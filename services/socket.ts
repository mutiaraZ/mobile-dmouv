import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://192.168.246.17:8001";

class SocketService {
  private socket: Socket | null = null;

  // ============================================
  // CONNECT
  // ============================================
  connect() {
    if (this.socket?.connected) {
      console.log("Socket already connected");
      return;
    }

    this.socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    this.socket.on("connect", () => {
      console.log("================================");
      console.log("CONNECTED TO ML SERVER");
      console.log("Socket ID:", this.socket?.id);
      console.log("================================");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("================================");
      console.log("DISCONNECTED");
      console.log("Reason:", reason);
      console.log("================================");
    });

    this.socket.on("connect_error", (err) => {
      console.log("================================");
      console.log("CONNECTION ERROR");
      console.log(err.message);
      console.log("================================");
    });
  }

  // ============================================
  // DISCONNECT
  // ============================================
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // ============================================
  // SEND PING
  // ============================================
  ping() {
    this.socket?.emit("ping", {
      timestamp: Date.now(),
    });
  }

  // ============================================
  // LISTEN PONG
  // ============================================
  onPong(callback: (data: any) => void) {
    this.socket?.on("pong", callback);
  }

  // ============================================
  // SEND IMAGE TO ML SERVER
  // ============================================
  verifyImage(base64Image: string) {
    this.socket?.emit("verify", {
      image_b64: base64Image,
    });
  }

  // ============================================
  // LISTEN VERIFY RESULT
  // ============================================
  onVerifyResult(callback: (data: any) => void) {
    this.socket?.on("verify_result", callback);
  }

  // ============================================
  // BROADCAST
  // ============================================
  broadcast(payload: any) {
    this.socket?.emit("broadcast", payload);
  }

  // ============================================
  // LISTEN BROADCAST
  // ============================================
  onBroadcast(callback: (data: any) => void) {
    this.socket?.on("broadcast", callback);
  }

  // ============================================
  // REMOVE ALL LISTENER
  // ============================================
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }

  // ============================================
  // GET SOCKET
  // ============================================
  getSocket() {
    return this.socket;
  }

  // ============================================
  // STATUS
  // ============================================
  isConnected() {
    return this.socket?.connected ?? false;
  }
}

const socketService = new SocketService();

export default socketService;