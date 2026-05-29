import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DeviceCard from "../../components/home/DeviceCard";


import FanIcon from "../../assets/images/fandua.svg";
import LamphomeIcon from "../../assets/images/leddua.svg";

const devices = [
  { id: "1", name: "LED", icon: <LamphomeIcon width={80} height={80} /> },
  { id: "2", name: "FAN", icon: <FanIcon width={80} height={80} /> },
];

const userName = "TimRisetCPS";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      );
      setDate(
        now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDevicePress = (deviceId: string) => {
    if (deviceId === "1") {
      router.push("/lamp-control");
    } else if (deviceId === "2") {
      router.push("/fan-control");
    }
  };

  const handleViewMotion = () => {
    router.push("/(tabs)/history");
  };

  const HEADER_HEIGHT = 325;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header Section */}
      <View
        className="bg-secondary h-[380px] rounded-b-[40px] px-6 pb-5 absolute top-0 left-0 right-0 z-10 justify-between shadow-lg shadow-black/25"
        style={{ paddingTop: insets.top + 10 }}
      >
        {/* Top Header Content */}
        <View>
          <Text
            className="font-poppins-bold text-3xl text-white mt-16"
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.25)",
              textShadowOffset: { width: 1, height: 2 },
              textShadowRadius: 3,
            }}
          >
            Smart Motion Detection
          </Text>
          <Text className="font-poppins-medium text-lg text-primary mt-0.5">
            Sense Beyond Limits
          </Text>
          <Text className="font-poppins-regular text-3xl text-white mt-0.5">
            Hi, <Text className="font-poppins-regular text-white">{userName}! 👋</Text>
          </Text>
        </View>

        {/* Bottom Header Content */}
        <View className="flex-row justify-between items-end mt-2.5">
          <Text className="font-poppins-regular text-base text-white">
            #LightsUpWhenLifeMoves
          </Text>
          <View className="mb-1.5">
            <TouchableOpacity
              className="bg-primary py-3 px-6 rounded-full mb-5"
              onPress={handleViewMotion}
            >
              <Text className="text-white font-poppins-semibold text-base">
                View Motion
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT }}
      >
        <View className="flex-row justify-between items-center px-6 mt-5 mb-2.5">
          <Text className="font-poppins-regular text-base text-textLight">
            {date}
          </Text>
          <Text className="font-poppins-semibold text-base text-text">
            {time}
          </Text>
        </View>

        <View className="pl-6 mt-2">
          <Text
            className="font-poppins-semibold text-3xl text-text mb-4"
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.2)",
              textShadowOffset: { width: 1, height: 2 },
              textShadowRadius: 4,
            }}
          >
            Devices
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: 120,
              paddingRight: 25,
              gap: 30,

            }}
          >
            {devices.map((device) => (
              <DeviceCard
                key={device.id}
                name={device.name}
                icon={device.icon}
                onPress={() => handleDevicePress(device.id)}
                
              />
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
