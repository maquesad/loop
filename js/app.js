// ---------- Storage ----------
const STORAGE_KEY = 'loopTrackerData';

const DEFAULT_ROUTINE = {
  Mon: ['Squats 3x10', 'Push-ups 3x12', 'Plank 3x40s'],
  Tue: ['5k run / cardio 30min'],
  Wed: ['Deadlifts 3x8', 'Rows 3x10', 'Core circuit'],
  Thu: ['Rest / mobility'],
  Fri: ['Bench press 3x8', 'Lunges 3x10', 'Plank 3x40s'],
  Sat: ['Long run / bike'],
  Sun: ['Rest'],
};

function defaultData() {
  return {
    pomodoro: {
      settings: { focusMin: 25, breakMin: 5, longBreakMin: 15, sessionsBeforeLong: 4 },
      sessionsByDate: {},
    },
    workout: {
      routine: JSON.parse(JSON.stringify(DEFAULT_ROUTINE)),
      logByDate: {},
    },
    meals: {
      planByDate: {},
    },
    recipes: [],
    work: {
      tasks: [],
    },
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw);
    const base = defaultData();
    return {
      pomodoro: { ...base.pomodoro, ...parsed.pomodoro, settings: { ...base.pomodoro.settings, ...(parsed.pomodoro && parsed.pomodoro.settings) } },
      workout: { ...base.workout, ...parsed.workout },
      meals: { ...base.meals, ...parsed.meals },
      recipes: parsed.recipes || [],
      work: { ...base.work, ...parsed.work },
    };
  } catch (e) {
    console.warn('Failed to load stored data, starting fresh.', e);
    return defaultData();
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadData();

// ---------- Helpers ----------
function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function currentWeekday() {
  return WEEKDAYS[new Date().getDay()];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem('loopTheme');
  const theme = saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
}

document.getElementById('themeToggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('loopTheme', next);
  document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
});

// ---------- Tabs ----------
document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
});

// ---------- Header date ----------
function renderTodayDate() {
  const el = document.getElementById('todayDate');
  el.textContent = new Date().toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  });
}

// ---------- Pomodoro ----------
const timerDisplay = document.getElementById('timerDisplay');
const timerPhaseLabel = document.getElementById('timerPhaseLabel');
const timerStartPauseBtn = document.getElementById('timerStartPause');
const sessionCountEl = document.getElementById('sessionCount');

let timer = {
  phase: 'focus', // focus | break | longBreak
  remainingSec: 0,
  running: false,
  intervalId: null,
  completedFocusSessions: 0,
};

function phaseDurationSec(phase) {
  const s = state.pomodoro.settings;
  if (phase === 'focus') return s.focusMin * 60;
  if (phase === 'longBreak') return s.longBreakMin * 60;
  return s.breakMin * 60;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function loadSettingsIntoInputs() {
  const s = state.pomodoro.settings;
  document.getElementById('focusMin').value = s.focusMin;
  document.getElementById('breakMin').value = s.breakMin;
  document.getElementById('longBreakMin').value = s.longBreakMin;
  document.getElementById('sessionsBeforeLong').value = s.sessionsBeforeLong;
}

function renderSessionCount() {
  const count = state.pomodoro.sessionsByDate[todayKey()] || 0;
  sessionCountEl.textContent = `${count} session${count === 1 ? '' : 's'} today`;
}

function resetTimerToPhase(phase) {
  timer.phase = phase;
  timer.remainingSec = phaseDurationSec(phase);
  updateTimerUI();
}

function updateTimerUI() {
  timerDisplay.textContent = formatTime(timer.remainingSec);
  timerPhaseLabel.textContent = timer.phase === 'focus' ? 'Focus' : timer.phase === 'longBreak' ? 'Long break' : 'Break';
  timerStartPauseBtn.textContent = timer.running ? 'Pause' : 'Start';
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) { /* audio not available, ignore */ }
}

function advancePhase() {
  playChime();
  if (timer.phase === 'focus') {
    timer.completedFocusSessions += 1;
    const key = todayKey();
    state.pomodoro.sessionsByDate[key] = (state.pomodoro.sessionsByDate[key] || 0) + 1;
    saveData();
    renderSessionCount();
    const isLong = timer.completedFocusSessions % state.pomodoro.settings.sessionsBeforeLong === 0;
    resetTimerToPhase(isLong ? 'longBreak' : 'break');
  } else {
    resetTimerToPhase('focus');
  }
}

function tick() {
  timer.remainingSec -= 1;
  if (timer.remainingSec <= 0) {
    advancePhase();
    return;
  }
  updateTimerUI();
}

function startPauseTimer() {
  if (timer.running) {
    clearInterval(timer.intervalId);
    timer.running = false;
    updateTimerUI();
  } else {
    timer.running = true;
    timer.intervalId = setInterval(tick, 1000);
    updateTimerUI();
  }
}

document.getElementById('timerStartPause').addEventListener('click', startPauseTimer);
document.getElementById('timerReset').addEventListener('click', () => {
  clearInterval(timer.intervalId);
  timer.running = false;
  resetTimerToPhase('focus');
});
document.getElementById('timerSkip').addEventListener('click', () => {
  clearInterval(timer.intervalId);
  timer.running = false;
  advancePhase();
});

