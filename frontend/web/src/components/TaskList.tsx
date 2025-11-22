import React from "react";

export type TaskListProps = {
  tasks: { id: string; title: string; status: string }[];
};

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(tasks.map((task) => [task.id, true])),
  );

  React.useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      tasks.forEach((task) => {
        if (next[task.id] === undefined) {
          next[task.id] = true;
        }
      });
      return next;
    });
  }, [tasks]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!tasks.length) {
    return <div style={{ color: "#6b7280" }}>Нет задач для отображения</div>;
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 12 }}>
      {tasks.map((task) => {
        const isOpen = expanded[task.id] ?? true;
        return (
          <li
            key={task.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#fff",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{task.title}</span>
              <button
                type="button"
                onClick={() => toggle(task.id)}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {isOpen ? "Свернуть" : "Развернуть"}
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 10, color: "#374151", display: "grid", gap: 6 }}>
                <div>
                  <strong>Статус:</strong> {task.status}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Полный функционал задачи доступен в развернутом режиме.
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default TaskList;
