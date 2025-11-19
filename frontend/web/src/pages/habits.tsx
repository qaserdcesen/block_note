import React from "react";

import HabitList from "../components/HabitList";
import Layout from "../components/Layout";

const HabitsPage = () => (
  <Layout>
    <h1>Привычки</h1>
    {/* TODO: fetch /api/v1/habits */}
    <HabitList habits={[]} />
  </Layout>
);

export default HabitsPage;
