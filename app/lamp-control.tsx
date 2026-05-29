import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import resolveConfig from "tailwindcss/resolveConfig";
import { fetchDeviceStatus, updateLampState } from "../api/api";
import LampIcon from "../assets/images/leddua.svg";
import { Colors } from "../constants/Colors";
import { useLamp } from "../context/LampContext";
import tailwindConfig from "../tailwind.config.js"; 

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const fullConfig = resolveConfig(tailwindConfig);
const themeColors = fullConfig.theme.colors as any;

type PersonStatus = "detected" | "not-detected";
type LightStatus = "on" | "off";

const TRACK_WIDTH = 76;
const TRACK_HEIGHT = 40;
const THUMB_SIZE = 32;
const PADDING = 4;

interface CustomSwitchProps {
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}

const CustomSwitch: React.FC<CustomSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
}) => {
  const animatedValue = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animatedValue, {
      toValue: value ? 1 : 0,
      friction: 7,
      tension: 100,
      useNativeDriver: false,
    }).start();
  }, [value, animatedValue]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [themeColors.border, themeColors.primary],
  });

  const sunIconOpacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sunIconScale = animatedValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] });
  const moonIconOpacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const moonIconScale = animatedValue.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.5, 0] });


  return (
    <Pressable
      onPress={onValueChange}
      disabled={disabled}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View
        className={`rounded-full justify-center ${disabled ? "opacity-50" : ""}`}
        style={{ width: TRACK_WIDTH, height: TRACK_HEIGHT, backgroundColor }}
      >
        <Animated.View
          className="absolute bg-white justify-center items-center shadow-lg"
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
            transform: [{ translateX }],
            elevation: 5,
          }}
        >
          <Animated.View className="absolute" style={{ opacity: moonIconOpacity, transform: [{ scale: moonIconScale }] }}>
            <Ionicons name="moon" size={18} color={themeColors.textLight} />
          </Animated.View>
          <Animated.View className="absolute" style={{ opacity: sunIconOpacity, transform: [{ scale: sunIconScale }] }}>
            <Ionicons name="sunny" size={18} color={themeColors.lampOnColor} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
};

