import React from "react";

import Layout from "../components/Layout";
import TaskList from "../components/TaskList";

const demoTasks = [
  { id: "1", title: "Спланировать неделю", status: "В работе" },
  { id: "2", title: "Подготовить презентацию", status: "В ожидании" },
  { id: "3", title: "Согласовать отпуск", status: "Готово" },
];

const TasksPage = () => (
  <Layout>
    <h1>Задачи</h1>
    {/* TODO: CRUD via /api/v1/tasks */}
    <TaskList tasks={demoTasks} />
  </Layout>
);

export default TasksPage;
