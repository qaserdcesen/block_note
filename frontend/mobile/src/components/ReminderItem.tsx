import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ReminderItemProps = {
  id: string;
  type: string;
  label: string;
};

const ReminderItem: React.FC<ReminderItemProps> = ({ type, label }) => (
  <View style={styles.container}>
    <Text style={styles.type}>{type}</Text>
    <Text>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ccc", marginBottom: 8 },
  type: { fontWeight: "600", marginBottom: 4 },
});

export default ReminderItem;
