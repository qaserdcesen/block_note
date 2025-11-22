import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type HabitItemProps = {
  id: string;
  name: string;
  schedule: string;
  isActive: boolean;
};

const HabitItem: React.FC<HabitItemProps> = ({ name, schedule, isActive }) => {
  const [isOpen, setIsOpen] = useState(true);
  const statusLabel = isActive ? "Активна" : "Выключена";

  return (
    <View style={[styles.container, !isActive && styles.inactive]}>
      <Pressable style={styles.header} onPress={() => setIsOpen((prev) => !prev)}>
        <Text style={styles.title}>{name}</Text>
        <Text style={styles.toggle}>{isOpen ? "Свернуть" : "Развернуть"}</Text>
      </Pressable>
      {isOpen && (
        <View style={styles.body}>
          <Text style={styles.row}>График: {schedule}</Text>
          <Text style={styles.row}>Статус: {statusLabel}</Text>
          <Text style={styles.helper}>Полный функционал привычки доступен в развернутом виде.</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 12, borderRadius: 12, backgroundColor: "#eaf6ff", marginBottom: 8 },
  inactive: { opacity: 0.5 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 16, fontWeight: "600", flex: 1, marginRight: 12 },
  toggle: { color: "#1f6feb", fontWeight: "600" },
  body: { marginTop: 8 },
  row: { color: "#111", marginBottom: 4 },
  helper: { color: "#4b5563", fontSize: 12 },
});

export default HabitItem;
