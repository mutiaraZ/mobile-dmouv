import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (passwords: { current: string; new: string }) => void;
};

export const ChangePasswordModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isCurrentPasswordVisible, setCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleSave = () => {
    const newErrors = {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };
    let hasError = false;

    if (!currentPassword) {
      newErrors.currentPassword = "Fill this field";
      hasError = true;
    }
    if (!newPassword) {
      newErrors.newPassword = "Fill this field";
      hasError = true;
    } else if (newPassword.length < 8) {
      newErrors.newPassword =
        "New password must be at least 8 characters long.";
      hasError = true;
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Fill this field";
      hasError = true;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "New passwords do not match.";
      hasError = true;
    }
    if (newPassword && currentPassword === newPassword) {
      newErrors.newPassword =
        "New password cannot be the same as the current one.";
      hasError = true;
    }

    setErrors(newErrors);

    if (hasError) {
      return;
    }

    Alert.alert(
      "Confirm Change",
      "Are you sure you want to change your password?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes",
          onPress: () => {
            onSubmit({ current: currentPassword, new: newPassword });
            handleCloseModal();
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPasswordVisible(false);
    setNewPasswordVisible(false);
    setConfirmPasswordVisible(false);
    setFocusedInput(null);
    setErrors({ currentPassword: "", newPassword: "", confirmPassword: "" });
    onClose();
  };

  const clearErrorsOnChange = (inputName: string) => {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [inputName]: "",
    }));
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCloseModal}
    >
      <View className="flex-1 justify-center items-center bg-black/60">
        <View className="bg-white rounded-2xl p-6 w-[90%] items-center shadow-lg shadow-black/25">
          <Text className="font-poppins-bold text-2xl mb-6 text-primary">
            Change Password
          </Text>

          {/* Current Password Input */}
          <View className="w-full mb-4">
            <View
              className={`w-full flex-row items-center border rounded-xl bg-white ${
                focusedInput === "currentPassword"
                  ? "border-primary border-[1.5px]"
                  : "border-border"
              } ${!!errors.currentPassword ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="Current Password"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!isCurrentPasswordVisible}
                value={currentPassword}
                onChangeText={(text) => {
                  setCurrentPassword(text);
                  clearErrorsOnChange("currentPassword");
                }}
                onFocus={() => setFocusedInput("currentPassword")}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() =>
                  setCurrentPasswordVisible(!isCurrentPasswordVisible)
                }
                className="p-2.5"
              >
                <Ionicons
                  name={isCurrentPasswordVisible ? "eye-off" : "eye"}
                  size={24}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </View>
            {errors.currentPassword ? (
              <Text className="text-redDot font-roboto-regular text-xs mt-1 pl-1">
                {errors.currentPassword}
              </Text>
            ) : null}
          </View>

          {/* New Password Input */}
          <View className="w-full mb-4">
            <View
              className={`w-full flex-row items-center border rounded-xl bg-white ${
                focusedInput === "newPassword"
                  ? "border-primary border-[1.5px]"
                  : "border-border"
              } ${!!errors.newPassword ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="New Password (min. 8 characters)"
                placeholderTextColor={Colors.textLight}
                secureTextEntry={!isNewPasswordVisible}
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  clearErrorsOnChange("newPassword");
                }}
                onFocus={() => setFocusedInput("newPassword")}
                onBlur={() => setFocusedInput(null)}
              />
              <TouchableOpacity
                onPress={() => setNewPasswordVisible(!isNewPasswordVisible)}
                className="p-2.5"
              >
                <Ionicons
                  name={isNewPasswordVisible ? "eye-off" : "eye"}
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
          <View className="w-full mb-4">
            <View
              className={`w-full flex-row items-center border rounded-xl bg-white ${
                focusedInput === "confirmPassword"
                  ? "border-primary border-[1.5px]"
                  : "border-border"
              } ${!!errors.confirmPassword ? "border-redDot" : ""}`}
            >
              <TextInput
                className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
                style={{ lineHeight: 20 }}
                placeholder="Confirm New Password"
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

          {/* Tombol Aksi */}
          <View className="flex-row justify-between w-full mt-4">
            <TouchableOpacity
              className="flex-1 bg-border py-4 rounded-2xl items-center mr-1.5"
              onPress={handleCloseModal}
            >
              <Text className="text-text text-lg font-poppins-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary py-4 rounded-2xl items-center ml-1.5"
              onPress={handleSave}
            >
              <Text className="text-white text-lg font-poppins-semibold">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
