import React from "react";
import { FlatList, StyleSheet, View } from "react-native";

import TaskItem, { TaskItemProps } from "../components/TaskItem";

const mockTasks: TaskItemProps[] = [
  { id: "1", title: "Подготовить еженедельный отчёт", status: "in_progress" },
  { id: "2", title: "Запланировать звонок с командой", status: "pending" },
  { id: "3", title: "Сходить в спортзал", status: "done" },
];

const TasksScreen = () => {
  // TODO: получать /api/v1/tasks с учётом выбранной даты
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
