import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const TodayScreen = () => {
  // TODO: fetch /api/v1/tasks?date=YYYY-MM-DD to hydrate overview
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Today</Text>
      <View style={styles.card}>
        <Text>Tasks and habits summary will render here</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 12 },
  heading: { fontSize: 28, fontWeight: "600" },
  card: { padding: 16, borderRadius: 12, backgroundColor: "#f4f4f8" },
});

export default TodayScreen;
