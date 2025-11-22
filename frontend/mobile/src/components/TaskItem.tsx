import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type TaskItemProps = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
};

const STATUS_LABELS: Record<TaskItemProps["status"], string> = {
  pending: "В ожидании",
  in_progress: "В работе",
  done: "Готово",
  cancelled: "Отменено",
};

const TaskItem: React.FC<TaskItemProps> = ({ title, status }) => {
  const [isOpen, setIsOpen] = useState(true);
  const statusLabel = STATUS_LABELS[status] ?? status;

  return (
    <View style={styles.container}>
      <Pressable style={styles.header} onPress={() => setIsOpen((prev) => !prev)}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.toggle}>{isOpen ? "Свернуть" : "Развернуть"}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.body}>
          <Text style={styles.status}>Статус: {statusLabel}</Text>
          <Text style={styles.helper}>Полный функционал задачи доступен в развернутом виде.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#ddd", marginBottom: 8, backgroundColor: "#fff" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 12 },
  toggle: { color: "#1f6feb", fontWeight: "600" },
  body: { marginTop: 8 },
  status: { color: "#111", marginBottom: 4 },
  helper: { color: "#666", fontSize: 12 },
});

export default TaskItem;
