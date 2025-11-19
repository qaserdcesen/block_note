import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import ReminderItem, { ReminderItemProps } from "../components/ReminderItem";

const mockReminders: ReminderItemProps[] = [
  { id: "1", type: "time", label: "Water the plants" },
  { id: "2", type: "weather", label: "Go for a run if it is sunny" },
];

const RemindersScreen = () => (
  <View style={styles.container}>
    {/* TODO: CRUD via /api/v1/reminders */}
    <FlatList data={mockReminders} renderItem={({ item }) => <ReminderItem {...item} />} keyExtractor={(item) => item.id} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default RemindersScreen;
