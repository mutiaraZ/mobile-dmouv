import eventlet
eventlet.monkey_patch()

import base64
import hmac
import json
import os
import queue
import time
from datetime import datetime, timezone
from functools import wraps

import cv2
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

from model import CommandGenerator, PoseModel, decode_base64_image  # noqa: E402

# ======================================================
# CONFIG (semua dari .env)
# ======================================================
PORT = int(os.getenv("PORT", "8001"))
WS_AUTH_TOKEN = os.getenv("WS_AUTH_TOKEN", "")  # kosong = tanpa auth

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")


CAMERA_AUTOSTART = os.getenv("CAMERA_AUTOSTART", "1") == "1"
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "0"))
CAPTURE_INTERVAL = float(os.getenv("CAPTURE_INTERVAL", "0.2"))
STATUS_INTERVAL = float(os.getenv("STATUS_INTERVAL", "5"))
MOTION_COOLDOWN = float(os.getenv("MOTION_COOLDOWN", "30"))  # detik, cegah spam log motion

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

# ======================================================
# SUPABASE (auth login + tabel device_history) - key dibaca dari .env milik backend
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
    print("[SUPABASE] env belum lengkap - /api/auth/login dan history dinonaktifkan")


# ======================================================
# HISTORY (Supabase Postgres + push realtime via Socket.IO)
# ======================================================
_history_q = queue.Queue(maxsize=2000)
_motion = {"prev": False, "last_log": 0.0}
VALID_EVENT_TYPES = ("motion", "lamp-on", "lamp-off", "fan-on", "fan-off", "schedule")


def log_event(event_type, message, device=None, source="system", reason=None, metadata=None):
    """Antrikan event ke DB. Tidak memblok pipeline deteksi dan tidak pernah melempar error."""
    if supabase is None:
        return
    row = {
        "device_id": DEVICE_ID,
        "event_type": event_type,
        "device": device,
        "source": source,
        "message": message,
        "reason": reason,
        "metadata": metadata or {},
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        _history_q.put_nowait((row, 0))
    except queue.Full:
        print("[HISTORY] Antrian penuh, event dibuang")


def history_worker():
    while True:
        row, attempt = _history_q.get()
        try:
            res = supabase.table("device_history").insert(row).execute()
            saved = res.data[0] if res.data else row
            socketio.emit("history_event", saved)  # push realtime ke semua app
        except Exception as e:
            print(f"[HISTORY] Gagal simpan (percobaan {attempt + 1}): {e}")
            if attempt < 5:  # WiFi Raspi sempat putus -> coba lagi
                socketio.sleep(2 ** attempt)
                _history_q.put((row, attempt + 1))


def describe_command(cmd):
    """Perintah backend -> (event_type, message, source)."""
    on = cmd["command"] == "ON"
    device = cmd["device"]
    manual = cmd["reason"] == "manual"
    if device == "lamp":
        if manual:
            msg = "Lights are now ON" if on else "Lights are now OFF"
        else:
            msg = "Lamp turned on automatically" if on else "Lamp turned off automatically (no one around)"
    else:
        if manual:
            msg = "Fan has been activated" if on else "Fan has been turned off"
        else:
            msg = "Fan started automatically" if on else "Fan turned off automatically (no one around)"
    return f"{device}-{'on' if on else 'off'}", msg, ("manual" if manual else "auto")


def log_commands(commands):
    for cmd in commands:
        event_type, msg, source = describe_command(cmd)
        log_event(event_type, msg, device=cmd["device"], source=source, reason=cmd["reason"])


def track_motion(client_id):
    """Catat 'motion' saat orang TERKONFIRMASI muncul (transisi tidak ada -> ada), dengan cooldown."""
    now = time.time()
    person = generator._person
    if person and not _motion["prev"] and now - _motion["last_log"] >= MOTION_COOLDOWN:
        _motion["last_log"] = now
        log_event("motion", "Motion detected around the device", source="auto",
                  reason="person_detected", metadata={"client_id": client_id})
    _motion["prev"] = person


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
        log_commands(commands)  # simpan ke history + push realtime
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
    track_motion(client_id)  # sebelum publish_commands: urutan log "motion" lalu "lamp on"
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
    return jsonify({"success": True, "state": generator.snapshot()})


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


# ---------- HISTORY ----------
@app.route("/api/history", methods=["GET"])
@require_token
def history_list():
    if supabase is None:
        return jsonify({"success": False, "message": "Supabase belum dikonfigurasi"}), 503
    try:
        limit = max(1, min(int(request.args.get("limit", 100)), 300))
        before = request.args.get("before")  # cursor: created_at item terlama yang sudah dimuat
        q = (
            supabase.table("device_history")
            .select("id,event_type,device,source,message,reason,created_at")
            .eq("device_id", DEVICE_ID)
            .order("created_at", desc=True)
            .order("id", desc=True)
            .limit(limit)
        )
        if before:
            q = q.lt("created_at", before)
        rows = q.execute().data or []
        return jsonify({"success": True, "items": rows, "has_more": len(rows) == limit})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/history/log", methods=["POST"])
@require_token
def history_log():
    """Dipakai script lain di Raspi (jadwal, feedback relay) untuk menulis event."""
    data = request.json or {}
    event_type = data.get("event_type")
    if event_type not in VALID_EVENT_TYPES:
        return jsonify({"success": False, "message": "event_type tidak valid"}), 400
    log_event(
        event_type,
        data.get("message") or event_type,
        device=data.get("device"),
        source=data.get("source", "system"),
        reason=data.get("reason"),
        metadata=data.get("metadata"),
    )
    return jsonify({"success": True})


# ======================================================
# SOCKET.IO EVENTS
# ======================================================
@socketio.on("connect")
def on_connect(auth=None):
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token_ok(token):
        print("[WS] Koneksi ditolak: token salah")
        return False
    print(f"[+] Client connected: {request.sid}")
    emit("connected", {"status": "connected", "sid": request.sid})
    emit("device_state", generator.snapshot())


@socketio.on("disconnect")
def on_disconnect():
    print(f"[-] Client disconnected: {request.sid}")


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
    socketio.start_background_task(history_worker)
    if CAMERA_AUTOSTART:
        start_camera()
    socketio.run(app, host="0.0.0.0", port=PORT, debug=False)


if __name__ == "__main__":
    main()