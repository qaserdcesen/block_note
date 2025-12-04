import React from "react";

import Layout from "../components/Layout";
import TaskList, { TaskListProps } from "../components/TaskList";

const demoTasks: TaskListProps["tasks"] = [
  {
    id: "1",
    title: "Спланировать неделю",
    emoji: "🗓",
    description: "Расставить крупные блоки, встречи, тренировки и личные задачи.",
    status: "in_progress",
    dueDate: "сегодня",
    dueTime: "19:00",
    tags: ["план", "фокус", "личное"],
    category: "Планирование",
    priority: 3,
    progress: 35,
  },
  {
    id: "2",
    title: "Согласовать отпуск",
    emoji: "🌴",
    description: "Проверить даты, отправить заявку в HR и предупредить команду.",
    status: "pending",
    dueDate: "22 дек.",
    dueTime: "10:30",
    tags: ["HR", "личное"],
    category: "Работа",
    priority: 2,
    progress: 20,
  },
  {
    id: "3",
    title: "Доделать автоматизацию отчётов",
    emoji: "🤖",
    description: "Закрыть баг с экспортом и накатить cron в тестовый контур.",
    status: "blocked",
    dueDate: "23 дек.",
    dueTime: "09:00",
    tags: ["автоматизация", "данные", "баг"],
    category: "Работа",
    priority: 5,
    progress: 62,
  },
];

const TasksPage = () => (
  <Layout>
    <h1 style={{ margin: "4px 0", letterSpacing: -0.02 }}>Задачи</h1>
    <p style={{ marginTop: 0, color: "#9fb2d9" }}>Всё с подробными статусами, тегами, сроками и прогрессом.</p>
    {/* TODO: CRUD via /api/v1/tasks */}
    <TaskList tasks={demoTasks} />
  </Layout>
);

export default TasksPage;
