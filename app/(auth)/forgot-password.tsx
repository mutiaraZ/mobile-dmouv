import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import FullLogo from "../../assets/images/fulldmouv.svg";
import { Colors } from "../../constants/Colors";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();

  const [errors, setErrors] = useState({
    email: "",
    newPassword: "",
    confirmPassword: "",
  });

  const validateFields = () => {
    const newErrors = { email: "", newPassword: "", confirmPassword: "" };
    let isValid = true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Fill this field";
      isValid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }

    if (!newPassword) {
      newErrors.newPassword = "Fill this field";
      isValid = false;
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters";
      isValid = false;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Fill this field";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleResetPassword = () => {
    if (!validateFields()) {
      return;
    }

    console.log("Resetting password for:", { email, newPassword });
    router.push("/(auth)/login");
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
            Reset Your Password
          </Text>
          <Text className="font-poppins-extralight text-base text-primary text-center mt-2">
            Enter your email and a new password
          </Text>
        </View>

        <View className="bg-cardgray rounded-2xl p-6 shadow-lg shadow-black/25">
          {/* Email Input */}
          <View className="mb-5">
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
              placeholder="Enter your registered email"
              placeholderTextColor={Colors.textLight}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedInput("email")}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.email ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.email}
              </Text>
            ) : null}
          </View>

          {/* New Password Input */}
          <View className="mb-5">
            <Text className="font-poppins-semibold text-lg text-primary mb-2">
              New Password
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-white shadow-sm ${
                focusedInput === "newPassword"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.newPassword ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 px-4 h-12 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="Minimum 8 characters"
                placeholderTextColor={Colors.textLight}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!isPasswordVisible}
                onFocus={() => setFocusedInput("newPassword")}
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
            {errors.newPassword ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.newPassword}
              </Text>
            ) : null}
          </View>

          {/* Confirm New Password Input */}
          <View className="mb-5">
            <Text className="font-poppins-semibold text-lg text-primary mb-2">
              Confirm New Password
            </Text>
            <View
              className={`flex-row items-center border rounded-xl bg-white shadow-sm ${
                focusedInput === "confirmPassword"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.confirmPassword ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 px-4 h-12 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="Repeat new password"
                placeholderTextColor={Colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                onFocus={() => setFocusedInput("confirmPassword")}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() =>
                  setIsConfirmPasswordVisible(!isConfirmPasswordVisible)
                }
                className="px-2.5"
              >
                <Ionicons
                  name={isConfirmPasswordVisible ? "eye-off" : "eye"}
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
            {errors.confirmPassword ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.confirmPassword}
              </Text>
            ) : null}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-2xl items-center mt-2.5"
            onPress={handleResetPassword}
          >
            <Text className="font-poppins-semibold text-lg text-white">
              Reset Password
            </Text>
          </TouchableOpacity>

          <View className="mt-8 items-center">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="font-roboto-regular text-base text-primary">
                Back to Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
