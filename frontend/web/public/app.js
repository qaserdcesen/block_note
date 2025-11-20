const apiBase = "/api/v1";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const tg = window.Telegram?.WebApp;

const state = {
  token: localStorage.getItem("cthm_token"),
  currentPage: "auth-page",
  assistantHistory: [],
  habitStatuses: {},
  userTimezone: localStorage.getItem("cthm_timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  telegramUser: tg?.initDataUnsafe?.user || null,
};

const statusEl = document.getElementById("status");
const currentUserEl = document.getElementById("current-user");
const timezoneIndicator = document.getElementById("timezone-indicator");
const workspaceGuard = document.getElementById("workspace-guard");
const assistantGuard = document.getElementById("assistant-guard");
const tasksList = document.getElementById("tasks-list");
const habitsList = document.getElementById("habits-list");
const remindersList = document.getElementById("reminders-list");
const assistantHistoryEl = document.getElementById("assistant-history");
const tasksDateInput = document.getElementById("tasks-date");
const reminderDate = document.getElementById("reminder-date");
const reminderTime = document.getElementById("reminder-time");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

const pages = {
  "auth-page": document.getElementById("auth-page"),
  "workspace-page": document.getElementById("workspace-page"),
  "assistant-page": document.getElementById("assistant-page"),
};

const today = new Date().toISOString().slice(0, 10);
if (tasksDateInput) tasksDateInput.value = today;
if (reminderDate) reminderDate.value = today;
if (reminderTime) reminderTime.value = "09:00";

initTelegram();
bindNav();
bindForms();
updatePanels();
switchPage(state.currentPage);
if (state.token) {
  refreshAll();
}

function initTelegram() {
  if (!tg) {
    updateUserMeta();
    return;
  }
  if (tg.initDataUnsafe?.user) {
    state.telegramUser = tg.initDataUnsafe.user;
  }
  applyTelegramTheme(tg.themeParams);
  tg.ready();
  tg.expand();
  tg.onEvent?.("themeChanged", () => applyTelegramTheme(tg.themeParams));
  updateUserMeta();
}

function applyTelegramTheme(themeParams) {
  if (!themeParams) return;
  const root = document.documentElement.style;
  const map = {
    bg_color: "--tg-theme-bg-color",
    text_color: "--tg-theme-text-color",
    hint_color: "--tg-theme-hint-color",
    button_color: "--tg-theme-button-color",
    button_text_color: "--tg-theme-button-text-color",
    secondary_bg_color: "--tg-theme-secondary-bg-color",
  };
  Object.entries(map).forEach(([key, cssVar]) => {
    if (themeParams[key]) {
      root.setProperty(cssVar, themeParams[key]);
    }
  });
}

function setStatus(message, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.dataset.type = type;
  if (tg?.HapticFeedback) {
    const style = type === "error" ? "heavy" : type === "success" ? "medium" : "light";
    tg.HapticFeedback.impactOccurred(style);
  }
}

function switchPage(targetId) {
  const button = navButtons.find((btn) => btn.dataset.target === targetId);
  const requiresAuth = button?.dataset.requiresAuth === "true";
  if (requiresAuth && !state.token) {
    setStatus("Нужен вход, чтобы открыть этот раздел.", "error");
    targetId = "auth-page";
  }
  state.currentPage = targetId;
  Object.entries(pages).forEach(([id, element]) => {
    if (element) element.hidden = id !== targetId;
  });
  navButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.target === targetId);
    if (btn.dataset.requiresAuth === "true") {
      btn.disabled = !state.token;
    }
  });
  updateGuards();
}

function updateGuards() {
  const loggedIn = Boolean(state.token);
  if (workspaceGuard) workspaceGuard.hidden = loggedIn;
  if (assistantGuard) assistantGuard.hidden = loggedIn;
  if (!loggedIn && state.currentPage !== "auth-page") {
    switchPage("auth-page");
  }
}

function updateUserMeta() {
  const loggedIn = Boolean(state.token);
  const tgLabel = state.telegramUser?.username || state.telegramUser?.first_name || null;
  const prefix = loggedIn ? "Авторизован" : "Гость";
  currentUserEl.textContent = tgLabel ? `${prefix} · ${tgLabel}` : prefix;
  if (timezoneIndicator) {
    timezoneIndicator.textContent = state.userTimezone || "UTC";
  }
}

