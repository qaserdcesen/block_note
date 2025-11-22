import React from "react";

import HabitList from "../components/HabitList";
import Layout from "../components/Layout";

const demoHabits = [
  { id: "1", name: "Утренняя зарядка", schedule: "каждый день" },
  { id: "2", name: "Чтение 20 минут", schedule: "по будням" },
  { id: "3", name: "Пробежка", schedule: "по выходным" },
];

const HabitsPage = () => (
  <Layout>
    <h1>Привычки</h1>
    {/* TODO: fetch /api/v1/habits */}
    <HabitList habits={demoHabits} />
  </Layout>
);

export default HabitsPage;
