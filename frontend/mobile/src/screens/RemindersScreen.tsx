import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import ReminderItem, { ReminderItemProps } from "../components/ReminderItem";

const mockReminders: ReminderItemProps[] = [
  { id: "1", type: "time", label: "Полить растения в 19:00" },
  { id: "2", type: "weather", label: "Если солнечно, выйти на прогулку" },
];

const RemindersScreen = () => (
  <View style={styles.container}>
    {/* TODO: CRUD через /api/v1/reminders */}
    <FlatList data={mockReminders} renderItem={({ item }) => <ReminderItem {...item} />} keyExtractor={(item) => item.id} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default RemindersScreen;
