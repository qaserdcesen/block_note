const apiBase = "/api/v1";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const state = {
  token: localStorage.getItem("cthm_token"),
  currentPage: "auth-page",
  assistantHistory: [],
  habitStatuses: {},
};

const statusEl = document.getElementById("status");
const currentUserEl = document.getElementById("current-user");
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
tasksDateInput.value = today;
reminderDate.value = today;
reminderTime.value = "09:00";

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function switchPage(targetId) {
  const button = navButtons.find((btn) => btn.dataset.target === targetId);
  const requiresAuth = button?.dataset.requiresAuth === "true";
  if (requiresAuth && !state.token) {
    setStatus("Авторизуйтесь, чтобы открыть этот раздел", "error");
    targetId = "auth-page";
  }
  state.currentPage = targetId;
  Object.entries(pages).forEach(([id, element]) => {
    element.hidden = id !== targetId;
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
  workspaceGuard.hidden = loggedIn;
  assistantGuard.hidden = loggedIn;
  if (!loggedIn && state.currentPage !== "auth-page") {
    switchPage("auth-page");
  }
}

function updatePanels() {
  const loggedIn = Boolean(state.token);
  currentUserEl.textContent = loggedIn ? "Авторизация успешна" : "Не авторизованы";
  navButtons.forEach((btn) => {
    if (btn.dataset.requiresAuth === "true") {
      btn.disabled = !loggedIn;
    }
  });
  updateGuards();
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchPage(btn.dataset.target));
});

function formatCompletionValue(mode, value) {
  const numeric = Number(value) || 0;
  return mode === "binary" ? (numeric >= 100 ? 100 : 0) : clamp(numeric, 0, 100);
}

function syncCompletionInput(modeSelect, valueInput) {
  const normalized = formatCompletionValue(modeSelect.value, valueInput.value);
  valueInput.value = normalized;
  valueInput.step = modeSelect.value === "binary" ? 100 : 5;
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone"),
    language: formData.get("language"),
  };
  try {
    await fetchJson(`${apiBase}/auth/register`, { method: "POST", body: JSON.stringify(payload) });
    setStatus("Пользователь создан, теперь выполните вход", "success");
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
    setStatus("Авторизация успешна", "success");
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
  if (response.status === 204) {
    return null;
  }

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
    const message = (data && data.detail) || response.statusText || "Ошибка запроса";
    if (response.status === 401) {
      state.token = null;
      localStorage.removeItem("cthm_token");
      updatePanels();
    }
    throw new Error(message);
  }
  return data;
}

function isoFromDateTime(date, time) {
  if (!date) return null;
  const isoString = new Date(`${date}T${time || "00:00"}:00`).toISOString();
  return isoString;
}

