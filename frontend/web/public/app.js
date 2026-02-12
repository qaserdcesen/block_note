const apiBase = "/api/v1";
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tg = window.Telegram?.WebApp;
const initialTimezone =
  localStorage.getItem("cthm_timezone") || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

const ADD_CATEGORY_VALUE = "__add_category__";
const ADD_TAG_VALUE = "__add_tag__";
const EMOJI_STORAGE_KEY = "cthm_emojis";
const SUBTASKS_KEY = "cthm_subtasks";

const loadEmojiStore = () => {
  try {
    return JSON.parse(localStorage.getItem(EMOJI_STORAGE_KEY) || '{"tasks":{},"habits":{},"reminders":{}}');
  } catch {
    return { tasks: {}, habits: {}, reminders: {} };
  }
};

const persistEmojis = (store) => {
  try {
    localStorage.setItem(EMOJI_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore */
  }
};

const state = {
  currentPage: "home-page",
  assistantHistory: [],
  habitStatuses: {},
  tasks: [],
  habits: [],
  reminders: [],
  categories: [],
  tags: [],
  emojis: loadEmojiStore(),
  ui: {
    taskSearch: "",
    taskSort: "date_desc",
    habitSearch: "",
    habitSort: "name_asc",
    taskTagFilter: [],
    habitTagFilter: [],
    homeSearch: "",
    homeTaskSort: "date_desc",
  },
  userTimezone: initialTimezone,
  telegramUser: tg?.initDataUnsafe?.user || null,
  profile: {
    user: null,
    stats: null,
    settings: {
      timezone: initialTimezone,
      first_day_of_week: "monday",
      day_start_hour: 0,
      theme_mode: "system",
      ui_density: "standard",
      font_scale: "normal",
      assistant_tone: "friendly",
      assistant_detail: "concise",
      assistant_tips_suggest_habits: true,
      assistant_tips_overdue_tasks: true,
    },
    goals: [],
  },
};

const el = (id) => document.getElementById(id);
const statusEl = el("status");
const currentUserEl = el("current-user");
const timezoneIndicator = el("timezone-indicator");
const tasksList = el("tasks-list");
const habitsList = el("habits-list");
const remindersList = el("reminders-list");
let homeTasksList = null;
let homeHabitsList = null;
let homeRemindersList = null;
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
const taskSearchInput = el("task-search");
const taskSortSelect = el("task-sort");
const habitSearchInput = el("habit-search");
const habitSortSelect = el("habit-sort");
let taskFilterTagsSelect = el("task-filter-tags");
let habitFilterTagsSelect = el("habit-filter-tags");
function updateFilterSelectState(selectEl) {
  if (!selectEl) return;
  const hasSelection = readSelectedValues(selectEl).length > 0;
  selectEl.classList.toggle("compact-empty", !hasSelection);
}
const navProfileBtn = el("nav-profile");
const navCreateBtn = el("nav-create");
const navAssistantBtn = el("nav-assistant"); // будет использоваться как "Главная"
const creationMenu = el("creation-menu");
const creationOptions = Array.from(document.querySelectorAll(".creation-option"));
const creationPages = ["tasks-page", "habits-page", "reminders-page"];
const profileNameEl = el("profile-name");
const profileUsernameEl = el("profile-username");
const profileIdEl = el("profile-id");
const profileTimezoneEl = el("profile-timezone");
const profileTasksWeekEl = el("profile-tasks-week");
const profileHabitsWeekEl = el("profile-habits-week");
const profileTasksTodayEl = el("profile-tasks-today");
const profileSettingsForm = el("profile-settings-form");
const settingsTimezoneInput = el("settings-timezone");
const settingsWeekStartSelect = el("settings-week-start");
const settingsDayStartInput = el("settings-day-start");
const settingsThemeModeSelect = el("settings-theme-mode");
const settingsUiDensitySelect = el("settings-ui-density");
const settingsFontScaleSelect = el("settings-font-scale");
const settingsAssistantToneSelect = el("settings-assistant-tone");
const settingsAssistantDetailSelect = el("settings-assistant-detail");
const settingsAssistantSuggestHabits = el("settings-assistant-suggest-habits");
const settingsAssistantOverdue = el("settings-assistant-overdue");
const btnExportData = el("btn-export-data");
const btnCleanCompleted = el("btn-clean-completed");
const btnCleanHabitLogs = el("btn-clean-habit-logs");
const goalForm = el("goal-form");
const goalTitleInput = el("goal-title");
const goalDescriptionInput = el("goal-description");
const goalTargetDateInput = el("goal-target-date");
const goalCategorySelect = el("goal-category");
const goalList = el("goal-list");
const profileTasksMonthEl = el("profile-tasks-month");
const profileHabitsMonthEl = el("profile-habits-month");
const profileHabitsStreakCurrentEl = el("profile-habits-streak-current");
const profileHabitsStreakBestEl = el("profile-habits-streak-best");
const profileHabitsSkipsEl = el("profile-habits-skips");
const profilePriorityList = el("profile-priority-breakdown");
const profileCategoryList = el("profile-category-breakdown");
const personalizationForm = el("profile-personalization-form");
const assistantForm = el("profile-assistant-form");

const pages = {
  "home-page": null,
  "tasks-page": el("tasks-page"),
  "habits-page": el("habits-page"),
  "reminders-page": el("reminders-page"),
  "assistant-page": el("assistant-page"),
  "profile-page": el("profile-page"),
};

const setEmoji = (type, id, value) => {
  if (!id) return;
  const next = { ...state.emojis, [type]: { ...(state.emojis?.[type] || {}), [id]: value } };
  state.emojis = next;
  persistEmojis(next);
};

const emojiFor = (type, id, fallback) => (state.emojis?.[type]?.[id] || fallback || "").trim() || fallback;

const sliderColors = { accent: "#6b8bff", accentAlt: "#9c7cff" };
const ASSISTANT_CREATED_ENTRY_RE =
  /\b(task|tasks|habit|habits|reminder|reminders|задача|задачи|привычка|привычки|напоминание|напоминания)\s*#(\d+)(?:\s*["“«]([^"”»\n]+)["”»])?/giu;

const loadSubtaskStore = () => {
  try {
    return JSON.parse(localStorage.getItem(SUBTASKS_KEY) || "{}");
  } catch {
    return {};
  }
};

let subtaskStore = loadSubtaskStore();

const persistSubtasks = () => {
  try {
    localStorage.setItem(SUBTASKS_KEY, JSON.stringify(subtaskStore));
  } catch {
    /* ignore */
  }
};

const subtaskKey = (kind, id) => `${kind}:${id}`;
const getSubtasks = (kind, id) => subtaskStore[subtaskKey(kind, id)] || [];
const addSubtask = (kind, id, title) => {
  const key = subtaskKey(kind, id);
  const list = getSubtasks(kind, id).slice();
  list.push({ id: Date.now(), title, done: false });
  subtaskStore[key] = list;
  persistSubtasks();
  return list;
};
const toggleSubtask = (kind, id, subId) => {
  const key = subtaskKey(kind, id);
  const list = getSubtasks(kind, id).map((item) => (item.id === subId ? { ...item, done: !item.done } : item));
  subtaskStore[key] = list;
  persistSubtasks();
  return list;
};
const removeSubtask = (kind, id, subId) => {
  const key = subtaskKey(kind, id);
  const list = getSubtasks(kind, id).filter((item) => item.id !== subId);
  subtaskStore[key] = list;
  persistSubtasks();
  return list;
};

const applySliderFill = (sliderEl) => {
  if (!sliderEl) return;
  const value = clamp(Number(sliderEl.value) || 0, 0, 100);
  const filled = Math.min(100, Math.max(0, value));
  sliderEl.style.setProperty("--fill", `${filled}%`);
  sliderEl.style.setProperty("--fill-color-start", sliderColors.accent);
  sliderEl.style.setProperty("--fill-color-end", sliderColors.accentAlt);
};

const formatUsername = (username) => {
  if (!username) return "";
  return username.startsWith("@") ? username : `@${username}`;
};

const elevateFilters = () => {
  const moveFilters = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (!section || !section.parentNode) return;
    const filters = section.querySelector(".filters-row");
    if (!filters) return;
    const ensureTagFilter = (filtersEl, selectId) => {
      let select = document.getElementById(selectId);
      if (!select) {
        const label = document.createElement("label");
        label.className = "inline-input";
        label.textContent = "Фильтр по тегам";
        select = document.createElement("select");
        select.id = selectId;
        select.multiple = true;
        select.size = 6;
        select.className = "filter-tag-select";
        label.appendChild(select);
        filtersEl.appendChild(label);
      }
      if (selectId === "task-filter-tags") taskFilterTagsSelect = select;
      if (selectId === "habit-filter-tags") habitFilterTagsSelect = select;
    };
    const markFilterControl = (inputId, className) => {
      const input = document.getElementById(inputId);
      const wrap = input?.closest("label");
      if (wrap) wrap.classList.add(className);
    };
    if (sectionId === "tasks-section") {
      ensureTagFilter(filters, "task-filter-tags");
      filters.classList.add("filters-row--tasks");
      markFilterControl("task-search", "filters-search");
      markFilterControl("task-sort", "filters-sort");
      markFilterControl("task-filter-tags", "filters-tags");
    }
    if (sectionId === "habits-section") {
      ensureTagFilter(filters, "habit-filter-tags");
      filters.classList.add("filters-row--top");
    } else {
      filters.classList.add("filters-row--top");
    }
    const wrapper = document.createElement("article");
    wrapper.className = "card filters-card";
    wrapper.appendChild(filters);
    section.parentNode.insertBefore(wrapper, section);
  };
  moveFilters("tasks-section");
  moveFilters("habits-section");
};

