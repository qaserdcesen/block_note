import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type HabitItemProps = {
  id: string;
  name: string;
  schedule: string;
  isActive: boolean;
};

const HabitItem: React.FC<HabitItemProps> = ({ name, schedule, isActive }) => (
  <View style={[styles.container, !isActive && styles.inactive]}>
    <Text style={styles.title}>{name}</Text>
    <Text>{schedule}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, backgroundColor: "#eaf6ff", marginBottom: 8 },
  inactive: { opacity: 0.5 },
  title: { fontSize: 16, fontWeight: "600" },
});

export default HabitItem;
