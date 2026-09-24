import eventlet
eventlet.monkey_patch()

from dotenv import load_dotenv
load_dotenv()

import base64
import json
import time
import cv2
import numpy as np
import ncnn
import paho.mqtt.client as mqtt

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
import os

# PENTING: project ini HARUS sama dengan yang dipakai mobile app (lib/supabase.ts),
# yaitu project "sfcpobdfasoyxpgxexst". Isi lewat environment variable, jangan hardcode.
# Ambil dari Supabase dashboard -> Settings -> API (gunakan service_role key di backend saja,
# JANGAN taruh service_role key ini di kode mobile app).
SUPABASE_URL = "https://vljznwlefqeiymtqmnlt.supabase.co"
SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanpud2xlZnFlaXltdHFtbmx0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc4OTg5OCwiZXhwIjoyMDk1MzY1ODk4fQ.XfALDGDlrVLXFTuo7X_65OMHQ80bmr7iBFWWDCqD74A"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsanpud2xlZnFlaXltdHFtbmx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODk4OTgsImV4cCI6MjA5NTM2NTg5OH0.KFk_DXKTC7t5L06wY_BgS8zziXi-OD42cCg4Mb3VJVU"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://vljznwlefqeiymtqmnlt.supabase.co")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", SUPABASE_SERVICE_KEY)
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", SUPABASE_ANON_KEY)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

# ======================================================
# LOAD YOLO11N-POSE (NCNN)
# ======================================================
net = ncnn.Net()
net.load_param(r"model.ncnn.param")
net.load_model(r"model.ncnn.bin")

previous_keypoints_map = {}
previous_device_state = {}   # client_id -> "ON" / "OFF", dipakai untuk deteksi perubahan status


# ======================================================
# SIMPAN EVENT KE SUPABASE (hanya saat status berubah)
# ======================================================
def save_detection_event(client_id, total_person, device_command):
    """
    Insert baris history ke Supabase HANYA ketika status ON/OFF berubah
    dari sebelumnya, supaya tabel tidak dibanjiri baris yang sama tiap frame.
    """
    prev_state = previous_device_state.get(client_id)
    previous_device_state[client_id] = device_command

    if prev_state == device_command:
        return  # tidak ada perubahan, tidak perlu insert

    events = []

    if device_command == "ON":
        events.append({
            "event_type": "motion",
            "message": "Motion detected around the device",
        })
        events.append({
            "event_type": "lamp-on",
            "message": "Lights are now ON",
        })
        events.append({
            "event_type": "fan-on",
            "message": "Fan has been activated",
        })
    else:
        events.append({
            "event_type": "lamp-off",
            "message": "Lights are now OFF",
        })
        events.append({
            "event_type": "fan-off",
            "message": "Fan has been turned off",
        })

    for ev in events:
        try:
            supabase.table("detection_history").insert({
                "event_type": ev["event_type"],
                "message": ev["message"],
                "client_id": client_id,
                "total_person": total_person,
            }).execute()
        except Exception as e:
            print(f"[SUPABASE] Gagal simpan history ({ev['event_type']}): {e}")

    print(f"[SUPABASE] {len(events)} event tersimpan (status: {prev_state} -> {device_command})")

# ======================================================
# MQTT CONFIG
# ======================================================
MQTT_BROKER     = "n1a44690.ala.asia-southeast1.emqxsl.com"
MQTT_PORT       = 8883                # SSL/TLS port
MQTT_USERNAME   = "testuser"
MQTT_PASSWORD   = "testpass123"
DEVICE_ID       = "dmouv"

# Topics
MQTT_TOPIC_DETECTION = f"{DEVICE_ID}/detection/status"   # publish hasil deteksi pose
MQTT_TOPIC_DEVICE    = f"{DEVICE_ID}/device/control"     # publish perintah ke IoT device
MQTT_TOPIC_COMMAND   = f"{DEVICE_ID}/server/command"     # subscribe perintah dari luar

