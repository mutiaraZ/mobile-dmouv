import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { SwipeListView } from "react-native-swipe-list-view";
import { FilterType } from "../components/modal/filter";
import { Colors } from "../constants/Colors";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type LogEntry = {
  id: string;
  date: string;
  type: FilterType;
};

const DUMMY_LOGS: LogEntry[] = [
  { id: "1", date: "August 13 at 15:00 PM", type: "motion" },
  { id: "2", date: "August 13 at 10:00 PM", type: "schedule" },
  { id: "3", date: "August 12 at 15:00 PM", type: "automatic" },
  { id: "4", date: "August 11 at 20:00 PM", type: "lamp-on" },
  { id: "5", date: "August 11 at 22:00 PM", type: "fan-off" },
  { id: "6", date: "August 10 at 14:00 PM", type: "motion" },
  { id: "7", date: "August 9 at 12:00 PM", type: "schedule" },
  { id: "8", date: "August 8 at 11:00 PM", type: "automatic" },
  { id: "9", date: "August 7 at 14:00 PM", type: "lamp-off" },
  { id: "10", date: "August 6 at 04:00 PM", type: "fan-on" },
  { id: "11", date: "August 5 at 18:00 PM", type: "motion" },
  { id: "12", date: "August 4 at 17:00 PM", type: "schedule" },
];

const userName = "TimRisetCPS";

export default function NotificationsScreen() {
  const [activityLogs, setActivityLogs] = useState<LogEntry[]>([]);
  const [currentDate, setCurrentDate] = useState("");
  const router = useRouter();

  useEffect(() => {
    setActivityLogs(DUMMY_LOGS);
    const now = new Date();
    const formattedDate = now.toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentDate(formattedDate);
  }, []);

  const handleDeleteNotification = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActivityLogs((prevLogs) => prevLogs.filter((log) => log.id !== id));
  };

  const handleNotificationPress = (notification: LogEntry) => {
    router.push({
      pathname: "/(tabs)/history",
      params: { filter: notification.type },
    });
  };

  const renderItem = (data: { item: LogEntry }) => (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => handleNotificationPress(data.item)}
    >
      <View className="bg-primary rounded-xl p-3 flex-row items-center mb-3">
        <Ionicons
          name="warning-outline"
          size={24}
          color={Colors.white}
          className="mr-4"
        />
        <View className="flex-1">
          <Text className="text-md text-white leading-5 font-roboto-regular">
            <Text className="font-poppins-bold">Security update: </Text>
            Someone just moved in your space
          </Text>
          <Text className="text-[13px] text-white/80 mt-1 font-roboto-regular">
            {data.item.date}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHiddenItem = (data: { item: LogEntry }) => (
    <View className="items-center flex-1 flex-row justify-end mb-3">
      <TouchableOpacity
        className="bg-redDot justify-center items-center absolute top-0 bottom-4 right-0 w-20 rounded-xl"
        onPress={() => handleDeleteNotification(data.item.id)}
      >
        <Ionicons name="trash-outline" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView
        className="flex-1 bg-background"
        edges={["top", "left", "right"]}
      >
        <View className="px-5 pt-[50px] mb-5">
          <Text className="font-poppins-regular text-[17px] text-text mt-2.5">
            Activity Log
          </Text>
          <Text
            className="font-roboto-medium text-3xl text-text mt-0.5"
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.1)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 6,
            }}
          >
            Hello, {userName}
          </Text>
          <Text className="font-roboto-regular text-[15px] text-textLight mt-2">
            {currentDate}
          </Text>
        </View>

        {activityLogs.length > 0 ? (
          <SwipeListView
            data={activityLogs}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            keyExtractor={(item) => item.id}
            rightOpenValue={-80}
            disableRightSwipe
            contentContainerStyle={{ paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View className="flex-1 justify-center items-center pb-16">
            <Ionicons
              name="notifications-off-outline"
              size={60}
              color={Colors.textLight}
            />
            <Text className="font-poppins-semibold text-lg text-text mt-5">
              No New Notifications
            </Text>
            <Text className="font-roboto-regular text-sm text-textLight mt-1">
              You are all caught up!
            </Text>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}
