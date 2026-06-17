import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import CameraStream from "../../components/CameraStream";

export default function CameraScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View
        className="bg-secondary rounded-b-[40px] px-6 pb-6 shadow-lg shadow-black/25"
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

        <View className="flex-row items-center mt-6 bg-white/15 px-4 py-3 rounded-2xl">
          <View className="w-3 h-3 rounded-full bg-green-400 mr-3" />
          <Text className="font-poppins-medium text-white text-base">
            Camera Connected
          </Text>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-2 pt-6 pb-8">
          <View
            className="overflow-hidden rounded-[30px] border"
            style={{
              borderColor: "#E5E7EB",
              backgroundColor: "#000",
              height: 680,
            }}
          >
            <CameraStream />
          </View>

          <View className="mt-5 px-2">
            <Text className="font-poppins-regular text-textLight text-sm">
              Monitor motion activity directly from your IoT webcam in real-time.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}