
import eventlet
eventlet.monkey_patch()

import base64
import hmac
import json
import os
import time
from functools import wraps

import cv2
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from model import CommandGenerator, PoseModel, decode_base64_image  # noqa: E402

# ======================================================
# CONFIG (semua dari .env)
# ======================================================
PORT = int(os.getenv("PORT", "8001"))
WS_AUTH_TOKEN = os.getenv("WS_AUTH_TOKEN", "")  # kosong = tanpa auth
# 1 = perintah manual ditolak (503) kalau Raspberry Pi belum terhubung via Socket.IO
REQUIRE_RASPI = os.getenv("REQUIRE_RASPI", "1") == "1"

CAMERA_AUTOSTART = os.getenv("CAMERA_AUTOSTART", "1") == "1"
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CAPTURE_INTERVAL = float(os.getenv("CAPTURE_INTERVAL", "0.2"))
STATUS_INTERVAL = float(os.getenv("STATUS_INTERVAL", "5"))

MQTT_BROKER = os.getenv("MQTT_BROKER", "")
MQTT_PORT = int(os.getenv("MQTT_PORT", "8883"))
MQTT_USERNAME = os.getenv("MQTT_USERNAME", "")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD", "")
DEVICE_ID = os.getenv("DEVICE_ID", "dmouv")

TOPIC_DETECTION = f"{DEVICE_ID}/detection/status"
TOPIC_SERVER_COMMAND = f"{DEVICE_ID}/server/command"
DEVICE_TOPICS = {
    "lamp": os.getenv("MQTT_TOPIC_LAMP", f"{DEVICE_ID}/device/lamp"),
    "fan": os.getenv("MQTT_TOPIC_FAN", f"{DEVICE_ID}/device/fan"),
}

# ======================================================
# APP
# ======================================================
app = Flask(__name__)
CORS(app)
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="eventlet",
    max_http_buffer_size=5 * 1024 * 1024,  # default 1 MB; frame base64 dari HP bisa lebih
)

pose_model = PoseModel()
generator = CommandGenerator(
    devices=tuple(DEVICE_TOPICS),
    on_confirm_frames=int(os.getenv("ON_CONFIRM_FRAMES", "3")),
    off_delay_sec=float(os.getenv("OFF_DELAY_SEC", "10")),
)

# Daftar sid Socket.IO milik Raspberry Pi yang sedang online
raspi_sids = set()


def raspi_online():
    return len(raspi_sids) > 0


# ======================================================
# SUPABASE (hanya untuk /api/auth/login) - key dibaca dari .env milik backend
# ======================================================
supabase = supabase_auth = None
_sb_url = os.getenv("SUPABASE_URL")
_sb_service = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
_sb_anon = os.getenv("SUPABASE_ANON_KEY")
if _sb_url and _sb_service and _sb_anon:
    from supabase import create_client
    supabase = create_client(_sb_url, _sb_service)
    supabase_auth = create_client(_sb_url, _sb_anon)
else:
    print("[SUPABASE] env belum lengkap - /api/auth/login dinonaktifkan")


# ======================================================
# AUTH TOKEN (opsional)
# ======================================================
def token_ok(candidate):
    return not WS_AUTH_TOKEN or hmac.compare_digest(str(candidate or ""), WS_AUTH_TOKEN)