async function handleCreateTask(event) {
  event.preventDefault();
  const title = document.getElementById("task-title").value;
  const description = document.getElementById("task-description").value;
  const priority = Number(document.getElementById("task-priority").value) || 1;
  const completionMode = document.getElementById("task-completion-mode").value;
  const completionValueInput = document.getElementById("task-completion-value");
  const completionValue = formatCompletionValue(completionMode, completionValueInput.value);
  completionValueInput.value = completionValue;
  const due = isoFromDateTime(tasksDateInput.value, document.getElementById("task-time").value);
  const payload = {
    title,
    description,
    priority,
    due_datetime: due,
    completion_mode: completionMode,
    completion_value: completionValue,
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
    tasksList.innerHTML = "<p>Нет задач на выбранную дату</p>";
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <header class="card-header">
        <div>
          <strong>${task.title}</strong>
          <p>${task.description || "Без описания"}</p>
        </div>
        <span class="badge">Приоритет ${task.priority}</span>
      </header>
      <p>Статус: <span class="badge badge-neutral">${task.status}</span></p>
      <p>Прогресс: ${task.completion_mode === "percent" ? `${task.completion_value}%` : task.completion_value >= 100 ? "Выполнено" : "Не выполнено"}</p>
    `;

    const controls = document.createElement("div");
    controls.className = "actions stack";

    const completionControls = document.createElement("div");
    completionControls.className = "completion-controls";

    const modeSelect = document.createElement("select");
    [
      { value: "binary", label: "Бинарно" },
      { value: "percent", label: "Процент" },
    ].forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      if (task.completion_mode === option.value) opt.selected = true;
      modeSelect.appendChild(opt);
    });

    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.min = 0;
    valueInput.max = 100;
    valueInput.value = task.completion_value;
    syncCompletionInput(modeSelect, valueInput);
    modeSelect.addEventListener("change", () => syncCompletionInput(modeSelect, valueInput));

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Обновить прогресс";
    applyButton.onclick = () => updateTaskCompletion(task.id, modeSelect.value, valueInput.value);

    completionControls.append(modeSelect, valueInput, applyButton);

    const doneButton = document.createElement("button");
    doneButton.type = "button";
    doneButton.textContent = "Отметить выполненной";
    doneButton.onclick = () => updateTaskCompletion(task.id, "binary", 100);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteTask(task.id);

    controls.append(completionControls, doneButton, deleteBtn);
    card.appendChild(controls);
    tasksList.appendChild(card);
  });
}

async function updateTaskCompletion(taskId, mode, value) {
  try {
    const completion_value = formatCompletionValue(mode, value);
    await apiFetch(`/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ completion_mode: mode, completion_value }),
    });
    setStatus("Прогресс задачи обновлён", "success");
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

