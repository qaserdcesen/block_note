import React, { PropsWithChildren } from "react";

const palette = {
  bg: "#0b1224",
  glow: "0 22px 60px rgba(0, 0, 0, 0.35)",
  card: "linear-gradient(140deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
  stroke: "rgba(255,255,255,0.12)",
  text: "#e8edff",
  muted: "#9fb2d9",
  accent: "#6b8bff",
};

const shellBackground = `
  radial-gradient(circle at 16% 12%, rgba(107, 139, 255, 0.18), transparent 26%),
  radial-gradient(circle at 82% 10%, rgba(255, 149, 214, 0.12), transparent 30%),
  radial-gradient(circle at 40% 96%, rgba(34, 197, 235, 0.10), transparent 32%),
  ${palette.bg}
`;

const Layout: React.FC<PropsWithChildren> = ({ children }) => (
  <div
    style={{
      minHeight: "100vh",
      background: shellBackground,
      color: palette.text,
      fontFamily: '"Space Grotesk", "Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
      padding: "24px 16px 72px",
    }}
  >
    <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18 }}>
      <header
        style={{
          borderRadius: 18,
          padding: "14px 18px",
          background: palette.card,
          border: `1px solid ${palette.stroke}`,
          boxShadow: palette.glow,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            aria-hidden
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: "linear-gradient(135deg, #6b8bff, #9c7cff)",
              display: "grid",
              placeItems: "center",
              color: palette.bg,
              fontWeight: 800,
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            📌
          </div>
          <div>
            <div style={{ fontWeight: 700, letterSpacing: -0.02, fontSize: 17 }}>Контекстный планировщик</div>
            <div style={{ color: palette.muted, fontSize: 13 }}>Задачи, привычки и напоминания в одном потоке</div>
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${palette.stroke}`,
            color: palette.muted,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#72efdd", display: "inline-block" }} />
          Live
        </div>
      </header>

      <main style={{ flex: 1, display: "grid", gap: 16 }}>{children}</main>

      <footer
        style={{
          borderRadius: 14,
          padding: "12px 14px",
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${palette.stroke}`,
          color: palette.muted,
          fontSize: 12,
        }}
      >
        API-хуки будут подключены к /api/v1. Дизайн адаптирован под тёмную тему и мобильные размеры.
      </footer>
    </div>
  </div>
);

export default Layout;