['focusMin', 'breakMin', 'longBreakMin', 'sessionsBeforeLong'].forEach((id) => {
  document.getElementById(id).addEventListener('change', (e) => {
    const key = id === 'sessionsBeforeLong' ? 'sessionsBeforeLong' : id;
    let val = parseInt(e.target.value, 10);
    if (Number.isNaN(val) || val < 1) val = state.pomodoro.settings[key];
    state.pomodoro.settings[key] = val;
    saveData();
    if (!timer.running) resetTimerToPhase(timer.phase);
  });
});

function initPomodoro() {
  loadSettingsIntoInputs();
  renderSessionCount();
  resetTimerToPhase('focus');
}

// ---------- Workout ----------
let editingWeekday = currentWeekday();

function renderWorkoutToday() {
  const day = currentWeekday();
  document.getElementById('workoutDayLabel').textContent = `Today's routine (${day})`;
  const routine = state.workout.routine[day] || [];
  const key = todayKey();
  const log = state.workout.logByDate[key] || {};
  const list = document.getElementById('workoutList');
  list.innerHTML = '';
  routine.forEach((exercise, idx) => {
    const li = document.createElement('li');
    const done = !!log[idx];
    if (done) li.classList.add('done');
    li.innerHTML = `
      <input type="checkbox" ${done ? 'checked' : ''} data-idx="${idx}" />
      <span class="row-text">${exercise}</span>
    `;
    li.querySelector('input').addEventListener('change', (e) => {
      const k = todayKey();
      if (!state.workout.logByDate[k]) state.workout.logByDate[k] = {};
      state.workout.logByDate[k][idx] = e.target.checked;
      saveData();
      renderWorkoutToday();
    });
    list.appendChild(li);
  });
  const total = routine.length;
  const doneCount = routine.filter((_, idx) => log[idx]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('workoutProgressFill').style.width = `${pct}%`;
}

function renderWeekdayTabs() {
  const container = document.getElementById('weekdayTabs');
  container.innerHTML = '';
  WEEKDAYS.filter((d) => d !== 'Sun').concat(['Sun']).forEach(() => {}); // no-op to keep order stable
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((day) => {
    const btn = document.createElement('button');
    btn.textContent = day;
    if (day === editingWeekday) btn.classList.add('active');
    btn.addEventListener('click', () => {
      editingWeekday = day;
      renderWeekdayTabs();
      renderRoutineEditList();
    });
    container.appendChild(btn);
  });
}

function renderRoutineEditList() {
  const list = document.getElementById('routineEditList');
  list.innerHTML = '';
  const exercises = state.workout.routine[editingWeekday] || [];
  exercises.forEach((exercise, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="row-text">${exercise}</span>
      <button class="remove-btn" title="Remove">✕</button>
    `;
    li.querySelector('.remove-btn').addEventListener('click', () => {
      state.workout.routine[editingWeekday].splice(idx, 1);
      saveData();
      renderRoutineEditList();
      renderWorkoutToday();
    });
    list.appendChild(li);
  });
}

document.getElementById('editRoutineBtn').addEventListener('click', () => {
  const card = document.getElementById('routineEditorCard');
  card.classList.toggle('hidden');
  if (!card.classList.contains('hidden')) {
    renderWeekdayTabs();
    renderRoutineEditList();
  }
});

document.getElementById('addExerciseBtn').addEventListener('click', () => {
  const input = document.getElementById('newExerciseInput');
  const val = input.value.trim();
  if (!val) return;
  if (!state.workout.routine[editingWeekday]) state.workout.routine[editingWeekday] = [];
  state.workout.routine[editingWeekday].push(val);
  input.value = '';
  saveData();
  renderRoutineEditList();
  renderWorkoutToday();
});
document.getElementById('newExerciseInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addExerciseBtn').click();
});

// ---------- Meals ----------
function renderMeals() {
  const key = todayKey();
  const plan = state.meals.planByDate[key] || {};
  document.getElementById('mealBreakfast').value = plan.breakfast || '';
  document.getElementById('mealLunch').value = plan.lunch || '';
  document.getElementById('mealDinner').value = plan.dinner || '';
  document.getElementById('mealSnacks').value = plan.snacks || '';
}

['mealBreakfast', 'mealLunch', 'mealDinner', 'mealSnacks'].forEach((id) => {
  document.getElementById(id).addEventListener('input', (e) => {
    const key = todayKey();
    if (!state.meals.planByDate[key]) state.meals.planByDate[key] = {};
    const field = id.replace('meal', '').toLowerCase();
    state.meals.planByDate[key][field] = e.target.value;
    saveData();
  });
});

// ---------- Recipes ----------
let editingRecipeId = null;

function renderRecipes() {
  const container = document.getElementById('recipeList');
  container.innerHTML = '';
  if (state.recipes.length === 0) {
    container.innerHTML = '<p class="muted">No recipes yet. Add your first one.</p>';
    return;
  }
  state.recipes.forEach((recipe) => {
    const item = document.createElement('div');
    item.className = 'recipe-item';
    item.innerHTML = `
      <div class="recipe-item-header">
        <div>
          <strong>${recipe.name}</strong>
          <div class="recipe-tags">${(recipe.tags || []).join(' · ')}</div>
        </div>
        <span>▾</span>
      </div>
      <div class="recipe-body">
        <h4>Ingredients</h4>
        <ul>${(recipe.ingredients || []).map((i) => `<li>${i}</li>`).join('')}</ul>
        <h4>Steps</h4>
        <ol>${(recipe.steps || []).map((s) => `<li>${s}</li>`).join('')}</ol>
        <div class="recipe-actions">
          <button class="btn btn-small" data-action="edit">Edit</button>
          <button class="btn btn-small" data-action="delete">Delete</button>
        </div>
      </div>
    `;
    const header = item.querySelector('.recipe-item-header');
    const body = item.querySelector('.recipe-body');
    header.addEventListener('click', () => body.classList.toggle('open'));
    item.querySelector('[data-action="delete"]').addEventListener('click', () => {
      state.recipes = state.recipes.filter((r) => r.id !== recipe.id);
      saveData();
      renderRecipes();
    });
    item.querySelector('[data-action="edit"]').addEventListener('click', () => {
      openRecipeEditor(recipe);
    });
    container.appendChild(item);
  });
}

function openRecipeEditor(recipe) {
  editingRecipeId = recipe ? recipe.id : null;
  document.getElementById('recipeEditorTitle').textContent = recipe ? 'Edit recipe' : 'New recipe';
  document.getElementById('recipeName').value = recipe ? recipe.name : '';
  document.getElementById('recipeTags').value = recipe ? (recipe.tags || []).join(', ') : '';
  document.getElementById('recipeIngredients').value = recipe ? (recipe.ingredients || []).join('\n') : '';
  document.getElementById('recipeSteps').value = recipe ? (recipe.steps || []).join('\n') : '';
  document.getElementById('recipeEditorCard').classList.remove('hidden');
}

document.getElementById('newRecipeBtn').addEventListener('click', () => openRecipeEditor(null));
document.getElementById('cancelRecipeBtn').addEventListener('click', () => {
  document.getElementById('recipeEditorCard').classList.add('hidden');
});
document.getElementById('saveRecipeBtn').addEventListener('click', () => {
  const name = document.getElementById('recipeName').value.trim();
  if (!name) return;
  const tags = document.getElementById('recipeTags').value.split(',').map((t) => t.trim()).filter(Boolean);
  const ingredients = document.getElementById('recipeIngredients').value.split('\n').map((s) => s.trim()).filter(Boolean);
  const steps = document.getElementById('recipeSteps').value.split('\n').map((s) => s.trim()).filter(Boolean);

  if (editingRecipeId) {
    const recipe = state.recipes.find((r) => r.id === editingRecipeId);
    Object.assign(recipe, { name, tags, ingredients, steps });
  } else {
    state.recipes.push({ id: uid(), name, tags, ingredients, steps });
  }
  saveData();
  document.getElementById('recipeEditorCard').classList.add('hidden');
  renderRecipes();
});

// ---------- Work tasks ----------
function renderTasks() {
  const list = document.getElementById('taskList');
  list.innerHTML = '';
  const sorted = [...state.work.tasks].sort((a, b) => a.done - b.done);
  sorted.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');
    li.innerHTML = `
      <input type="checkbox" ${task.done ? 'checked' : ''} />
      <span class="task-text">${task.text}</span>
      <span class="priority-badge priority-${task.priority}">${task.priority}</span>
      <button class="remove-btn" title="Remove">✕</button>
    `;
    li.querySelector('input').addEventListener('change', (e) => {
      task.done = e.target.checked;
      saveData();
      renderTasks();
    });
    li.querySelector('.remove-btn').addEventListener('click', () => {
      state.work.tasks = state.work.tasks.filter((t) => t.id !== task.id);
      saveData();
      renderTasks();
    });
    list.appendChild(li);
  });
}

document.getElementById('addTaskBtn').addEventListener('click', () => {
  const input = document.getElementById('newTaskInput');
  const text = input.value.trim();
  if (!text) return;
  const priority = document.getElementById('newTaskPriority').value;
  state.work.tasks.push({ id: uid(), text, priority, done: false, createdAt: Date.now() });
  input.value = '';
  saveData();
  renderTasks();
});
document.getElementById('newTaskInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addTaskBtn').click();
});

// ---------- Export / Import ----------
document.getElementById('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `loop-backup-${todayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      state = { ...defaultData(), ...parsed };
      saveData();
      renderAll();
    } catch (err) {
      alert('Could not read that file — is it a valid Loop backup JSON?');
    }
  };
  reader.readAsText(file);
});

// ---------- Init ----------
function renderAll() {
  renderTodayDate();
  initPomodoro();
  renderWorkoutToday();
  renderMeals();
  renderRecipes();
  renderTasks();
}

initTheme();
renderAll();
