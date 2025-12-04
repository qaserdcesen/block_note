import React from "react";

import HabitList, { HabitListProps } from "../components/HabitList";
import Layout from "../components/Layout";

const demoHabits: HabitListProps["habits"] = [
  {
    id: "1",
    name: "Утренняя зарядка",
    emoji: "🏋️‍♂️",
    description: "15 минут разминки и суставной гимнастики перед завтраком.",
    schedule: "каждый день",
    reminder: "07:15",
    tags: ["здоровье", "энергия"],
    category: "Здоровье",
    priority: 4,
    streak: 12,
    progress: 68,
    status: "active",
  },
  {
    id: "2",
    name: "Чтение 20 минут",
    emoji: "📚",
    description: "Читаю нон-фикшн и делаю короткие заметки.",
    schedule: "по будням",
    reminder: "22:15",
    tags: ["фокус", "образование"],
    category: "Саморазвитие",
    priority: 3,
    streak: 5,
    progress: 52,
    status: "building",
  },
  {
    id: "3",
    name: "Пробежка",
    emoji: "🏃‍♂️",
    description: "5 км трусцой, растяжка и вода без телефона.",
    schedule: "по выходным",
    reminder: "09:30",
    tags: ["спорт", "выносливость"],
    category: "Здоровье",
    priority: 5,
    streak: 21,
    progress: 85,
    status: "paused",
  },
];

const HabitsPage = () => (
  <Layout>
    <h1 style={{ margin: "4px 0", letterSpacing: -0.02 }}>Привычки</h1>
    <p style={{ marginTop: 0, color: "#9fb2d9" }}>График, напоминания, серия и прогресс в одном месте.</p>
    {/* TODO: fetch /api/v1/habits */}
    <HabitList habits={demoHabits} />
  </Layout>
);

export default HabitsPage;
