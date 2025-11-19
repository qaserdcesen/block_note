import React from "react";
import { StyleSheet, Text, View } from "react-native";

const SettingsScreen = () => (
  <View style={styles.container}>
    {/* TODO: manage notification channels and user profile */}
    <Text style={styles.heading}>Settings</Text>
    <Text>Profile, localization, timezone, notification channels</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  heading: { fontSize: 22, fontWeight: "600" },
});

export default SettingsScreen;