function updatePanels() {
  const loggedIn = Boolean(state.token);
  navButtons.forEach((btn) => {
    if (btn.dataset.requiresAuth === "true") {
      btn.disabled = !loggedIn;
    }
  });
  updateUserMeta();
  updateGuards();
}

function bindNav() {
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchPage(btn.dataset.target));
  });
}

function bindForms() {
  document.getElementById("register-form")?.addEventListener("submit", handleRegister);
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);
  document.getElementById("task-form")?.addEventListener("submit", handleCreateTask);
  document.getElementById("habit-form")?.addEventListener("submit", handleCreateHabit);
  document.getElementById("reminder-form")?.addEventListener("submit", handleCreateReminder);
  document.getElementById("assistant-form")?.addEventListener("submit", handleAssistant);
  tasksDateInput?.addEventListener("change", loadTasks);

  const taskCompletionValue = document.getElementById("task-completion-value");
  const taskCompletionToggle = document.getElementById("task-done");
  const habitCompletionValue = document.getElementById("habit-completion-value");
  const habitCompletionToggle = document.getElementById("habit-done");

  linkCompletionInputs(taskCompletionValue, taskCompletionToggle);
  linkCompletionInputs(habitCompletionValue, habitCompletionToggle);
}

function normalizeCompletionValue(value) {
  return clamp(Number(value) || 0, 0, 100);
}

function completionStatusFromValue(value) {
  if (value >= 100) return "done";
  if (value > 0) return "in_progress";
  return "pending";
}

function linkCompletionInputs(valueInput, checkbox) {
  if (!valueInput || !checkbox) return;
  valueInput.addEventListener("change", () => {
    const normalized = normalizeCompletionValue(valueInput.value);
    valueInput.value = normalized;
    checkbox.checked = normalized >= 100;
  });
  checkbox.addEventListener("change", () => {
    valueInput.value = checkbox.checked ? 100 : 0;
  });
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const timezone = formData.get("timezone") || state.userTimezone || "UTC";
  const language = formData.get("language") || "ru";
  const payload = {
    email: (formData.get("email") || "").trim(),
    password: (formData.get("password") || "").trim(),
    timezone,
    language,
  };
  if (!payload.email || !payload.password) {
    setStatus("Введите e-mail и пароль", "error");
    return;
  }
  if (state.telegramUser?.id) payload.telegram_id = state.telegramUser.id;
  if (state.telegramUser?.username) payload.telegram_username = state.telegramUser.username;
  try {
    await fetchJson(`${apiBase}/auth/register`, { method: "POST", body: JSON.stringify(payload) });
    state.userTimezone = timezone;
    localStorage.setItem("cthm_timezone", timezone);
    updateUserMeta();
    setStatus("Аккаунт создан, теперь можно войти.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
  };
  try {
    const data = await fetchJson(`${apiBase}/auth/login`, { method: "POST", body: JSON.stringify(payload) });
    state.token = data.access_token;
    localStorage.setItem("cthm_token", state.token);
    setStatus("Вход выполнен", "success");
    updatePanels();
    switchPage("workspace-page");
    await refreshAll();
  } catch (error) {
    state.token = null;
    localStorage.removeItem("cthm_token");
    updatePanels();
    setStatus(error.message, "error");
  }
}

async function fetchJson(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token && !url.includes("/auth/")) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, { ...options, headers });
  if (response.status === 204) return null;

  const rawText = await response.text();
  let data = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { detail: rawText };
    }
  }

  if (!response.ok) {
    const message = formatErrorDetail(data?.detail) || response.statusText || "Ошибка запроса";
    if (response.status === 401) {
      state.token = null;
      localStorage.removeItem("cthm_token");
      updatePanels();
    }
    throw new Error(message);
  }
  return data;
}

function formatErrorDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg || d?.detail || JSON.stringify(d)))
      .filter(Boolean)
      .join("; ");
  }
  if (detail?.msg) return detail.msg;
  if (detail?.detail) return detail.detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

