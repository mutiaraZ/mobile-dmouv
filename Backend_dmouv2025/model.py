"""
model.py - Inference YOLO11n-pose (NCNN) + generator perintah perangkat.

Dua bagian yang sengaja dipisah:
  PoseModel         gambar -> hasil deteksi (butuh paket `ncnn`, jalan di Raspi)
  CommandGenerator  hasil deteksi -> perintah ON/OFF lampu/kipas (Python murni,
                    bisa dites di laptop tanpa ncnn)
"""
import base64
import math
import os
import time

import cv2
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CONF_THRESHOLD = float(os.getenv("CONF_THRESHOLD", "0.5"))
NMS_THRESHOLD = float(os.getenv("NMS_THRESHOLD", "0.45"))
INPUT_SIZE = int(os.getenv("INPUT_SIZE", "640"))
NCNN_THREADS = int(os.getenv("NCNN_THREADS", "4"))


def decode_base64_image(image_b64):
    if not image_b64:
        raise ValueError("image_b64 kosong")
    # buang prefix data URL kalau ada ("data:image/jpeg;base64,...")
    if "," in image_b64[:64]:
        image_b64 = image_b64.split(",", 1)[1]
    arr = np.frombuffer(base64.b64decode(image_b64), dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Gagal decode gambar")
    return img


# ======================================================
# 1. DETEKSI POSE
# ======================================================
class PoseModel:
    def __init__(self, param_path=None, bin_path=None):
        import ncnn  # import di sini supaya CommandGenerator bisa dipakai tanpa ncnn

        self._ncnn = ncnn
        self.net = ncnn.Net()
        self.net.opt.num_threads = NCNN_THREADS
        self.net.load_param(param_path or os.path.join(BASE_DIR, "model.ncnn.param"))
        self.net.load_model(bin_path or os.path.join(BASE_DIR, "model.ncnn.bin"))

    def detect(self, img):
        """img: numpy BGR (hasil cv2). Return dict hasil deteksi."""
        ncnn = self._ncnn
        h, w = img.shape[:2]

        resized = cv2.resize(img, (INPUT_SIZE, INPUT_SIZE))
        mat_in = ncnn.Mat.from_pixels(
            resized, ncnn.Mat.PixelType.PIXEL_BGR, INPUT_SIZE, INPUT_SIZE
        )
        mat_in.substract_mean_normalize([], [1 / 255.0] * 3)

        with self.net.create_extractor() as ex:
            ex.input("in0", mat_in)
            ret, out0 = ex.extract("out0")

        if ret != 0:
            return {"status": "ERROR", "message": "YOLO pose extraction failed"}

        output = np.array(out0).T
        boxes, confs, kps = [], [], []

        for det in output:
            x, y, bw, bh = det[0:4]
            conf = det[4]
            if conf < CONF_THRESHOLD:
                continue

            boxes.append([
                int((x - bw / 2) * w / INPUT_SIZE),
                int((y - bh / 2) * h / INPUT_SIZE),
                int(bw * w / INPUT_SIZE),
                int(bh * h / INPUT_SIZE),
            ])
            confs.append(float(conf))

            kp_raw = det[5:]
            kps.append([
                [int(kp_raw[i] * w / INPUT_SIZE),
                 int(kp_raw[i + 1] * h / INPUT_SIZE),
                 float(kp_raw[i + 2])]
                for i in range(0, len(kp_raw), 3)
            ])

        people = []
        if boxes:
            idxs = cv2.dnn.NMSBoxes(boxes, confs, CONF_THRESHOLD, NMS_THRESHOLD)
            for idx in np.array(idxs).flatten():
                x1, y1, bw, bh = boxes[idx]
                people.append({
                    "bbox": [float(x1), float(y1), float(x1 + bw), float(y1 + bh)],
                    "conf": confs[idx],
                    "keypoints": kps[idx],
                })

        return {
            "status": "OK",
            "pose_detected": len(people) > 0,
            "total_person": len(people),
            "image_width": w,
            "image_height": h,
            "boxes": [p["bbox"] for p in people],
            "data": people,
        }


# ======================================================
# 2. GENERATOR PERINTAH
# ======================================================
class CommandGenerator:
    """
    Mengubah hasil deteksi (datang tiap frame dari websocket / kamera) menjadi
    perintah ON/OFF per perangkat.

    Aturan mode AUTO:
      - ON  : orang terdeteksi di `on_confirm_frames` frame berturut-turut
              (menahan false positive satu frame).
      - OFF : tidak ada orang TERKONFIRMASI selama `off_delay_sec` detik.
              Deteksi 1 frame (false positive) tidak lagi mereset timer OFF.
      - tick() mengevaluasi timeout OFF secara berkala, jadi perangkat tetap
        mati walau frame berhenti masuk (kamera error, koneksi putus).
      - Perintah hanya dikeluarkan kalau status berubah, bukan tiap frame.

    Mode MANUAL: perangkat tidak disentuh oleh deteksi; hanya berubah lewat manual().
    Status awal None = belum diketahui, jadi keputusan auto pertama selalu dikirim.
    Pindah ke mode AUTO langsung mengeksekusi keputusan saat itu juga.
    """

    def __init__(self, devices=("lamp", "fan"), on_confirm_frames=3,
                 off_delay_sec=10.0, clock=time.monotonic):
        self.on_confirm_frames = max(1, int(on_confirm_frames))
        self.off_delay_sec = float(off_delay_sec)
        self._clock = clock
        self._started = clock()
        self._hits = 0
        self._person = False      # True hanya kalau sudah terkonfirmasi
        self._last_seen = None    # terakhir kali orang TERKONFIRMASI
        self.devices = {d: {"mode": "auto", "state": None} for d in devices}

    # ---------- helpers ----------
    def _targets(self, device):
        if device == "all":
            return list(self.devices)
        if device not in self.devices:
            raise ValueError(f"device tidak dikenal: {device!r}")
        return [device]

    def _set(self, device, command, reason):
        self.devices[device]["state"] = command
        return {
            "device": device,
            "command": command,
            "reason": reason,
            "mode": self.devices[device]["mode"],
            "timestamp": time.time(),
        }

    def _idle_for(self, now):
        """Sudah berapa detik tidak ada orang terkonfirmasi."""
        ref = self._last_seen if self._last_seen is not None else self._started
        return now - ref

    def _auto_commands(self, now):
        """Keputusan auto saat ini -> perintah untuk perangkat auto yang belum sesuai."""
        if self._person:
            want, reason = "ON", "person_detected"
        elif self._idle_for(now) >= self.off_delay_sec:
            want, reason = "OFF", "no_person_timeout"
        else:
            return []
        return [
            self._set(name, want, reason)
            for name, dev in self.devices.items()
            if dev["mode"] == "auto" and dev["state"] != want
        ]

    def _off_in(self, dev, now):
        """Sisa detik sebelum perangkat auto dimatikan (None kalau tidak relevan)."""
        if dev["mode"] != "auto" or dev["state"] != "ON" or self._person:
            return None
        return max(0, math.ceil(self.off_delay_sec - self._idle_for(now)))

    # ---------- dipanggil tiap hasil deteksi ----------
    def update(self, detection):
        """Return list perintah yang perlu dikirim (bisa kosong)."""
        if not detection or detection.get("status") != "OK":
            return self.tick()

        now = self._clock()
        if detection.get("total_person", 0) > 0:
            self._hits += 1
        else:
            self._hits = 0

        self._person = self._hits >= self.on_confirm_frames
        if self._person:
            self._last_seen = now
        return self._auto_commands(now)

    def tick(self):
        """Dipanggil berkala (~1 detik) supaya timeout OFF jalan walau frame berhenti."""
        return self._auto_commands(self._clock())

    # ---------- dari tombol di app ----------
    def set_mode(self, device, mode):
        """
        Return list perintah. Kalau pindah ke auto, keputusan saat ini
        (ON/OFF sesuai kondisi orang) langsung dieksekusi.
        """
        if mode not in ("auto", "manual"):
            raise ValueError(f"mode harus 'auto' atau 'manual', bukan {mode!r}")
        for name in self._targets(device):
            self.devices[name]["mode"] = mode
            if mode == "auto":
                self.devices[name]["state"] = None  # paksa sinkron dengan kondisi sebenarnya
        return self._auto_commands(self._clock()) if mode == "auto" else []

    def manual(self, device, command):
        command = str(command).upper()
        if command not in ("ON", "OFF"):
            raise ValueError(f"command harus 'ON' atau 'OFF', bukan {command!r}")
        cmds = []
        for name in self._targets(device):
            self.devices[name]["mode"] = "manual"
            cmds.append(self._set(name, command, "manual"))  # selalu kirim, walau state sama
        return cmds

    def snapshot(self):
        now = self._clock()
        devices = {}
        for name, dev in self.devices.items():
            info = dict(dev)
            info["off_in_sec"] = self._off_in(dev, now)
            devices[name] = info
        return {"person_detected": self._person, "devices": devices}