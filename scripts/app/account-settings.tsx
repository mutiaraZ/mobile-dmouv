import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserRole } from "../api/auth";
import AboutAppModal from "../components/modal/about-app";
import { ChangeNameModal } from "../components/modal/ChangeNameModal";
import { ChangePasswordModal } from "../components/modal/ChangePasswordModal";
import { Colors } from "../constants/Colors";

const initialUserData = {
  name: "TimRisetCPS",
  email: "TimRisetCPS@gmail.com",
  profilePicture: require("../assets/images/pp.svg"),
};

const AccountSettingsScreen: React.FC = () => {
  const router = useRouter();
  const [userName, setUserName] = useState<string>(initialUserData.name);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Modal visibility states
  const [isPasswordModalVisible, setPasswordModalVisible] =
    useState<boolean>(false);
  const [isAboutAppModalVisible, setAboutAppModalVisible] =
    useState<boolean>(false);
  const [isNameModalVisible, setNameModalVisible] = useState<boolean>(false);

  const insets = useSafeAreaInsets();

  useEffect(() => {
    try {
      const role = localStorage.getItem("role") as UserRole | null;
      setUserRole(role);
    } catch (e) {
      console.error("Failed to fetch user role", e);
    }
  }, []);

  const handleLogout = () => {
    console.log("LOGOUT CLICKED");

    console.log("BEFORE:", localStorage.getItem("token"));

    localStorage.clear();

    console.log("AFTER:", localStorage.getItem("token"));

    router.replace("/(auth)/login");
  };

  const handleChangeProfilePicture = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(
        "Permission required",
        "You need to allow access to your photos."
      );
      return;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!pickerResult.canceled) {
      setProfileImage(pickerResult.assets[0].uri);
      Alert.alert(
        "Profile Picture Updated",
        "Your new profile picture is ready to be uploaded!"
      );
    }
  };

  const handleSubmitPasswordChange = (passwords: {
    current: string;
    new: string;
  }) => {
    console.log("Password data to send to backend:", passwords);
    Alert.alert("Success", "Your password has been changed successfully!");
  };

  const handleSubmitNameChange = (newName: string) => {
    setUserName(newName);
    setNameModalVisible(false);
    Alert.alert("Name Updated", "Your name has been successfully changed.");
  };

  return (
    <View className="flex-1 bg-secondary">
      <View
        className="h-[40%] bg-secondary px-5"
        style={{ paddingTop: insets.top }}
      >
        <View className="items-center justify-center mt-12">
          <View>
            <Image
              source={
                profileImage
                  ? { uri: profileImage }
                  : initialUserData.profilePicture
              }
              className="w-[110px] h-[110px] rounded-full border-4 border-white/80"
            />
            <TouchableOpacity
              className="absolute bottom-0.5 right-0.5 bg-primary rounded-full w-[30px] h-[30px] justify-center items-center border-2 border-white"
              onPress={handleChangeProfilePicture}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
            </TouchableOpacity>
          </View>
          <Text className="text-white text-3xl font-poppins-semibold mt-4">
            {userName}
          </Text>
        </View>
      </View>

      <View className="flex-1 bg-white px-8 pt-5 rounded-t-[30px] -mt-8">
        <View className="w-[50px] h-[5px] bg-border rounded-full self-center mb-8" />
        <View className="w-full">
          {/* Email */}
          <View className="flex-row items-center py-4 border-b border-border">
            <Ionicons
              name="mail-outline"
              size={26}
              color={Colors.primary}
              className="mr-5"
            />
            <View>
              <Text className="text-lg font-poppins-semibold text-text">
                Email
              </Text>
              <Text className="text-base text-textLight">
                {initialUserData.email}
              </Text>
            </View>
          </View>

          {/* Name */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-b border-border"
            onPress={() => setNameModalVisible(true)}
          >
            <Ionicons
              name="person-outline"
              size={26}
              color={Colors.primary}
              className="mr-5"
            />
            <View className="flex-1">
              <Text className="text-lg font-poppins-semibold text-text">
                Name
              </Text>
              <Text className="text-base text-textLight">{userName}</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          {/* Password */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-b border-border"
            onPress={() => setPasswordModalVisible(true)}
          >
            <Ionicons
              name="key-outline"
              size={26}
              color={Colors.primary}
              className="mr-5"
            />
            <View className="flex-1">
              <Text className="text-lg font-poppins-semibold text-text">
                Password
              </Text>
              <Text className="text-base text-textLight">
                Change your password
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          {/* Add Account (Conditional) */}
          {userRole === "superuser" && (
            <TouchableOpacity
              className="flex-row items-center py-4 border-b border-border"
              onPress={() => router.push("/adduser")}
            >
              <Ionicons
                name="person-add-outline"
                size={26}
                color={Colors.primary}
                className="mr-5"
              />
              <View className="flex-1">
                <Text className="text-lg font-poppins-semibold text-text">
                  Add Account
                </Text>
                <Text className="text-base text-textLight">
                  Create a new user profile
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={Colors.textLight}
              />
            </TouchableOpacity>
          )}

          {/* About App */}
          <TouchableOpacity
            className="flex-row items-center py-4 border-b border-border"
            onPress={() => setAboutAppModalVisible(true)}
          >
            <Ionicons
              name="information-circle-outline"
              size={26}
              color={Colors.primary}
              className="mr-5"
            />
            <View className="flex-1">
              <Text className="text-lg font-poppins-semibold text-text">
                About App
              </Text>
              <Text className="text-base text-textLight">
                Learn more about the app
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-primary py-4 rounded-full w-full self-center items-center mt-auto mb-12"
          onPress={handleLogout}
        >
          <Text className="text-white text-lg font-poppins-bold">Log out</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Components */}
      <ChangePasswordModal
        visible={isPasswordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onSubmit={handleSubmitPasswordChange}
      />
      <AboutAppModal
        visible={isAboutAppModalVisible}
        onClose={() => setAboutAppModalVisible(false)}
      />
      <ChangeNameModal
        visible={isNameModalVisible}
        onClose={() => setNameModalVisible(false)}
        onSubmit={handleSubmitNameChange}
        currentName={userName}
      />
    </View>
  );
};

export default AccountSettingsScreen;
