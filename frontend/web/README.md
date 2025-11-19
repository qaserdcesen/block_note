# Web

Deux части:
1. public/ — уже собранный статичный демо (index.html, pp.js, styles.css). FastAPI монтирует его на /web, так что можно просто запустить backend и открыть http://127.0.0.1:8000/.
2. src/ — набор React/TypeScript-компонентов/страниц (Layout, TaskList, HabitList, index/tasks/habits/reminders/settings). Перенесите их в Vite/Next/CRA, когда будете делать полноценный SPA.

TODO: внедрить state-management/маршрутизацию, авторизацию, более богатый UI поверх REST /api/v1.
