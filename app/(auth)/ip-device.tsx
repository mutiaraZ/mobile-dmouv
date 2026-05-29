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

export default function IpDeviceScreen() {
  const [ipAddress, setIpAddress] = useState("");
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const router = useRouter();
  const [errors, setErrors] = useState({
    ipAddress: "",
    ssid: "",
    password: "",
  });

  const validateFields = () => {
    const newErrors = { ipAddress: "", ssid: "", password: "" };
    let isValid = true;

    if (!ipAddress) {
      newErrors.ipAddress = "Fill this field";
      isValid = false;
    }
    if (!ssid) {
      newErrors.ssid = "Fill this field";
      isValid = false;
    }
    if (!password) {
      newErrors.password = "Fill this field";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleConnect = () => {
    if (!validateFields()) {
      return;
    }
    console.log("Connecting with:", { ipAddress, ssid, password });
    router.push("/(tabs)/home");
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
              textShadowColor: "rgba(0, 0, 0, 0.4)",
              textShadowOffset: { width: 1.5, height: 1.5 },
              textShadowRadius: 2,
            }}
          >
            Enter your IP Device and SSID
          </Text>
          <Text className="font-poppins-extralight text-base text-primary text-center mt-2">
            Please provide your device&apos;s IP and Wifi SSID to keep you
            connected
          </Text>
        </View>

        <View className="bg-cardgray rounded-2xl p-6 shadow-lg shadow-black/25">
          {/* IP Device Input */}
          <View className="mb-5">
            <Text className="font-poppins-semibold text-lg text-primary mb-2">
              IP Device
            </Text>
            <TextInput
              className={`border rounded-xl px-4 h-12 text-base font-roboto-regular text-text bg-white shadow-sm ${
                focusedInput === "ip"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.ipAddress ? "border-redDot" : ""}`}
              style={{ lineHeight: 20 }} // biar teks tidak kepotong
              placeholder="Enter Your IP Device"
              placeholderTextColor={Colors.textLight}
              value={ipAddress}
              onChangeText={setIpAddress}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              onFocus={() => setFocusedInput("ip")}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.ipAddress ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.ipAddress}
              </Text>
            ) : null}
          </View>

          {/* SSID Input */}
          <View className="mb-5">
            <View className="flex-row justify-between mb-2">
              <Text className="font-poppins-semibold text-lg text-primary">
                SSID
              </Text>
              <Text className="font-roboto-regular text-base text-textLight">
                WI-FI ID
              </Text>
            </View>
            <TextInput
              className={`border rounded-xl px-4 h-12 text-base font-roboto-regular text-text bg-white shadow-sm ${
                focusedInput === "ssid"
                  ? "border-primary border-2"
                  : "border-border"
              } ${!!errors.ssid ? "border-redDot" : ""}`}
              style={{ lineHeight: 20 }}
              placeholder="SSID Name"
              placeholderTextColor={Colors.textLight}
              value={ssid}
              onChangeText={setSsid}
              autoCapitalize="none"
              onFocus={() => setFocusedInput("ssid")}
              onBlur={() => setFocusedInput(null)}
            />
            {errors.ssid ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.ssid}
              </Text>
            ) : null}
          </View>

          {/* Password Input */}
          <View className="mb-5">
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
                placeholderTextColor={Colors.textLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!isPasswordVisible}
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

          {/* Connect Button */}
          <TouchableOpacity
            className="bg-primary py-4 rounded-2xl items-center mt-2.5"
            onPress={handleConnect}
          >
            <Text className="font-poppins-bold text-lg text-white">
              Connect
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
