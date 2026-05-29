import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (newName: string) => void;
  currentName: string;
};

export const ChangeNameModal: React.FC<Props> = ({
  visible,
  onClose,
  onSubmit,
  currentName,
}) => {
  const [name, setName] = useState(currentName);
  const [focusedInput, setFocusedInput] = useState<boolean>(false);

  // Efek ini memastikan input field selalu diisi dengan nama terbaru saat modal dibuka
  useEffect(() => {
    if (visible) {
      setName(currentName);
    }
  }, [visible, currentName]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert("Error", "Name cannot be empty.");
      return;
    }
    onSubmit(name.trim());
  };

  const handleCloseModal = () => {
    // Reset state saat modal ditutup
    setName(currentName);
    setFocusedInput(false);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCloseModal}
    >
      <Pressable
        className="flex-1 justify-center items-center bg-black/60"
        onPress={handleCloseModal}
      >
        <Pressable
          className="bg-white rounded-2xl p-6 w-[90%] items-center shadow-lg shadow-black/25"
          onPress={() => {}} // Mencegah modal tertutup saat menekan kontennya
        >
          <Text className="font-poppins-bold text-2xl mb-6 text-primary">
            Change Name
          </Text>

          <View
            className={`w-full flex-row items-center border rounded-xl mb-4 bg-white ${
              focusedInput ? "border-primary" : "border-border"
            }`}
          >
            <TextInput
              className="flex-1 h-12 px-4 text-base font-roboto-regular text-text"
              style={{ lineHeight: 20 }}
              placeholder="Enter your new name"
              placeholderTextColor={Colors.textLight}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocusedInput(true)}
              onBlur={() => setFocusedInput(false)}
              autoFocus={true}
            />
          </View>

          {/* Tombol Aksi */}
          <View className="flex-row justify-between w-full mt-4">
            <TouchableOpacity
              className="flex-1 bg-border py-4 rounded-2xl items-center mr-1.5"
              onPress={handleCloseModal}
            >
              <Text className="text-text text-lg font-poppins-semibold">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary py-4 rounded-2xl items-center ml-1.5"
              onPress={handleSave}
            >
              <Text className="text-white text-lg font-poppins-semibold">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};
