import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable } from "react-native";
import { Colors } from "../constants/Colors";

const TRACK_WIDTH = 88;
const TRACK_HEIGHT = 40;
const THUMB_SIZE = 32;
const PADDING = 4;

interface OnOffSwitchProps {
  value: boolean;
  onValueChange: () => void;
  disabled?: boolean;
}

const thumbShadow = Platform.select({
  web: { boxShadow: "0px 1px 3px rgba(0,0,0,0.25)" } as object,
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});

export default function OnOffSwitch({
  value,
  onValueChange,
  disabled = false,
}: OnOffSwitchProps) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [PADDING, TRACK_WIDTH - THUMB_SIZE - PADDING],
  });
  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });
  const onOpacity = anim;
  const offOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  const labelBase = {
    position: "absolute" as const,
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  };

  return (
    <Pressable
      onPress={onValueChange}
      disabled={disabled}
      hitSlop={10}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: TRACK_HEIGHT / 2,
          backgroundColor,
          justifyContent: "center",
        }}
      >
        <Animated.Text
          style={[labelBase, { left: 15, opacity: onOpacity, color: Colors.white }]}
        >
          ON
        </Animated.Text>
        <Animated.Text
          style={[labelBase, { right: 13, opacity: offOpacity, color: Colors.textLight }]}
        >
          OFF
        </Animated.Text>

        <Animated.View
          style={[
            {
              position: "absolute",
              top: PADDING,
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: Colors.white,
              transform: [{ translateX }],
            },
            thumbShadow,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}