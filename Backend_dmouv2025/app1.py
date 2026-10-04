import os
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO

app = Flask(__name__, static_folder="static", static_url_path="")
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

API_KEY = os.getenv("API_KEY", "ganti-api-key-web")
DEVICE_TOKEN = os.getenv("DEVICE_TOKEN", "ganti-token-raspi")

# State terakhir yang diketahui server + sid koneksi Raspi
state = {"power": "off", "mode": "auto", "raspiOnline": False, "updatedAt": None}
raspi_sid = None


def now():
    return datetime.now(timezone.utc).isoformat()


def broadcast_state():
    # kirim ke semua dashboard (namespace default "/")
    socketio.emit("state", state, namespace="/")


def require_api_key(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if request.headers.get("x-api-key") != API_KEY:
            return jsonify(ok=False, error="unauthorized"), 401
        return f(*args, **kwargs)
    return wrapper


# ---------- Socket.IO: sisi Raspberry Pi (namespace /device) ----------
@socketio.on("connect", namespace="/device")
def device_connect(auth):
    global raspi_sid
    if not auth or auth.get("token") != DEVICE_TOKEN:
        return False  # tolak koneksi
    raspi_sid = request.sid
    state["raspiOnline"] = True
    broadcast_state()
    print("Raspi terhubung:", raspi_sid)


@socketio.on("disconnect", namespace="/device")
def device_disconnect(*args):
    global raspi_sid
    if request.sid == raspi_sid:
        raspi_sid = None
        state["raspiOnline"] = False
        broadcast_state()
        print("Raspi terputus")


@socketio.on("state_report", namespace="/device")
def device_state_report(data):
    # Raspi melapor perubahan (mis. dari sensor otomatis fitur 1)
    state.update(data)
    state["updatedAt"] = now()
    broadcast_state()


# ---------- Socket.IO: sisi dashboard web (namespace /) ----------
@socketio.on("connect")
def dashboard_connect(auth=None):
    socketio.emit("state", state, to=request.sid)


# ---------- Helper: kirim command ke Raspi & tunggu ACK ----------
def send_to_raspi(event, payload, timeout=5):
    if not raspi_sid:
        raise RuntimeError("Raspberry Pi offline")
    # call() = emit + tunggu return value dari handler di Raspi
    return socketio.call(event, payload, to=raspi_sid, namespace="/device", timeout=timeout)


# ---------- HTTP endpoints ----------
@app.get("/api/status")
@require_api_key
def get_status():
    return jsonify(ok=True, state=state)


@app.post("/api/control")
@require_api_key
def control():
    power = (request.get_json(silent=True) or {}).get("power")
    if power not in ("on", "off"):
        return jsonify(ok=False, error="power harus 'on' atau 'off'"), 400
    try:
        ack = send_to_raspi("control", {"power": power, "source": "web"})
    except Exception as e:
        return jsonify(ok=False, error=str(e) or "Raspi tidak merespons"), 503

    state.update(power=ack["power"], mode="manual", updatedAt=now())
    broadcast_state()
    return jsonify(ok=True, state=state)


@app.post("/api/mode")
@require_api_key
def set_mode():
    mode = (request.get_json(silent=True) or {}).get("mode")
    if mode not in ("auto", "manual"):
        return jsonify(ok=False, error="mode harus 'auto' atau 'manual'"), 400
    try:
        send_to_raspi("set_mode", {"mode": mode})
    except Exception as e:
        return jsonify(ok=False, error=str(e) or "Raspi tidak merespons"), 503

    state.update(mode=mode, updatedAt=now())
    broadcast_state()
    return jsonify(ok=True, state=state)


@app.get("/")
def index():
    return app.send_static_file("index.html")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)