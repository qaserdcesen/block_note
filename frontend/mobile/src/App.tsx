import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import TodayScreen from "./screens/TodayScreen";
import ChatScreen from "./screens/ChatScreen";
import TasksScreen from "./screens/TasksScreen";
import HabitsScreen from "./screens/HabitsScreen";
import RemindersScreen from "./screens/RemindersScreen";
import SettingsScreen from "./screens/SettingsScreen";

const Tab = createBottomTabNavigator();

const App = () => (
  <NavigationContainer>
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Сегодня" component={TodayScreen} />
      <Tab.Screen name="Ассистент" component={ChatScreen} />
      <Tab.Screen name="Задачи" component={TasksScreen} />
      <Tab.Screen name="Привычки" component={HabitsScreen} />
      <Tab.Screen name="Напоминания" component={RemindersScreen} />
      <Tab.Screen name="Настройки" component={SettingsScreen} />
    </Tab.Navigator>
  </NavigationContainer>
);

export default App;
