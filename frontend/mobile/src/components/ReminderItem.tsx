import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type ReminderItemProps = {
  id: string;
  type: string;
  label: string;
};

const TYPE_LABELS: Record<string, string> = {
  time: "По времени",
  weather: "По погоде",
  location: "По местоположению",
};

const ReminderItem: React.FC<ReminderItemProps> = ({ type, label }) => {
  const displayType = TYPE_LABELS[type] ?? type;

  return (
    <View style={styles.container}>
      <Text style={styles.type}>{displayType}</Text>
      <Text>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ccc", marginBottom: 8, backgroundColor: "#fff" },
  type: { fontWeight: "600", marginBottom: 4 },
});

export default ReminderItem;
