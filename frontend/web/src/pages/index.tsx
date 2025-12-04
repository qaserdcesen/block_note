import React from "react";

import Layout from "../components/Layout";
import TaskList, { TaskListProps } from "../components/TaskList";

const tasks: TaskListProps["tasks"] = [
  {
    id: "1",
    title: "Съесть мороженое на крыше",
    emoji: "🍦",
    description: "Весёлый эксперимент с видом на город. Возьму плед и запасной стаканчик.",
    status: "pending",
    dueDate: "20 дек.",
    dueTime: "12:00",
    tags: ["мороженое", "крыша", "юмор"],
    category: "Развлечения",
    priority: 5,
    progress: 0,
  },
  {
    id: "2",
    title: "Подготовить презентацию",
    emoji: "🧠",
    description: "Собрать слайды по новым фичам, добавить демо и свежие метрики.",
    status: "in_progress",
    dueDate: "21 дек.",
    dueTime: "15:00",
    tags: ["презентация", "отчёт", "демо"],
    category: "Работа",
    priority: 4,
    progress: 48,
  },
];

const IndexPage = () => (
  <Layout>
    <h1 style={{ margin: "4px 0", letterSpacing: -0.02 }}>Сегодня</h1>
    <p style={{ marginTop: 0, color: "#9fb2d9" }}>Быстрый обзор приоритетов и деталей на текущий день.</p>
    {/* TODO: fetch /api/v1/tasks?date=today */}
    <TaskList tasks={tasks} />
  </Layout>
);

export default IndexPage;
