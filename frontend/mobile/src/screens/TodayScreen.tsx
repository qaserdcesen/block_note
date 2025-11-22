import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const TodayScreen = () => {
  // TODO: получать /api/v1/tasks?date=YYYY-MM-DD для сводки
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Сегодня</Text>
      <View style={styles.card}>
        <Text>Здесь появится сводка по задачам и привычкам за день.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16 },
  heading: { fontSize: 28, fontWeight: "600", marginBottom: 12 },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f4f4f8" },
});

export default TodayScreen;
