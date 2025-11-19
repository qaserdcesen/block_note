import React from "react";
import { StyleSheet, Text, View } from "react-native";

export type TaskItemProps = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
};

const TaskItem: React.FC<TaskItemProps> = ({ title, status }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.status}>{status}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  status: { color: "#666" },
});

export default TaskItem;