const useDeviceSync = () => {
  const { setIsAutoMode } = useLamp();
  const [lampStatus, setLampStatus] = useState<LightStatus>("off");
  const [personStatus, setPersonStatus] = useState<PersonStatus>("not-detected");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getInitialStatus = async () => {
      try {
        const data = await fetchDeviceStatus();
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLampStatus(data.lampStatus);
        setPersonStatus(data.personStatus);
        setIsAutoMode(data.isAutoMode);
      } catch (error) {
        console.error("Fetch initial status error:", error);
        Alert.alert("Error", "Failed to fetch initial status from the server.");
      } finally {
        setIsLoading(false);
      }
    };

    getInitialStatus();

    const intervalId = setInterval(async () => {
      try {
        const data = await fetchDeviceStatus();
        setPersonStatus((prevStatus) => {
          if (data.personStatus !== prevStatus) {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
            return data.personStatus;
          }
          return prevStatus;
        });
      } catch (error) {
        console.error("Fetch status update error:", error);
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [setIsAutoMode]);

  return { lampStatus, setLampStatus, personStatus, isLoading };
};

const StatusItem: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => (
  <View className="flex-1 items-center">
    <Ionicons name={icon} size={24} color={Colors.primary} />
    <View className="items-center mt-2">
      <Text className="font-poppins-regular text-sm text-textLight">{label}</Text>
      <Text
        className="font-poppins-semibold text-[15px] font-bold mt-1"
        style={{ color }}
      >
        {value}
      </Text>
    </View>
  </View>
);

export default function LampControlScreen() {
  const insets = useSafeAreaInsets();
  const { isAutoMode, setIsAutoMode } = useLamp();
  const { lampStatus, setLampStatus, personStatus, isLoading } = useDeviceSync();

  useEffect(() => {
    if (isLoading || !isAutoMode) return;

    const performAutoUpdate = (newStatus: LightStatus) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setLampStatus(newStatus);
      updateLampState({ lampStatus: newStatus }).catch((err) =>
        console.error("Auto mode update failed:", err)
      );
    };

    if (personStatus === "detected" && lampStatus === "off") {
      performAutoUpdate("on");
    } else if (personStatus === "not-detected" && lampStatus === "on") {
      performAutoUpdate("off");
    }
  }, [personStatus, isAutoMode, isLoading, lampStatus, setLampStatus]);

  const handleAutoModeToggle = async () => {
    const newMode = !isAutoMode;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setIsAutoMode(newMode);
    try {
      await updateLampState({ isAutoMode: newMode });
    } catch (error) {
      console.error("Update auto mode failed:", error);
      Alert.alert("Error", "Failed to update automatic mode.");
      setIsAutoMode(!newMode);
    }
  };

  const handleLampToggle = async () => {
    if (isAutoMode) return; 
    const newStatus = lampStatus === "on" ? "off" : "on";
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLampStatus(newStatus); 
    try {
      await updateLampState({ lampStatus: newStatus });
    } catch (error) {
      console.error("Update lamp status failed:", error);
      Alert.alert("Error", "Failed to update lamp status.");
      setLampStatus(lampStatus); 
    }
  };

  const isLampOn = lampStatus === "on";

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-secondary">
        <ActivityIndicator size="large" color={Colors.white} />
        <Text className="mt-2.5 text-white text-base">Loading Status...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-secondary" style={{ paddingTop: insets.top + 50 }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header Section */}
      <View className="items-center justify-start px-5">
        <Text className="font-poppins-semibold text-3xl font-bold text-white mt-0.5" style={{ textShadowColor: "rgba(0, 0, 0, 0.2)", textShadowOffset: { width: 1, height: 2 }, textShadowRadius: 3 }}>
          Smart Lamp
        </Text>
        <Text className="font-poppins-regular text-[15px] text-textLight mt-0.5">
          Control your smart lighting
        </Text>
        <View className="w-52 h-52 justify-center items-center my-5 p-4">
          <LampIcon width="120%" height="120%" fill={isLampOn ? Colors.lampOnColor : Colors.lampOffColor} />
        </View>
      </View>

      {/* Control Section (White Panel) */}
      <View className="bg-white flex-1 rounded-t-[30px] items-center shadow-lg shadow-black/10">
        <View className="w-full items-center px-6 pt-5 pb-16">
          <View className="w-[50px] h-[5px] bg-border rounded-full mb-6" />

          {/* Manual Power Button */}
          <TouchableOpacity
            className={`w-24 h-24 rounded-full justify-center items-center bg-secondary shadow-lg shadow-primary/30 mb-2.5 border-2 border-white ${isAutoMode ? "bg-border" : ""}`}
            onPress={handleLampToggle}
            disabled={isAutoMode}
            activeOpacity={0.7}
          >
            <Ionicons name="power" size={36} color={isLampOn && !isAutoMode ? Colors.primary : Colors.white} />
          </TouchableOpacity>
          <Text className={`font-poppins-semibold text-base font-semibold mb-6 ${isLampOn ? "text-greenDot" : "text-textLight"}`}>
            Lamp is {isLampOn ? "On" : "Off"}
          </Text>

          <View className="w-full h-px bg-border mb-5" />

          {/* Status Panel */}
          <View className="flex-row w-full justify-around bg-[#F4F3F3] rounded-2xl p-4 mb-5">
            <StatusItem
              icon="body-outline"
              label="Person Status"
              value={personStatus === "detected" ? "Detected" : "Not Detected"}
              color={personStatus === "detected" ? Colors.redDot : Colors.greenDot}
            />
            <View className="w-px bg-border mx-2.5" />
            <StatusItem
              icon="bulb-outline"
              label="Lamp Status"
              value={isLampOn ? "On" : "Off"}
              color={isLampOn ? Colors.greenDot : Colors.redDot}
            />
          </View>

          {/* Automatic Mode Panel */}
          <View className="flex-row justify-between items-center bg-[#F4F3F3] rounded-2xl p-5 w-full">
            <View>
              <Text className="font-poppins-semibold text-[15px] font-semibold text-text">
                Automatic Mode
              </Text>
              <Text className="font-poppins-regular text-xs text-textLight mt-0.5">
                Control lamp based on detection
              </Text>
            </View>
            <CustomSwitch value={isAutoMode} onValueChange={handleAutoModeToggle} />
          </View>
        </View>
      </View>
    </View>
  );
}