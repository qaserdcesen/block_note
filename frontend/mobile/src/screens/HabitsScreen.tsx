import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import HabitItem, { HabitItemProps } from "../components/HabitItem";

const mockHabits: HabitItemProps[] = [
  { id: "1", name: "Reading", schedule: "daily", isActive: true },
  { id: "2", name: "Running", schedule: "weekly", isActive: false },
];

const HabitsScreen = () => (
  <View style={styles.container}>
    {/* TODO: wire up /api/v1/habits and /logs endpoints */}
    <FlatList data={mockHabits} renderItem={({ item }) => <HabitItem {...item} />} keyExtractor={(item) => item.id} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default HabitsScreen;