const buildHomePage = () => {
  const pagesContainer = document.querySelector(".pages");
  if (!pagesContainer) return;
  const home = document.createElement("section");
  home.className = "page";
  home.id = "home-page";
  const head = document.createElement("div");
  head.className = "page-head page-head__compact";
  head.innerHTML = `
    <div>
      <p class="eyebrow">Обзор</p>
      <h2>Главная</h2>
      <p class="muted">Все задачи, привычки и напоминания в одном месте, отсортированы по дате.</p>
    </div>
  `;
  const filtersCard = document.createElement("article");
  filtersCard.className = "card filters-card";
  const filtersRow = document.createElement("div");
  filtersRow.className = "filters-row filters-row--tasks";
  filtersRow.innerHTML = `
    <label class="inline-input filters-search">
      Поиск (название, категория, теги)
      <input type="search" id="home-search" placeholder="Введите название или категорию" />
    </label>
    <label class="inline-input filters-sort">
      Сортировка задач
      <select id="home-task-sort">
        <option value="date_desc">По дате (позже -> раньше)</option>
        <option value="date_asc">По дате (раньше -> позже)</option>
        <option value="priority_desc">По приоритету (выше -> ниже)</option>
        <option value="priority_asc">По приоритету (ниже -> выше)</option>
        <option value="title">По названию (А->Я)</option>
      </select>
    </label>
  `;
  filtersCard.appendChild(filtersRow);
  const grid = document.createElement("div");
  grid.className = "home-grid";
  const makeCard = (title, listId) => {
    const card = document.createElement("article");
    card.className = "card";
    const h = document.createElement("header");
    h.className = "section-head";
    h.innerHTML = `<h3>${title}</h3>`;
    const list = document.createElement("div");
    list.id = listId;
    list.className = "entries";
    card.append(h, list);
    return { card, list };
  };
  const tasksCard = makeCard("Задачи", "home-tasks-list");
  const habitsCard = makeCard("Привычки", "home-habits-list");
  const remindersCard = makeCard("Напоминания", "home-reminders-list");
  homeTasksList = tasksCard.list;
  homeHabitsList = habitsCard.list;
  homeRemindersList = remindersCard.list;
  grid.append(tasksCard.card, habitsCard.card, remindersCard.card);
  home.append(head, filtersCard, grid);
  pagesContainer.prepend(home);
  pages["home-page"] = home;
  const homeSearchInput = home.querySelector("#home-search");
  if (homeSearchInput) {
    homeSearchInput.addEventListener("input", () => {
      state.ui.homeSearch = homeSearchInput.value.trim();
      state.ui.taskSearch = state.ui.homeSearch;
      state.ui.habitSearch = state.ui.homeSearch;
      renderTasks(state.tasks, tasksList);
      renderHabits(state.habits, habitsList);
      renderTasks(state.tasks, homeTasksList, state.ui.homeTaskSort);
      renderHabits(state.habits, homeHabitsList);
      renderReminders(state.reminders, homeRemindersList, state.ui.homeSearch);
      renderReminders(state.reminders, remindersList, state.ui.homeSearch);
    });
    homeSearchInput.value = state.ui.homeSearch;
  }
  const homeSortSelect = home.querySelector("#home-task-sort");
  if (homeSortSelect) {
    homeSortSelect.value = state.ui.homeTaskSort || "date_desc";
    homeSortSelect.addEventListener("change", () => {
      state.ui.homeTaskSort = homeSortSelect.value;
      renderTasks(state.tasks, homeTasksList, state.ui.homeTaskSort);
    });
  }
};

const initAssistantBubble = () => {
  const assistantPage = pages["assistant-page"];
  if (!assistantPage) return;
  assistantPage.classList.add("assistant-flyout");
  assistantPage.hidden = true;
  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "assistant-fab";
  toggleBtn.textContent = "Ассистент";
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "assistant-close";
  closeBtn.textContent = "×";
  assistantPage.appendChild(closeBtn);
  let open = false;
  const apply = () => {
    assistantPage.hidden = !open;
    toggleBtn.classList.toggle("open", open);
  };
  toggleBtn.onclick = () => {
    open = !open;
    apply();
  };
  closeBtn.onclick = () => {
    open = false;
    apply();
  };
  document.body.appendChild(toggleBtn);
  apply();
};

const fixNavBarOrder = () => {
  const navBar = navProfileBtn?.closest(".tabbar");
  const navCreateWrap = navCreateBtn?.closest(".nav-create");
  if (!navBar) return;
  if (navCreateWrap && navCreateBtn && navCreateBtn.parentElement !== navCreateWrap) {
    navCreateWrap.prepend(navCreateBtn);
  }
  if (navCreateWrap && creationMenu && creationMenu.parentElement !== navCreateWrap) {
    navCreateWrap.appendChild(creationMenu);
  }
  [navAssistantBtn, navCreateWrap, navProfileBtn].filter(Boolean).forEach((node) => navBar.appendChild(node));
};

const today = new Date().toISOString().slice(0, 10);
if (tasksDateInput) tasksDateInput.value = today;
if (reminderDate) reminderDate.value = today;
if (reminderTime) reminderTime.value = "09:00";

initTelegram();
buildHomePage();
initAssistantBubble();
fixNavBarOrder();
elevateFilters();
bindNav();
bindForms();
bindFilters();
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
  [navProfileBtn, navAssistantBtn, navCreateBtn].forEach((btn) => btn?.classList.remove("active"));
  if (targetId === "home-page") navAssistantBtn?.classList.add("active");
  else if (creationPages.includes(targetId)) navCreateBtn?.classList.add("active");
  else if (targetId === "profile-page") navProfileBtn?.classList.add("active");
  if (targetId === "profile-page") {
    loadProfile();
    loadGoals();
  }
  if (targetId === "assistant-page") {
    loadAssistantHistory();
  }
  if (targetId === "tasks-page") {
    loadTaxonomy();
    loadTasks();
  }
  if (targetId === "habits-page") {
    loadTaxonomy();
    loadHabits();
  }
  if (targetId === "reminders-page") {
    loadReminders();
  }
  if (targetId === "home-page") {
    loadTaxonomy();
    Promise.all([loadTasks(), loadHabits(), loadReminders()]);
  }
  closeCreationMenu();
  updateUserMeta();
}

function openCreationMenu() {
  if (!creationMenu) return;
  creationMenu.hidden = false;
  requestAnimationFrame(() => creationMenu.classList.add("open"));
}

function closeCreationMenu() {
  if (!creationMenu) return;
  creationMenu.classList.remove("open");
  creationMenu.hidden = true;
}

function toggleCreationMenu() {
  if (!creationMenu) return;
  if (creationMenu.hidden) openCreationMenu();
  else closeCreationMenu();
}

function updateUserMeta() {
  const username = state.profile.user?.telegram_username || state.telegramUser?.username || null;
  const profileName =
    [state.telegramUser?.first_name, state.telegramUser?.last_name].filter(Boolean).join(" ") ||
    state.profile.user?.telegram_username ||
    "";
  const tgLabel = formatUsername(username) || profileName;
  const prefix = tgLabel ? `Вы вошли как ${tgLabel}` : "Гость";
  if (currentUserEl) currentUserEl.textContent = prefix;
  if (timezoneIndicator) timezoneIndicator.textContent = state.userTimezone || "UTC";
}

function updatePanels() {
  updateUserMeta();
  renderProfile();
}

function bindNav() {
  if (navAssistantBtn) navAssistantBtn.textContent = "Главная";
  if (navCreateBtn) navCreateBtn.textContent = "Создание";
  if (navProfileBtn) navProfileBtn.textContent = "Профиль";
  navProfileBtn?.addEventListener("click", () => switchPage("profile-page"));
  navAssistantBtn?.addEventListener("click", () => switchPage("home-page"));
  navCreateBtn?.addEventListener("click", toggleCreationMenu);
  creationOptions.forEach((btn) =>
    btn.addEventListener("click", () => {
      const target = btn.dataset.target;
      if (target) switchPage(target);
    })
  );
  document.addEventListener("click", (event) => {
    if (!creationMenu || !navCreateBtn) return;
    const target = event.target;
    if (creationMenu.contains(target) || navCreateBtn.contains(target)) return;
    closeCreationMenu();
  });
}

function bindForms() {
  el("task-form")?.addEventListener("submit", handleCreateTask);
  el("habit-form")?.addEventListener("submit", handleCreateHabit);
  el("reminder-form")?.addEventListener("submit", handleCreateReminder);
  el("assistant-form")?.addEventListener("submit", handleAssistant);
  profileSettingsForm?.addEventListener("submit", handleSaveSettings);
  personalizationForm?.addEventListener("submit", handleSavePersonalization);
  assistantForm?.addEventListener("submit", handleSaveAssistantSettings);
  goalForm?.addEventListener("submit", handleCreateGoal);
  btnExportData?.addEventListener("click", handleExportData);
  btnCleanCompleted?.addEventListener("click", () => handleCleanup("tasks"));
  btnCleanHabitLogs?.addEventListener("click", () => handleCleanup("habit_logs"));
  linkCompletionInputs(el("task-completion-value"), el("task-done"));
  linkCompletionInputs(el("habit-completion-value"), el("habit-done"));
}

