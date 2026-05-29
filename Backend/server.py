import eventlet
eventlet.monkey_patch()

import base64
import json
import time
import cv2
import numpy as np
import ncnn

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client, ClientOptions
from flask_socketio import SocketIO, emit

# ======================================================
# INITIALIZE APP
# ======================================================
app = Flask(__name__)
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

# ======================================================
# SUPABASE
# ======================================================
SUPABASE_URL = "https://vljznwlefqeiymtqmnlt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanpud2xlZnFlaXltdHFtbmx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc4OTg5OCwiZXhwIjoyMDk1MzY1ODk4fQ.XfALDGDlrVLXFTuo7X_65OMHQ80bmr7iBFWWDCqD74A"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanpud2xlZnFlaXltdHFtbmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODk4OTgsImV4cCI6MjA5NTM2NTg5OH0.KFk_DXKTC7t5L06wY_BgS8zziXi-OD42cCg4Mb3VJVU"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ======================================================
# LOAD YOLO11N-POSE (NCNN)
# ======================================================
net = ncnn.Net()
net.load_param(r"C:\\Users\\mutia\\Downloads\\ML CPS\\mobile-dmouv2025\\Backend\\model.ncnn.param")
net.load_model(r"C:\Users\mutia\Downloads\ML CPS\mobile-dmouv2025\Backend\model.ncnn.bin")

previous_keypoints_map = {}

# ======================================================
# DECODE BASE64 IMAGE
# ======================================================
def decode_base64_image(image_b64: str):
    if not image_b64:
        raise ValueError("image_b64 is empty")

    image_bytes = base64.b64decode(image_b64)
    np_arr = np.frombuffer(image_bytes, dtype=np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Failed to decode image")

    return img

# ======================================================
# YOLO PERSON POSE DETECTION
# ======================================================
CONF_THRESHOLD = 0.5
NMS_THRESHOLD = 0.45
INPUT_SIZE = 640

def detect_person_pose(image_b64, client_id="http_client"):
    img = decode_base64_image(image_b64)

    original_h, original_w = img.shape[:2]

    resized = cv2.resize(img, (INPUT_SIZE, INPUT_SIZE))

    mat_in = ncnn.Mat.from_pixels(
        resized,
        ncnn.Mat.PixelType.PIXEL_BGR,
        INPUT_SIZE,
        INPUT_SIZE
    )

    norm_vals = [1 / 255.0, 1 / 255.0, 1 / 255.0]
    mat_in.substract_mean_normalize([], norm_vals)

    with net.create_extractor() as ex:
        ex.input("in0", mat_in)
        ret, out0 = ex.extract("out0")

    if ret != 0:
        return {
            "status": "ERROR",
            "message": "YOLO pose extraction failed"
        }

    import numpy as np
    output = np.array(out0).T

    boxes = []
    confidences = []
    all_keypoints = []

    for det in output:
        x, y, bw, bh = det[0:4]
        conf = det[4]

        if conf < CONF_THRESHOLD:
            continue

        x1 = int((x - bw / 2) * original_w / INPUT_SIZE)
        y1 = int((y - bh / 2) * original_h / INPUT_SIZE)
        w_box = int(bw * original_w / INPUT_SIZE)
        h_box = int(bh * original_h / INPUT_SIZE)

        kp_raw = det[5:]
        keypoints = []
        for i in range(0, len(kp_raw), 3):
            kx = int(kp_raw[i] * original_w / INPUT_SIZE)
            ky = int(kp_raw[i + 1] * original_h / INPUT_SIZE)
            ks = float(kp_raw[i + 2])
            keypoints.append([kx, ky, ks])

        boxes.append([x1, y1, w_box, h_box])
        confidences.append(float(conf))
        all_keypoints.append(keypoints)

    indices = cv2.dnn.NMSBoxes(boxes, confidences, CONF_THRESHOLD, NMS_THRESHOLD)

    result_list = []

    if len(indices) > 0:
        for idx in indices.flatten():
            x1, y1, w_box, h_box = boxes[idx]
            x2 = x1 + w_box
            y2 = y1 + h_box

            result_list.append({
                "bbox": [float(x1), float(y1), float(x2), float(y2)],
                "conf": confidences[idx],
                "keypoints": all_keypoints[idx]
            })

    previous_keypoints_map[client_id] = result_list

    return {
        "status": "OK",
        "pose_detected": len(result_list) > 0,
        "total_person": len(result_list),
        "data": result_list
    }

# ======================================================
# ROUTES
# ======================================================
@app.route("/")
def home():
    return jsonify({"message": "ML Flask Server OK"})

@app.route("/ping")
def ping():
    return jsonify({
        "ml_server": "online",
        "timestamp": time.time()
    })

# ======================================================
# LOGIN
# ======================================================
@app.route("/api/auth/login", methods=["POST"])
def login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email dan password wajib diisi"
            }), 400

        try:
            auth = supabase_auth.auth.sign_in_with_password({
                "email": email,
                "password": password
            })

            profile = supabase.table("profiles").select("role").eq("id", auth.user.id).single().execute()
            role = profile.data.get("role", "user") if profile.data else "user"

            return jsonify({
                "success": True,
                "token": auth.session.access_token,
                "user": {
                    "id": auth.user.id,
                    "email": auth.user.email,
                    "role": role
                }
            })

        except Exception as auth_error:
            print("[AUTH] Primary auth failed, trying fallback...", str(auth_error))

            result = supabase.rpc("verify_user_password", {
                "user_email": email,
                "user_password": password
            }).execute()

            if not result.data:
                return jsonify({
                    "success": False,
                    "message": "Email atau password salah"
                }), 401

            return jsonify({
                "success": True,
                "token": "manual_token_" + email,
                "user": {
                    "id": result.data[0]["id"],
                    "email": email,
                    "role": result.data[0].get("role", "user")
                }
            })

    except Exception as e:
        print("[LOGIN ERROR]", repr(e))
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# ======================================================
# VERIFY
# ======================================================
@app.route("/verify", methods=["POST"])
def verify():
    try:
        data = request.json
        image_b64 = data.get("image_b64")
        client_id = data.get("client_id", "http_client")

        result = detect_person_pose(image_b64, client_id)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================================================
# SOCKET.IO EVENTS
# ======================================================
@socketio.on("connect")
def on_connect():
    print(f"[+] Client connected: {request.sid}")
    emit("connected", {
        "status": "connected",
        "sid": request.sid
    })

@socketio.on("disconnect")
def on_disconnect():
    print(f"[-] Client disconnected: {request.sid}")
    previous_keypoints_map.pop(request.sid, None)

@socketio.on("verify")
def on_verify(data):
    try:
        image_b64 = data.get("image_b64")
        result = detect_person_pose(image_b64, request.sid)
        emit("verify_result", result)
    except Exception as e:
        emit("verify_result", {
            "status": "ERROR",
            "error": str(e)
        })

@socketio.on("frame")
def on_frame(data):
    try:
        image_b64 = data.get("image_b64")
        result = detect_person_pose(image_b64, request.sid)
        emit("detection_result", result)
    except Exception as e:
        emit("detection_result", {
            "status": "ERROR",
            "error": str(e)
        })

@socketio.on("ping")
def on_ping(_):
    emit("pong", {"timestamp": time.time()})

@socketio.on("broadcast")
def on_broadcast(data):
    emit("broadcast", data, broadcast=True)

# ======================================================
# RUN SERVER
# ======================================================
if __name__ == "__main__":
    socketio.run(
        app,
        host="192.168.246.17",
        port=8001,
        debug=False
    )