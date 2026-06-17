import { Ionicons } from "@expo/vector-icons";
import { NativeStackHeaderProps } from "@react-navigation/native-stack";
import { SplashScreen, Stack } from "expo-router";
import React, { useEffect } from "react";
import { StatusBar, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/Colors";
import { FanProvider } from "../context/FanContext";
import { LampProvider } from "../context/LampContext";
import { useLoadFonts } from "../hooks/useLoadFonts";
import "../global.css"; // Pastikan global.css diimpor

SplashScreen.preventAutoHideAsync();

/**
 * Header kustom yang menggunakan NativeWind untuk styling.
 */
const Header = ({ options, navigation, route }: NativeStackHeaderProps) => {
  const insets = useSafeAreaInsets();
  const { title } = options;

  const isAccountSettings = route.name === "account-settings";
  const isTransparentWithBlueIcons =
    route.name === "lamp-control" ||
    route.name === "fan-control" ||
    route.name === "notifications";

  // Logika untuk menentukan warna tetap sama
  let iconColor: string;
  let backgroundColor: string;
  let titleColor: string;

  if (isAccountSettings) {
    iconColor = Colors.white;
    titleColor = Colors.white;
    backgroundColor = "transparent";
  } else if (isTransparentWithBlueIcons) {
    iconColor = Colors.primary;
    titleColor = Colors.white;
    backgroundColor = "transparent";
  } else {
    iconColor = Colors.primary;
    titleColor = Colors.text;
    backgroundColor = Colors.background;
  }

  return (
    <View
      // StyleSheet.headerContainer diubah menjadi className
      className="flex-row justify-between items-center px-5 pb-2.5 absolute top-0 left-0 right-0 z-10"
      // Style dinamis tetap dipertahankan
      style={{
        paddingTop: insets.top,
        backgroundColor: backgroundColor,
      }}
    >
      {/* Kolom Kiri */}
      <View className="flex-1 items-start">
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={30} color={iconColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* Kolom Tengah */}
      <View className="flex-[2] items-center justify-center">
        {title && (
          <Text
            className="font-poppins-bold text-lg"
            style={{ color: titleColor }}
          >
            {title}
          </Text>
        )}
      </View>

      {/* Kolom Kanan */}
      <View className="flex-1 flex-row items-center justify-end">
        <TouchableOpacity
          onPress={() => navigation.navigate("notifications" as never)}
        >
          <Ionicons name="notifications-outline" size={30} color={iconColor} />
        </TouchableOpacity>
        <TouchableOpacity
          className="ml-4" // marginLeft: 16 diubah menjadi ml-4
          onPress={() => navigation.navigate("account-settings" as never)}
        >
          <Ionicons name="person-circle-outline" size={30} color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Layout utama aplikasi.
 */
export default function RootLayout() {
  const [fontsLoaded, fontError] = useLoadFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <FanProvider>
      <LampProvider>
        <StatusBar barStyle="light-content" />
        <Stack
          screenOptions={{
            header: ({ options, navigation, route }) => (
              <Header options={options} navigation={navigation} route={route} />
            ),
            headerShown: true,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)"
            options={{
              headerShown: false,
              animation: "fade",
              animationDuration: 500,
            }}
          />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="account-settings" options={{ title: "" }} />
          <Stack.Screen name="lamp-control" options={{ title: "" }} />
          <Stack.Screen name="fan-control" options={{ title: "" }} />
          <Stack.Screen name="notifications" options={{ title: "" }} />
        </Stack>
      </LampProvider>
    </FanProvider>
  );
}
