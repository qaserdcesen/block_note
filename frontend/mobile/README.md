# Mobile (React Native / Expo) — archived

Фокус фронтенда сместился на Telegram Mini App (см. `frontend/web/public`). Этот каталог оставлен как черновик компонентов/экранов Expo, если когда-нибудь понадобится собрать нативную версию.

Структура черновиков:
- `src/screens` — Today, Chat, Tasks, Habits, Reminders, Settings.
- `src/components` — Task/Habit/Reminder list items.

Если нужна нативная сборка, создайте новый проект Expo (`npx create-expo-app`), перенесите эти файлы и подключите тот же REST API (`/api/v1`).
