import React, { useEffect, useRef, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { io, Socket } from "socket.io-client";

// GANTI sesuai IP laptop yang menjalankan server.py (backend Flask)
const BACKEND_URL = "http://10.199.74.17:8001";

type Box = [number, number, number, number]; // x1, y1, x2, y2 (pixel di gambar asli)

type CameraFramePayload = {
  client_id: string;
  image_b64: string;
  pose_detected: boolean;
  total_person: number;
  boxes: Box[];
  image_width: number;
  image_height: number;
};

export default function CameraStream() {
  const socketRef = useRef<Socket | null>(null);
  const [frame, setFrame] = useState<CameraFramePayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const socket = io(BACKEND_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 999,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[CameraStream] Terhubung ke backend");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[CameraStream] Terputus dari backend");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("[CameraStream] Connect error:", err.message);
      setIsConnected(false);
    });

    // Ini event utama: tiap Raspi kirim frame ke backend, backend broadcast ke sini
    socket.on("camera_frame", (data: CameraFramePayload) => {
      setFrame(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleLayout = (e: any) => {
    const { width, height } = e.nativeEvent.layout;
    setDisplaySize({ width, height });
  };

  if (!frame) {
    return (
      <View style={styles.container} onLayout={handleLayout}>
        <Text style={styles.statusText}>
          {isConnected ? "Menunggu frame dari kamera..." : "Menghubungkan ke backend..."}
        </Text>
      </View>
    );
  }

  // Skala bounding box dari ukuran gambar asli ke ukuran tampilan di layar
  const scaleX = displaySize.width / (frame.image_width || 1);
  const scaleY = displaySize.height / (frame.image_height || 1);

  return (
    <View style={styles.container} onLayout={handleLayout}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${frame.image_b64}` }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />

      {frame.boxes.map((box, index) => {
        const [x1, y1, x2, y2] = box;
        return (
          <View
            key={index}
            style={[
              styles.boundingBox,
              {
                left: x1 * scaleX,
                top: y1 * scaleY,
                width: (x2 - x1) * scaleX,
                height: (y2 - y1) * scaleY,
              },
            ]}
          >
            <Text style={styles.boxLabel}>Person</Text>
          </View>
        );
      })}

      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, { color: frame.pose_detected ? "#FF0000" : "#00FF00" }]}>
          ● {frame.pose_detected ? "MOTION DETECTED" : "NO PERSON"}
        </Text>
      </View>

      <View style={styles.countBadge}>
        <Text style={styles.countText}>{frame.total_person} person</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  boundingBox: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#FF0000",
  },
  boxLabel: {
    position: "absolute",
    top: -20,
    left: 0,
    color: "#FF0000",
    fontWeight: "bold",
    fontSize: 12,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  countText: {
    color: "#fff",
    fontSize: 14,
  },
  statusText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
