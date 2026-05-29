import React, { useEffect, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";
import { updatePersonStatus } from "../api/api";

export default function CameraStream() {
  if (Platform.OS === "web") {
    return <WebCameraStream />;
  }

  const { WebView } = require("react-native-webview");
  return (
    <WebView
      source={{ uri: "http://192.168.246.17/stream" }}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      startInLoadingState={true}
      style={{ flex: 1 }}
      renderLoading={() => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
          <Text style={{ color: "#fff" }}>Loading Camera...</Text>
        </View>
      )}
    />
  );
}

function WebCameraStream() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const [status, setStatus] = useState<"NO PERSON" | "PERSON IDLE" | "MOTION DETECTED">("NO PERSON");
  const [personCount, setPersonCount] = useState(0);
  const detectionRef = useRef<any>(null);

  const initSocket = () => {
    // @ts-ignore
    const socket = window.io("http://192.168.246.17:8001", {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[SocketIO] Connected!", socket.id);
    });

    socket.on("detection_result", (data: any) => {
      console.log("[Detection]", data);
      if (data.status === "OK") {
        detectionRef.current = data.data;
        setPersonCount(data.total_person);
        setStatus(data.total_person === 0 ? "NO PERSON" : "PERSON IDLE");
        updatePersonStatus(data.total_person > 0 ? "detected" : "not-detected");
      }
    });

    socket.on("connect_error", (err: any) => {
      console.error("[SocketIO] connect error:", err);
    });
  };

  useEffect(() => {
    if ((window as any).io) {
      initSocket();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.6.0/socket.io.min.js";
    script.crossOrigin = "anonymous";
    script.onload = () => initSocket();
    script.onerror = () => console.error("[SocketIO] Gagal load script");
    document.head.appendChild(script);

    return () => {
      socketRef.current?.disconnect?.();
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => {
        console.error("[Camera] getUserMedia error:", err);
      });

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const processFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const detections = detectionRef.current;
    if (detections && detections.length > 0) {
      const scaleX = canvas.width / 320;
      const scaleY = canvas.height / 240;

      detections.forEach((det: any) => {
        const x1 = det.bbox[0] * scaleX;
        const y1 = det.bbox[1] * scaleY;
        const x2 = det.bbox[2] * scaleX;
        const y2 = det.bbox[3] * scaleY;

        // Bounding box
        ctx.strokeStyle = "#FF0000";
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Label
        ctx.fillStyle = "#FF0000";
        ctx.font = "bold 16px Arial";
        ctx.fillText("Person", x1, y1 > 20 ? y1 - 5 : y1 + 15);
      });
    }

    if (Math.random() < 0.2) {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 320;
      tempCanvas.height = 240;
      const tempCtx = tempCanvas.getContext("2d");
      tempCtx?.drawImage(video, 0, 0, 320, 240);
      const b64 = tempCanvas.toDataURL("image/jpeg", 0.5).split(",")[1];
      if (socketRef.current?.connected) {
        socketRef.current.emit("frame", { image_b64: b64 });
      } else {
        console.warn("[Frame] Socket not connected yet");
      }
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  };

  const handleVideoPlay = () => {
    animFrameRef.current = requestAnimationFrame(processFrame);
  };

  const statusColor =
    status === "MOTION DETECTED" ? "#FF0000" :
    status === "PERSON IDLE" ? "#FFFF00" : "#00FF00";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", backgroundColor: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        onPlay={handleVideoPlay}
        style={{ display: "none" }}
      />
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      <div style={{
        position: "absolute",
        top: 12,
        left: 12,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 8,
        padding: "4px 10px",
      }}>
        <span style={{ color: statusColor, fontWeight: "bold", fontSize: 14 }}>
          ● {status}
        </span>
      </div>

      <div style={{
        position: "absolute",
        top: 12,
        right: 12,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 8,
        padding: "4px 10px",
      }}>
        <span style={{ color: "#fff", fontSize: 14 }}>
          👤 {personCount} person
        </span>
      </div>
    </div>
  );
}