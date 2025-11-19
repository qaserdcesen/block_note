import React from "react";

export type HabitListProps = {
  habits: { id: string; name: string; schedule: string }[];
};

const HabitList: React.FC<HabitListProps> = ({ habits }) => (
  <div>
    {habits.map((habit) => (
      <div key={habit.id} style={{ marginBottom: 12 }}>
        <strong>{habit.name}</strong>
        <div>{habit.schedule}</div>
      </div>
    ))}
  </div>
);

export default HabitList;