def require_token(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not token_ok(request.headers.get("X-Auth-Token")):
            return jsonify({"success": False, "message": "Unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ======================================================
# MQTT
# ======================================================
mqtt_client = None


def mqtt_publish(topic, payload):
    if mqtt_client is None:
        print(f"[MQTT off] {topic}: {payload}")
        return
    mqtt_client.publish(topic, payload, qos=1)


def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected")
        client.subscribe(TOPIC_SERVER_COMMAND)
    else:
        print(f"[MQTT] Gagal connect, rc={rc}")


def on_mqtt_message(client, userdata, msg):
    try:
        command = json.loads(msg.payload.decode()).get("command")
        if command == "reset":
            generator.set_mode("all", "auto")
            socketio.emit("device_state", generator.snapshot())
        elif command == "status":
            publish_status()
    except Exception as e:
        print(f"[MQTT] Pesan tidak valid: {e}")


def setup_mqtt():
    global mqtt_client
    if not MQTT_BROKER:
        print("[MQTT] MQTT_BROKER kosong - publish dinonaktifkan")
        return
    client = mqtt.Client(client_id=f"{DEVICE_ID}-server", protocol=mqtt.MQTTv311)
    if MQTT_USERNAME:
        client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)
    if MQTT_PORT == 8883:
        client.tls_set()
    client.on_connect = on_mqtt_connect
    client.on_message = on_mqtt_message
    client.reconnect_delay_set(1, 30)
    # connect_async + loop_start: tetap mencoba tersambung kalau WiFi Raspi belum siap saat boot
    client.connect_async(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    mqtt_client = client


def publish_status():
    mqtt_publish(TOPIC_DETECTION, json.dumps({
        "server": "online",
        "state": generator.snapshot(),
        "timestamp": time.time(),
    }))


# ======================================================
# PIPELINE: frame -> deteksi -> perintah
# ======================================================
_last_status = {"person": None, "at": 0.0}


def publish_commands(commands):
    for cmd in commands:
        mqtt_publish(DEVICE_TOPICS[cmd["device"]], cmd["command"])
        print(f"[CMD] {cmd['device']} -> {cmd['command']} ({cmd['reason']})")
        socketio.emit("device_command", cmd)
    if commands:
        socketio.emit("device_state", generator.snapshot())


def publish_detection_status(result, client_id):
    """Status deteksi ke MQTT hanya saat berubah / tiap STATUS_INTERVAL, bukan tiap frame."""
    if result.get("status") != "OK":
        return
    now = time.time()
    person = result["pose_detected"]
    if person != _last_status["person"] or now - _last_status["at"] >= STATUS_INTERVAL:
        _last_status.update(person=person, at=now)
        mqtt_publish(TOPIC_DETECTION, json.dumps({
            "client_id": client_id,
            "pose_detected": person,
            "total_person": result["total_person"],
            "timestamp": now,
        }))


def process_frame(img, client_id):
    result = pose_model.detect(img)
    commands = generator.update(result)
    publish_commands(commands)
    try:
        publish_detection_status(result, client_id)
    except Exception as e:  # status MQTT gagal tidak boleh menggagalkan hasil deteksi
        print(f"[MQTT] Gagal publish status: {e}")
    return result, commands


# ======================================================
# KAMERA LOKAL RASPI (USB webcam)
# ======================================================
camera_running = False


def webcam_loop():
    global camera_running
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        print(f"[CAMERA] Gagal membuka kamera index {CAMERA_INDEX}")
        camera_running = False
        return

    camera_running = True
    print("[CAMERA] Loop dimulai")
    try:
        while camera_running:
            ok, frame = cap.read()
            if not ok:
                socketio.sleep(1)
                continue
            try:
                result, _ = process_frame(frame, "webcam_local")
                enc_ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if enc_ok and result.get("status") == "OK":
                    socketio.emit("camera_frame", {
                        "client_id": "webcam_local",
                        "image_b64": base64.b64encode(buf.tobytes()).decode(),
                        "pose_detected": result["pose_detected"],
                        "total_person": result["total_person"],
                        "boxes": result["boxes"],
                        "image_width": result["image_width"],
                        "image_height": result["image_height"],
                    })
                socketio.emit("detection_result", result)
            except Exception as e:
                print(f"[CAMERA] Error: {e}")
            socketio.sleep(CAPTURE_INTERVAL)  # bukan time.sleep: jangan blok eventlet
    finally:
        cap.release()
        camera_running = False
        print("[CAMERA] Loop dihentikan")


def start_camera():
    global camera_running
    if camera_running:
        return False
    camera_running = True
    socketio.start_background_task(webcam_loop)
    return True


# ======================================================
# HTTP ROUTES
# ======================================================
@app.route("/")
def home():
    return jsonify({"message": "DMouv backend OK"})


@app.route("/ping")
def ping():
    return jsonify({"server": "online", "timestamp": time.time()})


@app.route("/api/auth/login", methods=["POST"])
def login():
    if supabase is None:
        return jsonify({"success": False, "message": "Supabase belum dikonfigurasi"}), 503
    try:
        data = request.json or {}
        email, password = data.get("email"), data.get("password")
        if not email or not password:
            return jsonify({"success": False, "message": "Email dan password wajib diisi"}), 400

        try:
            auth = supabase_auth.auth.sign_in_with_password({"email": email, "password": password})
            profile = supabase.table("profiles").select("role").eq("id", auth.user.id).single().execute()
            role = profile.data.get("role", "user") if profile.data else "user"
            return jsonify({
                "success": True,
                "token": auth.session.access_token,
                "user": {"id": auth.user.id, "email": auth.user.email, "role": role},
            })
        except Exception as auth_error:
            print("[AUTH] Primary auth gagal, coba fallback:", auth_error)
            result = supabase.rpc("verify_user_password", {
                "user_email": email, "user_password": password
            }).execute()
            if not result.data:
                return jsonify({"success": False, "message": "Email atau password salah"}), 401
            return jsonify({
                "success": True,
                "token": "manual_token_" + email,
                "user": {
                    "id": result.data[0]["id"],
                    "email": email,
                    "role": result.data[0].get("role", "user"),
                },
            })
    except Exception as e:
        print("[LOGIN ERROR]", repr(e))
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/verify", methods=["POST"])
@require_token
def verify():
    try:
        data = request.json or {}
        img = decode_base64_image(data.get("image_b64"))
        result, commands = process_frame(img, data.get("client_id", "http_client"))
        return jsonify({**result, "commands": commands})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/device/control", methods=["POST"])
@require_token
def device_control():
    # Cek DULU sebelum state diubah, supaya state backend tidak melenceng dari kondisi asli
    if REQUIRE_RASPI and not raspi_online():
        return jsonify({"success": False, "message": "Raspberry Pi offline"}), 503
    try:
        data = request.json or {}
        device = data.get("device") or data.get("device_id") or "all"
        commands = generator.manual(device, data.get("command", "OFF"))
        publish_commands(commands)
        return jsonify({"success": True, "commands": commands})
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/device/mode", methods=["POST"])
@require_token
def device_mode():
    try:
        data = request.json or {}
        generator.set_mode(data.get("device", "all"), data.get("mode"))
        socketio.emit("device_state", generator.snapshot())
        return jsonify({"success": True, "state": generator.snapshot()})
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400


@app.route("/api/device/status", methods=["GET"])
@require_token
def device_status():
    publish_status()
    return jsonify({"success": True, "raspi_online": raspi_online(),
                    "state": generator.snapshot()})


@app.route("/api/camera/start", methods=["POST"])
@require_token
def camera_start():
    started = start_camera()
    return jsonify({"success": started,
                    "message": "Kamera dimulai" if started else "Kamera sudah berjalan"})


@app.route("/api/camera/stop", methods=["POST"])
@require_token
def camera_stop():
    global camera_running
    camera_running = False
    return jsonify({"success": True, "message": "Kamera akan dihentikan"})


@app.route("/api/camera/status", methods=["GET"])
@require_token
def camera_status():
    return jsonify({"camera_running": camera_running})


# ======================================================
# SOCKET.IO EVENTS
# ======================================================
@socketio.on("connect")
def on_connect(auth=None):
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token_ok(token):
        print("[WS] Koneksi ditolak: token salah")
        return False
    role = auth.get("role") if isinstance(auth, dict) else None
    if role == "raspi":
        join_room("raspi")
        raspi_sids.add(request.sid)
        print(f"[+] RASPI connected: {request.sid}")
        socketio.emit("raspi_status", {"online": True})
    else:
        print(f"[+] Client connected: {request.sid}")
    emit("connected", {"status": "connected", "sid": request.sid})
    emit("device_state", generator.snapshot())


@socketio.on("disconnect")
def on_disconnect():
    print(f"[-] Client disconnected: {request.sid}")
    if request.sid in raspi_sids:
        raspi_sids.discard(request.sid)
        socketio.emit("raspi_status", {"online": raspi_online()})


@socketio.on("device_ack")
def on_device_ack(data):
    """Raspi melapor bahwa relay sudah benar-benar berubah."""
    print(f"[ACK] {data}")
    socketio.emit("device_ack", data)


def _handle_image(data, reply_event):
    try:
        img = decode_base64_image((data or {}).get("image_b64"))
        result, _ = process_frame(img, request.sid)
        emit(reply_event, result)
    except Exception as e:
        emit(reply_event, {"status": "ERROR", "error": str(e)})


@socketio.on("frame")
def on_frame(data):
    _handle_image(data, "detection_result")


@socketio.on("verify")
def on_verify(data):
    _handle_image(data, "verify_result")


@socketio.on("set_mode")
def on_set_mode(data):
    data = data or {}
    try:
        generator.set_mode(data.get("device", "all"), data.get("mode"))
        socketio.emit("device_state", generator.snapshot())
    except ValueError as e:
        emit("server_error", {"event": "set_mode", "message": str(e)})


@socketio.on("device_control")
def on_device_control(data):
    data = data or {}
    try:
        publish_commands(generator.manual(data.get("device", "all"), data.get("command")))
    except ValueError as e:
        emit("server_error", {"event": "device_control", "message": str(e)})


@socketio.on("get_state")
def on_get_state(_=None):
    emit("device_state", generator.snapshot())


@socketio.on("ping")
def on_ping(_=None):
    emit("pong", {"timestamp": time.time()})


# ======================================================
# RUN
# ======================================================
def main():
    setup_mqtt()
    if CAMERA_AUTOSTART:
        start_camera()
    socketio.run(app, host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()