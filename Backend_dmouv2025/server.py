```python
import eventlet
eventlet.monkey_patch()

import base64
import json
import time
import cv2
import numpy as np
import ncnn
import paho.mqtt.client as mqtt

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from flask_socketio import SocketIO, emit


# ======================================================
# INITIALIZE APP
# ======================================================

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet"
)


# ======================================================
# SUPABASE
# ======================================================

SUPABASE_URL = "https://vljznwlefqeiymtqmnlt.supabase.co"

# GANTI dengan key milik kamu
SUPABASE_SERVICE_KEY = "YOUR_SUPABASE_SERVICE_KEY"
SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY"

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY
)

supabase_auth: Client = create_client(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
)


# ======================================================
# LOAD YOLO11N-POSE (NCNN)
# ======================================================

net = ncnn.Net()

net.load_param(r"model.ncnn.param")
net.load_model(r"model.ncnn.bin")

previous_keypoints_map = {}


# ======================================================
# MQTT CONFIG
# ======================================================

MQTT_BROKER = "n1a44690.ala.asia-southeast1.emqxsl.com"
MQTT_PORT = 8883

MQTT_USERNAME = "testuser"
MQTT_PASSWORD = "testpass123"

DEVICE_ID = "dmouv"

MQTT_TOPIC_DETECTION = f"{DEVICE_ID}/detection/status"
MQTT_TOPIC_DEVICE = f"{DEVICE_ID}/device/control"
MQTT_TOPIC_COMMAND = f"{DEVICE_ID}/server/command"


mqtt_client = mqtt.Client(
    client_id="dmouv-server",
    protocol=mqtt.MQTTv311
)


# ======================================================
# MQTT CALLBACKS
# ======================================================

def on_mqtt_connect(client, userdata, flags, rc):

    if rc == 0:

        print("[MQTT] Connected to broker")

        client.subscribe(MQTT_TOPIC_COMMAND)

        print(
            f"[MQTT] Subscribed to: "
            f"{MQTT_TOPIC_COMMAND}"
        )

    else:

        print(
            f"[MQTT] Failed to connect, rc={rc}"
        )


def on_mqtt_disconnect(client, userdata, rc):

    print(
        f"[MQTT] Disconnected, rc={rc}"
    )


def on_mqtt_message(client, userdata, msg):

    topic = msg.topic

    payload = msg.payload.decode()

    print(
        f"[MQTT] Received | "
        f"{topic}: {payload}"
    )

    try:

        data = json.loads(payload)

        command = data.get("command")

        if command == "reset":

            print(
                "[MQTT] Reset command received"
            )

        elif command == "status":

            mqtt_client.publish(
                MQTT_TOPIC_DETECTION,
                json.dumps({
                    "server": "online",
                    "timestamp": time.time()
                })
            )

    except Exception as e:

        print(
            f"[MQTT] Message parse error: {e}"
        )


# ======================================================
# MQTT SETUP
# ======================================================

mqtt_client.username_pw_set(
    MQTT_USERNAME,
    MQTT_PASSWORD
)

mqtt_client.tls_set(
    tls_version=mqtt.ssl.PROTOCOL_TLS
)

mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.on_message = on_mqtt_message


try:

    mqtt_client.connect(
        MQTT_BROKER,
        MQTT_PORT,
        keepalive=60
    )

    mqtt_client.loop_start()

    print(
        f"[MQTT] Connecting to "
        f"{MQTT_BROKER}:{MQTT_PORT} (TLS)..."
    )

except Exception as e:

    print(
        f"[MQTT] Could not connect to broker: {e}"
    )


# ======================================================
# DECODE BASE64 IMAGE
# ======================================================

def decode_base64_image(image_b64: str):

    if not image_b64:

        raise ValueError(
            "image_b64 is empty"
        )

    image_bytes = base64.b64decode(
        image_b64
    )

    np_arr = np.frombuffer(
        image_bytes,
        dtype=np.uint8
    )

    img = cv2.imdecode(
        np_arr,
        cv2.IMREAD_COLOR
    )

    if img is None:

        raise ValueError(
            "Failed to decode image"
        )

    return img


# ======================================================
# YOLO PERSON POSE DETECTION
# ======================================================

CONF_THRESHOLD = 0.5
NMS_THRESHOLD = 0.45
INPUT_SIZE = 640


def detect_person_pose_from_frame(
    img,
    client_id="camera_local"
):

    original_h, original_w = img.shape[:2]

    resized = cv2.resize(
        img,
        (INPUT_SIZE, INPUT_SIZE)
    )

    mat_in = ncnn.Mat.from_pixels(
        resized,
        ncnn.Mat.PixelType.PIXEL_BGR,
        INPUT_SIZE,
        INPUT_SIZE
    )

    norm_vals = [
        1 / 255.0,
        1 / 255.0,
        1 / 255.0
    ]

    mat_in.substract_mean_normalize(
        [],
        norm_vals
    )

    with net.create_extractor() as ex:

        ex.input(
            "in0",
            mat_in
        )

        ret, out0 = ex.extract(
            "out0"
        )

    if ret != 0:

        return {
            "status": "ERROR",
            "message":
                "YOLO pose extraction failed"
        }

    output = np.array(out0).T

    boxes = []
    confidences = []
    all_keypoints = []


    for det in output:

        x, y, bw, bh = det[0:4]

        conf = det[4]

        if conf < CONF_THRESHOLD:

            continue


        x1 = int(
            (x - bw / 2)
            * original_w
            / INPUT_SIZE
        )

        y1 = int(
            (y - bh / 2)
            * original_h
            / INPUT_SIZE
        )

        w_box = int(
            bw
            * original_w
            / INPUT_SIZE
        )

        h_box = int(
            bh
            * original_h
            / INPUT_SIZE
        )


        kp_raw = det[5:]

        keypoints = []


        for i in range(
            0,
            len(kp_raw),
            3
        ):

            kx = int(
                kp_raw[i]
                * original_w
                / INPUT_SIZE
            )

            ky = int(
                kp_raw[i + 1]
                * original_h
                / INPUT_SIZE
            )

            ks = float(
                kp_raw[i + 2]
            )

            keypoints.append(
                [kx, ky, ks]
            )


        boxes.append([
            x1,
            y1,
            w_box,
            h_box
        ])

        confidences.append(
            float(conf)
        )

        all_keypoints.append(
            keypoints
        )


    indices = cv2.dnn.NMSBoxes(
        boxes,
        confidences,
        CONF_THRESHOLD,
        NMS_THRESHOLD
    )

    result_list = []


    if len(indices) > 0:

        for idx in indices.flatten():

            x1, y1, w_box, h_box = \
                boxes[idx]

            x2 = x1 + w_box
            y2 = y1 + h_box

            result_list.append({

                "bbox": [
                    float(x1),
                    float(y1),
                    float(x2),
                    float(y2)
                ],

                "conf":
                    confidences[idx],

                "keypoints":
                    all_keypoints[idx]
            })


    previous_keypoints_map[
        client_id
    ] = result_list

    pose_detected = (
        len(result_list) > 0
    )


    # ==================================================
    # MQTT
    # ==================================================

    try:

        detection_payload = json.dumps({

            "client_id":
                client_id,

            "pose_detected":
                pose_detected,

            "total_person":
                len(result_list),

            "timestamp":
                time.time()
        })


        mqtt_client.publish(
            MQTT_TOPIC_DETECTION,
            detection_payload
        )


        device_command = (
            "ON"
            if pose_detected
            else "OFF"
        )


        mqtt_client.publish(
            MQTT_TOPIC_DEVICE,
            device_command
        )


        print(
            f"[MQTT] Published → "
            f"{MQTT_TOPIC_DEVICE}: "
            f"{device_command} | "
            f"persons: "
            f"{len(result_list)}"
        )


    except Exception as e:

        print(
            f"[MQTT] Publish error: {e}"
        )


    return {

        "status": "OK",

        "pose_detected":
            pose_detected,

        "total_person":
            len(result_list),

        "data":
            result_list
    }


# ======================================================
# BASE64 DETECTION WRAPPER
# ======================================================

def detect_person_pose(
    image_b64,
    client_id="http_client"
):

    img = decode_base64_image(
        image_b64
    )

    return detect_person_pose_from_frame(
        img,
        client_id
    )


# ======================================================
# WEBCAM CONFIG
# ======================================================

CAMERA_INDEX = 0

CAPTURE_INTERVAL = 0.2

camera_running = False


# ======================================================
# WEBCAM LOOP
# ======================================================

def webcam_loop():

    global camera_running


    cap = cv2.VideoCapture(
        CAMERA_INDEX
    )


    # Optional: set resolution
    cap.set(
        cv2.CAP_PROP_FRAME_WIDTH,
        640
    )

    cap.set(
        cv2.CAP_PROP_FRAME_HEIGHT,
        480
    )


    if not cap.isOpened():

        print(
            f"[CAMERA] Gagal membuka "
            f"webcam index "
            f"{CAMERA_INDEX}"
        )

        camera_running = False

        return


    camera_running = True

    print(
        "[CAMERA] Webcam loop dimulai"
    )


    while camera_running:

        ret, frame = cap.read()


        if not ret:

            print(
                "[CAMERA] Gagal membaca "
                "frame, retry..."
            )

            socketio.sleep(1)

            continue


        try:

            # ==========================================
            # YOLO DETECTION
            # ==========================================

            result = detect_person_pose_from_frame(
                frame,
                client_id="webcam_local"
            )


            # ==========================================
            # ENCODE FRAME
            # ==========================================

            success, buffer = cv2.imencode(
                ".jpg",
                frame,
                [
                    cv2.IMWRITE_JPEG_QUALITY,
                    70
                ]
            )


            if success:

                frame_b64 = base64.b64encode(
                    buffer.tobytes()
                ).decode("utf-8")


                # ======================================
                # KIRIM FRAME + DETECTION KE FRONTEND
                # ======================================

                socketio.emit(
                    "camera_frame",
                    {
                        "image": frame_b64,
                        "detection": result
                    }
                )


            # ==========================================
            # KIRIM HASIL DETEKSI TERPISAH
            # ==========================================

            socketio.emit(
                "detection_result",
                result
            )


        except Exception as e:

            print(
                f"[CAMERA] Detection error: {e}"
            )


        socketio.sleep(
            CAPTURE_INTERVAL
        )


    cap.release()

    print(
        "[CAMERA] Webcam loop dihentikan"
    )


# ======================================================
# ROUTES
# ======================================================

@app.route("/")
def home():

    return jsonify({
        "message":
            "ML Flask Server OK"
    })


@app.route("/ping")
def ping():

    return jsonify({

        "ml_server":
            "online",

        "timestamp":
            time.time()
    })


# ======================================================
# LOGIN
# ======================================================

@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def login():

    try:

        data = request.json

        email = data.get(
            "email"
        )

        password = data.get(
            "password"
        )


        if not email or not password:

            return jsonify({

                "success": False,

                "message":
                    "Email dan password wajib diisi"

            }), 400


        try:

            auth = (
                supabase_auth
                .auth
                .sign_in_with_password({

                    "email": email,

                    "password":
                        password
                })
            )


            profile = (
                supabase
                .table("profiles")
                .select("role")
                .eq(
                    "id",
                    auth.user.id
                )
                .single()
                .execute()
            )


            role = (
                profile.data.get(
                    "role",
                    "user"
                )
                if profile.data
                else "user"
            )


            return jsonify({

                "success": True,

                "token":
                    auth.session.access_token,

                "user": {

                    "id":
                        auth.user.id,

                    "email":
                        auth.user.email,

                    "role":
                        role
                }
            })


        except Exception as auth_error:

            print(
                "[AUTH] Primary auth failed, "
                "trying fallback...",
                str(auth_error)
            )


            result = (
                supabase
                .rpc(
                    "verify_user_password",
                    {
                        "user_email":
                            email,

                        "user_password":
                            password
                    }
                )
                .execute()
            )


            if not result.data:

                return jsonify({

                    "success": False,

                    "message":
                        "Email atau password salah"

                }), 401


            return jsonify({

                "success": True,

                "token":
                    "manual_token_" + email,

                "user": {

                    "id":
                        result.data[0]["id"],

                    "email":
                        email,

                    "role":
                        result.data[0].get(
                            "role",
                            "user"
                        )
                }
            })


    except Exception as e:

        print(
            "[LOGIN ERROR]",
            repr(e)
        )

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ======================================================
# VERIFY HTTP
# ======================================================

@app.route(
    "/verify",
    methods=["POST"]
)
def verify():

    try:

        data = request.json

        image_b64 = data.get(
            "image_b64"
        )

        client_id = data.get(
            "client_id",
            "http_client"
        )


        result = detect_person_pose(
            image_b64,
            client_id
        )


        return jsonify(result)


    except Exception as e:

        return jsonify({

            "error":
                str(e)

        }), 500


# ======================================================
# MQTT DEVICE CONTROL
# ======================================================

@app.route(
    "/api/device/control",
    methods=["POST"]
)
def device_control():

    try:

        data = request.json

        device_id = data.get(
            "device_id",
            "all"
        )

        command = data.get(
            "command",
            "OFF"
        )


        topic = (
            f"dmouv/device/"
            f"{device_id}"
        )


        mqtt_client.publish(
            topic,
            command
        )


        print(
            f"[MQTT] Manual control → "
            f"{topic}: {command}"
        )


        return jsonify({

            "success": True,

            "topic":
                topic,

            "command":
                command
        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


@app.route(
    "/api/device/status",
    methods=["GET"]
)
def device_status():

    try:

        mqtt_client.publish(
            MQTT_TOPIC_DETECTION,
            json.dumps({

                "server":
                    "online",

                "timestamp":
                    time.time()
            })
        )


        return jsonify({

            "success": True,

            "message":
                "Status published to MQTT"
        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ======================================================
# CAMERA START
# ======================================================

@app.route(
    "/api/camera/start",
    methods=["POST"]
)
def camera_start():

    global camera_running


    if camera_running:

        return jsonify({

            "success": False,

            "message":
                "Kamera sudah berjalan"
        })


    socketio.start_background_task(
        webcam_loop
    )


    return jsonify({

        "success": True,

        "message":
            "Webcam loop dimulai"
    })


# ======================================================
# CAMERA STOP
# ======================================================

@app.route(
    "/api/camera/stop",
    methods=["POST"]
)
def camera_stop():

    global camera_running

    camera_running = False


    return jsonify({

        "success": True,

        "message":
            "Webcam loop akan dihentikan"
    })


# ======================================================
# CAMERA STATUS
# ======================================================

@app.route(
    "/api/camera/status",
    methods=["GET"]
)
def camera_status():

    return jsonify({

        "camera_running":
            camera_running
    })


# ======================================================
# SOCKET.IO EVENTS
# ======================================================

@socketio.on("connect")
def on_connect():

    print(
        f"[+] Client connected: "
        f"{request.sid}"
    )


    emit(
        "connected",
        {
            "status":
                "connected",

            "sid":
                request.sid
        }
    )


@socketio.on("disconnect")
def on_disconnect():

    print(
        f"[-] Client disconnected: "
        f"{request.sid}"
    )


    previous_keypoints_map.pop(
        request.sid,
        None
    )


@socketio.on("verify")
def on_verify(data):

    try:

        image_b64 = data.get(
            "image_b64"
        )

        result = detect_person_pose(
            image_b64,
            request.sid
        )


        emit(
            "verify_result",
            result
        )


    except Exception as e:

        emit(
            "verify_result",
            {
                "status":
                    "ERROR",

                "error":
                    str(e)
            }
        )


@socketio.on("frame")
def on_frame(data):

    try:

        image_b64 = data.get(
            "image_b64"
        )


        result = detect_person_pose(
            image_b64,
            request.sid
        )


        emit(
            "detection_result",
            result
        )


    except Exception as e:

        emit(
            "detection_result",
            {
                "status":
                    "ERROR",

                "error":
                    str(e)
            }
        )


@socketio.on("ping")
def on_ping(_):

    emit(
        "pong",
        {
            "timestamp":
                time.time()
        }
    )


@socketio.on("broadcast")
def on_broadcast(data):

    emit(
        "broadcast",
        data,
        broadcast=True
    )


# ======================================================
# RUN SERVER
# ======================================================

if __name__ == "__main__":

    # Mulai webcam otomatis
    socketio.start_background_task(
        webcam_loop
    )


    socketio.run(
        app,

        # Gunakan 0.0.0.0 agar Raspberry Pi
        # dan device lain di jaringan bisa akses
        host="0.0.0.0",

        port=8001,

        debug=False
    )