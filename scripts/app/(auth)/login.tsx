import { Ionicons } from "@expo/vector-icons";
import Checkbox from "expo-checkbox";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login, storeUserSession } from "../../api/auth";
import FullLogo from "../../assets/images/fulldmouv.svg";
import { Colors } from "../../constants/Colors";

// --- VALIDATION FUNCTIONS ---
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    return "Fill this field";
  }
  if (!emailRegex.test(email)) {
    return "Please enter a valid email address";
  }
  return "";
};
const validatePassword = (password: string) => {
  if (!password) {
    return "Fill this field";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters";
  }
  return "";
};

// --- MAIN COMPONENT ---
export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [loginError, setLoginError] = useState("");

  const clearErrorsOnChange = () => {
    setLoginError("");
    if (errors.email || errors.password) {
      setErrors({ email: "", password: "" });
    }
  };

  const handleLogin = async () => {
    setLoginError("");

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError || passwordError) {
      setErrors({
        email: emailError,
        password: passwordError,
      });
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email, password);

      console.log("LOGIN RESPONSE:", user);

      if (user) {
        await storeUserSession(user.token, user.role);

        console.log(`Login successful as: ${user.role}`);
        
        if (user.role === "superuser") {
          router.replace("/(auth)/ip-device");
        } else {
          router.replace("/(tabs)/home");
        }
      } else {
        setLoginError("Invalid email or password. Please try again.");
      }
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      setLoginError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 justify-center p-5"
      >
        <View className="items-center mb-8">
          <FullLogo width={280} height={60} className="mb-5" />
          <Text
            className="font-poppins-medium text-2xl text-primary text-center mt-2"
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.3)",
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Welcome to D&apos;mouv
          </Text>
          <Text className="font-poppins-extralight text-base text-primary text-center mt-2">
            {"Your smart way to sense, react,\nand save energy"}
          </Text>
        </View>

        <View className="bg-cardgray rounded-2xl p-6 shadow-lg shadow-black/25">
          {/* Email Input */}
          <View className="mb-4">
            <Text className="font-poppins-semibold text-lg text-primary mb-2">
              Email
            </Text>
            <TextInput
              className={`border rounded-xl px-4 h-12 text-base font-roboto-regular text-text bg-white shadow-sm ${
                focusedInput === "email"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.email ? "border-redDot" : ""}`}
              style={{ lineHeight: 20 }}
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                clearErrorsOnChange();
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.textLight}
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.email ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="font-poppins-semibold text-lg text-primary mb-2">
              Password
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-white shadow-sm ${
                focusedInput === "password"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.password ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 px-4 h-12 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="Password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  clearErrorsOnChange();
                }}
                secureTextEntry={!isPasswordVisible}
                placeholderTextColor={Colors.textLight}
                onFocus={() => setFocusedInput("password")}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                className="px-2.5"
              >
                <Ionicons
                  name={isPasswordVisible ? "eye-off" : "eye"}
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
            {errors.password ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.password}
              </Text>
            ) : null}
          </View>

          {/* Options Container */}
          <View className="flex-row justify-between items-center mb-8">
            <View className="flex-row items-center">
              <Checkbox
                className="mr-2"
                value={rememberMe}
                onValueChange={setRememberMe}
                color={rememberMe ? Colors.primary : undefined}
              />
              <Text className="font-roboto-regular text-x text-textLight">
                Keep me Signed in
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text className="font-roboto-regular text-x text-primary">
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            className={`py-4 rounded-2xl items-center ${
              isLoading ? "bg-primary/70" : "bg-primary"
            }`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text className="font-poppins-semibold text-lg text-white">
                Sign In
              </Text>
            )}
          </TouchableOpacity>
          {loginError ? (
            <Text className="text-redDot font-roboto-medium text-sm text-center mt-4">
              {loginError}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