mqtt_client = mqtt.Client(client_id="dmouv-server", protocol=mqtt.MQTTv311)

# ======================================================
# MQTT CALLBACKS
# ======================================================
def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected to broker")
        client.subscribe(MQTT_TOPIC_COMMAND)
        print(f"[MQTT] Subscribed to: {MQTT_TOPIC_COMMAND}")
    else:
        print(f"[MQTT] Failed to connect, rc={rc}")

def on_mqtt_disconnect(client, userdata, rc):
    print(f"[MQTT] Disconnected, rc={rc}")

def on_mqtt_message(client, userdata, msg):
    topic = msg.topic
    payload = msg.payload.decode()
    print(f"[MQTT] Received | {topic}: {payload}")

    # Contoh: handle perintah dari luar (misal dari dashboard web)
    try:
        data = json.loads(payload)
        command = data.get("command")
        if command == "reset":
            print("[MQTT] Reset command received")
        elif command == "status":
            mqtt_client.publish(MQTT_TOPIC_DETECTION, json.dumps({
                "server": "online",
                "timestamp": time.time()
            }))
    except Exception as e:
        print(f"[MQTT] Message parse error: {e}")

# Setup MQTT
mqtt_client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
mqtt_client.tls_set(tls_version=mqtt.ssl.PROTOCOL_TLS)  # wajib untuk port 8883 (EMQX cloud)

mqtt_client.on_connect    = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.on_message    = on_mqtt_message

try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    mqtt_client.loop_start()  # jalankan di background thread (non-blocking)
    print(f"[MQTT] Connecting to {MQTT_BROKER}:{MQTT_PORT} (TLS)...")
