import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  SafeAreaView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import OnboardingData from "../../constants/OnboardingData";

const { width } = Dimensions.get("window");

// Onboarding Item Component
const OnboardingItem = ({ item }: { item: (typeof OnboardingData)[0] }) => {
  const SvgImage = item.image;

  return (
    <View className="justify-center items-center px-10" style={{ width }}>
      <SvgImage width={width * 0.6} height={width * 0.6} />
      <View className="mt-8">
        <Text
          className="font-poppins-semibold text-3xl text-text text-center"
          style={{
            textShadowColor: "rgba(0, 0, 0, 0.4)",
            textShadowOffset: { width: 1.5, height: 1.5 },
            textShadowRadius: 2,
          }}
        >
          {item.title}
        </Text>
        <Text className="font-poppins-extralight text-lg text-primary text-center px-5">
          {item.subtitle}
        </Text>
      </View>
    </View>
  );
};

// Paginator Component
const Paginator = ({
  data,
  scrollX,
}: {
  data: any[];
  scrollX: Animated.Value;
}) => {
  const dotPosition = Animated.divide(scrollX, width);

  return (
    <View className="flex-[2] flex-row justify-center items-center">
      {data.slice(0, 3).map((_, i) => {
        const dotWidth = dotPosition.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [10, 20, 10],
          extrapolate: "clamp",
        });

        const dotOpacity = dotPosition.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: [0.3, 1, 0.3],
          extrapolate: "clamp",
        });

        const dotColor = dotPosition.interpolate({
          inputRange: [i - 1, i, i + 1],
          outputRange: ["#ccc", Colors.primary, "#ccc"],
          extrapolate: "clamp",
        });

        return (
          <Animated.View
            key={i.toString()}
            className="h-2.5 rounded-full mx-2"
            style={{
              width: dotWidth,
              opacity: dotOpacity,
              backgroundColor: dotColor,
            }}
          />
        );
      })}
    </View>
  );
};

// Main Screen Component
export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const slidesRef = useRef<FlatList>(null);
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;

  const viewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (viewableItems.length > 0) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const handleOnScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const scrollTo = (index: number) => {
    if (slidesRef.current && index >= 0 && index < OnboardingData.length) {
      slidesRef.current.scrollToIndex({ index });
    }
  };

  const navigateToNextScreen = async () => {
    try {
      await AsyncStorage.setItem("onboardingComplete", "true");
      router.push("/(auth)/login");
    } catch (e) {
      console.error("Failed to save onboarding status.", e);
    }
  };

  const handleNext = () => {
    if (currentIndex < OnboardingData.length - 1) {
      scrollTo(currentIndex + 1);
    } else {
      navigateToNextScreen();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      scrollTo(currentIndex - 1);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Background Blobs */}
      <View className="absolute w-[250px] h-[250px] rounded-full bg-blue-200/30 top-[-80px] left-[-100px]" />
      <View className="absolute w-[250px] h-[250px] rounded-full bg-blue-200/30 top-[30%] right-[-90px]" />
      <View className="absolute w-[250px] h-[250px] rounded-full bg-blue-200/30 bottom-[-60px] left-[45%]" />

      {/* Main Content */}
      <View className="flex-1 justify-center items-center">
        <FlatList
          ref={slidesRef}
          data={OnboardingData}
          renderItem={({ item }) => <OnboardingItem item={item} />}
          horizontal
          showsHorizontalScrollIndicator={false}
          pagingEnabled
          bounces={false}
          keyExtractor={(item) => item.id}
          onScroll={handleOnScroll}
          scrollEventThrottle={16}
          onViewableItemsChanged={viewableItemsChanged}
          viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        />
      </View>

      {/* Footer */}
      <View className="h-[100px] justify-center px-8 pb-10">
        {currentIndex === OnboardingData.length - 1 ? (
          <TouchableOpacity
            className="bg-primary py-4 rounded-full items-center mx-5 shadow-md shadow-black/25"
            onPress={handleNext}
          >
            <Text className="font-poppins-semibold text-base text-white">
              Let&apos;s Get Started
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row justify-between items-center w-full">
            {currentIndex === 0 ? (
              <TouchableOpacity
                className="bg-primary py-2.5 px-5 rounded-full items-center justify-center min-w-[80px] shadow-md shadow-black/25"
                onPress={navigateToNextScreen}
              >
                <Text className="font-poppins-semibold text-base text-white">
                  Skip
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                className="bg-primary py-2.5 px-5 rounded-full items-center justify-center min-w-[80px] shadow-md shadow-black/25"
                onPress={handleBack}
              >
                <Text className="font-poppins-semibold text-base text-white">
                  Back
                </Text>
              </TouchableOpacity>
            )}

            <Paginator data={OnboardingData} scrollX={scrollX} />

            <TouchableOpacity
              className="bg-primary py-2.5 px-5 rounded-full items-center justify-center min-w-[80px] shadow-md shadow-black/25"
              onPress={handleNext}
            >
              <Text className="font-poppins-semibold text-base text-white">
                Next
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
