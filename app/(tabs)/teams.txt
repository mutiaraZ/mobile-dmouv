import React, { useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect, SvgProps } from "react-native-svg";
import { Colors } from "../../constants/Colors";
import { TEAM_DATA } from "../../constants/team-data";

// --- TYPE DEFINITIONS ---
type Member = {
  id: string;
  name: string;
  code: string;
  major: string;
  profilePic: React.FC<SvgProps> | number;
  quote: string;
  socials: {
    instagram: string;
    linkedin: string;
    github: string;
  };
};

// --- SOCIAL MEDIA ICONS ---
const InstagramIcon = (props: SvgProps) => (
  <Svg
    width={28}
    height={28}
    viewBox="0 0 24 24"
    fill="none"
    stroke={Colors.text}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Rect x={2} y={2} width={20} height={20} rx={5} ry={5} />
    <Path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
    <Path d="M17.5 6.5h.01" />
  </Svg>
);

const LinkedinIcon = (props: SvgProps) => (
  <Svg
    width={28}
    height={28}
    viewBox="0 0 24 24"
    fill="none"
    stroke={Colors.text}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6z" />
    <Rect x={2} y={9} width={4} height={12} />
    <Circle cx={4} cy={4} r={2} />
  </Svg>
);

const GithubIcon = (props: SvgProps) => (
  <Svg
    width={28}
    height={28}
    viewBox="0 0 24 24"
    fill="none"
    stroke={Colors.text}
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <Path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" />
  </Svg>
);

// --- TEAM MEMBER CARD ---
// The comment tail style is complex and best kept as a StyleSheet object
const commentTailStyle = StyleSheet.create({
  tail: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Colors.white,
    position: "absolute",
    bottom: -10,
    alignSelf: "center",
  },
});

const TeamMemberCard = ({
  code,
  name,
  major,
  profilePicSource,
}: {
  code: string;
  name: string;
  major: string;
  profilePicSource: React.FC<SvgProps> | number;
}) => {
  const ProfilePic = profilePicSource;
  return (
    <View className="items-center mb-6">
      <View className="bg-white rounded-xl py-2.5 px-1 w-[105%] shadow-md shadow-black/10 mb-2.5 relative">
        <Text className="font-poppins-bold text-base text-text text-center">
          {code}
        </Text>
        <Text
          className="font-poppins-semibold text-sm text-primary text-center mt-0.5"
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          className="font-poppins-regular text-[9px] text-textLight text-center"
          numberOfLines={1}
        >
          {major}
        </Text>
        <View style={commentTailStyle.tail} />
      </View>
      <View className="w-[108px] h-[108px] rounded-full border-2 border-secondary bg-white justify-center items-center overflow-hidden shadow-lg shadow-black/15">
        {typeof ProfilePic === "number" ? (
          <Image
            source={ProfilePic}
            className="w-full h-full"
            resizeMode="cover"
          />
        ) : (
          <ProfilePic width="100%" height="100%" />
        )}
      </View>
    </View>
  );
};

// --- MAIN TEAMS SCREEN COMPONENT ---
export default function TeamsScreen() {
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const handleMemberPress = (member: Member) => {
    setSelectedMember(member);
  };

  const handleCloseModal = () => {
    setSelectedMember(null);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <View className="items-center justify-center pt-16 pb-4 bg-background border-b border-border">
        <View className="items-center">
          <Text className="font-poppins-regular text-lg text-text">
            RESEARCH DIVISION 2023
          </Text>
          <Text
            className="font-roboto-medium text-3xl text-text tracking-wider"
            style={{
              textShadowColor: "rgba(0, 0, 0, 0.2)",
              textShadowOffset: { width: 1, height: 2 },
              textShadowRadius: 4,
            }}
          >
            OUR TEAM
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 90 }}>
        {TEAM_DATA.map((group, index) => (
          <View key={index} className="bg-secondary rounded-xl p-5 mb-5">
            <Text className="font-roboto-semibold-italic text-lg text-primary mb-5 text-center">
              {group.role}
            </Text>
            <View className="flex-row flex-wrap justify-around gap-3">
              {group.members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  className="w-[48%]"
                  onPress={() => handleMemberPress(member)}
                >
                  <TeamMemberCard
                    code={member.code}
                    name={member.name}
                    major={member.major}
                    profilePicSource={member.profilePic}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Member Detail Modal */}
      {selectedMember && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!selectedMember}
          onRequestClose={handleCloseModal}
        >
          <Pressable
            className="flex-1 bg-black/50 justify-end"
            onPress={handleCloseModal}
          >
            <Pressable className="bg-white rounded-t-2xl p-5 pb-20 items-center shadow-lg shadow-black">
              <View className="-mt-16 items-center mb-4">
                <View className="w-[125px] h-[125px] rounded-full border border-white bg-background justify-center items-center overflow-hidden shadow-xl shadow-black/30">
                  {typeof selectedMember.profilePic === "number" ? (
                    <Image
                      source={selectedMember.profilePic}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  ) : (
                    React.createElement(selectedMember.profilePic, {
                      width: "100%",
                      height: "100%",
                    })
                  )}
                </View>
              </View>
              <Text className="font-poppins-bold text-2xl text-primary text-center">
                {selectedMember.name}
              </Text>
              <Text className="font-roboto-medium text-lg text-text text-center mb-1">
                {selectedMember.code}
              </Text>
              <Text className="font-poppins-regular text-base text-textLight text-center mb-4">
                {selectedMember.major}
              </Text>

              <View className="w-full border-t border-border pt-4 mb-5">
                <Text className="font-poppins-semibold text-sm text-text text-center mb-1 uppercase tracking-widest">
                  Motto
                </Text>
                <Text className="font-poppins-regular italic text-base text-textLight text-center px-2.5 leading-5">
                  &quot;{selectedMember.quote}&quot;
                </Text>
              </View>

              <View className="flex-row justify-center gap-6 w-full pt-4 border-t border-border">
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(selectedMember.socials.instagram)
                  }
                >
                  <InstagramIcon />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL(selectedMember.socials.linkedin)
                  }
                >
                  <LinkedinIcon />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedMember.socials.github)}
                >
                  <GithubIcon />
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </SafeAreaView>
  );
}
