import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "../../constants/Colors";

// --- Tipe dan Konfigurasi ---
type LogType =
  | "motion"
  | "lamp-on"
  | "lamp-off"
  | "fan-on"
  | "fan-off"
  | "schedule"
  | "automatic";
export type FilterType = "All" | LogType;

type FilterOption = {
  label: string;
  type: FilterType;
  icon: keyof typeof Ionicons.glyphMap;
};

export type FilterGroup = {
  title: string;
  options: FilterOption[];
};

const logStyleConfig: Record<LogType, { dotColor: string }> = {
  motion: { dotColor: Colors.primary },
  "lamp-on": { dotColor: Colors.greenDot },
  "lamp-off": { dotColor: Colors.redDot },
  "fan-on": { dotColor: Colors.fanOnColor },
  "fan-off": { dotColor: Colors.fanOffColor },
  schedule: { dotColor: "#FFC107" },
  automatic: { dotColor: "#9C27B0" },
};

// --- Props Interface ---
interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  filterGroups: FilterGroup[];
  currentFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
}

// --- Komponen FilterModal dengan NativeWind ---
export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onClose,
  filterGroups,
  currentFilter,
  onSelectFilter,
}) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        className="flex-1 justify-end bg-black/50"
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          className="bg-white rounded-t-[25px] pt-2.5 pb-10 px-5 w-full"
          onStartShouldSetResponder={() => true}
        >
          <View className="w-[50px] h-[5px] bg-border rounded-full self-center my-2.5" />
          <View className="flex-row justify-between items-center mb-2.5">
            <Text className="font-poppins-bold text-2xl text-primary">
              Filter by Event
            </Text>
          </View>

          {filterGroups.map((group) => (
            <View key={group.title}>
              <Text className="font-poppins-bold text-base text-textLight mt-4 mb-2.5 uppercase">
                {group.title}
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {group.options.map(({ label, type, icon }) => {
                  const isActive = currentFilter === type;
                  const color =
                    logStyleConfig[type as LogType]?.dotColor || Colors.primary;
                  return (
                    <TouchableOpacity
                      key={type}
                      className={`w-[48.5%] rounded-2xl p-4 mb-2.5 border-[1.5px] items-center flex-row ${
                        isActive
                          ? "bg-primary border-primary"
                          : "bg-white border-border"
                      }`}
                      onPress={() => onSelectFilter(type)}
                    >
                      <Ionicons
                        name={icon}
                        size={22}
                        color={isActive ? Colors.white : color}
                      />
                      <Text
                        className={`font-poppins-semibold text-[15px] ml-3 ${
                          isActive ? "text-white" : "text-text"
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default FilterModal;
