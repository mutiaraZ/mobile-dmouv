import { useHistory } from "@/context/hooks/useHistory";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FilterGroup,
  FilterModal,
  FilterType,
} from "../../components/modal/filter";
import { Colors } from "../../constants/Colors";

type LogType =
  | "motion"
  | "lamp-on"
  | "lamp-off"
  | "fan-on"
  | "fan-off"
  | "schedule"
  | "automatic";

type LogItemProps = { type: LogType; message: string; time: string };

const logStyleConfig: Record<
  LogType,
  { bgColor: string; dotColor: string; messageColor: string; title: string }
> = {
  motion: {
    title: "Motion Detected",
    bgColor: Colors.secondary,
    dotColor: Colors.primary,
    messageColor: Colors.text,
  },
  "lamp-on": {
    title: "Lamp ON",
    bgColor: Colors.success,
    dotColor: Colors.greenDot,
    messageColor: Colors.text,
  },
  "lamp-off": {
    title: "Lamp OFF",
    bgColor: Colors.error,
    dotColor: Colors.redDot,
    messageColor: Colors.text,
  },
  "fan-on": {
    title: "Fan ON",
    bgColor: Colors.fanOnBg,
    dotColor: Colors.fanOnColor,
    messageColor: Colors.text,
  },
  "fan-off": {
    title: "Fan OFF",
    bgColor: Colors.fanOffBg,
    dotColor: Colors.fanOffColor,
    messageColor: Colors.text,
  },
  schedule: {
    title: "Schedule",
    bgColor: "#FFF8E1",
    dotColor: "#FFC107",
    messageColor: Colors.text,
  },
  automatic: {
    title: "Automatic Mode",
    bgColor: "#F3E5F5",
    dotColor: "#9C27B0",
    messageColor: Colors.text,
  },
};

