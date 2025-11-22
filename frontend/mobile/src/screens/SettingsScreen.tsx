import React from "react";
import { StyleSheet, Text, View } from "react-native";

const SettingsScreen = () => (
  <View style={styles.container}>
    {/* TODO: управление каналами уведомлений и профилем пользователя */}
    <Text style={styles.heading}>Настройки</Text>
    <Text>Профиль, локализация, часовой пояс и каналы уведомлений.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 22, fontWeight: "600", marginBottom: 6 },
});

export default SettingsScreen;