except Exception as e:
    print(f"[MQTT] Could not connect to broker: {e}")

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
NMS_THRESHOLD  = 0.45
INPUT_SIZE     = 640

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

    output = np.array(out0).T

    boxes        = []
    confidences  = []
    all_keypoints = []

    for det in output:
        x, y, bw, bh = det[0:4]
        conf = det[4]

        if conf < CONF_THRESHOLD:
            continue

        x1    = int((x - bw / 2) * original_w / INPUT_SIZE)
        y1    = int((y - bh / 2) * original_h / INPUT_SIZE)
        w_box = int(bw * original_w / INPUT_SIZE)
        h_box = int(bh * original_h / INPUT_SIZE)

        kp_raw    = det[5:]
        keypoints = []
        for i in range(0, len(kp_raw), 3):
            kx = int(kp_raw[i]     * original_w / INPUT_SIZE)
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
                "bbox":      [float(x1), float(y1), float(x2), float(y2)],
                "conf":      confidences[idx],
                "keypoints": all_keypoints[idx]
            })

    previous_keypoints_map[client_id] = result_list

    pose_detected = len(result_list) > 0

    # ======================================================
    # PUBLISH KE MQTT SETELAH DETEKSI
    # ======================================================
    try:
        # 1. Publish status deteksi lengkap
        detection_payload = json.dumps({
            "client_id":    client_id,
            "pose_detected": pose_detected,
            "total_person": len(result_list),
            "timestamp":    time.time()
        })
        mqtt_client.publish(MQTT_TOPIC_DETECTION, detection_payload)

        # 2. Publish perintah ke IoT device
        #    ON  → ada orang terdeteksi
        #    OFF → tidak ada orang
        device_command = "ON" if pose_detected else "OFF"
        mqtt_client.publish(MQTT_TOPIC_DEVICE, device_command)

        print(f"[MQTT] Published → {MQTT_TOPIC_DEVICE}: {device_command} | persons: {len(result_list)}")

    except Exception as e:
        print(f"[MQTT] Publish error: {e}")

    # ======================================================
    # SIMPAN KE SUPABASE (history) - hanya saat status berubah
    # ======================================================
    save_detection_event(client_id, len(result_list), device_command)

    return {
        "status":       "OK",
        "pose_detected": pose_detected,
        "total_person": len(result_list),
        "data":         result_list,
        "image_width":  original_w,
        "image_height": original_h,
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
        data     = request.json
        email    = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email dan password wajib diisi"
            }), 400

        try:
            auth = supabase_auth.auth.sign_in_with_password({
                "email":    email,
                "password": password
            })

            profile = supabase.table("profiles").select("role").eq("id", auth.user.id).single().execute()
            role = profile.data.get("role", "user") if profile.data else "user"

            return jsonify({
                "success": True,
                "token": auth.session.access_token,
                "user": {
                    "id":    auth.user.id,
                    "email": auth.user.email,
                    "role":  role
                }
            })

        except Exception as auth_error:
            print("[AUTH] Primary auth failed, trying fallback...", str(auth_error))

            result = supabase.rpc("verify_user_password", {
                "user_email":    email,
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
                    "id":    result.data[0]["id"],
                    "email": email,
                    "role":  result.data[0].get("role", "user")
                }
            })

    except Exception as e:
        print("[LOGIN ERROR]", repr(e))
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# ======================================================
# VERIFY (HTTP)
# ======================================================
@app.route("/verify", methods=["POST"])
def verify():
    try:
        data      = request.json
        image_b64 = data.get("image_b64")
        client_id = data.get("client_id", "http_client")

        result = detect_person_pose(image_b64, client_id)

        # ======================================================
        # BROADCAST FRAME + HASIL DETEKSI KE MOBILE APP (live feed)
        # ======================================================
        try:
            socketio.emit("camera_frame", {
                "client_id": client_id,
                "image_b64": image_b64,
                "pose_detected": result.get("pose_detected", False),
                "total_person": result.get("total_person", 0),
                "boxes": [d["bbox"] for d in result.get("data", [])],
                "image_width": result.get("image_width"),
                "image_height": result.get("image_height"),
            })
        except Exception as e:
            print(f"[SOCKET] Gagal broadcast camera_frame: {e}")

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ======================================================
# MQTT DEVICE CONTROL (HTTP Manual)
# ======================================================
@app.route("/api/device/control", methods=["POST"])
def device_control():
    """
    Manual control IoT device via HTTP → MQTT
    Body: { "device_id": "lamp1", "command": "ON" }
    """
    try:
        data      = request.json
        device_id = data.get("device_id", "all")
        command   = data.get("command", "OFF")

        topic = f"dmouv/device/{device_id}"
        mqtt_client.publish(topic, command)

        print(f"[MQTT] Manual control → {topic}: {command}")

        return jsonify({
            "success": True,
            "topic":   topic,
            "command": command
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/device/status", methods=["GET"])
def device_status():
    """
    Publish status request ke broker
    """
    try:
        mqtt_client.publish(MQTT_TOPIC_DETECTION, json.dumps({
            "server":    "online",
            "timestamp": time.time()
        }))
        return jsonify({"success": True, "message": "Status published to MQTT"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# ======================================================
# SOCKET.IO EVENTS
# ======================================================
@socketio.on("connect")
def on_connect():
    print(f"[+] Client connected: {request.sid}")
    emit("connected", {
        "status": "connected",
        "sid":    request.sid
    })

@socketio.on("disconnect")
def on_disconnect():
    print(f"[-] Client disconnected: {request.sid}")
    previous_keypoints_map.pop(request.sid, None)

@socketio.on("verify")
def on_verify(data):
    try:
        image_b64 = data.get("image_b64")
        result    = detect_person_pose(image_b64, request.sid)
        emit("verify_result", result)
    except Exception as e:
        emit("verify_result", {
            "status": "ERROR",
            "error":  str(e)
        })

@socketio.on("frame")
def on_frame(data):
    try:
        image_b64 = data.get("image_b64")
        result    = detect_person_pose(image_b64, request.sid)
        emit("detection_result", result)
    except Exception as e:
        emit("detection_result", {
            "status": "ERROR",
            "error":  str(e)
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
        host="10.199.74.17",
        port=8001,
        debug=False
    )