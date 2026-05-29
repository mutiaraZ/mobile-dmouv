import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../constants/Colors";

type UserRole = "superuser" | "user";

const AddUserScreen: React.FC = () => {
  const router = useRouter();

  // State for each input field
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [role, setRole] = useState<UserRole>("user");

  // State for error messages
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State for password visibility
  const [isPasswordVisible, setPasswordVisible] = useState<boolean>(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] =
    useState<boolean>(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSave = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    };
    let hasError = false;

    if (!name) {
      newErrors.name = "Fill this field";
      hasError = true;
    }
    if (!email) {
      newErrors.email = "Fill this field";
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address.";
      hasError = true;
    }
    if (!password) {
      newErrors.password = "Fill this field";
      hasError = true;
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
      hasError = true;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Fill this field";
      hasError = true;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      return;
    }

    Alert.alert(
      "Confirm Add Account",
      `Are you sure you want to add this account as a ${role}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            console.log("New user data to send to backend:", {
              name,
              email,
              pass: password,
              role,
            });
            Alert.alert(
              "Account Added",
              `New account for ${name} has been successfully created!`,
              [{ text: "OK", onPress: () => router.back() }]
            );
          },
        },
      ]
    );
  };

  const clearErrorsOnChange = (inputName: string) => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [inputName]: "",
    }));
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="px-5 py-5">
            <Text className="font-poppins-bold text-2xl text-text mb-1 text-center">
              Create New User
            </Text>
            <Text className="font-roboto-regular text-[15px] text-textLight text-center mb-8">
              Enter the details below to create a new account
            </Text>

            <View className="bg-white rounded-2xl p-5 shadow-lg shadow-black/10">
              {/* Name Input */}
              <View className="w-full mb-5">
                <Text className="font-poppins-semibold text-lg text-text mb-2">
                  Full Name
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl bg-gray-50 ${
                    focusedInput === "name"
                      ? "border-primary border-[1.5px] bg-white"
                      : "border-border"
                  } ${!!errors.name ? "border-redDot" : ""}`}
                >
                  <TextInput
                    className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                    style={{ lineHeight: 20 }}
                    placeholder="Enter full name"
                    placeholderTextColor={Colors.textLight}
                    value={name}
                    onChangeText={(text) => {
                      setName(text);
                      clearErrorsOnChange("name");
                    }}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                {errors.name ? (
                  <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                    {errors.name}
                  </Text>
                ) : null}
              </View>

              {/* Email Input */}
              <View className="w-full mb-5">
                <Text className="font-poppins-semibold text-lg text-text mb-2">
                  Email Address
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl bg-gray-50 ${
                    focusedInput === "email"
                      ? "border-primary border-[1.5px] bg-white"
                      : "border-border"
                  } ${!!errors.email ? "border-redDot" : ""}`}
                >
                  <TextInput
                    className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                    style={{ lineHeight: 20 }}
                    placeholder="Enter email address"
                    placeholderTextColor={Colors.textLight}
                    value={email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onChangeText={(text) => {
                      setEmail(text);
                      clearErrorsOnChange("email");
                    }}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
                {errors.email ? (
                  <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                    {errors.email}
                  </Text>
                ) : null}
              </View>

              {/* Password Input */}
              <View className="w-full mb-5">
                <Text className="font-poppins-semibold text-lg text-text mb-2">
                  Password
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl bg-gray-50 ${
                    focusedInput === "password"
                      ? "border-primary border-[1.5px] bg-white"
                      : "border-border"
                  } ${!!errors.password ? "border-redDot" : ""}`}
                >
                  <TextInput
                    className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                    style={{ lineHeight: 20 }}
                    placeholder="Min. 8 characters"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!isPasswordVisible}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      clearErrorsOnChange("password");
                    }}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setPasswordVisible(!isPasswordVisible)}
                    className="p-2.5"
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

              {/* Confirm Password Input */}
              <View className="w-full mb-5">
                <Text className="font-poppins-semibold text-lg text-text mb-2">
                  Confirm Password
                </Text>
                <View
                  className={`flex-row items-center border rounded-xl bg-gray-50 ${
                    focusedInput === "confirmPassword"
                      ? "border-primary border-[1.5px] bg-white"
                      : "border-border"
                  } ${!!errors.confirmPassword ? "border-redDot" : ""}`}
                >
                  <TextInput
                    className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                    style={{ lineHeight: 20 }}
                    placeholder="Re-enter password"
                    placeholderTextColor={Colors.textLight}
                    secureTextEntry={!isConfirmPasswordVisible}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      clearErrorsOnChange("confirmPassword");
                    }}
                    onFocus={() => setFocusedInput("confirmPassword")}
                    onBlur={() => setFocusedInput(null)}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setConfirmPasswordVisible(!isConfirmPasswordVisible)
                    }
                    className="p-2.5"
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

              {/* Role Selection */}
              <View className="w-full mb-2">
                <Text className="font-poppins-semibold text-lg text-text mb-2">
                  Select Role
                </Text>
                <View className="flex-row w-full">
                  <TouchableOpacity
                    className={`flex-1 py-3 border-[1.5px] rounded-xl items-center mx-1 ${
                      role === "user"
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                    onPress={() => setRole("user")}
                  >
                    <Text
                      className={`font-poppins-medium text-base ${
                        role === "user" ? "text-primary" : "text-textLight"
                      }`}
                    >
                      User
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 border-[1.5px] rounded-xl items-center mx-1 ${
                      role === "superuser"
                        ? "border-primary bg-primary/10"
                        : "border-border"
                    }`}
                    onPress={() => setRole("superuser")}
                  >
                    <Text
                      className={`font-poppins-medium text-base ${
                        role === "superuser" ? "text-primary" : "text-textLight"
                      }`}
                    >
                      Superuser
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        <View className="p-5 bg-background">
          <TouchableOpacity
            className="bg-primary py-4 rounded-full items-center shadow-md shadow-black/10"
            onPress={handleSave}
          >
            <Text className="text-white text-lg font-poppins-semibold">
              Add Account
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AddUserScreen;
