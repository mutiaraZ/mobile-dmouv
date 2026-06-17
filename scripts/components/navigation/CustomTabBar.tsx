import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Colors } from "../../constants/Colors";

const TabItem = ({
  route,
  isFocused,
  onPress,
}: {
  route: any;
  isFocused: boolean;
  onPress: () => void;
}) => {
  const iconName =
    route.name === "home"
      ? "home"
      : route.name === "history"
      ? "filter"
      : route.name === "camera"
      ? "camera"
      : "settings";

  const animatedLabelStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
    };
  });

  return (
    <TouchableOpacity onPress={onPress} className="flex-1 justify-center items-center">
      <Ionicons
        name={isFocused ? iconName : (`${iconName}-outline` as any)}
        size={26}
        color={isFocused ? Colors.primary : Colors.textLight}
      />
      <Animated.Text
        className="font-poppins-semibold text-[11px] text-primary mt-0.5"
        style={animatedLabelStyle}
      >
        {route.name.charAt(0).toUpperCase() + route.name.slice(1)}
      </Animated.Text>
    </TouchableOpacity>
  );
};

const CustomTabBar = ({ state, navigation }: BottomTabBarProps) => {
  return (
    <View className="absolute bottom-8 left-5 right-5 h-[67px] rounded-[25px] shadow-lg shadow-black/10">
      <BlurView
        intensity={95}
        tint="light"
        className="flex-1 rounded-[25px] overflow-hidden flex-row"
      >
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const onPress = () => {
            if (!isFocused) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TabItem
              key={route.key}
              route={route}
              isFocused={isFocused}
              onPress={onPress}
            />
          );
        })}
      </BlurView>
    </View>
  );
};

export default CustomTabBar;