import React from "react";
import { SafeAreaView, Text, View } from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import CameraStream from "../../components/CameraStream";

// Tab bar: bottom-8 (32) + tinggi 67 = 99, ditambah jarak napas
const TAB_BAR_SPACE = 110;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View
        className="bg-secondary rounded-b-[40px] px-6 pb-5 shadow-lg shadow-black/25"
        style={{
          paddingTop: insets.top + 10,
        }}
      >
        <View className="flex-row items-center justify-between mt-14">
          <View className="flex-1 ml-6">
            <Text
              className="font-poppins-bold text-3xl text-white"
              style={{
                textShadowColor: "rgba(0, 0, 0, 0.25)",
                textShadowOffset: { width: 1, height: 2 },
                textShadowRadius: 3,
              }}
            >
              Live Motion
            </Text>
            <Text className="font-poppins-medium text-base text-primary mt-1">
              Real-time IoT Camera Monitoring
            </Text>
          </View>
        </View>

        <View className="flex-row items-center mt-4 bg-white/15 px-4 py-3 rounded-2xl">
          <View className="w-3 h-3 rounded-full bg-green-400 mr-3" />
          <Text className="font-poppins-medium text-white text-base">
            Camera Connected
          </Text>
        </View>
      </View>

      {/* Konten tanpa scroll: frame kamera mengisi sisa ruang di antara header & tab bar */}
      <View
        className="flex-1 px-4 pt-4"
        style={{ paddingBottom: TAB_BAR_SPACE }}
      >
        <View
          className="flex-1 overflow-hidden rounded-[30px] border"
          style={{
            borderColor: "#E5E7EB",
            backgroundColor: "#000",
          }}
        >
          <CameraStream />
        </View>

        <Text className="font-poppins-regular text-textLight text-xs mt-3 px-2">
          Monitor motion activity directly from your IoT webcam in real-time.
        </Text>
      </View>
    </SafeAreaView>
  );
}