function bindFilters() {
  if (taskSearchInput) {
    taskSearchInput.value = state.ui.taskSearch;
    taskSearchInput.addEventListener("input", () => {
      state.ui.taskSearch = taskSearchInput.value.trim();
      renderTasks(state.tasks);
    });
  }
  if (taskSortSelect) {
    taskSortSelect.value = state.ui.taskSort;
    taskSortSelect.addEventListener("change", () => {
      state.ui.taskSort = taskSortSelect.value;
      renderTasks(state.tasks);
    });
  }
  if (habitSearchInput) {
    habitSearchInput.value = state.ui.habitSearch;
    habitSearchInput.addEventListener("input", () => {
      state.ui.habitSearch = habitSearchInput.value.trim();
      renderHabits(state.habits);
    });
  }
  if (habitSortSelect) {
    habitSortSelect.value = state.ui.habitSort;
    habitSortSelect.addEventListener("change", () => {
      state.ui.habitSort = habitSortSelect.value;
      renderHabits(state.habits);
    });
  }
  if (taskFilterTagsSelect) {
    taskFilterTagsSelect.addEventListener("change", () => {
      if (taskFilterTagsSelect.options[0]?.selected && taskFilterTagsSelect.options[0].value === "") {
        Array.from(taskFilterTagsSelect.options).forEach((opt, idx) => (opt.selected = idx === 0));
        state.ui.taskTagFilter = [];
      } else {
        state.ui.taskTagFilter = readSelectedValues(taskFilterTagsSelect);
        if (taskFilterTagsSelect.options[0]?.value === "") taskFilterTagsSelect.options[0].selected = false;
      }
      updateFilterSelectState(taskFilterTagsSelect);
      renderTasks(state.tasks);
    });
    updateFilterSelectState(taskFilterTagsSelect);
  }
  if (habitFilterTagsSelect) {
    habitFilterTagsSelect.addEventListener("change", () => {
      if (habitFilterTagsSelect.options[0]?.selected && habitFilterTagsSelect.options[0].value === "") {
        Array.from(habitFilterTagsSelect.options).forEach((opt, idx) => (opt.selected = idx === 0));
        state.ui.habitTagFilter = [];
      } else {
        state.ui.habitTagFilter = readSelectedValues(habitFilterTagsSelect);
        if (habitFilterTagsSelect.options[0]?.value === "") habitFilterTagsSelect.options[0].selected = false;
      }
      updateFilterSelectState(habitFilterTagsSelect);
      renderHabits(state.habits);
    });
    updateFilterSelectState(habitFilterTagsSelect);
  }
}

function renderProfile() {
  renderProfileUser();
  renderProfileStats();
  fillSettingsForm();
  fillPersonalizationForm();
  fillAssistantForm();
  applyUserPreferences(state.profile.settings);
}

function renderProfileUser() {
  const username = state.profile.user?.telegram_username || state.telegramUser?.username || "";
  const fullName = [state.telegramUser?.first_name, state.telegramUser?.last_name].filter(Boolean).join(" ").trim();
  const idValue = state.profile.user?.telegram_id ?? state.telegramUser?.id ?? state.profile.user?.id;
  const displayName = fullName || formatUsername(username) || state.profile.user?.telegram_username || "";
  if (profileNameEl) profileNameEl.textContent = displayName || "Имя пользователя недоступно";
  if (profileUsernameEl) profileUsernameEl.textContent = formatUsername(username) || "Не указан";
  if (profileIdEl) profileIdEl.textContent = idValue ? String(idValue) : "-";
  if (profileTimezoneEl) profileTimezoneEl.textContent = state.profile.settings?.timezone || state.userTimezone || "UTC";
}

function renderProfileStats() {
  const stats = state.profile.stats;
  const valueOrDash = (value) => (typeof value === "number" ? value : "—");
  if (profileTasksWeekEl) profileTasksWeekEl.textContent = valueOrDash(stats?.tasks_completed_last_7_days);
  if (profileHabitsWeekEl) profileHabitsWeekEl.textContent = valueOrDash(stats?.habits_completed_last_7_days);
  if (profileTasksTodayEl) profileTasksTodayEl.textContent = valueOrDash(stats?.tasks_completed_today);
  if (profileTasksMonthEl) profileTasksMonthEl.textContent = valueOrDash(stats?.tasks_completed_last_30_days);
  if (profileHabitsMonthEl) profileHabitsMonthEl.textContent = valueOrDash(stats?.habits_completed_last_30_days);
  if (profileHabitsStreakCurrentEl) profileHabitsStreakCurrentEl.textContent = valueOrDash(stats?.habit_current_streak);
  if (profileHabitsStreakBestEl) profileHabitsStreakBestEl.textContent = valueOrDash(stats?.habit_best_streak);
  if (profileHabitsSkipsEl) profileHabitsSkipsEl.textContent = valueOrDash(stats?.habit_skips_last_30_days);
  renderBreakdown(profilePriorityList, stats?.tasks_by_priority);
  renderBreakdown(profileCategoryList, stats?.tasks_by_category);
}

function fillSettingsForm() {
  const settings = state.profile.settings || {};
  if (settingsTimezoneInput) settingsTimezoneInput.value = settings.timezone || state.userTimezone || "UTC";
  if (settingsWeekStartSelect) settingsWeekStartSelect.value = settings.first_day_of_week || "monday";
  if (settingsDayStartInput)
    settingsDayStartInput.value =
      typeof settings.day_start_hour === "number" ? settings.day_start_hour : state.profile.settings.day_start_hour;
}

function fillPersonalizationForm() {
  const settings = state.profile.settings || {};
  if (settingsThemeModeSelect) settingsThemeModeSelect.value = settings.theme_mode || "system";
  if (settingsUiDensitySelect) settingsUiDensitySelect.value = settings.ui_density || "standard";
  if (settingsFontScaleSelect) settingsFontScaleSelect.value = settings.font_scale || "normal";
}

function fillAssistantForm() {
  const settings = state.profile.settings || {};
  if (settingsAssistantToneSelect) settingsAssistantToneSelect.value = settings.assistant_tone || "friendly";
  if (settingsAssistantDetailSelect) settingsAssistantDetailSelect.value = settings.assistant_detail || "concise";
  if (settingsAssistantSuggestHabits)
    settingsAssistantSuggestHabits.checked = settings.assistant_tips_suggest_habits ?? true;
  if (settingsAssistantOverdue)
    settingsAssistantOverdue.checked = settings.assistant_tips_overdue_tasks ?? true;
}

