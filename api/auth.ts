import AsyncStorage from "@react-native-async-storage/async-storage";
import { BACKEND_URL } from "./config";

// ===============================
// TIPE DATA
// ===============================
export type UserRole = "superuser" | "user";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
};

// ===============================
// LOGIN KE BACKEND FLASK
// ===============================
export const login = async (
  email: string,
  password: string
): Promise<User | null> => {
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      console.log("Login failed:", data);
      return null;
    }

    const user: User = {
      id: data.user.id,
      name: data.user.email.split("@")[0],
      email: data.user.email,
      role: data.user.role as UserRole,
      token: data.token,
    };

    return user;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
};

// ===============================
// SIMPAN USER SESSION
// ===============================
export const storeUserSession = async (token: string, role: string) => {
  try {
    await AsyncStorage.multiSet([
      ["token", token],
      ["role", role],
    ]);
    console.log("Session saved:", { role });
  } catch (e) {
    console.error("Failed to save user session", e);
  }
};

// ===============================
// HAPUS SESSION
// ===============================
export const clearUserSession = async () => {
  try {
    await AsyncStorage.multiRemove(["token", "role", "user_id", "email"]);
  } catch (e) {
    console.error("Failed to clear user session", e);
  }
};

// ===============================
// CEK USER MASIH LOGIN
// ===============================
export const isLoggedIn = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem("token");
  return token !== null;
};