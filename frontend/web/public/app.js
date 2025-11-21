const apiBase = "/api/v1";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tg = window.Telegram?.WebApp;

const state = {
  currentPage: "workspace-page",
  assistantHistory: [],
  habitStatuses: {},
  categories: [],
  tags: [],
  userTimezone: localStorage.getItem("cthm_timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  telegramUser: tg?.initDataUnsafe?.user || null,
};

const el = (id) => document.getElementById(id);
const statusEl = el("status");
const currentUserEl = el("current-user");
const timezoneIndicator = el("timezone-indicator");
const tasksList = el("tasks-list");
const habitsList = el("habits-list");
const remindersList = el("reminders-list");
const assistantHistoryEl = el("assistant-history");
const tasksDateInput = el("tasks-date");
const reminderDate = el("reminder-date");
const reminderTime = el("reminder-time");
const categoriesList = el("categories-list");
const tagsList = el("tags-list");
const taskCategorySelect = el("task-category");
const habitCategorySelect = el("habit-category");
const taskTagsSelect = el("task-tags");
const habitTagsSelect = el("habit-tags");
const navButtons = Array.from(document.querySelectorAll(".nav-btn"));

const pages = {
  "workspace-page": el("workspace-page"),
  "assistant-page": el("assistant-page"),
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
refreshAll();

function initTelegram() {
  if (!tg) {
    updateUserMeta();
    return;
  }
  if (tg.initDataUnsafe?.user) state.telegramUser = tg.initDataUnsafe.user;
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
  Object.entries(map).forEach(([k, cssVar]) => themeParams[k] && root.setProperty(cssVar, themeParams[k]));
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
  state.currentPage = targetId;
  Object.entries(pages).forEach(([id, element]) => element && (element.hidden = id !== targetId));
  navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === targetId));
  updateUserMeta();
}

function updateUserMeta() {
  const rawTgLabel = state.telegramUser?.username || state.telegramUser?.first_name || null;
  const tgLabel = rawTgLabel ? (rawTgLabel.startsWith("@") ? rawTgLabel : `@${rawTgLabel}`) : null;
  const prefix = tgLabel ? `Пользователь ${tgLabel}` : "Гость";
  if (currentUserEl) currentUserEl.textContent = prefix;
  if (timezoneIndicator) timezoneIndicator.textContent = state.userTimezone || "UTC";
}

function updatePanels() {
  updateUserMeta();
}

function bindNav() {
  navButtons.forEach((btn) => btn.addEventListener("click", () => switchPage(btn.dataset.target)));
}

function bindForms() {
  el("task-form")?.addEventListener("submit", handleCreateTask);
  el("habit-form")?.addEventListener("submit", handleCreateHabit);
  el("reminder-form")?.addEventListener("submit", handleCreateReminder);
  el("assistant-form")?.addEventListener("submit", handleAssistant);
  el("category-form")?.addEventListener("submit", handleCreateCategory);
  el("tag-form")?.addEventListener("submit", handleCreateTag);
  tasksDateInput?.addEventListener("change", loadTasks);
  linkCompletionInputs(el("task-completion-value"), el("task-done"));
  linkCompletionInputs(el("habit-completion-value"), el("habit-done"));
}

const normalizeCompletionValue = (value) => clamp(Number(value) || 0, 0, 100);
const completionStatusFromValue = (value) => (value >= 100 ? "done" : value > 0 ? "in_progress" : "pending");

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

async function fetchJson(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
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
    const message = formatErrorDetail(data?.detail) || response.statusText || "Не удалось выполнить запрос";
    throw new Error(message);
  }
  return data;
}

function formatErrorDetail(detail) {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((d) => (typeof d === "string" ? d : d?.msg || d?.detail || JSON.stringify(d)))
      .filter(Boolean)
      .join("; ");
  if (detail?.msg) return detail.msg;
  if (detail?.detail) return detail.detail;
  try {
    return JSON.stringify(detail);
  } catch {
    return String(detail);
  }
}