function renderBreakdown(target, items) {
  if (!target) return;
  target.innerHTML = "";
  if (!items || !items.length) {
    target.innerHTML = '<li class="muted">Данных пока нет</li>';
    return;
  }
  items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.label}: ${item.count}`;
    target.appendChild(li);
  });
}

function applyUserPreferences(settings) {
  const theme = settings?.theme_mode || "system";
  document.body.classList.remove("theme-light", "theme-dark");
  if (theme === "light") document.body.classList.add("theme-light");
  if (theme === "dark") document.body.classList.add("theme-dark");
  document.body.dataset.density = settings?.ui_density || "standard";
  document.body.dataset.fontScale = settings?.font_scale || "normal";
}

async function handleSaveSettings(event) {
  event.preventDefault();
  const payload = {
    timezone: (settingsTimezoneInput?.value || state.userTimezone || "UTC").trim(),
    first_day_of_week: settingsWeekStartSelect?.value || "monday",
    day_start_hour: clamp(Number(settingsDayStartInput?.value) || 0, 0, 23),
  };
  payload.first_day_of_week = (payload.first_day_of_week || "monday").toLowerCase();
  if (!payload.timezone) payload.timezone = "UTC";
  try {
    const saved = await apiFetch("/users/me/settings", { method: "PUT", body: JSON.stringify(payload) });
    state.profile.settings = { ...state.profile.settings, ...(saved || payload) };
    state.userTimezone = state.profile.settings.timezone || state.userTimezone;
    localStorage.setItem("cthm_timezone", state.userTimezone);
    setStatus("Настройки профиля сохранены", "success");
    renderProfile();
    updateUserMeta();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleSavePersonalization(event) {
  event.preventDefault();
  const payload = {
    theme_mode: settingsThemeModeSelect?.value || "system",
    ui_density: settingsUiDensitySelect?.value || "standard",
    font_scale: settingsFontScaleSelect?.value || "normal",
  };
  try {
    const saved = await apiFetch("/users/me/settings", { method: "PUT", body: JSON.stringify(payload) });
    state.profile.settings = { ...state.profile.settings, ...(saved || payload) };
    applyUserPreferences(state.profile.settings);
    setStatus("Персонализация сохранена", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleSaveAssistantSettings(event) {
  event.preventDefault();
  const payload = {
    assistant_tone: settingsAssistantToneSelect?.value || "friendly",
    assistant_detail: settingsAssistantDetailSelect?.value || "concise",
    assistant_tips_suggest_habits: !!settingsAssistantSuggestHabits?.checked,
    assistant_tips_overdue_tasks: !!settingsAssistantOverdue?.checked,
  };
  try {
    const saved = await apiFetch("/users/me/settings", { method: "PUT", body: JSON.stringify(payload) });
    state.profile.settings = { ...state.profile.settings, ...(saved || payload) };
    setStatus("Настройки ассистента сохранены", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadProfile() {
  try {
    const [user, stats, settings] = await Promise.all([
      apiFetch("/users/me"),
      apiFetch("/users/me/stats"),
      apiFetch("/users/me/settings"),
    ]);
    state.profile.user = user || null;
    state.profile.stats = stats || null;
    if (settings) state.profile.settings = { ...state.profile.settings, ...settings };
    state.userTimezone = state.profile.settings.timezone || state.userTimezone;
    localStorage.setItem("cthm_timezone", state.userTimezone);
    renderProfile();
    updateUserMeta();
  } catch (error) {
    renderProfile();
    setStatus(error.message, "error");
  }
}

async function handleExportData() {
  try {
    const data = await apiFetch("/users/me/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "planner-export.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Экспорт готов", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleCleanup(type) {
  const confirmations = {
    tasks: "Вы уверены, что хотите удалить все выполненные задачи? Это действие нельзя отменить.",
    habit_logs: "Вы уверены, что хотите удалить все журналы привычек? Это действие нельзя отменить.",
  };
  if (!confirm(confirmations[type] || "Подтвердите действие")) return;
  const path = type === "habit_logs" ? "/users/me/cleanup/habit-logs" : "/users/me/cleanup/completed-tasks";
  try {
    const result = await apiFetch(path, { method: "POST" });
    const deleted = result?.deleted ?? 0;
    const message =
      type === "habit_logs"
        ? `Удалено записей журналов: ${deleted}`
        : `Удалено выполненных задач: ${deleted}`;
    setStatus(message, "success");
    await Promise.all([loadTasks(), loadHabits()]);
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function handleCreateGoal(event) {
  event.preventDefault();
  const payload = {
    title: goalTitleInput?.value || "",
    description: goalDescriptionInput?.value || "",
    target_date: goalTargetDateInput?.value || null,
    category_id: Number(goalCategorySelect?.value) || null,
  };
  if (!payload.title.trim()) {
    setStatus("Название цели не может быть пустым", "error");
    return;
  }
  try {
    await apiFetch("/goals", { method: "POST", body: JSON.stringify(payload) });
    setStatus("Цель добавлена", "success");
    goalForm?.reset();
    if (goalCategorySelect) goalCategorySelect.value = "";
    await loadGoals();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadGoals() {
  try {
    const goals = await apiFetch("/goals");
    state.profile.goals = goals || [];
    renderGoals();
  } catch (error) {
    state.profile.goals = [];
    renderGoals();
    setStatus(error.message, "error");
  }
}

function renderGoals() {
  if (!goalList) return;
  goalList.innerHTML = "";
  if (!state.profile.goals.length) {
    goalList.innerHTML = '<p class="muted">Целей пока нет</p>';
    return;
  }
  state.profile.goals.forEach((goal) => {
    const card = document.createElement("article");
    card.className = "card entry";
    const header = document.createElement("header");
    header.className = "card-header";
    const titleWrap = document.createElement("div");
    const categoryLabel = goal.category?.name ? ` · ${goal.category.name}` : "";
    titleWrap.innerHTML = `
      <strong>${goal.title}${categoryLabel}</strong>
      <p class="muted entry-description">${goal.description || "Описание не заполнено"}</p>
    `;
    const target = document.createElement("span");
    target.className = "badge";
    target.textContent = goal.target_date ? `Срок: ${goal.target_date}` : "Срок не задан";
    header.append(titleWrap, target);

    const actions = document.createElement("div");
    actions.className = "actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "ghost-btn";
    editBtn.textContent = "Редактировать";
    editBtn.onclick = () => openGoalEditor(goal, card);
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Удалить";
    deleteBtn.onclick = () => deleteGoal(goal.id);
    actions.append(editBtn, deleteBtn);

    card.append(header, actions);
    goalList.appendChild(card);
  });
}

function openGoalEditor(goal, card) {
  card.querySelectorAll(".inline-editor").forEach((el) => el.remove());
  const form = document.createElement("form");
  form.className = "inline-editor form-grid";
  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = goal.title;
  const descInput = document.createElement("input");
  descInput.type = "text";
  descInput.value = goal.description || "";
  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.value = goal.target_date || "";
  const categorySelect = document.createElement("select");
  setupCategorySelect(categorySelect, goal.category_id);

  form.append(
    labelWrap("Название", titleInput),
    labelWrap("Описание", descInput),
    labelWrap("Целевая дата", dateInput),
    labelWrap("Категория", categorySelect),
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
      description: descInput.value,
      target_date: dateInput.value || null,
      category_id: Number(categorySelect.value) || null,
    };
    await saveGoal(goal.id, payload, form);
  });
  card.appendChild(form);
}

async function saveGoal(goalId, payload, formNode) {
  try {
    await apiFetch(`/goals/${goalId}`, { method: "PATCH", body: JSON.stringify(payload) });
    setStatus("Цель обновлена", "success");
    formNode?.remove();
    await loadGoals();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteGoal(goalId) {
  if (!confirm("Удалить цель?")) return;
  try {
    await apiFetch(`/goals/${goalId}`, { method: "DELETE" });
    setStatus("Цель удалена", "success");
    await loadGoals();
  } catch (error) {
    setStatus(error.message, "error");
  }
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
    const message = formatErrorDetail(data?.detail) || response.statusText || "Что-то пошло не так";
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
function readSelectedValues(selectEl) {
  if (!selectEl) return [];
  return Array.from(selectEl.selectedOptions || [])
    .map((o) => Number(o.value))
    .filter(Boolean);
}

function fillCategorySelect(selectEl, selectedId = null) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const empty = new Option("Без категории", "");
  const add = new Option("Добавить категорию", ADD_CATEGORY_VALUE);
  selectEl.append(empty, add);
  state.categories.forEach((item) => {
    const option = new Option(item.name, item.id);
    selectEl.appendChild(option);
  });
  if (selectedId) selectEl.value = String(selectedId);
  if (!selectedId) selectEl.value = "";
}

function fillTagSelect(selectEl, selectedIds = []) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const add = new Option("Добавить тег", ADD_TAG_VALUE);
  selectEl.appendChild(add);
  if (!state.tags.length) {
    const placeholder = new Option("Тегов пока нет", "", false, false);
    placeholder.disabled = true;
    selectEl.appendChild(placeholder);
  }
  state.tags.forEach((tag) => {
    const option = new Option(`#${tag.name}`, tag.id);
    option.selected = selectedIds.includes(tag.id);
    selectEl.appendChild(option);
  });
  if (!selectedIds.length) selectEl.selectedIndex = -1;
}

function setupCategorySelect(selectEl, selectedId = null) {
  if (!selectEl) return;
  fillCategorySelect(selectEl, selectedId);
  selectEl.onchange = async () => {
    if (selectEl.value !== ADD_CATEGORY_VALUE) return;
    const created = await promptCategoryCreation();
    fillCategorySelect(selectEl, created?.id || null);
    if (created?.id) selectEl.value = String(created.id);
  };
}

function setupTagSelect(selectEl, selectedIds = []) {
  if (!selectEl) return;
  fillTagSelect(selectEl, selectedIds);
  selectEl.onchange = async () => {
    const selectedValues = Array.from(selectEl.selectedOptions || []).map((o) => o.value);
    if (!selectedValues.includes(ADD_TAG_VALUE)) return;
    const preserved = readSelectedValues(selectEl);
    const created = await promptTagCreation();
    const nextSelected = new Set(preserved);
    if (created?.id) nextSelected.add(created.id);
    fillTagSelect(selectEl, Array.from(nextSelected));
  };
}
async function promptCategoryCreation() {
  const name = (prompt("Введите название категории") || "").trim();
  if (!name) {
    setStatus("Название категории не может быть пустым", "error");
    return null;
  }
  try {
    const created = await apiFetch("/categories", { method: "POST", body: JSON.stringify({ name }) });
    setStatus("Категория добавлена", "success");
    await loadTaxonomy();
    return created;
  } catch (error) {
    setStatus(error.message, "error");
    return null;
  }
}

