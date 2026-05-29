import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LogoD from "../../assets/images/D.svg";
import CustomTabBar from "../../components/navigation/CustomTabBar";
import { Colors } from "../../constants/Colors";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        header: ({ options, navigation }) => {
          const state = navigation.getState();
          const currentRouteName = state.routes[state.index]?.name;
          const isHome = currentRouteName === "home";
          const iconColor = isHome ? Colors.white : Colors.primary;
          return (
            <View
              className="absolute top-0 left-0 right-0 z-10 flex-row items-center justify-between bg-transparent px-5 pb-2.5 h-[110px]"
              style={{ paddingTop: insets.top }}
            >
              {/* Left Container */}
              <View className="flex-1 items-start translate-y-1">
                {isHome ? (
                  <TouchableOpacity onPress={() => navigation.navigate("home")}>
                    <LogoD width={40} height={40} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.canGoBack()
                        ? navigation.goBack()
                        : navigation.navigate("home")
                    }
                  >
                    <Ionicons name="arrow-back" size={30} color={iconColor} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Center Container */}
              <View className="flex-[2] items-center justify-center">
                {!isHome && options.title && (
                  <Text
                    className="font-poppins-bold text-lg"
                    style={{ color: iconColor }}
                  >
                    {options.title}
                  </Text>
                )}
              </View>

              {/* Right Container */}
              <View className="flex-1 flex-row items-center justify-end translate-y-0.5">
                <TouchableOpacity
                  onPress={() => navigation.navigate("notifications" as never)}
                >
                  <Ionicons
                    name="notifications-outline"
                    size={29}
                    color={iconColor}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  className="ml-4"
                  onPress={() =>
                    navigation.navigate("account-settings" as never)
                  }
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={33}
                    color={iconColor}
                  />
                </TouchableOpacity>
              </View>
            </View>
          );
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "" }} />
      <Tabs.Screen name="history" options={{ title: "" }} />
      <Tabs.Screen name="camera" options={{ title: "" }} />
      <Tabs.Screen name="settings" options={{ title: "" }} />
    </Tabs>
  );
}