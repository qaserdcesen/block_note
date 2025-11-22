import React from "react";

export type HabitListProps = {
  habits: { id: string; name: string; schedule: string }[];
};

const HabitList: React.FC<HabitListProps> = ({ habits }) => {
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(habits.map((habit) => [habit.id, true])),
  );

  React.useEffect(() => {
    setExpanded((prev) => {
      const next = { ...prev };
      habits.forEach((habit) => {
        if (next[habit.id] === undefined) {
          next[habit.id] = true;
        }
      });
      return next;
    });
  }, [habits]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!habits.length) {
    return <div style={{ color: "#6b7280" }}>Нет привычек для отображения</div>;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {habits.map((habit) => {
        const isOpen = expanded[habit.id] ?? true;
        return (
          <div
            key={habit.id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#f9fafb",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <span style={{ fontWeight: 700 }}>{habit.name}</span>
              <button
                type="button"
                onClick={() => toggle(habit.id)}
                style={{
                  border: "1px solid #d1d5db",
                  background: "#fff",
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
                  <strong>График:</strong> {habit.schedule}
                </div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>
                  Полный набор действий по привычке доступен в развернутом режиме.
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default HabitList;
