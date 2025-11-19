# Web

Раздел состоит из двух частей:
1. public/ — статичный демо-интерфейс (index.html, app.js, styles.css). FastAPI монтирует его на /web, так что достаточно запустить backend и открыть http://127.0.0.1:8000/.
2. src/ — набор React/TypeScript-компонентов (Layout, TaskList, HabitList, pages). Их можно перенести в Vite/Next/CRA, когда потребуется полноценный SPA.

TODO: внедрить state-management, авторизацию, более богатый UI поверх REST /api/v1.
