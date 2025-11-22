import React from "react";

import Layout from "../components/Layout";
import TaskList from "../components/TaskList";

const tasks = [
  { id: "1", title: "Написать спецификацию", status: "в работе" },
  { id: "2", title: "Синк с ассистентом", status: "готово" },
];

const IndexPage = () => (
  <Layout>
    <h1>Сегодня</h1>
    {/* TODO: fetch /api/v1/tasks?date=today */}
    <TaskList tasks={tasks} />
  </Layout>
);

export default IndexPage;
