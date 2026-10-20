(() => {
  "use strict";

  const STORAGE_KEY = "habit-tracker-data";
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = dateKey(new Date());
  const elements = {
    habitList: document.getElementById("habitList"),
    emptyState: document.getElementById("emptyState"),
    progressCount: document.getElementById("progressCount"),
    progressPct: document.getElementById("progressPct"),
    progressFill: document.getElementById("progressFill"),
    dateLine: document.getElementById("dateLine"),
    addHabitOverlay: document.getElementById("addHabitOverlay"),
    newHabitInput: document.getElementById("newHabitInput"),
    dayOverlay: document.getElementById("dayOverlay"),
    dayModalTitle: document.getElementById("dayModalTitle"),
    dayModalList: document.getElementById("dayModalList"),
    calendarGrid: document.getElementById("calendarGrid"),
    weekdayRow: document.getElementById("weekdayRow"),
    monthLabel: document.getElementById("monthLabel"),
    statGrid: document.getElementById("statGrid"),
    chartCanvas: document.getElementById("chartCanvas"),
    snackbar: document.getElementById("snackbar")
  };

  let snackbarTimer;
  let installPrompt;
  let habits = loadHabits();
  let calendarMonth = new Date();
  calendarMonth.setDate(1);

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function loadHabits() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Saved habit data is not a list.");
      return parsed.filter(habit =>
        habit &&
        typeof habit.id === "string" &&
        typeof habit.name === "string" &&
        Array.isArray(habit.completions)
      );
    } catch (error) {
      console.error("Could not load saved habits:", error);
      showMessage("Saved habits could not be loaded.");
      return [];
    }
  }

  function saveHabits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
      return true;
    } catch (error) {
      console.error("Could not save habits:", error);
      showMessage("Your change could not be saved on this device.");
      return false;
    }
  }

  function showMessage(message) {
    elements.snackbar.textContent = message;
    elements.snackbar.classList.add("show");
    clearTimeout(snackbarTimer);
    snackbarTimer = setTimeout(() => elements.snackbar.classList.remove("show"), 2800);
  }

  function setModalOpen(modal, isOpen) {
    modal.hidden = !isOpen;
    if (isOpen && modal === elements.addHabitOverlay) {
      requestAnimationFrame(() => elements.newHabitInput.focus());
    }
  }

  function isComplete(habit, day = today) {
    return habit.completions.includes(day);
  }

  function toggleCompletion(habit, day) {
    if (isComplete(habit, day)) {
      habit.completions = habit.completions.filter(completion => completion !== day);
    } else {
      habit.completions.push(day);
    }
    saveHabits();
    render();
  }

  function makeHabitRow(habit, day, showDelete = false) {
    const row = document.createElement("div");
    row.className = `habit-item${isComplete(habit, day) ? " completed" : ""}`;

    const toggle = document.createElement("button");
    toggle.className = "habit-check";
    toggle.type = "button";
    toggle.dataset.action = "toggle";
    toggle.dataset.id = habit.id;
    toggle.dataset.day = day;
    toggle.setAttribute("aria-label", `${isComplete(habit, day) ? "Mark incomplete" : "Mark complete"}: ${habit.name}`);
    toggle.setAttribute("aria-pressed", String(isComplete(habit, day)));
    if (isComplete(habit, day)) toggle.textContent = "✓";

    const name = document.createElement("span");
    name.className = "habit-name";
    name.textContent = habit.name;

    row.append(toggle, name);

    if (showDelete) {
      const remove = document.createElement("button");
      remove.className = "delete-btn";
      remove.type = "button";
      remove.dataset.action = "delete";
      remove.dataset.id = habit.id;
      remove.setAttribute("aria-label", `Delete ${habit.name}`);
      remove.textContent = "✕";
      row.append(remove);
    }

    return row;
  }

  function renderToday() {
    elements.dateLine.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric"
    }).format(new Date());

    const completedCount = habits.filter(habit => isComplete(habit)).length;
    const percentage = habits.length ? Math.round(completedCount / habits.length * 100) : 0;
    elements.progressCount.textContent = `${completedCount}/${habits.length}`;
    elements.progressPct.textContent = `${percentage}%`;
    elements.progressFill.style.width = `${percentage}%`;
    elements.habitList.replaceChildren(...habits.map(habit => makeHabitRow(habit, today, true)));
    elements.emptyState.hidden = habits.length > 0;
  }

  function renderCalendar() {
    elements.weekdayRow.replaceChildren(...weekdays.map(day => {
      const label = document.createElement("span");
      label.textContent = day;
      return label;
    }));

    elements.monthLabel.textContent = new Intl.DateTimeFormat(undefined, {
      month: "long",
      year: "numeric"
    }).format(calendarMonth);

    const firstDay = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
    const cells = [];

    for (let index = 0; index < firstDay.getDay(); index += 1) {
      const emptyCell = document.createElement("div");
      emptyCell.className = "calendar-day empty";
      cells.push(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const key = dateKey(date);
      const count = habits.filter(habit => isComplete(habit, key)).length;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "calendar-day";
      if (key === today) cell.classList.add("today");
      if (key > today) cell.classList.add("future");
      cell.textContent = String(day);
      cell.dataset.day = key;
      cell.setAttribute("aria-label", `${date.toLocaleDateString()}: ${count} of ${habits.length} habits completed`);

      if (count > 0) {
        const ratio = count / Math.max(habits.length, 1);
        cell.style.backgroundColor = ratio >= 1 ? "#25d30e" : ratio >= 0.66 ? "#ffe58a" : ratio >= 0.33 ? "#ffd39a" : "#ffb4ab";
      }
      cells.push(cell);
    }

    elements.calendarGrid.replaceChildren(...cells);
  }

  function renderDayModal(day) {
    const date = new Date(`${day}T12:00:00`);
    elements.dayModalTitle.textContent = new Intl.DateTimeFormat(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    }).format(date);

    if (!habits.length) {
      const message = document.createElement("p");
      message.className = "empty-sub";
      message.textContent = "No habits to show.";
      elements.dayModalList.replaceChildren(message);
    } else {
      elements.dayModalList.replaceChildren(...habits.map(habit => makeHabitRow(habit, day)));
    }
    setModalOpen(elements.dayOverlay, true);
  }

  function getBestStreak() {
    let best = 0;
    for (const habit of habits) {
      const days = [...new Set(habit.completions)].sort();
      let streak = 0;
      let previous = null;
      for (const day of days) {
        const current = new Date(`${day}T12:00:00`);
        const gap = previous ? (current - previous) / 86400000 : 1;
        streak = gap === 1 ? streak + 1 : 1;
        best = Math.max(best, streak);
        previous = current;
      }
    }
    return best;
  }

  function renderStats() {
    const completedToday = habits.filter(habit => isComplete(habit)).length;
    const totalCompletions = habits.reduce((total, habit) => total + new Set(habit.completions).size, 0);
    const bestStreak = getBestStreak();
    const stats = [
      ["Total Habits", habits.length],
      ["Completed Today", `${completedToday}/${habits.length}`],
      ["Best Streak", `${bestStreak} ${bestStreak === 1 ? "day" : "days"}`],
      ["Total Check-ins", totalCompletions]
    ];

    elements.statGrid.replaceChildren(...stats.map(([label, value]) => {
      const card = document.createElement("div");
      card.className = "stat-card";
      const title = document.createElement("span");
      title.className = "stat-label";
      title.textContent = label;
      const number = document.createElement("strong");
      number.className = "stat-value";
      number.textContent = String(value);
      card.append(title, number);
      return card;
    }));
    drawChart();
  }

  function drawChart() {
    const canvas = elements.chartCanvas;
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width) return;

    const scale = window.devicePixelRatio || 1;
    const width = bounds.width;
    const height = 220;
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) {
      console.error("The progress chart could not be drawn because a 2D canvas is unavailable.");
      return;
    }
    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);

    const values = [];
    for (let offset = 13; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      values.push(habits.filter(habit => isComplete(habit, key)).length);
    }

    const max = Math.max(habits.length, 1);
    const gap = 5;
    const barWidth = (width - gap * 13) / 14;
    const chartHeight = height - 32;
    context.fillStyle = "#4f46e5";
    values.forEach((value, index) => {
      const barHeight = value / max * chartHeight;
      const x = index * (barWidth + gap);
      context.beginPath();
      context.roundRect(x, height - 20 - barHeight, barWidth, Math.max(barHeight, 2), 4);
      context.fill();
    });
  }

  function render() {
    renderToday();
    renderCalendar();
    renderStats();
  }

  document.querySelector(".bottom-nav").addEventListener("click", event => {
    const button = event.target.closest(".nav-item");
    if (!button) return;
    document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.toggle("active", screen.id === `screen-${button.dataset.screen}`);
    });
    if (button.dataset.screen === "progress") drawChart();
  });

  document.getElementById("fab").addEventListener("click", () => setModalOpen(elements.addHabitOverlay, true));
  document.getElementById("cancelAddHabit").addEventListener("click", () => setModalOpen(elements.addHabitOverlay, false));
  document.getElementById("confirmAddHabit").addEventListener("click", addHabit);
  elements.newHabitInput.addEventListener("keydown", event => {
    if (event.key === "Enter") addHabit();
  });

  function addHabit() {
    const name = elements.newHabitInput.value.trim();
    if (!name) {
      elements.newHabitInput.focus();
      showMessage("Enter a name for your habit.");
      return;
    }

    habits.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      completions: []
    });
    saveHabits();
    elements.newHabitInput.value = "";
    setModalOpen(elements.addHabitOverlay, false);
    render();
  }

  elements.habitList.addEventListener("click", handleHabitAction);
  elements.dayModalList.addEventListener("click", handleHabitAction);

  function handleHabitAction(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const habit = habits.find(item => item.id === button.dataset.id);
    if (!habit) return;

    if (button.dataset.action === "toggle") {
      toggleCompletion(habit, button.dataset.day || today);
    } else if (button.dataset.action === "delete") {
      habits = habits.filter(item => item.id !== habit.id);
      saveHabits();
      render();
    }
  }

  document.getElementById("resetTodayBtn").addEventListener("click", () => {
    const hasCompletions = habits.some(habit => isComplete(habit));
    if (!hasCompletions) {
      showMessage("Nothing to reset today.");
      return;
    }
    if (!window.confirm("Reset today's habit progress?")) return;
    habits.forEach(habit => {
      habit.completions = habit.completions.filter(day => day !== today);
    });
    saveHabits();
    render();
  });

  document.getElementById("resetAllBtn").addEventListener("click", () => {
    if (!habits.length) {
      showMessage("There are no habits to reset.");
      return;
    }
    if (!window.confirm("Delete all habits and progress?")) return;
    habits = [];
    saveHabits();
    render();
  });

  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  });
  document.getElementById("todayJumpBtn").addEventListener("click", () => {
    calendarMonth = new Date();
    calendarMonth.setDate(1);
    renderCalendar();
  });
  elements.calendarGrid.addEventListener("click", event => {
    const dayButton = event.target.closest("button[data-day]");
    if (dayButton) renderDayModal(dayButton.dataset.day);
  });
  document.getElementById("closeDayModal").addEventListener("click", () => setModalOpen(elements.dayOverlay, false));

  [elements.addHabitOverlay, elements.dayOverlay].forEach(overlay => {
    overlay.addEventListener("click", event => {
      if (event.target === overlay) setModalOpen(overlay, false);
    });
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      setModalOpen(elements.addHabitOverlay, false);
      setModalOpen(elements.dayOverlay, false);
    }
  });
  window.addEventListener("resize", drawChart);

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    document.getElementById("installIconBtn").hidden = false;
    document.getElementById("installBanner").hidden = false;
  });

  async function installApp() {
    if (!installPrompt) {
      showMessage("Install is not available in this browser.");
      return;
    }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    document.getElementById("installIconBtn").hidden = true;
    document.getElementById("installBanner").hidden = true;
  }

  document.getElementById("installIconBtn").addEventListener("click", installApp);
  document.getElementById("installBannerBtn").addEventListener("click", installApp);
  document.getElementById("installBannerClose").addEventListener("click", () => {
    document.getElementById("installBanner").hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    document.getElementById("installIconBtn").hidden = true;
    document.getElementById("installBanner").hidden = true;
    installPrompt = null;
    showMessage("Habit Tracker installed.");
  });

  render();
})();