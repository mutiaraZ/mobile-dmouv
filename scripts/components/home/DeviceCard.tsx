// components/home/DeviceCard.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { ReactElement } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";

type DeviceCardProps = {
  icon: ReactElement; // Menerima JSX element (SVG)
  name: string;
  onPress: () => void;
};

export default function DeviceCard({ icon, name, onPress }: DeviceCardProps) {
  return (
    <TouchableOpacity
      className="w-48 h-60 rounded-[25px] bg-white shadow-md shadow-black/10"
      onPress={onPress}
    >
      {/* Bagian Atas (SVG atau Ikon) */}
      <View className="w-full h-[130px] bg-offWhite rounded-t-[25px] justify-center items-center p-2.5">
        {icon}
      </View>

      {/* Bagian Bawah (Teks dan Tombol) */}
      <View className="flex-1 flex-row justify-between items-center px-4">
        <Text className="font-poppins-bold text-lg text-text">{name}</Text>
        <View className="bg-background w-[30px] h-[30px] rounded-full justify-center items-center">
          <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}
