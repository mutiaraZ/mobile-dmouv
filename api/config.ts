// Hanya variabel berawalan EXPO_PUBLIC_ yang ikut ter-bundle di Expo.
// Tambahkan di .env:
//   EXPO_PUBLIC_BACKEND_HOST=192.168.x.x
//   EXPO_PUBLIC_BACKEND_PORT=8001
//   EXPO_PUBLIC_API_TOKEN=            (samakan dengan WS_AUTH_TOKEN di backend; kosongkan jika backend tanpa auth)
const HOST = process.env.EXPO_PUBLIC_BACKEND_HOST ?? "127.0.0.1";
const PORT = process.env.EXPO_PUBLIC_BACKEND_PORT ?? "8001";

export const BACKEND_URL = `http://${HOST}:${PORT}`;
export const API_TOKEN = process.env.EXPO_PUBLIC_API_TOKEN ?? "";