const LogItem: React.FC<LogItemProps> = ({ type, message, time }) => {
  const style = logStyleConfig[type] ?? logStyleConfig.automatic;
  return (
    <View
      className="flex-row items-center rounded-2xl p-3 mb-2.5 border-l-4"
      style={{ backgroundColor: style.bgColor, borderColor: style.dotColor }}
    >
      <View
        className="w-3 h-3 rounded-full mr-4 ml-1"
        style={{ backgroundColor: style.dotColor }}
      />
      <View className="flex-1 flex-row justify-between items-start">
        <View className="flex-1">
          <Text
            className="font-roboto-bold text-[15px] mb-0.5"
            style={{ color: style.dotColor }}
          >
            {style.title}
          </Text>
          <Text
            className="font-roboto-regular text-[13px]"
            style={{ color: style.messageColor }}
          >
            {message}
          </Text>
        </View>
        <Text className="font-roboto-regular text-[13px] text-textLight">
          {time}
        </Text>
      </View>
    </View>
  );
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("All");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const DAYS_PER_PAGE = 2;

  const {
    days,
    loading,
    refreshing,
    loadingMore,
    hasMore,
    error,
    live,
    refresh,
    loadMore,
  } = useHistory();

  const filterGroups: FilterGroup[] = [
    {
      title: "General",
      options: [
        { label: "All", type: "All", icon: "apps" },
        { label: "Motion", type: "motion", icon: "walk" },
        { label: "Schedule", type: "schedule", icon: "calendar" },
        { label: "Automatic", type: "automatic", icon: "sparkles" },
      ],
    },
    {
      title: "Lamp",
      options: [
        { label: "Lamp On", type: "lamp-on", icon: "bulb" },
        { label: "Lamp Off", type: "lamp-off", icon: "bulb-outline" },
      ],
    },
    {
      title: "Fan",
      options: [
        { label: "Fan On", type: "fan-on", icon: "sync-circle" },
        { label: "Fan Off", type: "fan-off", icon: "sync-circle-outline" },
      ],
    },
  ];

  const getFilteredData = () => {
    const q = searchQuery.toLowerCase();
    return days
      .map((day) => ({
        ...day,
        logs: day.logs.filter((log) => {
          const matchesFilter =
            filterType === "All" ||
            (filterType === "automatic"
              ? log.source === "auto"
              : log.type === filterType);
          const matchesSearch =
            log.message.toLowerCase().includes(q) ||
            day.date.toLowerCase().includes(q);
          return matchesFilter && matchesSearch;
        }),
      }))
      .filter((day) => day.logs.length > 0);
  };

  const filteredHistory = getFilteredData();
  const totalPages = Math.ceil(filteredHistory.length / DAYS_PER_PAGE);
  const startIndex = (currentPage - 1) * DAYS_PER_PAGE;
  const endIndex = startIndex + DAYS_PER_PAGE;
  const paginatedDays = filteredHistory.slice(startIndex, endIndex);

  // Jaga halaman tetap valid kalau jumlah hari berubah (event live / filter)
  useEffect(() => {
    if (currentPage > Math.max(1, totalPages)) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const handleSelectFilter = (selectedFilter: FilterType) => {
    setFilterType(selectedFilter);
    setCurrentPage(1);
    setIsFilterModalVisible(false);
  };

  return (
    <View className="flex-1">
      <View
        className="px-5 pb-4 bg-background"
        style={{ paddingTop: insets.top }}
      >
        <Text
          className="font-poppins-medium text-3xl text-text mt-20 mb-6"
          style={{
            textShadowColor: "rgba(0, 0, 0, 0.25)",
            textShadowOffset: { width: 1, height: 2 },
            textShadowRadius: 3,
          }}
        >
          Room History
        </Text>

        <View className="flex-row items-center mb-3 -mt-3">
          <View
            className="w-2.5 h-2.5 rounded-full mr-2"
            style={{ backgroundColor: live ? Colors.greenDot : Colors.redDot }}
          />
          <Text className="font-roboto-regular text-[12px] text-textLight">
            {live ? "Live" : "Offline - pull down to refresh"}
          </Text>
        </View>

        <View className="flex-row items-center bg-white rounded-2xl px-4 h-14 shadow-md shadow-black/10">
          <Ionicons name="search-outline" size={22} color={Colors.textLight} />
          <TextInput
            className="flex-1 font-roboto-regular h-12 text-lg text-text ml-2.5"
            style={{ lineHeight: 20 }}
            placeholder="Search activity..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setCurrentPage(1);
            }}
          />
          <TouchableOpacity
            className="pl-2.5"
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 100,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {loading ? (
          <View className="items-center pt-20">
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error && days.length === 0 ? (
          <View className="items-center justify-center pt-20">
            <Ionicons
              name="cloud-offline-outline"
              size={50}
              color={Colors.textLight}
            />
            <Text className="font-poppins-regular text-base text-textLight text-center mt-4">
              {error}
            </Text>
          </View>
        ) : paginatedDays.length > 0 ? (
          <>
            {paginatedDays.map((day) => (
              <View
                key={day.date}
                className="bg-white rounded-2xl p-4 mb-5 shadow-lg shadow-black/10"
              >
                <Text className="font-poppins-bold text-lg text-text mb-4 px-1">
                  {day.date}
                </Text>
                {day.logs.map((log) => (
                  <LogItem
                    key={log.id}
                    type={log.type as LogType}
                    message={log.message}
                    time={log.time}
                  />
                ))}
              </View>
            ))}

            {totalPages > 1 && (
              <View className="flex-row justify-between items-center mt-2.5 px-2.5">
                <TouchableOpacity
                  onPress={() => setCurrentPage((c) => Math.max(1, c - 1))}
                  disabled={currentPage === 1}
                  className="p-2.5"
                >
                  <Text
                    className={`font-poppins-semibold text-[15px] ${
                      currentPage === 1 ? "text-border" : "text-primary"
                    }`}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
                <View className="flex-row">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <TouchableOpacity
                        key={page}
                        className={`w-10 h-10 rounded-xl justify-center items-center mx-1 border-[1.5px] ${
                          currentPage === page
                            ? "bg-primary border-primary"
                            : "bg-white border-border"
                        }`}
                        onPress={() => setCurrentPage(page)}
                      >
                        <Text
                          className={`font-poppins-bold text-base ${
                            currentPage === page ? "text-white" : "text-primary"
                          }`}
                        >
                          {page}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </View>
                <TouchableOpacity
                  onPress={() =>
                    setCurrentPage((c) => Math.min(totalPages, c + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2.5"
                >
                  <Text
                    className={`font-poppins-semibold text-[15px] ${
                      currentPage === totalPages
                        ? "text-border"
                        : "text-primary"
                    }`}
                  >
                    Next
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {hasMore && currentPage === totalPages && (
              <TouchableOpacity
                onPress={loadMore}
                disabled={loadingMore}
                className="items-center mt-4 p-3"
              >
                {loadingMore ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <Text className="font-poppins-semibold text-[15px] text-primary">
                    Load older history
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View className="items-center justify-center pt-20">
            <Ionicons
              name="archive-outline"
              size={50}
              color={Colors.textLight}
            />
            <Text className="font-poppins-regular text-base text-textLight text-center mt-4">
              No history found.
            </Text>
          </View>
        )}
      </ScrollView>

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        filterGroups={filterGroups}
        currentFilter={filterType}
        onSelectFilter={handleSelectFilter}
      />
    </View>
  );
}