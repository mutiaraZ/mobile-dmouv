import base64
import json
import cv2
import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket
import uvicorn

# ============================================
# CONFIG
# ============================================
FLASK_SERVER_URL = "http://10.199.74.17:8001/verify"
SOCKET_SERVER_URL = "http://10.199.74.17:8001"

app = FastAPI()

# Allow all CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Socket.IO client
sio = socketio.Client()

# ============================================
# CONNECT SOCKET.IO
# ============================================
@sio.event
def connect():
    print("[SocketIO] Connected to ML server")

@sio.event
def disconnect():
    print("[SocketIO] Disconnected from server")

@sio.on("verify_result")
def handle_verify_result(data):
    print("[Realtime Result]:", data)


def start_socket():
    try:
        sio.connect(SOCKET_SERVER_URL)
    except Exception as e:
        print("[SocketIO ERROR]", str(e))


start_socket()

# ============================================
# CONVERT FRAME / IMAGE -> BASE64
# ============================================
def encode_frame_to_b64(frame):
    _, buffer = cv2.imencode(".jpg", frame)
    img_b64 = base64.b64encode(buffer).decode("utf-8")
    return img_b64


# ============================================
# ROUTE: VERIFY (HTTP)
# ============================================
@app.post("/verify")
async def http_verify(payload: dict):
    """
    Client send:
    {
        "image_b64": "...",
        "client_id": "android123"
    }
    """

    import requests
    try:
        result = requests.post(FLASK_SERVER_URL, json=payload)
        return result.json()
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}


# ============================================
# WEBSOCKET RELAY UNTUK MOBILE/FRONTEND (Realtime)
# ============================================
@app.websocket("/ws/verify")
async def websocket_verify(ws: WebSocket):
    await ws.accept()
    print("[WS] Client connected")

    try:
        while True:
            data = await ws.receive_json()
            image_b64 = data.get("image_b64")

            sio.emit("verify", {"image_b64": image_b64})

            @sio.on("verify_result")
            def forward_to_client(result):
                try:
                    ws.send_json(result)
                except:
                    pass

    except Exception as e:
        print("[WS ERROR]", str(e))
        await ws.close()


# ============================================
# RUN
# ============================================
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=9001,
        reload=False
    )