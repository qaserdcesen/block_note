const apiBase = "/api/v1";
const state = {
  token: localStorage.getItem("cthm_token"),
  assistantHistory: [],
};

const statusEl = document.getElementById("status");
const currentUserEl = document.getElementById("current-user");
const tasksPanel = document.getElementById("tasks-panel");
const habitsPanel = document.getElementById("habits-panel");
const remindersPanel = document.getElementById("reminders-panel");
const assistantPanel = document.getElementById("assistant-panel");
const tasksList = document.getElementById("tasks-list");
const habitsList = document.getElementById("habits-list");
const remindersList = document.getElementById("reminders-list");
const assistantHistoryEl = document.getElementById("assistant-history");
const tasksDateInput = document.getElementById("tasks-date");
const reminderDate = document.getElementById("reminder-date");
const reminderTime = document.getElementById("reminder-time");

const today = new Date().toISOString().slice(0, 10);
tasksDateInput.value = today;
reminderDate.value = today;
reminderTime.value = "09:00";

function setStatus(message, type = "info") {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function updatePanels() {
  const loggedIn = Boolean(state.token);
  tasksPanel.hidden = !loggedIn;
  habitsPanel.hidden = !loggedIn;
  remindersPanel.hidden = !loggedIn;
  assistantPanel.hidden = !loggedIn;
  currentUserEl.textContent = loggedIn ? "Авторизация успешна" : "Не авторизованы";
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
    const message = (data && data.detail) || response.statusText;
    if (response.status === 401) {
      state.token = null;
      localStorage.removeItem("cthm_token");
      updatePanels();
    }
    throw new Error(message || "Request failed");
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
  const priority = Number(document.getElementById("task-priority").value);
  const due = isoFromDateTime(tasksDateInput.value, document.getElementById("task-time").value);
  const payload = { title, description, priority, due_datetime: due };
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
    tasksList.innerHTML = "<p>Нет задач</p>";
    return;
  }

  tasks.forEach((task) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `<div><strong>${task.title}</strong><p>${task.description || ""}</p></div>
      <p>Статус: <span class="badge">${task.status}</span> | Приоритет: ${task.priority}</p>`;

    const controls = document.createElement("div");
    controls.className = "actions";

    const doneBtn = document.createElement("button");
    doneBtn.textContent = "Готово";
    doneBtn.onclick = () => updateTask(task.id, { status: "done" });
    controls.appendChild(doneBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteTask(task.id);
    controls.appendChild(deleteBtn);

    card.appendChild(controls);
    tasksList.appendChild(card);
  });
}

async function updateTask(id, payload) {
  try {
    await apiFetch(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
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
    is_active: true,
  };
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
    renderHabits(habits);
  } catch (error) {
    renderHabits([]);
    setStatus(error.message, "error");
  }
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
    card.innerHTML = `<strong>${habit.name}</strong>
      <p>${habit.description || ""}</p>
      <p>Тип: ${habit.schedule_type}</p>`;
    habitsList.appendChild(card);
  });
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
  const messageInput = document.getElementById("assistant-message");
  const message = messageInput.value.trim();
  if (!message) return;
  messageInput.value = "";
  try {
    const response = await apiFetch("/assistant/message", { method: "POST", body: JSON.stringify({ user_message: message }) });
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

// Инициализация обработчиков
document.getElementById("register-form").addEventListener("submit", handleRegister);
document.getElementById("login-form").addEventListener("submit", handleLogin);
document.getElementById("task-form").addEventListener("submit", handleCreateTask);
document.getElementById("habit-form").addEventListener("submit", handleCreateHabit);
document.getElementById("reminder-form").addEventListener("submit", handleCreateReminder);
document.getElementById("assistant-form").addEventListener("submit", handleAssistant);
tasksDateInput.addEventListener("change", loadTasks);

updatePanels();
if (state.token) {
  refreshAll();
}
