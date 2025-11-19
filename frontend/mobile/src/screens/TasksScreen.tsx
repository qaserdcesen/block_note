import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import TaskItem, { TaskItemProps } from "../components/TaskItem";

const mockTasks: TaskItemProps[] = [
  { id: "1", title: "Prepare weekly report", status: "pending" },
  { id: "2", title: "Go to the gym", status: "done" },
];

const TasksScreen = () => {
  // TODO: fetch /api/v1/tasks with the selected date
  return (
    <View style={styles.container}>
      <FlatList data={mockTasks} renderItem={({ item }) => <TaskItem {...item} />} keyExtractor={(item) => item.id} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});

export default TasksScreen;
