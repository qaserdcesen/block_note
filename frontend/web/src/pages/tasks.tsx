import React from "react";

import Layout from "../components/Layout";
import TaskList from "../components/TaskList";

const TasksPage = () => (
  <Layout>
    <h1>Задачи</h1>
    {/* TODO: CRUD via /api/v1/tasks */}
    <TaskList tasks={[]} />
  </Layout>
);

export default TasksPage;
