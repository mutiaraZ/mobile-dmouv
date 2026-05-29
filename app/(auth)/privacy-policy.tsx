import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";

export default function PrivacyPolicyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-4 border-b border-border bg-white">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text className="font-poppins-bold text-xl text-primary">
          Privacy & Policy
        </Text>
        <View className="w-6" />
      </View>

      {/* Privacy Policy Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
      >
        <Text className="font-roboto-regular text-base text-textLight mb-2 italic">
          Last updated: September 5, 2025
        </Text>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          1. Introduction
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          Welcome to D&apos;mouv (&quot;we&quot;, &quot;our&quot;,
          &quot;us&quot;). We are committed to protecting your personal
          information and your right to privacy. If you have any questions or
          concerns about this privacy notice, or our practices with regards to
          your personal information, please contact us.
        </Text>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          2. Information We Collect
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          The personal information that we collect depends on the context of
          your interactions with us and the application, the choices you make,
          and the products and features you use. The personal information we
          collect may include the following:
        </Text>
        <View className="ml-2.5">
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • Name and Contact Data: We collect your name and email address.
          </Text>
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • Credentials: We collect passwords used for authentication and
            account access.
          </Text>
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • Device and Connection Data: We collect your device&apos;s IP
            address and the SSID of the Wi-Fi network you connect to.
          </Text>
        </View>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          3. How We Use Your Information
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          We use the information we collect or receive for the following
          purposes:
        </Text>
        <View className="ml-2.5">
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • To facilitate account creation and the login process.
          </Text>
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • To manage user accounts and keep them in working order.
          </Text>
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • To provide the core service of motion detection. This may require
            access to your device&apos;s camera feed, which is processed for
            motion and not stored unless motion is detected.
          </Text>
          <Text className="font-roboto-regular text-lg text-textLight leading-7 mb-1 text-justify">
            • To send you administrative information, such as updates to our
            terms, conditions, and policies.
          </Text>
        </View>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          4. Sharing Your Information
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          We only share information with your consent, to comply with laws, to
          provide you with services, to protect your rights, or to fulfill
          business obligations. We do not sell your personal information to
          third parties.
        </Text>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          5. Data Security
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          We have implemented appropriate technical and organizational security
          measures designed to protect the security of any personal information
          we process. However, no electronic transmission over the Internet can
          be guaranteed to be 100% secure.
        </Text>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          6. Changes to This Policy
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          We may update this privacy notice from time to time. The updated
          version will be indicated by an updated Last &quot;Last updated&quot;
          date.
        </Text>

        <Text className="font-poppins-bold text-lg text-text mt-4 mb-2.5">
          7. Contact Us
        </Text>
        <Text className="font-roboto-regular text-lg text-textLight leading-7 text-justify mb-2.5">
          If you have questions or comments about this notice, you may contact
          us at @cpslaboratory on Instagram.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
