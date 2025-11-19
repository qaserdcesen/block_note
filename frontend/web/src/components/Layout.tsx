import React, { PropsWithChildren } from "react";

const Layout: React.FC<PropsWithChildren> = ({ children }) => (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
    <header style={{ padding: "1rem", borderBottom: "1px solid #eee" }}>
      <strong>Contextual Planner</strong>
    </header>
    <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    <footer style={{ padding: "1rem", borderTop: "1px solid #eee", fontSize: 12 }}>
      TODO: link to /api/v1 backend actions
    </footer>
  </div>
);

export default Layout;
