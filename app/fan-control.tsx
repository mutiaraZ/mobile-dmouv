import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FanIcon from "../assets/images/fandua.svg";
import OnOffSwitch from "../components/OnOffSwitch";
import { Colors } from "../constants/Colors";
import { useFan } from "../context/FanContext";
import { useDeviceControl } from "../context/hooks/useDeviceControl";

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

export default function FanControlScreen() {
  const insets = useSafeAreaInsets();
  const { isAutoMode, setIsAutoMode } = useFan();
  const {
    power,
    personStatus,
    offInSec,
    isLoading,
    isSending,
    error,
    setAutoMode,
    setPowerState,
  } = useDeviceControl("fan", setIsAutoMode);

  const isFanOn = power === "on";

  const handleAutoModeToggle = () => {
    if (isSending) return;
    setAutoMode(!isAutoMode);
  };

  const handleFanToggle = () => {
    if (isAutoMode || isSending) return;
    setPowerState(isFanOn ? "off" : "on");
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-secondary">
        <ActivityIndicator size="large" color={Colors.white} />
        <Text className="mt-2.5 text-white text-base">Loading Status...</Text>
      </View>
    );
  }

  const showCountdown =
    isAutoMode && isFanOn && personStatus === "not-detected" && offInSec !== null;

  return (
    <ScrollView
      className="flex-1 bg-secondary"
      contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 50 }}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Header Section */}
      <View className="items-center justify-start px-5">
        <Text
          className="font-poppins-semibold text-3xl font-bold text-white mt-0.5"
          style={{
            textShadowColor: "rgba(0, 0, 0, 0.2)",
            textShadowOffset: { width: 1, height: 2 },
            textShadowRadius: 3,
          }}
        >
          Smart Fan
        </Text>
        <Text className="font-poppins-regular text-[15px] text-textLight mt-0.5">
          Control your smart cooler
        </Text>
        <View className="w-52 h-52 justify-center items-center mt-2.5 mb-12 p-4">
          <FanIcon
            width="120%"
            height="120%"
            fill={isFanOn ? Colors.primary : Colors.lampOffColor}
          />
        </View>
      </View>

      {/* Control Section (White Panel) */}
      <View className="bg-white flex-1 rounded-t-[30px] items-center shadow-lg shadow-black/10">
        <View className="w-full items-center px-6 pt-5 pb-16">
          <View className="w-[50px] h-[5px] bg-border rounded-full mb-6" />

          {/* Manual Power Button */}
          <TouchableOpacity
            className={`w-24 h-24 rounded-full justify-center items-center shadow-lg shadow-primary/30 mb-2.5 border-2 border-white ${
              isAutoMode ? "bg-border" : "bg-secondary"
            }`}
            onPress={handleFanToggle}
            disabled={isAutoMode || isSending}
            activeOpacity={0.7}
          >
            <Ionicons
              name="power"
              size={36}
              color={isFanOn && !isAutoMode ? Colors.primary : Colors.white}
            />
          </TouchableOpacity>
          <Text
            className={`font-poppins-semibold text-base font-semibold mb-2 ${
              isFanOn ? "text-greenDot" : "text-textLight"
            }`}
          >
            Fan {isFanOn ? "On" : "Off"}
          </Text>
          <Text className="font-poppins-regular text-xs text-textLight mb-4 text-center">
            {isAutoMode
              ? "Automatic mode is on. Turn it off to use the power button."
              : "Manual mode. The fan only changes when you press the button."}
          </Text>

          <View className="w-full h-px bg-border mb-5" />

          {error && (
            <View className="w-full bg-error rounded-2xl p-3 mb-4">
              <Text
                className="font-poppins-regular text-xs text-center"
                style={{ color: Colors.redDot }}
              >
                {error}
              </Text>
            </View>
          )}

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
              icon="sync-circle-outline"
              label="Fan Status"
              value={isFanOn ? "On" : "Off"}
              color={isFanOn ? Colors.greenDot : Colors.redDot}
            />
          </View>

          {showCountdown && (
            <Text className="font-poppins-regular text-xs text-textLight mb-5 text-center">
              No person detected. Fan turns off in {offInSec}s.
            </Text>
          )}

          {/* Automatic Mode Panel */}
          <View className="flex-row justify-between items-center bg-[#F4F3F3] rounded-2xl p-5 w-full">
            <View className="flex-1 pr-3">
              <Text className="font-poppins-semibold text-[15px] font-semibold text-text">
                Automatic Mode
              </Text>
              <Text className="font-poppins-regular text-xs text-textLight mt-0.5">
                Control fan based on detection
              </Text>
            </View>
            <OnOffSwitch
              value={isAutoMode}
              onValueChange={handleAutoModeToggle}
              disabled={isSending}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}