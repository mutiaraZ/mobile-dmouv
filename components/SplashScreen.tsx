import React from "react";
import { Text, View } from "react-native";
import FullLogo from "../assets/images/fulldmouv.svg";

export default function SplashScreenComponent() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <FullLogo width={306} height={66} />
      <Text className="text-lg font-roboto-regular text-primary mt-3">
        LightsUpWhenLifeMoves
      </Text>
    </View>
  );
}
