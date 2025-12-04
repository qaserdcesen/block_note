import React from "react";

type HabitStatus = "building" | "active" | "paused";

export type HabitListProps = {
  habits: {
    id: string;
    name: string;
    emoji?: string;
    description: string;
    schedule: string;
    reminder: string;
    tags: string[];
    category: string;
    priority: number;
    streak: number;
    progress: number;
    status: HabitStatus;
  }[];
};

const colors = {
  card: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  stroke: "rgba(255,255,255,0.12)",
  text: "#e8edff",
  muted: "#9fb2d9",
  accent: "#6b8bff",
  accentAlt: "#9c7cff",
  danger: "#ff6b6b",
};

const statusMeta: Record<
  HabitStatus,
  { label: string; tone: string; text: string; icon: string }
> = {
  building: {
    label: "Формируется",
    tone: "rgba(255, 196, 87, 0.18)",
    text: "#ffd482",
    icon: "🌱",
  },
  active: {
    label: "Активно",
    tone: "rgba(90, 212, 172, 0.18)",
    text: "#abf2dd",
    icon: "🔥",
  },
  paused: {
    label: "Пауза",
    tone: "rgba(255, 107, 107, 0.16)",
    text: "#ffc7c7",
    icon: "⏸",
  },
};

const chipBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 999,
  border: `1px solid ${colors.stroke}`,
  background: "rgba(255,255,255,0.05)",
  color: colors.text,
  fontWeight: 600,
  fontSize: 13,
} as const;

const softFieldStyle = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: `1px solid ${colors.stroke}`,
  color: colors.text,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
} as const;