const isoFromDateTime = (date, time) => (date ? `${date}T${time || "00:00"}:00` : null);
const splitDateTimeParts = (iso) => {
  if (!iso) return { date: "", time: "" };
  const [date, time] = iso.split("T");
  return { date: date || "", time: (time || "").slice(0, 5) };
};
const readSelectedValues = (selectEl) =>
  !selectEl ? [] : Array.from(selectEl.selectedOptions || []).map((o) => Number(o.value)).filter(Boolean);

function populateSelect(selectEl, options, includeEmpty = true) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  if (includeEmpty) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Без категории";
    selectEl.appendChild(empty);
  }
  options.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name;
    selectEl.appendChild(option);
  });
}

function populateTagSelect(selectEl, selectedIds = []) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  state.tags.forEach((tag) => {
    const option = document.createElement("option");
    option.value = tag.id;
    option.textContent = `#${tag.name}`;
    option.selected = selectedIds.includes(tag.id);
    selectEl.appendChild(option);
  });
}

const buildCategorySelect = (selectedId = null) => {
  const select = document.createElement("select");
  populateSelect(select, state.categories);
  if (selectedId) select.value = String(selectedId);
  return select;
};

const buildTagMultiSelect = (selectedIds = []) => {
  const select = document.createElement("select");
  select.multiple = true;
  select.size = 4;
  populateTagSelect(select, selectedIds);
  return select;
};

