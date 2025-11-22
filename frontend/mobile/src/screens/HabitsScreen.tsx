import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import HabitItem, { HabitItemProps } from "../components/HabitItem";

const mockHabits: HabitItemProps[] = [
  { id: "1", name: "Утренняя зарядка", schedule: "каждый день", isActive: true },
  { id: "2", name: "Чтение 20 минут", schedule: "по будням", isActive: true },
  { id: "3", name: "Пробежка", schedule: "по выходным", isActive: false },
];

const HabitsScreen = () => (
  <View style={styles.container}>
    {/* TODO: подключить /api/v1/habits и /logs */}
    <FlatList data={mockHabits} renderItem={({ item }) => <HabitItem {...item} />} keyExtractor={(item) => item.id} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default HabitsScreen;