function isoFromDateTime(date, time) {
  if (!date) return null;
  return `${date}T${time || "00:00"}:00`;
}

async function handleCreateTask(event) {
  event.preventDefault();
  const title = document.getElementById("task-title").value;
  const description = document.getElementById("task-description").value;
  const priority = Number(document.getElementById("task-priority").value) || 1;
  const due = isoFromDateTime(tasksDateInput.value, document.getElementById("task-time").value);
  const payload = {
    title,
    description,
    priority,
    due_datetime: due,
    completion_mode: "percent",
    completion_value: 0,
    status: "pending",
  };
  try {
    await apiFetch("/tasks", { method: "POST", body: JSON.stringify(payload) });
    document.getElementById("task-title").value = "";
    document.getElementById("task-description").value = "";
    setStatus("Задача добавлена", "success");
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}
async function loadTasks() {
  if (!state.token) return;
  const date = tasksDateInput.value;
  try {
    const tasks = await apiFetch(`/tasks?date=${date}`);
    renderTasks(tasks);
  } catch (error) {
    renderTasks([]);
    setStatus(error.message, "error");
  }
}

function renderTasks(tasks) {
  tasksList.innerHTML = "";
  if (!tasks.length) {
    tasksList.innerHTML = '<p class="muted">На выбранную дату задач нет</p>';
    return;
  }
  tasks.forEach((task) => {
    const statusKey = completionStatusFromValue(task.completion_value);
    const statusLabel = taskStatusLabel(statusKey);
    const dueLabel = task.due_datetime
      ? new Date(task.due_datetime).toLocaleString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
          month: "short",
          day: "numeric",
        })
      : "Без срока";
    const card = document.createElement("article");
    card.className = "card entry";
    card.innerHTML = `
      <header class="card-header">
        <div>
          <strong>${task.title}</strong>
          <p class="muted">${task.description || "Без описания"}</p>
        </div>
        <span class="badge">Приоритет ${task.priority}</span>
      </header>
      <p>Статус: <span class="badge badge-neutral">${statusLabel}</span></p>
      <p>Срок: <span class="badge badge-neutral">${dueLabel}</span></p>
    `;
    const controls = document.createElement("div");
    controls.className = "actions stack";
    const completionControls = document.createElement("div");
    completionControls.className = "completion-controls";
    const doneLabel = document.createElement("label");
    doneLabel.className = "checkbox-inline";
    const doneToggle = document.createElement("input");
    doneToggle.type = "checkbox";
    doneToggle.checked = task.completion_value >= 100;
    const valueInput = document.createElement("input");
    valueInput.type = "range";
    valueInput.min = 0;
    valueInput.max = 100;
    valueInput.step = 5;
    valueInput.value = task.completion_value;
    valueInput.className = "completion-slider";
    const valueBadge = document.createElement("span");
    valueBadge.className = "badge badge-neutral";
    valueBadge.textContent = `${valueInput.value}%`;
    valueInput.addEventListener("input", () => {
      const normalized = normalizeCompletionValue(valueInput.value);
      valueInput.value = normalized;
      valueBadge.textContent = `${normalized}%`;
      doneToggle.checked = normalized >= 100;
    });
    valueInput.addEventListener("change", () => updateTaskCompletion(task.id, valueInput.value));
    doneToggle.onchange = () => {
      const nextValue = doneToggle.checked ? 100 : 0;
      valueInput.value = nextValue;
      valueBadge.textContent = `${nextValue}%`;
      updateTaskCompletion(task.id, nextValue);
    };
    doneLabel.append(doneToggle, document.createTextNode("Галочка: выполнено"));
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Обновить прогресс";
    applyButton.onclick = () => updateTaskCompletion(task.id, valueInput.value);
    completionControls.append(doneLabel, valueInput, valueBadge, applyButton);
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteTask(task.id);
    controls.append(completionControls, deleteBtn);
    card.appendChild(controls);
    tasksList.appendChild(card);
  });
}
async function updateTaskCompletion(taskId, value) {
  try {
    const completion_value = normalizeCompletionValue(value);
    const payload = {
      completion_mode: "percent",
      completion_value,
      status: completionStatusFromValue(completion_value),
    };
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    setStatus("Статус задачи обновлен", "success");
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}
async function deleteTask(id) {
  try {
    await apiFetch(`/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function taskStatusLabel(status) {
  const map = {
    pending: "Запланирована",
    in_progress: "В работе",
    done: "Выполнена",
    cancelled: "Отменена",
  };
  return map[status] || "-";
}

async function handleCreateHabit(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById("habit-name").value,
    description: document.getElementById("habit-description").value,
    schedule_type: document.getElementById("habit-schedule").value,
    completion_mode: "percent",
    completion_value: 0,
    is_active: true,
  };
  try {
    await apiFetch("/habits", { method: "POST", body: JSON.stringify(payload) });
    document.getElementById("habit-name").value = "";
    document.getElementById("habit-description").value = "";
    setStatus("Привычка создана", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}
async function loadHabits() {
  if (!state.token) return;
  try {
    const habits = await apiFetch("/habits");
    await loadHabitStatuses(habits);
    renderHabits(habits);
  } catch (error) {
    renderHabits([]);
    setStatus(error.message, "error");
  }
}

async function loadHabitStatuses(habits) {
  const entries = await Promise.all(
    habits.map(async (habit) => {
      try {
        const logs = await apiFetch(`/habits/${habit.id}/logs`);
        return [habit.id, logs?.[0] || null];
      } catch (error) {
        setStatus(error.message, "error");
        return [habit.id, null];
      }
    })
  );
  state.habitStatuses = Object.fromEntries(entries);
}

function habitStatusText(habit) {
  const log = state.habitStatuses[habit.id];
  const statusKey = completionStatusFromValue(habit.completion_value);
  let label;
  if (log?.status === "skipped") {
    label = "Пропущено";
  } else if (statusKey === "done") {
    label = "Выполнено";
  } else if (statusKey === "in_progress") {
    label = `${habit.completion_value}%`;
  } else {
    label = "Не выполнено";
  }
  if (habit.schedule_type === "weekly" && log) {
    return `${label} (${log.date})`;
  }
  return label;
}
function renderHabits(habits) {
  habitsList.innerHTML = "";
  if (!habits.length) {
    habitsList.innerHTML = '<p class="muted">Пока нет привычек</p>';
    return;
  }
  habits.forEach((habit) => {
    const statusLabel = habitStatusText(habit);
    const card = document.createElement("article");
    card.className = "card entry";
    card.innerHTML = `
      <header class="card-header">
        <div>
          <strong>${habit.name}</strong>
          <p class="muted">${habit.description || "Без описания"}</p>
        </div>
        <span class="badge">${habit.schedule_type}</span>
      </header>
      <p>Статус: ${statusLabel}</p>
    `;
    const controls = document.createElement("div");
    controls.className = "actions stack";
    const completionControls = document.createElement("div");
    completionControls.className = "completion-controls";
    const doneLabel = document.createElement("label");
    doneLabel.className = "checkbox-inline";
    const doneToggle = document.createElement("input");
    doneToggle.type = "checkbox";
    doneToggle.checked = habit.completion_value >= 100;
    const valueInput = document.createElement("input");
    valueInput.type = "range";
    valueInput.min = 0;
    valueInput.max = 100;
    valueInput.step = 5;
    valueInput.value = habit.completion_value;
    valueInput.className = "completion-slider";
    const valueBadge = document.createElement("span");
    valueBadge.className = "badge badge-neutral";
    valueBadge.textContent = `${valueInput.value}%`;
    valueInput.addEventListener("input", () => {
      const normalized = normalizeCompletionValue(valueInput.value);
      valueInput.value = normalized;
      valueBadge.textContent = `${normalized}%`;
      doneToggle.checked = normalized >= 100;
    });
    valueInput.addEventListener("change", () => updateHabitCompletion(habit.id, valueInput.value));
    doneToggle.onchange = () => {
      const nextValue = doneToggle.checked ? 100 : 0;
      valueInput.value = nextValue;
      valueBadge.textContent = `${nextValue}%`;
      updateHabitCompletion(habit.id, nextValue);
    };
    doneLabel.append(doneToggle, document.createTextNode("Галочка: выполнено"));
    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Обновить прогресс";
    applyButton.onclick = () => updateHabitCompletion(habit.id, valueInput.value);
    completionControls.append(doneLabel, valueInput, valueBadge, applyButton);
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.textContent = "Пропустить";
    skipBtn.onclick = () => logHabitStatus(habit.id, "skipped");
    controls.append(completionControls, skipBtn);
    card.appendChild(controls);
    habitsList.appendChild(card);
  });
}
async function updateHabitCompletion(habitId, value) {
  try {
    const completion_value = normalizeCompletionValue(value);
    await apiFetch(`/habits/${habitId}`, {
      method: "PATCH",
      body: JSON.stringify({ completion_mode: "percent", completion_value }),
    });
    setStatus("Прогресс привычки обновлен", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}
async function logHabitStatus(habitId, status) {
  try {
    await apiFetch(`/habits/${habitId}/logs`, {
      method: "POST",
      body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), status }),
    });
    setStatus("Статус привычки зафиксирован", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleCreateReminder(event) {
  event.preventDefault();
  const trigger = isoFromDateTime(reminderDate.value, reminderTime.value);
  const note = document.getElementById("reminder-note").value || "Напоминание";
  const payload = {
    type: "time",
    trigger_time: trigger,
    trigger_timezone: state.userTimezone || "UTC",
    is_active: true,
    behavior_rule: note,
  };
  try {
    await apiFetch("/reminders", { method: "POST", body: JSON.stringify(payload) });
    setStatus("Напоминание создано", "success");
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadReminders() {
  if (!state.token) return;
  try {
    const reminders = await apiFetch("/reminders");
    renderReminders(reminders);
  } catch (error) {
    renderReminders([]);
    setStatus(error.message, "error");
  }
}

function renderReminders(reminders) {
  remindersList.innerHTML = "";
  if (!reminders.length) {
    remindersList.innerHTML = '<p class="muted">Нет активных напоминаний</p>';
    return;
  }
  reminders.forEach((reminder) => {
    const card = document.createElement("article");
    card.className = "card entry";
    const dateStr = reminder.trigger_time ? new Date(reminder.trigger_time).toLocaleString("ru-RU") : "-";
    card.innerHTML = `<strong>${reminder.type}</strong><p class="muted">${reminder.behavior_rule || ""}</p><p>Время: ${dateStr}</p>`;
    const actions = document.createElement("div");
    actions.className = "actions";
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteReminder(reminder.id);
    actions.appendChild(deleteBtn);
    card.appendChild(actions);
    remindersList.appendChild(card);
  });
}

async function deleteReminder(id) {
  try {
    await apiFetch(`/reminders/${id}`, { method: "DELETE" });
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleAssistant(event) {
  event.preventDefault();
  if (!state.token) {
    setStatus("Нужна авторизация для диалога с ассистентом", "error");
    switchPage("auth-page");
    return;
  }
  const messageInput = document.getElementById("assistant-message");
  const message = messageInput.value.trim();
  if (!message) return;
  messageInput.value = "";
  try {
    const response = await apiFetch("/assistant/message", {
      method: "POST",
      body: JSON.stringify({ user_message: message }),
    });
    state.assistantHistory.unshift({ user: message, reply: response.reply, ts: new Date().toLocaleTimeString("ru-RU") });
    renderAssistantHistory();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderAssistantHistory() {
  assistantHistoryEl.innerHTML = "";
  if (!state.assistantHistory.length) {
    assistantHistoryEl.innerHTML = '<p class="muted">Диалог пуст</p>';
    return;
  }
  state.assistantHistory.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card entry";
    card.innerHTML = `<p><strong>Вы:</strong> ${item.user}</p><p><strong>Ассистент:</strong> ${item.reply}</p><small class="muted">${item.ts}</small>`;
    assistantHistoryEl.appendChild(card);
  });
}

async function apiFetch(path, options = {}) {
  return fetchJson(`${apiBase}${path}`, options);
}

async function refreshAll() {
  await Promise.all([loadTasks(), loadHabits(), loadReminders()]);
}