const TagChip: React.FC<{
  label: string;
  editable?: boolean;
  onRemove?: (label: string) => void;
}> = ({ label, editable, onRemove }) => {
  const [hovered, setHovered] = React.useState(false);
  const showClose = editable && hovered;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={() => setHovered(true)}
      style={{
        ...chipBase,
        padding: "6px 10px",
        background: "rgba(255,255,255,0.07)",
      }}
    >
      <span style={{ color: colors.muted }}>#</span>
      <span>{label}</span>
      {showClose ? (
        <button
          type="button"
          onClick={() => onRemove?.(label)}
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: "none",
            background: "rgba(255,255,255,0.15)",
            color: colors.text,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            padding: 0,
          }}
          aria-label={`Удалить тег ${label}`}
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

const StatusPill: React.FC<{
  status: HabitStatus;
  editable?: boolean;
  onSelect?: (status: HabitStatus) => void;
}> = ({ status, editable, onSelect }) => {
  const [open, setOpen] = React.useState(false);
  const meta = statusMeta[status];

  const handleSelect = (value: HabitStatus) => {
    onSelect?.(value);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", minWidth: 140 }}>
      <button
        type="button"
        onClick={() => (editable ? setOpen((prev) => !prev) : undefined)}
        style={{
          ...chipBase,
          background: meta.tone,
          color: meta.text,
          borderColor: "transparent",
          justifyContent: "space-between",
          width: "100%",
          cursor: editable ? "pointer" : "default",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span aria-hidden>{meta.icon}</span>
          {meta.label}
        </span>
        {editable ? <span style={{ opacity: 0.8 }}>▾</span> : null}
      </button>
      {editable && open ? (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "rgba(14, 20, 38, 0.96)",
            borderRadius: 14,
            border: `1px solid ${colors.stroke}`,
            boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            display: "grid",
            gap: 6,
            padding: 8,
            zIndex: 10,
            minWidth: 180,
          }}
        >
          {Object.entries(statusMeta).map(([key, value]) => (
            <button
              key={key}
              type="button"
              onClick={() => handleSelect(key as HabitStatus)}
              style={{
                ...chipBase,
                width: "100%",
                justifyContent: "flex-start",
                background: value.tone,
                color: value.text,
                borderColor: "transparent",
                cursor: "pointer",
              }}
            >
              <span aria-hidden>{value.icon}</span>
              {value.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const ProgressLine: React.FC<{ value: number }> = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div
      style={{
        flex: 1,
        height: 10,
        borderRadius: 999,
        background: "rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.4)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          height: "100%",
          borderRadius: 999,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.accentAlt})`,
          boxShadow: "0 6px 16px rgba(107,139,255,0.28)",
          transition: "width 180ms ease",
        }}
      />
    </div>
    <span style={{ color: colors.text, fontWeight: 700, minWidth: 36 }}>{Math.round(value)}%</span>
  </div>
);

const HabitCard: React.FC<{ habit: HabitListProps["habits"][number] }> = ({ habit }) => {
  const [localHabit, setLocalHabit] = React.useState(habit);
  const [isEditing, setIsEditing] = React.useState(false);
  const [tagDraft, setTagDraft] = React.useState("");

  React.useEffect(() => setLocalHabit(habit), [habit]);

  const handleTagRemove = (label: string) => {
    if (!isEditing) return;
    setLocalHabit((prev) => ({ ...prev, tags: prev.tags.filter((tag) => tag !== label) }));
  };

  const handleTagAdd = () => {
    const next = tagDraft.trim();
    if (!next || !isEditing) return;
    setLocalHabit((prev) => ({ ...prev, tags: Array.from(new Set([...prev.tags, next])) }));
    setTagDraft("");
  };

  return (
    <div
      style={{
        background: colors.card,
        borderRadius: 24,
        border: `1px solid ${colors.stroke}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
        padding: 18,
        display: "grid",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 6, minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              aria-hidden
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02))",
                display: "grid",
                placeItems: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                fontSize: 20,
                overflow: "hidden",
              }}
            >
              {isEditing ? (
                <input
                  style={{
                    ...softFieldStyle,
                    width: "100%",
                    height: "100%",
                    padding: 0,
                    textAlign: "center",
                    fontSize: 16,
                    background: "transparent",
                    border: "none",
                  }}
                  maxLength={4}
                  value={localHabit.emoji || ""}
                  onChange={(e) => setLocalHabit((prev) => ({ ...prev, emoji: e.target.value }))}
                  aria-label="Эмоджи привычки"
                />
              ) : (
                localHabit.emoji || "🌀"
              )}
            </div>
            {isEditing ? (
              <input
                style={{ ...softFieldStyle, fontSize: 17, fontWeight: 700 }}
                value={localHabit.name}
                onChange={(e) => setLocalHabit((prev) => ({ ...prev, name: e.target.value }))}
                aria-label="Название привычки"
              />
            ) : (
              <div style={{ fontSize: 18, fontWeight: 800, color: colors.text }}>{localHabit.name}</div>
            )}
          </div>
          {isEditing ? (
            <textarea
              style={{ ...softFieldStyle, resize: "vertical", minHeight: 58 }}
              value={localHabit.description}
              onChange={(e) => setLocalHabit((prev) => ({ ...prev, description: e.target.value }))}
              aria-label="Описание привычки"
            />
          ) : (
            <div style={{ color: colors.muted, fontSize: 14, lineHeight: 1.5 }}>{localHabit.description}</div>
          )}
        </div>
        <StatusPill
          status={localHabit.status}
          editable={isEditing}
          onSelect={(next) => setLocalHabit((prev) => ({ ...prev, status: next }))}
        />
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        <div style={{ ...chipBase, flexWrap: "wrap", background: "rgba(255,255,255,0.05)" }}>
          <span aria-hidden>📅</span>
          <div style={{ display: "grid", gap: 2 }}>
            <span style={{ color: colors.muted, fontSize: 12 }}>График</span>
            <span>{localHabit.schedule}</span>
          </div>
          <span aria-hidden style={{ marginLeft: 8 }}>
            ⏰
          </span>
          <div style={{ display: "grid", gap: 2 }}>
            <span style={{ color: colors.muted, fontSize: 12 }}>Напоминание</span>
            <span>{localHabit.reminder}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <div style={{ ...chipBase }}>
            <span aria-hidden>🏷</span>
            <span style={{ color: colors.muted, fontSize: 12 }}>Категория</span>
            <strong>{localHabit.category}</strong>
          </div>
          <div style={{ ...chipBase }}>
            <span aria-hidden>⭐</span>
            <span style={{ color: colors.muted, fontSize: 12 }}>Приоритет</span>
            <strong>{localHabit.priority}</strong>
          </div>
          <div style={{ ...chipBase }}>
            <span aria-hidden>🔥</span>
            <span style={{ color: colors.muted, fontSize: 12 }}>Серия</span>
            <strong>{localHabit.streak} дней</strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ color: colors.muted, fontSize: 13 }}>Теги</span>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
            {localHabit.tags.map((tag) => (
              <TagChip key={tag} label={tag} editable={isEditing} onRemove={handleTagRemove} />
            ))}
            {isEditing ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input
                  style={{ ...softFieldStyle, width: 150 }}
                  placeholder="Новый тег"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" ? handleTagAdd() : undefined)}
                  aria-label="Добавить тег"
                />
                <button
                  type="button"
                  onClick={handleTagAdd}
                  style={{ ...chipBase, padding: "8px 10px", cursor: "pointer", background: colors.accent, color: "#0b1224" }}
                >
                  +
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ ...chipBase, padding: "8px 10px", background: "rgba(255,255,255,0.05)" }}>
            🌈 Прогресс привычки
          </span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <ProgressLine value={localHabit.progress} />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          style={{
            flex: 1,
            minWidth: 180,
            border: "none",
            borderRadius: 16,
            padding: "12px 14px",
            background: "linear-gradient(120deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
            color: colors.text,
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 14px 40px rgba(0,0,0,0.4)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          ✏ {isEditing ? "Сохранить" : "Редактировать"}
        </button>
        <button
          type="button"
          style={{
            flex: 0.9,
            minWidth: 160,
            border: "none",
            borderRadius: 16,
            padding: "12px 14px",
            background: `linear-gradient(120deg, ${colors.danger}, #e14b4b)`,
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
            boxShadow: "0 16px 44px rgba(255,107,107,0.35)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
          }}
        >
          🗑 Удалить
        </button>
      </div>
    </div>
  );
};

const HabitList: React.FC<HabitListProps> = ({ habits }) => {
  if (!habits.length) {
    return <div style={{ color: colors.muted }}>Нет привычек для отображения</div>;
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {habits.map((habit) => (
        <HabitCard key={habit.id} habit={habit} />
      ))}
    </div>
  );
};

export default HabitList;