async function promptTagCreation() {
  const name = (prompt("Введите название тега (без #)") || "").trim();
  if (!name) {
    setStatus("Название тега не может быть пустым", "error");
    return null;
  }
  try {
    const created = await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name }) });
    setStatus("Тег добавлен", "success");
    await loadTaxonomy();
    return created;
  } catch (error) {
    setStatus(error.message, "error");
    return null;
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
    fillFilterTagSelect(taskFilterTagsSelect, state.ui.taskTagFilter);
    fillFilterTagSelect(habitFilterTagsSelect, state.ui.habitTagFilter);
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

function fillFilterTagSelect(selectEl, selectedIds = []) {
  if (!selectEl) return;
  const selectedSet = new Set((selectedIds || []).map((id) => Number(id)));
  selectEl.innerHTML = "";
  const emptyOption = new Option("Без фильтра", "", !selectedSet.size, !selectedSet.size);
  selectEl.appendChild(emptyOption);
  if (!state.tags.length) {
    const placeholder = new Option("Тегов нет", "__no_tags__", false, false);
    placeholder.disabled = true;
    selectEl.appendChild(placeholder);
  } else {
    state.tags.forEach((tag) => {
      const option = new Option(`#${tag.name}`, tag.id);
      option.selected = selectedSet.has(Number(tag.id));
      selectEl.appendChild(option);
    });
  }
  updateFilterSelectState(selectEl);
}

const syncCreationSelectors = () => {
  setupCategorySelect(taskCategorySelect);
  setupCategorySelect(habitCategorySelect);
  setupCategorySelect(goalCategorySelect);
  setupTagSelect(taskTagsSelect);
  setupTagSelect(habitTagsSelect);
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
    setStatus("Задача добавлена", "success");
    await loadTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadTasks() {
  try {
    const tasks = await apiFetch(`/tasks`);
    state.tasks = tasks || [];
    renderTasks(state.tasks);
    if (homeTasksList) renderTasks(state.tasks, homeTasksList, state.ui.homeTaskSort);
  } catch (error) {
    state.tasks = [];
    renderTasks(state.tasks);
    if (homeTasksList) renderTasks(state.tasks, homeTasksList, state.ui.homeTaskSort);
    setStatus(error.message, "error");
  }
}

function taskStatusLabel(status) {
  const map = { pending: "В ожидании", in_progress: "В работе", done: "Готово", cancelled: "Отменено", blocked: "Заблокировано" };
  return map[status] || "-";
}

function statusPillClass(key) {
  return `status-${key || "pending"}`;
}

const createMetaChip = (icon, label, value) => {
  const chip = document.createElement("div");
  chip.className = "meta-chip";
  chip.innerHTML = `
    <span aria-hidden="true">${icon}</span>
    <div class="meta-chip__text">
      <div class="meta-chip__label">${label}</div>
      <div>${value}</div>
    </div>
  `;
  return chip;
};

const createTagChip = (label, removable = false, onRemove = null) => {
  const chip = document.createElement("div");
  chip.className = "tag-chip";
  const text = document.createElement("span");
  text.textContent = label;
  chip.appendChild(text);
  if (removable) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove";
    btn.textContent = "×";
    btn.onclick = () => onRemove && onRemove(label);
    chip.appendChild(btn);
  }
  return chip;
};

const createKebabMenu = (onEdit, onDelete) => {
  const wrap = document.createElement("div");
  wrap.className = "kebab-wrap";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kebab-btn";
  btn.textContent = "⋮";
  const menu = document.createElement("div");
  menu.className = "kebab-menu";
  const edit = document.createElement("button");
  edit.type = "button";
  edit.textContent = "Редактировать";
  const del = document.createElement("button");
  del.type = "button";
  del.textContent = "Удалить";
  edit.onclick = () => {
    menu.classList.remove("open");
    onEdit?.();
  };
  del.onclick = () => {
    menu.classList.remove("open");
    onDelete?.();
  };
  btn.onclick = (e) => {
    e.stopPropagation();
    menu.classList.toggle("open");
  };
  document.addEventListener("click", () => menu.classList.remove("open"));
  menu.append(edit, del);
  wrap.append(btn, menu);
  return wrap;
};

const createMetaItem = (icon, text) => {
  const item = document.createElement("div");
  item.className = "meta-line__item";
  item.innerHTML = `<span class="icon">${icon}</span><span>${text}</span>`;
  return item;
};

function renderTasks(tasks, targetList = tasksList, sortOverride = null) {
  const search = (state.ui?.taskSearch || "").toLowerCase();
  const sortKey = sortOverride || state.ui?.taskSort || "priority_desc";
  const tagFilter = (state.ui?.taskTagFilter || []).map((id) => Number(id)).filter(Boolean);
  const filtered = tasks.filter((task) => {
    if (tagFilter.length) {
      const tagIds = new Set((task.tags || []).map((t) => Number(t.id)));
      if (!tagFilter.every((id) => tagIds.has(id))) return false;
    }
    return matchesSearch([task.title, task.category?.name, ...(task.tags?.map((t) => t.name) || [])], search);
  });
  const sorted = prioritizePinned(sortTasks(filtered, sortKey));
  if (!targetList) return;
  targetList.innerHTML = "";
  if (!sorted.length) {
    const message = tasks.length ? "Ничего не найдено по текущему поиску или сортировке" : "Задач пока нет";
    targetList.innerHTML = `<p class="muted">${message}</p>`;
    return;
  }
  sorted.forEach((task) => {
    const dueDate = task.due_datetime ? new Date(task.due_datetime) : null;
    const dueDateLabel = dueDate ? dueDate.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "Без даты";
    const dueTimeLabel = dueDate ? dueDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    const categoryLabel = task.category?.name || "Без категории";
    const tags = task.tags || [];
    const priorityValue = task.priority ?? 0;
    let progressValue = clamp(task.completion_value || 0, 0, 100);
    const emoji = emojiFor("tasks", task.id, task.emoji || "📝");

    const card = document.createElement("article");
    card.className = "card entry neo-card task-card entry-modern";
    card.dataset.entryKind = "task";
    card.dataset.entryId = String(task.id);

    const head = document.createElement("div");
    head.className = "entry-head";
    const titleWrap = document.createElement("div");
    titleWrap.className = "entry-title-block";
    titleWrap.innerHTML = `
      <div class="entry-emoji">${emoji}</div>
      <div>
        <div class="entry-title">${task.title}</div>
        <p class="muted entry-description">${task.description || "Описание не заполнено"}</p>
      </div>
    `;
    const actionsTop = document.createElement("div");
    actionsTop.className = "entry-actions";
    const pinBtn = createPinButton(!!task.pinned, () => togglePinned("task", task.id, !task.pinned));
    const kebab = createKebabMenu(() => openTaskEditor(task, card), () => deleteTask(task.id));
    actionsTop.append(pinBtn, kebab);
    head.append(titleWrap, actionsTop);

    const metaLine = document.createElement("div");
    metaLine.className = "meta-line";
    metaLine.append(
      createMetaItem("&#128197;", `${dueDateLabel}, ${dueTimeLabel}`),
      createMetaItem("&#128193;", categoryLabel),
      createMetaItem("&#9873;", `Приоритет ${priorityValue || "-"}`)
    );

    const tagsRow = document.createElement("div");
    tagsRow.className = "tag-row compact";
    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tag-chip-wrap";
    if (!tags.length) {
      tagsWrap.innerHTML = '<span class="muted">Теги не выбраны</span>';
    } else {
      tags.forEach((tag) => tagsWrap.appendChild(createTagChip(`#${tag.name}`)));
    }
    tagsRow.append(tagsWrap);

    const checklist = document.createElement("div");
    checklist.className = "checklist";
    const subtasks = getSubtasks("task", task.id);
    const listEl = document.createElement("div");
    listEl.className = "checklist-list";
    const renderSubtasks = () => {
      listEl.innerHTML = "";
      if (!subtasks.length) {
        listEl.innerHTML = '<span class="muted">Подзадач пока нет</span>';
        return;
      }
      subtasks.forEach((sub) => {
        const item = document.createElement("label");
        item.className = "checklist-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.done;
        cb.onchange = () => {
          const next = toggleSubtask("task", task.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        const span = document.createElement("span");
        span.textContent = sub.title;
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ghost-btn";
        del.textContent = "×";
        del.onclick = () => {
          const next = removeSubtask("task", task.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        item.append(cb, span, del);
        listEl.appendChild(item);
      });
    };
    renderSubtasks();
    const addWrap = document.createElement("div");
    addWrap.className = "checklist-add";
    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "Новая подзадача";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.onclick = () => {
      const title = (addInput.value || "").trim();
      if (!title) return;
      const next = addSubtask("task", task.id, title);
      subtasks.splice(0, subtasks.length, ...next);
      addInput.value = "";
      renderSubtasks();
    };
    addWrap.append(addInput, addBtn);
    checklist.append(listEl, addWrap);

    const footer = document.createElement("div");
    footer.className = "entry-footer";
    const finishControl = document.createElement("div");
    finishControl.className = "finish-control";
    const finishLabel = document.createElement("button");
    finishLabel.type = "button";
    finishLabel.className = "finish-label";
    const applyFinishState = (val) => {
      progressValue = val;
      finishControl.style.setProperty("--complete", `${val}%`);
      finishLabel.textContent = val >= 100 ? "Сбросить прогресс" : "Завершить задачу";
      card.classList.toggle("completed", val >= 100);
    };
    applyFinishState(progressValue);
    finishControl.onclick = () => {
      const next = progressValue >= 100 ? 0 : 100;
      applyFinishState(next);
      updateTaskCompletion(task.id, next);
    };
    finishControl.append(finishLabel);
    footer.append(finishControl);

    const body = document.createElement("div");
    body.className = "card-body task-body entry-body";
    body.append(metaLine, tagsRow, checklist, footer);

    card.append(head, body);
    targetList.appendChild(card);
  });
}

const labelWrap = (text, control) => {
  const label = document.createElement("label");
  label.textContent = text;
  label.append(control);
  return label;
};

function createCollapseToggle(card, body) {
  let collapsed = false;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ghost-btn collapse-btn";
  const apply = () => {
    body.hidden = collapsed;
    card.classList.toggle("collapsed", collapsed);
    card.querySelectorAll(".entry-description").forEach((el) => (el.hidden = collapsed));
    btn.textContent = collapsed ? "Развернуть" : "Свернуть";
  };
  btn.addEventListener("click", () => {
    collapsed = !collapsed;
    apply();
  });
  apply();
  return btn;
}

function openTaskEditor(task, card) {
  card.querySelectorAll(".inline-editor").forEach((el) => el.remove());
  card.classList.add("editing");
  const { date, time } = splitDateTimeParts(task.due_datetime);
  const form = document.createElement("form");
  form.className = "inline-editor neo-editor";

  const emojiInput = document.createElement("input");
  emojiInput.type = "text";
  emojiInput.maxLength = 4;
  emojiInput.value = emojiFor("tasks", task.id, task.emoji || "🍦");
  emojiInput.placeholder = "Эмоджи";

  const titleInput = document.createElement("input");
  titleInput.type = "text";
  titleInput.value = task.title;
  const descriptionInput = document.createElement("textarea");
  descriptionInput.value = task.description || "";

  const statusSelect = document.createElement("select");
  const statusOptions = [
    { value: "pending", label: "В ожидании" },
    { value: "in_progress", label: "В работе" },
    { value: "done", label: "Готово" },
    { value: "cancelled", label: "Отменено" },
  ];
  const statusValue = task.status || completionStatusFromValue(task.completion_value);
  statusOptions.forEach(({ value, label }) => {
    const opt = new Option(label, value, false, value === statusValue);
    statusSelect.appendChild(opt);
  });

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

  const categorySelect = document.createElement("select");
  setupCategorySelect(categorySelect, task.category_id);

  const tagSelect = document.createElement("select");
  tagSelect.multiple = true;
  tagSelect.size = 4;
  tagSelect.style.display = "none";
  setupTagSelect(tagSelect, task.tags?.map((t) => t.id) || []);

  const tagChips = document.createElement("div");
  tagChips.className = "tag-chip-wrap";
  const tagRow = document.createElement("div");
  tagRow.className = "chip-row";
  tagRow.appendChild(tagChips);
  const tagInput = document.createElement("input");
  tagInput.type = "text";
  tagInput.placeholder = "Новый тег";
  const tagDataList = document.createElement("datalist");
  const tagDataListId = `tag-options-task-${task.id}`;
  tagDataList.id = tagDataListId;
  state.tags.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    tagDataList.appendChild(opt);
  });
  tagInput.setAttribute("list", tagDataListId);
  const tagAddBtn = document.createElement("button");
  tagAddBtn.type = "button";
  tagAddBtn.className = "ghost-pill";
  tagAddBtn.textContent = "+";
  const tagAddWrap = document.createElement("div");
  tagAddWrap.className = "chip-add";
  tagAddWrap.append(tagInput, tagAddBtn, tagDataList);

  const renderTagChips = () => {
    tagChips.innerHTML = "";
    const selectedIds = readSelectedValues(tagSelect);
    if (!selectedIds.length) {
      tagChips.innerHTML = '<span class="muted">Теги не выбраны</span>';
      return;
    }
    selectedIds.forEach((id) => {
      const tag = state.tags.find((t) => t.id === id);
      const chip = createTagChip(`#${tag?.name || id}`, true, () => {
        Array.from(tagSelect.options).forEach((opt) => {
          if (Number(opt.value) === id) opt.selected = false;
        });
        renderTagChips();
      });
      tagChips.appendChild(chip);
    });
  };

  tagSelect.addEventListener("change", renderTagChips);
  renderTagChips();

  tagAddBtn.onclick = async (event) => {
    event.preventDefault();
    const name = (tagInput.value || "").trim();
    if (!name) return;
    let tag = state.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      try {
        tag = await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name }) });
        if (tag) {
          state.tags.push(tag);
          renderTaxonomy();
        }
      } catch (error) {
        setStatus(error.message, "error");
        return;
      }
    }
    Array.from(tagSelect.options).forEach((opt) => {
      if (Number(opt.value) === tag.id) opt.selected = true;
    });
    tagInput.value = "";
    renderTagChips();
  };

  form.append(
    labelWrap("Эмоджи", emojiInput),
    labelWrap("Название", titleInput),
    labelWrap("Описание", descriptionInput),
    labelWrap("Статус", statusSelect),
    labelWrap("Дата", dateInput),
    labelWrap("Время", timeInput),
    labelWrap("Приоритет (1-10)", priorityInput),
    labelWrap("Категория", categorySelect),
    labelWrap("Теги", tagSelect),
    (() => {
      const wrap = document.createElement("div");
      wrap.className = "chip-input";
      wrap.append(tagRow, tagAddWrap);
      return wrap;
    })()
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
  cancelBtn.onclick = () => {
    card.classList.remove("editing");
    form.remove();
  };
  actions.append(saveBtn, cancelBtn);
  form.append(actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emojiValue = (emojiInput.value || "").trim() || "🍦";
    setEmoji("tasks", task.id, emojiValue);
    const payload = {
      title: titleInput.value,
      description: descriptionInput.value,
      priority: Number(priorityInput.value) || 1,
      due_datetime: isoFromDateTime(dateInput.value, timeInput.value),
      category_id: Number(categorySelect.value) || null,
      tag_ids: readSelectedValues(tagSelect),
      status: statusSelect.value,
    };
    await saveTaskEdit(task.id, payload, form);
    card.classList.remove("editing");
  });

  const container = card.querySelector(".card-body") || card;
  container.appendChild(form);
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
    setStatus("Прогресс по задаче сохранен", "success");
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
    setStatus("Привычка добавлена", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadHabits() {
  try {
    const habits = await apiFetch("/habits");
    state.habits = habits || [];
    await loadHabitStatuses(state.habits);
    renderHabits(state.habits);
    if (homeHabitsList) renderHabits(state.habits, homeHabitsList);
  } catch (error) {
    state.habits = [];
    renderHabits(state.habits);
    if (homeHabitsList) renderHabits(state.habits, homeHabitsList);
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
  const map = { daily: "Каждый день", weekly: "Раз в неделю", custom: "Своя схема" };
  return map[schedule] || "Не задано";
}

function habitStatusText(habit) {
  const log = state.habitStatuses[habit.id];
  const statusKey = completionStatusFromValue(habit.completion_value);
  let label;
  if (log?.status === "skipped") label = "Пропущено";
  else if (statusKey === "done") label = "Готово";
  else if (statusKey === "in_progress") label = `${habit.completion_value}%`;
  else label = "Пока не начата";
  if (habit.schedule_type === "weekly" && log?.date) return `${label} (${log.date})`;
  return label;
}

function renderHabits(habits, targetList = habitsList) {
  const search = (state.ui?.habitSearch || "").toLowerCase();
  const sortKey = (state.ui?.habitSort || "name_asc");
  const tagFilter = (state.ui?.habitTagFilter || []).map((id) => Number(id)).filter(Boolean);
  const filtered = habits.filter((habit) => {
    if (tagFilter.length) {
      const tagIds = new Set((habit.tags || []).map((t) => Number(t.id)));
      if (!tagFilter.every((id) => tagIds.has(id))) return false;
    }
    return matchesSearch([habit.name, habit.category?.name, ...(habit.tags?.map((t) => t.name) || [])], search);
  });
  const sorted = prioritizePinned(sortHabits(filtered, sortKey));
  if (!targetList) return;
  targetList.innerHTML = "";
  if (!sorted.length) {
    const message = habits.length ? "Ничего не найдено по текущему поиску или сортировке" : "Привычек пока нет";
    targetList.innerHTML = `<p class="muted">${message}</p>`;
    return;
  }
  sorted.forEach((habit) => {
    const categoryLabel = habit.category?.name || "Без категории";
    const tags = habit.tags || [];
    const scheduleLabel = habitScheduleLabel(habit.schedule_type);
    const priorityValue = habit.priority ?? "-";
    let progressValue = clamp(habit.completion_value || 0, 0, 100);
    const emoji = emojiFor("habits", habit.id, habit.emoji || "📌");

    const card = document.createElement("article");
    card.className = "card entry neo-card habit-card entry-modern";
    card.dataset.entryKind = "habit";
    card.dataset.entryId = String(habit.id);

    const head = document.createElement("div");
    head.className = "entry-head";
    const titleWrap = document.createElement("div");
    titleWrap.className = "entry-title-block";
    titleWrap.innerHTML = `
      <div class="entry-emoji">${emoji}</div>
      <div>
        <div class="entry-title">${habit.name}</div>
        <p class="muted entry-description">${habit.description || "Описание не заполнено"}</p>
      </div>
    `;
    const actionsTop = document.createElement("div");
    actionsTop.className = "entry-actions";
    const pinBtn = createPinButton(!!habit.pinned, () => togglePinned("habit", habit.id, !habit.pinned));
    const kebab = createKebabMenu(() => openHabitEditor(habit, card), () => deleteHabit(habit.id));
    actionsTop.append(pinBtn, kebab);
    head.append(titleWrap, actionsTop);

    const metaLine = document.createElement("div");
    metaLine.className = "meta-line";
    metaLine.append(
      createMetaItem("🗓", scheduleLabel),
      createMetaItem("&#128193;", categoryLabel),
      createMetaItem("&#9873;", `Приоритет ${priorityValue}`)
    );

    const tagsRow = document.createElement("div");
    tagsRow.className = "tag-row compact";
    const tagsWrap = document.createElement("div");
    tagsWrap.className = "tag-chip-wrap";
    if (!tags.length) {
      tagsWrap.innerHTML = '<span class="muted">Теги не выбраны</span>';
    } else {
      tags.forEach((tag) => tagsWrap.appendChild(createTagChip(`#${tag.name}`)));
    }
    tagsRow.append(tagsWrap);

    const checklist = document.createElement("div");
    checklist.className = "checklist";
    const subtasks = getSubtasks("habit", habit.id);
    const listEl = document.createElement("div");
    listEl.className = "checklist-list";
    const renderSubtasks = () => {
      listEl.innerHTML = "";
      if (!subtasks.length) {
        listEl.innerHTML = '<span class="muted">Подзадач пока нет</span>';
        return;
      }
      subtasks.forEach((sub) => {
        const item = document.createElement("label");
        item.className = "checklist-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.done;
        cb.onchange = () => {
          const next = toggleSubtask("habit", habit.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        const span = document.createElement("span");
        span.textContent = sub.title;
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ghost-btn";
        del.textContent = "×";
        del.onclick = () => {
          const next = removeSubtask("habit", habit.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        item.append(cb, span, del);
        listEl.appendChild(item);
      });
    };
    renderSubtasks();
    const addWrap = document.createElement("div");
    addWrap.className = "checklist-add";
    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "Новая подзадача";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.onclick = () => {
      const title = (addInput.value || "").trim();
      if (!title) return;
      const next = addSubtask("habit", habit.id, title);
      subtasks.splice(0, subtasks.length, ...next);
      addInput.value = "";
      renderSubtasks();
    };
    addWrap.append(addInput, addBtn);
    checklist.append(listEl, addWrap);

    const footer = document.createElement("div");
    footer.className = "entry-footer";
    const finishControl = document.createElement("div");
    finishControl.className = "finish-control";
    const finishLabel = document.createElement("button");
    finishLabel.type = "button";
    finishLabel.className = "finish-label";
    const applyFinishState = (val) => {
      progressValue = val;
      finishControl.style.setProperty("--complete", `${val}%`);
      finishLabel.textContent = val >= 100 ? "Сбросить прогресс" : "Отметить выполнение";
      card.classList.toggle("completed", val >= 100);
    };
    applyFinishState(progressValue);
    finishControl.onclick = () => {
      const next = progressValue >= 100 ? 0 : 100;
      applyFinishState(next);
      updateHabitCompletion(habit.id, next);
    };
    finishControl.append(finishLabel);
    footer.append(finishControl);

    const body = document.createElement("div");
    body.className = "card-body habit-body entry-body";
    body.append(metaLine, tagsRow, checklist, footer);

    card.append(head, body);
    targetList.appendChild(card);
  });
}

function compareStrings(a, b) {
  return (a || "").localeCompare(b || "", "ru", { sensitivity: "base" });
}

const tagsValue = (tags) =>
  tags?.length ? tags.map((t) => t?.name || "").filter(Boolean).sort(compareStrings).join(", ") : "";

function matchesSearch(parts, search) {
  if (!search) return true;
  const haystack = parts.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(search);
}

function prioritizePinned(list) {
  const pinned = [];
  const regular = [];
  list.forEach((item) => ((item?.pinned ? pinned : regular).push(item)));
  return [...pinned, ...regular];
}

function createPinButton(isPinned, onToggle) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `pin-btn ${isPinned ? "pinned" : ""}`;
  btn.innerHTML = isPinned ? "&#9733;" : "&#9734;";
  btn.title = isPinned ? "Открепить" : "Закрепить";
  btn.onclick = (event) => {
    event.stopPropagation();
    onToggle?.();
  };
  return btn;
}

async function togglePinned(kind, id, pinned) {
  const endpoints = {
    task: `/tasks/${id}`,
    habit: `/habits/${id}`,
    reminder: `/reminders/${id}`,
  };
  const path = endpoints[kind];
  if (!path) return;
  try {
    await apiFetch(path, { method: "PATCH", body: JSON.stringify({ pinned }) });
    if (kind === "task") await loadTasks();
    else if (kind === "habit") await loadHabits();
    else if (kind === "reminder") await loadReminders();
    setStatus(pinned ? "Закреплено" : "Откреплено", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function sortTasks(list, sortKey) {
  const items = [...list];
  const dateValue = (task, fallback) => (task.due_datetime ? new Date(task.due_datetime).getTime() : fallback);
  items.sort((a, b) => {
    switch (sortKey) {
      case "priority_asc":
        return (a.priority ?? 0) - (b.priority ?? 0);
      case "date_asc":
        return dateValue(a, Number.MAX_SAFE_INTEGER) - dateValue(b, Number.MAX_SAFE_INTEGER);
      case "date_desc":
        return dateValue(b, -Infinity) - dateValue(a, -Infinity);
      case "category":
        return compareStrings(a.category?.name, b.category?.name);
      case "tags":
        return compareStrings(tagsValue(a.tags), tagsValue(b.tags));
      case "title":
        return compareStrings(a.title, b.title);
      case "priority_desc":
      default:
        return (b.priority ?? 0) - (a.priority ?? 0);
    }
  });
  return items;
}

function sortHabits(list, sortKey) {
  const items = [...list];
  const logDateValue = (habit, fallback) => {
    const logDate = state.habitStatuses?.[habit.id]?.date;
    return logDate ? new Date(logDate).getTime() : fallback;
  };
  items.sort((a, b) => {
    switch (sortKey) {
      case "priority_desc":
        return (b.priority ?? 0) - (a.priority ?? 0);
      case "priority_asc":
        return (a.priority ?? 0) - (b.priority ?? 0);
      case "category":
        return compareStrings(a.category?.name, b.category?.name);
      case "tags":
        return compareStrings(tagsValue(a.tags), tagsValue(b.tags));
      case "log_date_desc":
        return logDateValue(b, -Infinity) - logDateValue(a, -Infinity);
      case "name_desc":
        return compareStrings(b.name, a.name);
      case "name_asc":
      default:
        return compareStrings(a.name, b.name);
    }
  });
  return items;
}

function openHabitEditor(habit, card) {
  card.querySelectorAll(".inline-editor").forEach((el) => el.remove());
  card.classList.add("editing");
  const form = document.createElement("form");
  form.className = "inline-editor neo-editor";

  const emojiInput = document.createElement("input");
  emojiInput.type = "text";
  emojiInput.maxLength = 4;
  emojiInput.value = emojiFor("habits", habit.id, habit.emoji || "🌀");
  emojiInput.placeholder = "Эмоджи";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = habit.name;
  const descInput = document.createElement("textarea");
  descInput.value = habit.description || "";

  const scheduleSelect = document.createElement("select");
  [
    { value: "daily", label: "Каждый день" },
    { value: "weekly", label: "Раз в неделю" },
    { value: "custom", label: "Своя схема" },
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

  const categorySelect = document.createElement("select");
  setupCategorySelect(categorySelect, habit.category_id);

  const tagSelect = document.createElement("select");
  tagSelect.multiple = true;
  tagSelect.size = 4;
  tagSelect.style.display = "none";
  setupTagSelect(tagSelect, habit.tags?.map((t) => t.id) || []);

  const tagChips = document.createElement("div");
  tagChips.className = "tag-chip-wrap";
  const tagRow = document.createElement("div");
  tagRow.className = "chip-row";
  tagRow.appendChild(tagChips);
  const tagInput = document.createElement("input");
  tagInput.type = "text";
  tagInput.placeholder = "Новый тег";
  const tagDataList = document.createElement("datalist");
  const tagDataListId = `tag-options-habit-${habit.id}`;
  tagDataList.id = tagDataListId;
  state.tags.forEach((t) => {
    const opt = document.createElement("option");
    opt.value = t.name;
    tagDataList.appendChild(opt);
  });
  tagInput.setAttribute("list", tagDataListId);
  const tagAddBtn = document.createElement("button");
  tagAddBtn.type = "button";
  tagAddBtn.className = "ghost-pill";
  tagAddBtn.textContent = "+";
  const tagAddWrap = document.createElement("div");
  tagAddWrap.className = "chip-add";
  tagAddWrap.append(tagInput, tagAddBtn, tagDataList);

  const renderTagChips = () => {
    tagChips.innerHTML = "";
    const selectedIds = readSelectedValues(tagSelect);
    if (!selectedIds.length) {
      tagChips.innerHTML = '<span class="muted">Теги не выбраны</span>';
      return;
    }
    selectedIds.forEach((id) => {
      const tag = state.tags.find((t) => t.id === id);
      const chip = createTagChip(`#${tag?.name || id}`, true, () => {
        Array.from(tagSelect.options).forEach((opt) => {
          if (Number(opt.value) === id) opt.selected = false;
        });
        renderTagChips();
      });
      tagChips.appendChild(chip);
    });
  };

  tagSelect.addEventListener("change", renderTagChips);
  renderTagChips();

  tagAddBtn.onclick = async (event) => {
    event.preventDefault();
    const name = (tagInput.value || "").trim();
    if (!name) return;
    let tag = state.tags.find((t) => t.name.toLowerCase() === name.toLowerCase());
    if (!tag) {
      try {
        tag = await apiFetch("/tags", { method: "POST", body: JSON.stringify({ name }) });
        if (tag) {
          state.tags.push(tag);
          renderTaxonomy();
        }
      } catch (error) {
        setStatus(error.message, "error");
        return;
      }
    }
    Array.from(tagSelect.options).forEach((opt) => {
      if (Number(opt.value) === tag.id) opt.selected = true;
    });
    tagInput.value = "";
    renderTagChips();
  };

  form.append(
    labelWrap("Эмоджи", emojiInput),
    labelWrap("Название", nameInput),
    labelWrap("Описание", descInput),
    labelWrap("Расписание", scheduleSelect),
    labelWrap("Активна", activeToggle),
    labelWrap("Категория", categorySelect),
    labelWrap("Теги", tagSelect),
    (() => {
      const wrap = document.createElement("div");
      wrap.className = "chip-input";
      wrap.append(tagRow, tagAddWrap);
      return wrap;
    })()
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
  cancelBtn.onclick = () => {
    card.classList.remove("editing");
    form.remove();
  };
  actions.append(saveBtn, cancelBtn);
  form.append(actions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emojiValue = (emojiInput.value || "").trim() || "🌀";
    setEmoji("habits", habit.id, emojiValue);
    const payload = {
      name: nameInput.value,
      description: descInput.value,
      schedule_type: scheduleSelect.value,
      is_active: activeToggle.checked,
      category_id: Number(categorySelect.value) || null,
      tag_ids: readSelectedValues(tagSelect),
    };
    await saveHabitEdit(habit.id, payload, form);
    card.classList.remove("editing");
  });
  const container = card.querySelector(".card-body") || card;
  container.appendChild(form);
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
    setStatus("Прогресс по привычке сохранен", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function logHabitStatus(habitId, status) {
  try {
    await apiFetch(`/habits/${habitId}/logs`, { method: "POST", body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), status }) });
    setStatus("Статус привычки отмечен", "success");
    await loadHabits();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function deleteHabit(id) {
  try {
    await apiFetch(`/habits/${id}`, { method: "DELETE" });
    setStatus("Привычка удалена", "success");
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
    setStatus("Напоминание добавлено", "success");
    await loadReminders();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function loadReminders() {
  try {
    const reminders = await apiFetch("/reminders");
    state.reminders = reminders || [];
    renderReminders(state.reminders);
    if (homeRemindersList) renderReminders(state.reminders, homeRemindersList, state.ui.homeSearch);
  } catch (error) {
    state.reminders = [];
    renderReminders([]);
    if (homeRemindersList) renderReminders([], homeRemindersList, state.ui.homeSearch);
    setStatus(error.message, "error");
  }
}

function reminderTypeLabel(type) {
  const map = { time: "По времени" };
  return map[type] || "Напоминание";
}

function renderReminders(reminders, targetList = remindersList, searchQuery = "") {
  if (!targetList) return;
  const q = (searchQuery || "").toLowerCase();
  targetList.innerHTML = "";
  const ordered = prioritizePinned(reminders.slice());
  const filtered = ordered.filter((rem) => {
    if (!q) return true;
    const hay = [rem.behavior_rule, rem.note].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });
  if (!filtered.length) {
    targetList.innerHTML = '<p class="muted">Напоминаний пока нет</p>';
    return;
  }
  filtered.forEach((reminder) => {
    const trigger = reminder.trigger_time ? new Date(reminder.trigger_time) : null;
    const dateLabel = trigger ? trigger.toLocaleDateString("ru-RU", { day: "2-digit", month: "short" }) : "Без даты";
    const timeLabel = trigger ? trigger.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }) : "--:--";
    const typeLabel = reminderTypeLabel(reminder.type);
    const statusKey = reminder.is_active === false ? "snoozed" : "pending";
    const statusLabel = statusKey === "snoozed" ? "Отложено" : "Запланировано";
    const emoji = reminder.emoji || "⏰";

    const card = document.createElement("article");
    card.className = "card entry neo-card reminder-card entry-modern";
    card.dataset.entryKind = "reminder";
    card.dataset.entryId = String(reminder.id);

    const head = document.createElement("div");
    head.className = "entry-head";
    const titleWrap = document.createElement("div");
    titleWrap.className = "entry-title-block";
    titleWrap.innerHTML = `
      <div class="entry-emoji">${emoji}</div>
      <div>
        <div class="entry-title">${reminder.behavior_rule || "Напоминание"}</div>
        <p class="muted entry-description">${typeLabel}</p>
      </div>
    `;
    const actionsTop = document.createElement("div");
    actionsTop.className = "entry-actions";
    const pinBtn = createPinButton(!!reminder.pinned, () => togglePinned("reminder", reminder.id, !reminder.pinned));
    const kebab = createKebabMenu(() => openReminderEditor(reminder, card), () => deleteReminder(reminder.id));
    actionsTop.append(pinBtn, kebab);
    head.append(titleWrap, actionsTop);

    const metaLine = document.createElement("div");
    metaLine.className = "meta-line";
    metaLine.append(
      createMetaItem("&#128197;", dateLabel),
      createMetaItem("&#9201;", timeLabel),
      createMetaItem("&#128276;", statusLabel)
    );

    const checklist = document.createElement("div");
    checklist.className = "checklist";
    const subtasks = getSubtasks("reminder", reminder.id);
    const listEl = document.createElement("div");
    listEl.className = "checklist-list";
    const renderSubtasks = () => {
      listEl.innerHTML = "";
      if (!subtasks.length) {
        listEl.innerHTML = '<span class="muted">Подзадач пока нет</span>';
        return;
      }
      subtasks.forEach((sub) => {
        const item = document.createElement("label");
        item.className = "checklist-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = sub.done;
        cb.onchange = () => {
          const next = toggleSubtask("reminder", reminder.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        const span = document.createElement("span");
        span.textContent = sub.title;
        const del = document.createElement("button");
        del.type = "button";
        del.className = "ghost-btn";
        del.textContent = "×";
        del.onclick = () => {
          const next = removeSubtask("reminder", reminder.id, sub.id);
          subtasks.splice(0, subtasks.length, ...next);
          renderSubtasks();
        };
        item.append(cb, span, del);
        listEl.appendChild(item);
      });
    };
    renderSubtasks();
    const addWrap = document.createElement("div");
    addWrap.className = "checklist-add";
    const addInput = document.createElement("input");
    addInput.type = "text";
    addInput.placeholder = "Новая подзадача";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "+";
    addBtn.onclick = () => {
      const title = (addInput.value || "").trim();
      if (!title) return;
      const next = addSubtask("reminder", reminder.id, title);
      subtasks.splice(0, subtasks.length, ...next);
      addInput.value = "";
      renderSubtasks();
    };
    addWrap.append(addInput, addBtn);
    checklist.append(listEl, addWrap);

    const body = document.createElement("div");
    body.className = "card-body reminder-body entry-body";
    body.append(metaLine, checklist);

    card.append(head, body);
    targetList.appendChild(card);
  });
}

async function loadAssistantHistory(limit = 50) {
  try {
    const history = await apiFetch(`/assistant/history?limit=${encodeURIComponent(limit)}`);
    state.assistantHistory = Array.isArray(history) ? history : [];
    renderAssistantHistory();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function refreshAfterAssistantActions() {
  await Promise.all([loadTasks(), loadHabits(), loadReminders(), loadTaxonomy()]);
}

async function handleAssistant(event) {
  event.preventDefault();
  const messageInput = el("assistant-message");
  const message = messageInput.value.trim();
  if (!message) return;
  messageInput.value = "";
  try {
    // Optimistic render so the user sees their message immediately.
    const now = new Date().toISOString();
    state.assistantHistory.push({ role: "user", content: message, created_at: now });
    renderAssistantHistory();

    await apiFetch("/assistant/message", { method: "POST", body: JSON.stringify({ user_message: message }) });
    await loadAssistantHistory();
    await refreshAfterAssistantActions();
  } catch (error) {
    setStatus(error.message, "error");
  }
}

function normalizeAssistantEntryKind(rawKind = "") {
  const kind = String(rawKind || "").toLowerCase();
  if (kind.startsWith("task") || kind.startsWith("задач")) return "task";
  if (kind.startsWith("habit") || kind.startsWith("привыч")) return "habit";
  if (kind.startsWith("reminder") || kind.startsWith("напомин")) return "reminder";
  return null;
}

function parseAssistantCreatedEntries(content = "") {
  const source = String(content || "").trim();
  if (!source) return { text: "", created: [] };
  const doneIndex = source.search(/\bdone\s*:/iu);
  const scanSource = doneIndex >= 0 ? source.slice(doneIndex) : source;
  const created = [];
  ASSISTANT_CREATED_ENTRY_RE.lastIndex = 0;
  let match = ASSISTANT_CREATED_ENTRY_RE.exec(scanSource);
  while (match) {
    const kind = normalizeAssistantEntryKind(match[1]);
    const id = Number(match[2]);
    if (kind && Number.isFinite(id)) {
      created.push({
        kind,
        id,
        title: String(match[3] || "").trim(),
      });
    }
    match = ASSISTANT_CREATED_ENTRY_RE.exec(scanSource);
  }
  const unique = [];
  const seen = new Set();
  created.forEach((item) => {
    const key = `${item.kind}:${item.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(item);
  });
  let text = source;
  if (doneIndex >= 0 && unique.length) {
    text = source.slice(0, doneIndex).trim().replace(/[\s,;:.!?-]+$/u, "");
  }
  return { text, created: unique };
}

function assistantEntryLabel(kind) {
  const labels = {
    task: "Задача",
    habit: "Привычка",
    reminder: "Напоминание",
  };
  return labels[kind] || "Запись";
}

function resetTaskFiltersForAssistantJump() {
  state.ui.taskSearch = "";
  state.ui.taskTagFilter = [];
  if (taskSearchInput) taskSearchInput.value = "";
  fillFilterTagSelect(taskFilterTagsSelect, []);
}

function resetHabitFiltersForAssistantJump() {
  state.ui.habitSearch = "";
  state.ui.habitTagFilter = [];
  if (habitSearchInput) habitSearchInput.value = "";
  fillFilterTagSelect(habitFilterTagsSelect, []);
}

async function navigateToAssistantEntry(kind, id) {
  const targetId = Number(id);
  if (!Number.isFinite(targetId)) return;
  const pageByKind = {
    task: "tasks-page",
    habit: "habits-page",
    reminder: "reminders-page",
  };
  const pageId = pageByKind[kind];
  if (!pageId) return;
  if (kind === "task") resetTaskFiltersForAssistantJump();
  if (kind === "habit") resetHabitFiltersForAssistantJump();
  switchPage(pageId);
  if (kind === "task") await loadTasks();
  if (kind === "habit") await loadHabits();
  if (kind === "reminder") await loadReminders();
  const selector = `.entry-modern[data-entry-kind="${kind}"][data-entry-id="${targetId}"]`;
  const page = pages[pageId];
  const target = page?.querySelector(selector);
  if (!target) {
    setStatus(`Не удалось найти ${assistantEntryLabel(kind).toLowerCase()} #${targetId}`, "error");
    return;
  }
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  target.classList.add("assistant-linked");
  setTimeout(() => target.classList.remove("assistant-linked"), 1800);
}

function buildAssistantCreatedEntryLink(entry) {
  const link = document.createElement("a");
  link.href = "#";
  link.className = "assistant-created-link";
  const kicker = document.createElement("span");
  kicker.className = "assistant-created-kicker";
  kicker.textContent = "Создано";
  const title = document.createElement("strong");
  title.className = "assistant-created-title";
  title.textContent = `${assistantEntryLabel(entry.kind)} #${entry.id}`;
  const caption = document.createElement("span");
  caption.className = "assistant-created-caption";
  caption.textContent = entry.title || "Открыть запись";
  const action = document.createElement("span");
  action.className = "assistant-created-action";
  action.textContent = "Открыть";
  link.append(kicker, title, caption, action);
  link.addEventListener("click", async (event) => {
    event.preventDefault();
    await navigateToAssistantEntry(entry.kind, entry.id);
  });
  return link;
}

function renderAssistantHistory() {
  if (!assistantHistoryEl) return;
  assistantHistoryEl.innerHTML = "";
  if (!state.assistantHistory.length) {
    assistantHistoryEl.innerHTML = '<p class="muted">История пока пустая</p>';
    return;
  }
  state.assistantHistory.forEach((item) => {
    const isUser = (item.role || "").toLowerCase() === "user";
    const ts = item.created_at ? new Date(item.created_at) : new Date();
    const bubble = document.createElement("div");
    bubble.className = `assistant-bubble ${isUser ? "user" : "assistant"}`;
    const contentWrap = document.createElement("div");
    contentWrap.className = "assistant-content";
    const parsed = isUser ? { text: String(item.content || ""), created: [] } : parseAssistantCreatedEntries(item.content);
    const contentText = (parsed.text || "").trim() || (parsed.created.length ? "Готово." : String(item.content || ""));
    if (contentText) {
      const text = document.createElement("div");
      text.className = "assistant-text";
      text.textContent = contentText;
      contentWrap.appendChild(text);
    }
    if (!isUser && parsed.created.length) {
      const createdWrap = document.createElement("div");
      createdWrap.className = "assistant-created-list";
      parsed.created.forEach((entry) => createdWrap.appendChild(buildAssistantCreatedEntryLink(entry)));
      contentWrap.appendChild(createdWrap);
    }
    const meta = document.createElement("span");
    meta.className = "assistant-meta";
    meta.textContent = ts.toLocaleTimeString("ru-RU");
    bubble.append(contentWrap, meta);
    assistantHistoryEl.appendChild(bubble);
  });
  assistantHistoryEl.scrollTop = assistantHistoryEl.scrollHeight;
}

async function apiFetch(path, options = {}) {
  return fetchJson(`${apiBase}${path}`, options);
}

async function refreshAll() {
  await loadTaxonomy();
  await Promise.all([loadTasks(), loadHabits(), loadReminders(), loadProfile(), loadGoals(), loadAssistantHistory()]);
}




