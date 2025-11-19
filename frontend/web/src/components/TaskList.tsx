import React from "react";

export type TaskListProps = {
  tasks: { id: string; title: string; status: string }[];
};

const TaskList: React.FC<TaskListProps> = ({ tasks }) => (
  <ul>
    {tasks.map((task) => (
      <li key={task.id}>
        <strong>{task.title}</strong> — {task.status}
      </li>
    ))}
  </ul>
);

export default TaskList;