async function handleCreateHabit(event) {
  event.preventDefault();
  const payload = {
    name: document.getElementById("habit-name").value,
    description: document.getElementById("habit-description").value,
    schedule_type: document.getElementById("habit-schedule").value,
    completion_mode: document.getElementById("habit-completion-mode").value,
    completion_value: formatCompletionValue(
      document.getElementById("habit-completion-mode").value,
      document.getElementById("habit-completion-value").value
    ),
    is_active: true,
  };
  document.getElementById("habit-completion-value").value = payload.completion_value;
  try {
    await apiFetch("/habits", { method: "POST", body: JSON.stringify(payload) });
    document.getElementById("habit-name").value = "";
    document.getElementById("habit-description").value = "";
    setStatus("Привычка сохранена", "success");
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

function habitStatusText(habitId) {
  const log = state.habitStatuses[habitId];
  if (!log) return "Нет отметок";
  return `${log.status === "done" ? "Выполнено" : "Пропущено"} (${log.date})`;
}

function renderHabits(habits) {
  habitsList.innerHTML = "";
  if (!habits.length) {
    habitsList.innerHTML = "<p>Нет привычек</p>";
    return;
  }

  habits.forEach((habit) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <header class="card-header">
        <div>
          <strong>${habit.name}</strong>
          <p>${habit.description || "Без описания"}</p>
        </div>
        <span class="badge">${habit.schedule_type}</span>
      </header>
      <p>Статус выполнения: ${habitStatusText(habit.id)}</p>
      <p>Режим отметки: ${habit.completion_mode === "percent" ? "Процент" : "Выполнил / не выполнил"}</p>
      <p>Текущее значение: ${habit.completion_mode === "percent" ? `${habit.completion_value}%` : habit.completion_value >= 100 ? "Выполнено" : "Не выполнено"}</p>
    `;

    const controls = document.createElement("div");
    controls.className = "actions stack";

    const completionControls = document.createElement("div");
    completionControls.className = "completion-controls";
    const modeSelect = document.createElement("select");
    [
      { value: "binary", label: "Бинарно" },
      { value: "percent", label: "Процент" },
    ].forEach((option) => {
      const opt = document.createElement("option");
      opt.value = option.value;
      opt.textContent = option.label;
      if (habit.completion_mode === option.value) opt.selected = true;
      modeSelect.appendChild(opt);
    });
    const valueInput = document.createElement("input");
    valueInput.type = "number";
    valueInput.min = 0;
    valueInput.max = 100;
    valueInput.value = habit.completion_value;
    syncCompletionInput(modeSelect, valueInput);
    modeSelect.addEventListener("change", () => syncCompletionInput(modeSelect, valueInput));

    const applyButton = document.createElement("button");
    applyButton.type = "button";
    applyButton.textContent = "Обновить прогресс";
    applyButton.onclick = () => updateHabitCompletion(habit.id, modeSelect.value, valueInput.value);

    completionControls.append(modeSelect, valueInput, applyButton);

    const doneBtn = document.createElement("button");
    doneBtn.type = "button";
    doneBtn.textContent = "Отметить выполнено сегодня";
    doneBtn.onclick = () => logHabitStatus(habit.id, "done");

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.textContent = "Отметить пропуск";
    skipBtn.onclick = () => logHabitStatus(habit.id, "skipped");

    controls.append(completionControls, doneBtn, skipBtn);
    card.appendChild(controls);
    habitsList.appendChild(card);
  });
}

async function updateHabitCompletion(habitId, mode, value) {
  try {
    const completion_value = formatCompletionValue(mode, value);
    await apiFetch(`/habits/${habitId}`, {
      method: "PATCH",
      body: JSON.stringify({ completion_mode: mode, completion_value }),
    });
    setStatus("Прогресс привычки обновлён", "success");
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
    setStatus("Статус привычки записан", "success");
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
    trigger_timezone: "UTC",
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
    remindersList.innerHTML = "<p>Нет активных напоминаний</p>";
    return;
  }
  reminders.forEach((reminder) => {
    const card = document.createElement("article");
    card.className = "card";
    const dateStr = reminder.trigger_time ? new Date(reminder.trigger_time).toLocaleString() : "-";
    card.innerHTML = `<strong>${reminder.type}</strong><p>${reminder.behavior_rule || ""}</p><p>Время: ${dateStr}</p>`;
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
    setStatus("Авторизуйтесь для доступа к ассистенту", "error");
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
    state.assistantHistory.unshift({ user: message, reply: response.reply, ts: new Date().toLocaleTimeString() });
    renderAssistantHistory();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderAssistantHistory() {
  assistantHistoryEl.innerHTML = "";
  if (!state.assistantHistory.length) {
    assistantHistoryEl.innerHTML = "<p>Диалог пуст</p>";
    return;
  }
  state.assistantHistory.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<p><strong>Вы:</strong> ${item.user}</p><p><strong>Ассистент:</strong> ${item.reply}</p><small>${item.ts}</small>`;
    assistantHistoryEl.appendChild(card);
  });
}

async function apiFetch(path, options = {}) {
  return fetchJson(`${apiBase}${path}`, options);
}

async function refreshAll() {
  await Promise.all([loadTasks(), loadHabits(), loadReminders()]);
}

const taskModeSelect = document.getElementById("task-completion-mode");
const taskCompletionValue = document.getElementById("task-completion-value");
const habitModeSelect = document.getElementById("habit-completion-mode");
const habitCompletionValue = document.getElementById("habit-completion-value");

if (taskModeSelect && taskCompletionValue) {
  taskModeSelect.addEventListener("change", () => syncCompletionInput(taskModeSelect, taskCompletionValue));
}
if (habitModeSelect && habitCompletionValue) {
  habitModeSelect.addEventListener("change", () => syncCompletionInput(habitModeSelect, habitCompletionValue));
}

// Инициализация обработчиков
document.getElementById("register-form").addEventListener("submit", handleRegister);
document.getElementById("login-form").addEventListener("submit", handleLogin);
document.getElementById("task-form").addEventListener("submit", handleCreateTask);
document.getElementById("habit-form").addEventListener("submit", handleCreateHabit);
document.getElementById("reminder-form").addEventListener("submit", handleCreateReminder);
document.getElementById("assistant-form").addEventListener("submit", handleAssistant);
tasksDateInput.addEventListener("change", loadTasks);

updatePanels();
switchPage(state.currentPage);
if (state.token) {
  refreshAll();
}
