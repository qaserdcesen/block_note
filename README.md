# Contextual Task & Habit Manager

Умный менеджер задач/привычек/напоминаний. Репозиторий организован как монорепо: FastAPI backend и два фронта (React Native заготовка + статичный web UI). Всё можно запустить локально без интеграций с LLM/погодой/геоданными.

## Структура
`
root/
  backend/            # FastAPI-приложение и бизнес-логика
  frontend/mobile/    # Заготовка Expo/React Native (структура экранов)
  frontend/web/
    public/           # Готовый статичный демо-интерфейс (index.html + app.js)
    src/              # React-компоненты/страницы для дальнейшего развития
`

Основные модули backend:
- pp/api — REST-роуты по доменам (auth, tasks, habits, reminders, assistant).
- pp/services — бизнес-логика, напоминания, уведомления, контекст.
- pp/models — SQLAlchemy 2.x модели/enum/relations.
- pp/schemas — Pydantic v2 DTO.
- pp/core — конфигурация, безопасность, планировщик, stub клиента LLM.
- pp/workers — фоновые задачи (проверка напоминаний).

## Настройка окружения
`ash
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env  # отредактируйте секреты/БД/таймзону
`

Что положить в .env:
- APP_NAME, DATABASE_URL (по умолчанию SQLite data/app.db), JWT_SECRET_KEY, SCHEDULER_TIMEZONE.
- Параметры LLM оставлены на будущее, но для демо не используются.

## Запуск
`ash
cd backend
uvicorn app.main:app --reload
`

При старте:
1. Создаются таблицы SQLite (путь ackend/data/app.db).
2. Регистрируются API-роуты по адресу http://127.0.0.1:8000/api/v1/....
3. Запускается APScheduler, который каждые 5 минут проверяет time-based напоминания.
4. Монтируется статичный web UI (rontend/web/public) на /web и корневой / редиректит туда.

## Как «увидеть» функционал
1. После запуска откройте http://127.0.0.1:8000/ — простое SPA без сборки (HTML+JS).
2. На вкладке «Регистрация и вход» создайте пользователя и выполните login (JWT хранится в localStorage).
3. Блок «Задачи»: выберите дату, заведите задачи, отметьте как «Готово» или удалите — данные идут в /api/v1/tasks.
4. Блок «Привычки»: создайте записи, смотрите список.
5. Блок «Напоминания»: создайте time-based напоминание (scheduler будет обрабатывать каждую минуту запуска worker'а).
6. Блок «Ассистент»: отправьте простые команды («создай задачу завтра...», «напомни через час») — rule-based сценарий создаст задачу или напоминание и вернёт ответ (без настоящего LLM).

## REST-эндоинты (если хотите работать через Postman/curl)
1. POST /api/v1/auth/register — создать пользователя.
2. POST /api/v1/auth/login — получить JWT.
3. GET/POST/PATCH/DELETE /api/v1/tasks + ?date=YYYY-MM-DD.
4. GET/POST/PATCH /api/v1/habits и GET/POST /api/v1/habits/{habit_id}/logs.
5. GET/POST/PATCH/DELETE /api/v1/reminders.
6. POST /api/v1/assistant/message — чат с rule-based ассистентом.

## Фронтенды
- **frontend/web/public** — минимальный runnable UI (HTML/CSS/JS), который общается с backend по AJAX.
- **frontend/mobile/src** — структура экранов и компонентов для будущего Expo-приложения.
- **frontend/web/src** — TypeScript-компоненты/страницы (можно перенести в Vite/Next проект).

## Дальнейшие шаги
- Подключить реальный LLM/внешние контексты в pp/core/llm_client.py и context_service.py.
- Добавить миграции Alembic и автоматические тесты.
- Развить полноценный React/React Native клиенты поверх REST API.
