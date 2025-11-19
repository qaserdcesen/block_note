import React, { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const ChatScreen = () => {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const sendMessage = () => {
    if (!message.trim()) return;
    setHistory((prev) => [...prev, `You: ${message}`]);
    // TODO: POST /api/v1/assistant/message and append assistant reply
    setMessage("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.history}>
        {history.map((line, index) => (
          <Text key={index}>{line}</Text>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Ask the assistant..."
        value={message}
        onChangeText={setMessage}
      />
      <Button title="Send" onPress={sendMessage} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  history: { flex: 1, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
});

export default ChatScreen;