async function handleCreateCategory(event) {
  event.preventDefault();
  const nameInput = el("category-name");
  const name = (nameInput?.value || "").trim();
  if (!name) return setStatus("Введите название категории", "error");
  try {
    await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name }) });
    if (nameInput) nameInput.value = "";
    setStatus("Категория добавлена", "success");
    await loadTaxonomy();
    await Promise.all([loadTasks(), loadHabits()]);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleCreateTag(event) {
  event.preventDefault();
  const nameInput = el("tag-name");
  const name = (nameInput?.value || "").trim();
  if (!name) return setStatus("Введите тег", "error");
  try {
    await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name }) });
    if (nameInput) nameInput.value = "";
    setStatus("Тег добавлен", "success");
    await loadTaxonomy();
    await Promise.all([loadTasks(), loadHabits()]);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteCategory(id) {
  try {
    await apiFetch(`/categories/${id}`, { method: "DELETE" });
    await loadTaxonomy();
    await Promise.all([loadTasks(), loadHabits()]);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteTag(id) {
  try {
    await apiFetch(`/tags/${id}`, { method: "DELETE" });
    await loadTaxonomy();
    await Promise.all([loadTasks(), loadHabits()]);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadTaxonomy() {
  try {
    const [categories, tags] = await Promise.all([apiFetch("/categories"), apiFetch("/tags")]);
    state.categories = categories || [];
    state.tags = tags || [];
    renderTaxonomy();
    syncCreationSelectors();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function renderTaxonomy() {
  if (categoriesList) {
    categoriesList.innerHTML = "";
    if (!state.categories.length) {
      categoriesList.innerHTML = '<p class="muted">Категорий пока нет</p>';
    } else {
      state.categories.forEach((cat) => {
        const item = document.createElement("div");
        item.className = "chip actionable";
        const label = document.createElement("span");
        label.textContent = cat.name;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ghost-btn";
        remove.textContent = "Удалить";
        remove.onclick = () => deleteCategory(cat.id);
        item.append(label, remove);
        categoriesList.appendChild(item);
      });
    }
  }
  if (tagsList) {
    tagsList.innerHTML = "";
    if (!state.tags.length) {
      tagsList.innerHTML = '<p class="muted">Тегов пока нет</p>';
    } else {
      state.tags.forEach((tag) => {
        const item = document.createElement("div");
        item.className = "chip actionable";
        const label = document.createElement("span");
        label.textContent = `#${tag.name}`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "ghost-btn";
        remove.textContent = "Удалить";
        remove.onclick = () => deleteTag(tag.id);
        item.append(label, remove);
        tagsList.appendChild(item);
      });
    }
  }
}

const syncCreationSelectors = () => {
  populateSelect(taskCategorySelect, state.categories);
  populateSelect(habitCategorySelect, state.categories);
  populateTagSelect(taskTagsSelect);
  populateTagSelect(habitTagsSelect);
};

async function handleCreateTask(event) {
  event.preventDefault();
  const payload = {
    title: el("task-title").value,
    description: el("task-description").value,
    priority: Number(el("task-priority").value) || 1,
    due_datetime: isoFromDateTime(tasksDateInput.value, el("task-time").value),
    completion_mode: "percent",
    completion_value: 0,
    status: "pending",
    category_id: Number(taskCategorySelect?.value) || null,
    tag_ids: readSelectedValues(taskTagsSelect),
  };
  try {
    await apiFetch("/tasks", { method: "POST", body: JSON.stringify(payload) });
    el("task-title").value = "";
    el("task-description").value = "";
    if (taskCategorySelect) taskCategorySelect.value = "";
    if (taskTagsSelect) Array.from(taskTagsSelect.options).forEach((opt) => (opt.selected = false));
    setStatus("Задача создана", "success");
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadTasks() {
  const date = tasksDateInput?.value || today;
  try {
    const tasks = await apiFetch(`/tasks?date=${date}`);
    renderTasks(tasks || []);
  } catch (error) {
    renderTasks([]);
    setStatus(error.message, "error");
  }
}

function taskStatusLabel(status) {
  const map = { pending: "В ожидании", in_progress: "В работе", done: "Готово", cancelled: "Отменена" };
  return map[status] || "-";
}

function renderTasks(tasks) {
  tasksList.innerHTML = "";
  if (!tasks.length) {
    tasksList.innerHTML = '<p class="muted">Для выбранной даты задач нет</p>';
    return;
  }
  tasks.forEach((task) => {
    const statusKey = completionStatusFromValue(task.completion_value);
    const statusLabel = taskStatusLabel(statusKey);
    const dueLabel = task.due_datetime
      ? new Date(task.due_datetime).toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit", month: "short", day: "numeric" })
      : "Без даты";
    const categoryLabel = task.category?.name || "Без категории";
    const tagsLabel = task.tags?.length ? task.tags.map((t) => `#${t.name}`).join(", ") : "Теги не выбраны";

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
      <p class="muted">Категория: ${categoryLabel}</p>
      <p class="muted">Теги: ${tagsLabel}</p>
    `;
    const controls = document.createElement("div");
    controls.className = "actions stack";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Редактировать";
    editBtn.onclick = () => openTaskEditor(task, card);

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
    doneLabel.append(doneToggle, document.createTextNode("Готово"));
    completionControls.append(doneLabel, valueInput, valueBadge);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteTask(task.id);
    controls.append(editBtn, completionControls, deleteBtn);

    card.appendChild(controls);
    tasksList.appendChild(card);
  });
}

const labelWrap = (text, control) => {
  const label = document.createElement("label");
  label.textContent = text;
  label.append(control);
  return label;
};

function openTaskEditor(task, card) {
  card.querySelectorAll(".inline-editor").forEach((el) => el.remove());
  const { date, time } = splitDateTimeParts(task.due_datetime);
  const form = document.createElement("form");
  form.className = "inline-editor";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = task.title;
  const descriptionInput = document.createElement("input");
  descriptionInput.type = "text";
  descriptionInput.value = task.description || "";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = date || tasksDateInput.value;
  const timeInput = document.createElement("input");
  timeInput.type = "time";
  timeInput.value = time || "09:00";
  const priorityInput = document.createElement("input");
  priorityInput.type = "number";
  priorityInput.min = 1;
  priorityInput.max = 10;
  priorityInput.value = task.priority;
  const categorySelect = buildCategorySelect(task.category_id);
  const tagSelect = buildTagMultiSelect(task.tags?.map((t) => t.id) || []);

  form.append(
    labelWrap("Название", titleInput),
    labelWrap("Описание", descriptionInput),
    labelWrap("Дата", dateInput),
    labelWrap("Время", timeInput),
    labelWrap("Приоритет (1-10)", priorityInput),
    labelWrap("Категория", categorySelect),
    labelWrap("Теги", tagSelect)
  );

  const actions = document.createElement("div");
  actions.className = "actions";
  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "Сохранить";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "ghost-btn";
  cancelBtn.textContent = "Отмена";
  cancelBtn.onclick = () => form.remove();
  actions.append(saveBtn, cancelBtn);
  form.append(actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      title: titleInput.value,
      description: descriptionInput.value,
      priority: Number(priorityInput.value) || 1,
      due_datetime: isoFromDateTime(dateInput.value, timeInput.value),
      category_id: Number(categorySelect.value) || null,
      tag_ids: readSelectedValues(tagSelect),
    };
    await saveTaskEdit(task.id, payload, form);
  });

  card.appendChild(form);
}

async function saveTaskEdit(taskId, payload, formNode) {
  try {
    await apiFetch(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setStatus("Задача обновлена", "success");
    formNode?.remove();
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function updateTaskCompletion(taskId, value) {
  try {
    const completion_value = normalizeCompletionValue(value);
    const payload = { completion_mode: "percent", completion_value, status: completionStatusFromValue(completion_value) };
    await apiFetch(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setStatus("Прогресс по задаче обновлен", "success");
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
    name: el("habit-name").value,
    description: el("habit-description").value,
    schedule_type: el("habit-schedule").value,
    completion_mode: "percent",
    completion_value: 0,
    is_active: true,
    category_id: Number(habitCategorySelect?.value) || null,
    tag_ids: readSelectedValues(habitTagsSelect),
  };
  try {
    await apiFetch("/habits", { method: "POST", body: JSON.stringify(payload) });
    el("habit-name").value = "";
    el("habit-description").value = "";
    if (habitCategorySelect) habitCategorySelect.value = "";
    if (habitTagsSelect) Array.from(habitTagsSelect.options).forEach((opt) => (opt.selected = false));
    setStatus("Привычка создана", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadHabits() {
  try {
    const habits = await apiFetch("/habits");
    await loadHabitStatuses(habits || []);
    renderHabits(habits || []);
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

function habitScheduleLabel(schedule) {
  const map = { daily: "Каждый день", weekly: "Раз в неделю", custom: "Произвольно" };
  return map[schedule] || "График не указан";
}

function habitStatusText(habit) {
  const log = state.habitStatuses[habit.id];
  const statusKey = completionStatusFromValue(habit.completion_value);
  let label;
  if (log?.status === "skipped") label = "Пропущено";
  else if (statusKey === "done") label = "Готово";
  else if (statusKey === "in_progress") label = `${habit.completion_value}%`;
  else label = "Не начата";
  if (habit.schedule_type === "weekly" && log?.date) return `${label} (${log.date})`;
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
    const categoryLabel = habit.category?.name || "Без категории";
    const tagsLabel = habit.tags?.length ? habit.tags.map((t) => `#${t.name}`).join(", ") : "Теги не выбраны";
    const scheduleLabel = habitScheduleLabel(habit.schedule_type);
    const card = document.createElement("article");
    card.className = "card entry";
    card.innerHTML = `
      <header class="card-header">
        <div>
          <strong>${habit.name}</strong>
          <p class="muted">${habit.description || "Без описания"}</p>
        </div>
        <span class="badge">${scheduleLabel}</span>
      </header>
      <p>Статус: ${statusLabel}</p>
      <p class="muted">Категория: ${categoryLabel}</p>
      <p class="muted">Теги: ${tagsLabel}</p>
    `;

    const controls = document.createElement("div");
    controls.className = "actions stack";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Редактировать";
    editBtn.onclick = () => openHabitEditor(habit, card);

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
    doneLabel.append(doneToggle, document.createTextNode("Готово"));
    completionControls.append(doneLabel, valueInput, valueBadge);

    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.textContent = "Пропустить";
    skipBtn.onclick = () => logHabitStatus(habit.id, "skipped");

    controls.append(editBtn, completionControls, skipBtn);
    card.appendChild(controls);
    habitsList.appendChild(card);
  });
}

function openHabitEditor(habit, card) {
  card.querySelectorAll(".inline-editor").forEach((el) => el.remove());
  const form = document.createElement("form");
  form.className = "inline-editor";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = habit.name;
  const descInput = document.createElement("input");
  descInput.type = "text";
  descInput.value = habit.description || "";
  const scheduleSelect = document.createElement("select");
  [
    { value: "daily", label: "Каждый день" },
    { value: "weekly", label: "Раз в неделю" },
    { value: "custom", label: "Произвольно" },
  ].forEach(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    if (value === habit.schedule_type) option.selected = true;
    scheduleSelect.appendChild(option);
  });
  const activeToggle = document.createElement("input");
  activeToggle.type = "checkbox";
  activeToggle.checked = habit.is_active;
  const categorySelect = buildCategorySelect(habit.category_id);
  const tagSelect = buildTagMultiSelect(habit.tags?.map((t) => t.id) || []);

  form.append(
    labelWrap("Название", nameInput),
    labelWrap("Описание", descInput),
    labelWrap("График", scheduleSelect),
    labelWrap("Активна", activeToggle),
    labelWrap("Категория", categorySelect),
    labelWrap("Теги", tagSelect)
  );

  const actions = document.createElement("div");
  actions.className = "actions";
  const saveBtn = document.createElement("button");
  saveBtn.type = "submit";
  saveBtn.textContent = "Сохранить";
  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "ghost-btn";
  cancelBtn.textContent = "Отмена";
  cancelBtn.onclick = () => form.remove();
  actions.append(saveBtn, cancelBtn);
  form.append(actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: nameInput.value,
      description: descInput.value,
      schedule_type: scheduleSelect.value,
      is_active: activeToggle.checked,
      category_id: Number(categorySelect.value) || null,
      tag_ids: readSelectedValues(tagSelect),
    };
    await saveHabitEdit(habit.id, payload, form);
  });
  card.appendChild(form);
}

async function saveHabitEdit(habitId, payload, formNode) {
  try {
    await apiFetch(`/habits/${habitId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setStatus("Привычка обновлена", "success");
    formNode?.remove();
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function updateHabitCompletion(habitId, value) {
  try {
    const completion_value = normalizeCompletionValue(value);
    await apiFetch(`/habits/${habitId}`, { method: "PATCH", body: JSON.stringify({ completion_mode: "percent", completion_value }) });
    setStatus("Прогресс по привычке обновлен", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function logHabitStatus(habitId, status) {
  try {
    await apiFetch(`/habits/${habitId}/logs`, { method: "POST", body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), status }) });
    setStatus("Статус привычки сохранен", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleCreateReminder(event) {
  event.preventDefault();
  const trigger = isoFromDateTime(reminderDate.value, reminderTime.value);
  const note = el("reminder-note").value || "Напоминание";
  const payload = { type: "time", trigger_time: trigger, trigger_timezone: state.userTimezone || "UTC", is_active: true, behavior_rule: note };
  try {
    await apiFetch("/reminders", { method: "POST", body: JSON.stringify(payload) });
    setStatus("Напоминание создано", "success");
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadReminders() {
  try {
    const reminders = await apiFetch("/reminders");
    renderReminders(reminders || []);
  } catch (error) {
    renderReminders([]);
    setStatus(error.message, "error");
  }
}

function reminderTypeLabel(type) {
  const map = { time: "По времени" };
  return map[type] || "Напоминание";
}

function renderReminders(reminders) {
  remindersList.innerHTML = "";
  if (!reminders.length) {
    remindersList.innerHTML = '<p class="muted">Напоминаний пока нет</p>';
    return;
  }
  reminders.forEach((reminder) => {
    const card = document.createElement("article");
    card.className = "card entry";
    const dateStr = reminder.trigger_time ? new Date(reminder.trigger_time).toLocaleString("ru-RU") : "-";
    const typeLabel = reminderTypeLabel(reminder.type);
    card.innerHTML = `<strong>${typeLabel}</strong><p class="muted">${reminder.behavior_rule || ""}</p><p>Время: ${dateStr}</p>`;
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
  const messageInput = el("assistant-message");
  const message = messageInput.value.trim();
  if (!message) return;
  messageInput.value = "";
  try {
    const response = await apiFetch("/assistant/message", { method: "POST", body: JSON.stringify({ user_message: message }) });
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
    card.innerHTML = `<p><strong>Вы:</strong> ${item.user}</p><p><strong>Ответ:</strong> ${item.reply}</p><small class="muted">${item.ts}</small>`;
    assistantHistoryEl.appendChild(card);
  });
}

async function apiFetch(path, options = {}) {
  return fetchJson(`${apiBase}${path}`, options);
}

async function refreshAll() {
  await loadTaxonomy();
  await Promise.all([loadTasks(), loadHabits(), loadReminders()]);
}
