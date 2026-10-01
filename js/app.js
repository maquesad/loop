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
      tagUniversity: false,
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
    chores: {
      items: [
        { id: 'c1', text: 'Laundry', day: 'Sat' },
        { id: 'c2', text: 'Groceries', day: 'Sun' },
        { id: 'c3', text: 'Clean bathroom', day: 'Wed' },
      ],
      logByWeek: {},
    },
    university: {
      program: 'Psicología · Bachillerato',
      school: 'Universidad Fidélitas',
      startDate: '2027-01-11',
      totalCourses: 0,
      terms: [
        {
          id: 't1',
          name: 'I Cuatrimestre 2027',
          start: '2027-01-11',
          end: '2027-04-24',
          courses: [
            { id: 'u1', code: 'PS-101', name: 'Introducción a la Psicología', credits: 3, status: 'planned', grade: '' },
            { id: 'u2', code: 'PS-501', name: 'Introducción a la Neurociencia', credits: 3, status: 'planned', grade: '' },
            { id: 'u3', code: 'BEPR-602B', name: 'Inteligencia Emocional', credits: 3, status: 'planned', grade: '' },
          ],
        },
      ],
      assignments: [],
      studyLog: {},
    },
    muay: {
      rounds: 5,
      roundMin: 3,
      restSec: 60,
      warnSec: 10,
      musicOn: true,
      volume: 0.7,
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
      chores: { ...base.chores, ...parsed.chores },
      university: { ...base.university, ...parsed.university },
      muay: { ...base.muay, ...parsed.muay },
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
    const focusedMin = Math.round((phaseDurationSec('focus') - Math.max(0, timer.remainingSec)) / 60);
    if (state.pomodoro.tagUniversity && focusedMin > 0) {
      state.university.studyLog[key] = (state.university.studyLog[key] || 0) + focusedMin;
      document.getElementById('timerLogNote').textContent = `+${focusedMin} min logged to University study`;
      renderUniversity();
    }
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
  document.getElementById('uniTagToggle').checked = !!state.pomodoro.tagUniversity;
}

document.getElementById('uniTagToggle').addEventListener('change', (e) => {
  state.pomodoro.tagUniversity = e.target.checked;
  saveData();
  document.getElementById('timerLogNote').textContent = e.target.checked ? 'Focus sessions will count as University study.' : '';
});

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

// ---------- Chores ----------
const CHORE_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Week key = date of that week's Monday, so completion resets every week.
function weekKey(d = new Date()) {
  const date = new Date(d);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return todayKey(date);
}

function choreLog() {
  const key = weekKey();
  if (!state.chores.logByWeek[key]) state.chores.logByWeek[key] = {};
  return state.chores.logByWeek[key];
}

function renderChores() {
  const today = currentWeekday();
  const log = choreLog();
  document.getElementById('choresTodayLabel').textContent = `Today's chores (${today})`;
  document.getElementById('choresWeekLabel').textContent = `Week of ${weekKey()}`;

  const todayList = document.getElementById('choresTodayList');
  todayList.innerHTML = '';
  const todays = state.chores.items.filter((c) => c.day === today);
  document.getElementById('choresTodayEmpty').classList.toggle('hidden', todays.length > 0);
  todays.forEach((chore) => {
    const li = document.createElement('li');
    const done = !!log[chore.id];
    if (done) li.classList.add('done');
    li.innerHTML = `
      <input type="checkbox" ${done ? 'checked' : ''} />
      <span class="row-text">${chore.text}</span>
    `;
    li.querySelector('input').addEventListener('change', (e) => {
      choreLog()[chore.id] = e.target.checked;
      saveData();
      renderChores();
    });
    todayList.appendChild(li);
  });

  const grid = document.getElementById('choresWeekGrid');
  grid.innerHTML = '';
  CHORE_DAYS.forEach((day) => {
    const col = document.createElement('div');
    col.className = 'week-day' + (day === today ? ' is-today' : '');
    const items = state.chores.items.filter((c) => c.day === day);
    col.innerHTML = `<div class="week-day-name">${day}</div>`;
    if (items.length === 0) {
      col.innerHTML += '<div class="muted week-empty">—</div>';
    }
    items.forEach((chore) => {
      const row = document.createElement('div');
      row.className = 'week-chore' + (log[chore.id] ? ' done' : '');
      row.innerHTML = `<span>${chore.text}</span><button class="remove-btn" title="Remove">✕</button>`;
      row.querySelector('.remove-btn').addEventListener('click', () => {
        state.chores.items = state.chores.items.filter((c) => c.id !== chore.id);
        saveData();
        renderChores();
      });
      col.appendChild(row);
    });
    grid.appendChild(col);
  });
}

document.getElementById('addChoreBtn').addEventListener('click', () => {
  const input = document.getElementById('newChoreInput');
  const text = input.value.trim();
  if (!text) return;
  const day = document.getElementById('newChoreDay').value;
  state.chores.items.push({ id: uid(), text, day });
  input.value = '';
  saveData();
  renderChores();
});
document.getElementById('newChoreInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addChoreBtn').click();
});

// ---------- University ----------
const COURSE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'In progress' },
  { value: 'done', label: 'Done' },
];

function uni() { return state.university; }

function allCourses() {
  return uni().terms.flatMap((t) => t.courses);
}

function daysBetween(fromKey, toKey) {
  const a = new Date(fromKey + 'T00:00:00');
  const b = new Date(toKey + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function formatDate(key) {
  return new Date(key + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function currentTerm() {
  const today = todayKey();
  return uni().terms.find((t) => t.start && t.end && t.start <= today && today <= t.end);
}

function renderUniHero() {
  const u = uni();
  document.getElementById('uniProgram').textContent = u.program;
  document.getElementById('uniSchool').textContent = u.school;

  const today = todayKey();
  const statusEl = document.getElementById('uniStatus');
  const term = currentTerm();
  if (term) {
    const total = Math.max(1, daysBetween(term.start, term.end));
    const elapsed = daysBetween(term.start, today);
    const week = Math.floor(elapsed / 7) + 1;
    const weeks = Math.ceil(total / 7);
    statusEl.innerHTML = `<strong>${term.name}</strong> · week ${week} of ${weeks} · ends ${formatDate(term.end)}`;
  } else if (u.startDate && today < u.startDate) {
    const days = daysBetween(today, u.startDate);
    statusEl.innerHTML = `Starts in <strong>${days} day${days === 1 ? '' : 's'}</strong> · ${formatDate(u.startDate)}`;
  } else {
    statusEl.textContent = 'Between terms';
  }

  const courses = allCourses();
  const done = courses.filter((c) => c.status === 'done');
  const total = u.totalCourses > 0 ? u.totalCourses : courses.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;
  const ring = document.getElementById('uniRingFill');
  const circumference = 2 * Math.PI * 52;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = circumference * (1 - pct / 100);
  document.getElementById('uniRingPct').textContent = `${pct}%`;

  document.getElementById('statCourses').textContent = `${done.length}/${total}`;
  document.getElementById('statCredits').textContent = done.reduce((s, c) => s + (Number(c.credits) || 0), 0);

  const wk = weekKey();
  let weekMinutes = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(wk + 'T00:00:00');
    d.setDate(d.getDate() + i);
    weekMinutes += u.studyLog[todayKey(d)] || 0;
  }
  document.getElementById('statStudy').textContent = `${(weekMinutes / 60).toFixed(1).replace(/\.0$/, '')}h`;

  const inWeek = new Date(); inWeek.setDate(inWeek.getDate() + 7);
  const limit = todayKey(inWeek);
  document.getElementById('statDue').textContent = u.assignments.filter((a) => !a.done && a.due >= today && a.due <= limit).length;
}

function renderTerms() {
  const list = document.getElementById('termList');
  list.innerHTML = '';
  if (uni().terms.length === 0) {
    list.innerHTML = '<p class="muted">No terms yet. Add your first cuatrimestre.</p>';
    return;
  }
  const active = currentTerm();
  uni().terms.forEach((term) => {
    const done = term.courses.filter((c) => c.status === 'done').length;
    const el = document.createElement('div');
    el.className = 'term' + (active && active.id === term.id ? ' term-active' : '');
    el.innerHTML = `
      <div class="term-header">
        <div>
          <div class="term-name">${term.name}${active && active.id === term.id ? ' <span class="pill">now</span>' : ''}</div>
          <div class="muted term-dates">${term.start ? formatDate(term.start) : '—'} → ${term.end ? formatDate(term.end) : '—'} · ${done}/${term.courses.length} done</div>
        </div>
        <div class="term-actions">
          <button class="icon-mini" data-act="edit" title="Edit term">✎</button>
          <button class="icon-mini" data-act="remove" title="Remove term">✕</button>
        </div>
      </div>
      <div class="term-edit hidden">
        <input type="text" data-field="name" value="${term.name}" placeholder="Term name" />
        <input type="date" data-field="start" value="${term.start || ''}" />
        <input type="date" data-field="end" value="${term.end || ''}" />
      </div>
      <div class="course-list"></div>
      <div class="add-row course-add">
        <input type="text" data-new="code" placeholder="Code" class="input-sm" />
        <input type="text" data-new="name" placeholder="Course name" />
        <button class="btn btn-small" data-act="addCourse">Add</button>
      </div>
    `;

    const editBox = el.querySelector('.term-edit');
    el.querySelector('[data-act="edit"]').addEventListener('click', () => editBox.classList.toggle('hidden'));
    editBox.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('change', () => {
        term[inp.dataset.field] = inp.value;
        saveData();
        renderUniversity();
      });
    });
    el.querySelector('[data-act="remove"]').addEventListener('click', () => {
      if (!confirm(`Remove "${term.name}" and its courses?`)) return;
      uni().terms = uni().terms.filter((t) => t.id !== term.id);
      saveData();
      renderUniversity();
    });

    const courseList = el.querySelector('.course-list');
    term.courses.forEach((course) => {
      const row = document.createElement('div');
      row.className = `course status-${course.status}`;
      row.innerHTML = `
        <div class="course-main">
          <span class="course-code">${course.code || ''}</span>
          <span class="course-name">${course.name}</span>
        </div>
        <select class="course-status">
          ${COURSE_STATUSES.map((s) => `<option value="${s.value}" ${s.value === course.status ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
        <input type="number" class="course-credits" value="${course.credits}" min="0" title="Credits" />
        <input type="text" class="course-grade" value="${course.grade}" placeholder="Grade" />
        <button class="remove-btn" title="Remove">✕</button>
      `;
      row.querySelector('.course-status').addEventListener('change', (e) => {
        course.status = e.target.value;
        saveData();
        renderUniversity();
      });
      row.querySelector('.course-credits').addEventListener('change', (e) => {
        course.credits = Number(e.target.value) || 0;
        saveData();
        renderUniHero();
      });
      row.querySelector('.course-grade').addEventListener('change', (e) => {
        course.grade = e.target.value.trim();
        saveData();
      });
      row.querySelector('.remove-btn').addEventListener('click', () => {
        term.courses = term.courses.filter((c) => c.id !== course.id);
        saveData();
        renderUniversity();
      });
      courseList.appendChild(row);
    });

    const addBtn = el.querySelector('[data-act="addCourse"]');
    const nameInput = el.querySelector('[data-new="name"]');
    const codeInput = el.querySelector('[data-new="code"]');
    const addCourse = () => {
      const name = nameInput.value.trim();
      if (!name) return;
      term.courses.push({ id: uid(), code: codeInput.value.trim(), name, credits: 3, status: 'planned', grade: '' });
      saveData();
      renderUniversity();
    };
    addBtn.addEventListener('click', addCourse);
    nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') addCourse(); });

    list.appendChild(el);
  });
}

function renderAssignments() {
  const list = document.getElementById('assignList');
  list.innerHTML = '';
  const today = todayKey();
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const soonKey = todayKey(soon);
  const sorted = [...uni().assignments].sort((a, b) => (a.done - b.done) || a.due.localeCompare(b.due));
  if (sorted.length === 0) {
    list.innerHTML = '<li class="muted" style="list-style:none">Nothing due. Enjoy it while it lasts.</li>';
    return;
  }
  sorted.forEach((a) => {
    const li = document.createElement('li');
    let urgency = '';
    if (!a.done && a.due < today) urgency = 'overdue';
    else if (!a.done && a.due <= soonKey) urgency = 'soon';
    li.className = 'task-item' + (a.done ? ' done' : '') + (urgency ? ` due-${urgency}` : '');
    li.innerHTML = `
      <input type="checkbox" ${a.done ? 'checked' : ''} />
      <div class="task-text">
        <div>${a.title}</div>
        <div class="muted assign-meta">${a.course ? a.course + ' · ' : ''}${formatDate(a.due)}${urgency === 'overdue' ? ' · overdue' : ''}</div>
      </div>
      <button class="remove-btn" title="Remove">✕</button>
    `;
    li.querySelector('input').addEventListener('change', (e) => {
      a.done = e.target.checked;
      saveData();
      renderUniversity();
    });
    li.querySelector('.remove-btn').addEventListener('click', () => {
      uni().assignments = uni().assignments.filter((x) => x.id !== a.id);
      saveData();
      renderUniversity();
    });
    list.appendChild(li);
  });
}

function renderStudyChart() {
  const chart = document.getElementById('studyChart');
  chart.innerHTML = '';
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const values = days.map((d) => uni().studyLog[todayKey(d)] || 0);
  const max = Math.max(60, ...values);
  days.forEach((d, i) => {
    const col = document.createElement('div');
    col.className = 'study-col' + (i === 6 ? ' is-today' : '');
    const h = Math.round((values[i] / max) * 100);
    const label = values[i] ? `${(values[i] / 60).toFixed(1).replace(/\.0$/, '')}h` : '';
    col.innerHTML = `
      <div class="study-val">${label}</div>
      <div class="study-bar-wrap"><div class="study-bar" style="height:${h}%"></div></div>
      <div class="study-day">${WEEKDAYS[d.getDay()]}</div>
    `;
    chart.appendChild(col);
  });
}

function renderUniversity() {
  renderUniHero();
  renderTerms();
  renderAssignments();
  renderStudyChart();
}

document.getElementById('uniEditBtn').addEventListener('click', () => {
  const card = document.getElementById('uniDetailsCard');
  card.classList.toggle('hidden');
  const u = uni();
  document.getElementById('uniProgramInput').value = u.program;
  document.getElementById('uniSchoolInput').value = u.school;
  document.getElementById('uniStartInput').value = u.startDate || '';
  document.getElementById('uniTotalInput').value = u.totalCourses || '';
});
[['uniProgramInput', 'program'], ['uniSchoolInput', 'school'], ['uniStartInput', 'startDate']].forEach(([id, field]) => {
  document.getElementById(id).addEventListener('change', (e) => {
    uni()[field] = e.target.value.trim();
    saveData();
    renderUniHero();
  });
});
document.getElementById('uniTotalInput').addEventListener('change', (e) => {
  uni().totalCourses = Math.max(0, parseInt(e.target.value, 10) || 0);
  saveData();
  renderUniHero();
});

document.getElementById('addTermBtn').addEventListener('click', () => {
  const n = uni().terms.length + 1;
  uni().terms.push({ id: uid(), name: `Term ${n}`, start: '', end: '', courses: [] });
  saveData();
  renderUniversity();
});

document.getElementById('addAssignBtn').addEventListener('click', () => {
  const title = document.getElementById('newAssignTitle').value.trim();
  const due = document.getElementById('newAssignDue').value;
  if (!title || !due) return;
  uni().assignments.push({ id: uid(), title, course: document.getElementById('newAssignCourse').value.trim(), due, done: false });
  document.getElementById('newAssignTitle').value = '';
  document.getElementById('newAssignCourse').value = '';
  document.getElementById('newAssignDue').value = '';
  saveData();
  renderUniversity();
});
document.getElementById('newAssignTitle').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('addAssignBtn').click();
});

document.querySelectorAll('.study-actions button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = todayKey();
    uni().studyLog[key] = (uni().studyLog[key] || 0) + Number(btn.dataset.min);
    saveData();
    renderUniversity();
  });
});

// ---------- Muay Thai rounds ----------
const DEFAULT_MUSIC_SRC = 'audio/sarama.mp3';
const mtMusic = document.getElementById('mtMusic');
const mt = {
  phase: 'ready', // ready | round | rest | done
  round: 1,
  remainingSec: 0,
  running: false,
  intervalId: null,
  musicLoaded: false,
};

let audioCtx = null;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function ringBell(times = 1) {
  try {
    const ac = ctx();
    for (let i = 0; i < times; i++) {
      const t0 = ac.currentTime + i * 0.55;
      [660, 1320, 1980].forEach((freq, idx) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain);
        gain.connect(ac.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(idx === 0 ? 0.5 : 0.18, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.6);
        osc.start(t0);
        osc.stop(t0 + 1.6);
      });
    }
  } catch (e) { /* ignore */ }
}

function clapper() {
  try {
    const ac = ctx();
    for (let i = 0; i < 3; i++) {
      const t0 = ac.currentTime + i * 0.12;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / data.length, 3);
      const src = ac.createBufferSource();
      const filter = ac.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      const gain = ac.createGain();
      gain.gain.value = 0.8;
      src.buffer = buf;
      src.connect(filter).connect(gain).connect(ac.destination);
      src.start(t0);
    }
  } catch (e) { /* ignore */ }
}

function mtSettings() { return state.muay; }

function mtFormat(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function mtPhaseDuration(phase) {
  if (phase === 'round') return Math.round(mtSettings().roundMin * 60);
  if (phase === 'rest') return mtSettings().restSec;
  if (phase === 'ready') return 10;
  return 0;
}

function musicPlay() {
  if (!mtSettings().musicOn || !mt.musicLoaded) return;
  mtMusic.volume = mtSettings().volume;
  mtMusic.play().catch(() => {});
}
function musicPause() { mtMusic.pause(); }
function musicStop() { mtMusic.pause(); try { mtMusic.currentTime = 0; } catch (e) { /* ignore */ } }

function mtRenderDots() {
  const dots = document.getElementById('mtDots');
  dots.innerHTML = '';
  for (let i = 1; i <= mtSettings().rounds; i++) {
    const d = document.createElement('span');
    d.className = 'mt-dot' + (i < mt.round || mt.phase === 'done' ? ' done' : i === mt.round && mt.phase !== 'ready' ? ' current' : '');
    dots.appendChild(d);
  }
}

function mtUpdateUI() {
  const card = document.getElementById('mtCard');
  card.classList.remove('mt-ready', 'mt-round', 'mt-rest', 'mt-done');
  card.classList.add(`mt-${mt.phase}`);
  const labels = { ready: 'Get ready', round: 'Fight', rest: 'Rest', done: 'Done' };
  document.getElementById('mtPhaseLabel').textContent = labels[mt.phase];
  document.getElementById('mtRoundLabel').textContent = mt.phase === 'done'
    ? `${mtSettings().rounds} rounds complete`
    : `Round ${mt.round} / ${mtSettings().rounds}`;
  document.getElementById('mtTime').textContent = mt.phase === 'done' ? '0:00' : mtFormat(mt.remainingSec);
  document.getElementById('mtStartPause').textContent = mt.running ? 'Pause' : (mt.phase === 'done' ? 'Again' : 'Start');
  mtRenderDots();
}

function mtSetPhase(phase) {
  mt.phase = phase;
  mt.remainingSec = mtPhaseDuration(phase);
  if (phase === 'round') { ringBell(1); musicPlay(); }
  else if (phase === 'rest') { ringBell(3); musicPause(); }
  else if (phase === 'done') { ringBell(3); musicStop(); mt.running = false; clearInterval(mt.intervalId); }
  else musicPause();
  mtUpdateUI();
}

function mtAdvance() {
  if (mt.phase === 'ready') mtSetPhase('round');
  else if (mt.phase === 'round') {
    if (mt.round >= mtSettings().rounds) mtSetPhase('done');
    else mtSetPhase('rest');
  } else if (mt.phase === 'rest') {
    mt.round += 1;
    mtSetPhase('round');
  }
}

function mtTick() {
  mt.remainingSec -= 1;
  const warn = mtSettings().warnSec;
  if (mt.phase === 'round' && warn > 0 && mt.remainingSec === warn) clapper();
  if (mt.remainingSec <= 0) { mtAdvance(); return; }
  mtUpdateUI();
}

function mtReset() {
  clearInterval(mt.intervalId);
  mt.running = false;
  mt.round = 1;
  musicStop();
  mt.phase = 'ready';
  mt.remainingSec = mtPhaseDuration('ready');
  mtUpdateUI();
}

document.getElementById('mtStartPause').addEventListener('click', () => {
  ctx();
  if (mt.phase === 'done') mtReset();
  if (mt.running) {
    clearInterval(mt.intervalId);
    mt.running = false;
    musicPause();
  } else {
    mt.running = true;
    mt.intervalId = setInterval(mtTick, 1000);
    if (mt.phase === 'round') musicPlay();
  }
  mtUpdateUI();
});
document.getElementById('mtReset').addEventListener('click', mtReset);
document.getElementById('mtSkip').addEventListener('click', () => {
  ctx();
  if (mt.phase === 'done') return;
  mtAdvance();
});

[['mtRounds', 'rounds'], ['mtRoundMin', 'roundMin'], ['mtRestSec', 'restSec'], ['mtWarnSec', 'warnSec']].forEach(([id, key]) => {
  document.getElementById(id).addEventListener('change', (e) => {
    const val = parseFloat(e.target.value);
    if (Number.isNaN(val) || val < 0) return;
    mtSettings()[key] = val;
    saveData();
    if (!mt.running) mtReset();
    else mtUpdateUI();
  });
});

document.getElementById('mtMusicOn').addEventListener('change', (e) => {
  mtSettings().musicOn = e.target.checked;
  saveData();
  if (!e.target.checked) musicPause();
  else if (mt.running && mt.phase === 'round') musicPlay();
});
document.getElementById('mtVolume').addEventListener('input', (e) => {
  mtSettings().volume = parseFloat(e.target.value);
  mtMusic.volume = mtSettings().volume;
  saveData();
});

function setMusicSource(src, label) {
  mtMusic.src = src;
  mt.musicLoaded = true;
  document.getElementById('mtMusicStatus').textContent = `Track: ${label}`;
}
document.getElementById('mtPickMusic').addEventListener('click', () => document.getElementById('mtMusicFile').click());
document.getElementById('mtMusicFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setMusicSource(URL.createObjectURL(file), file.name);
  if (mt.running && mt.phase === 'round') musicPlay();
});

async function initMuay() {
  const s = mtSettings();
  document.getElementById('mtRounds').value = s.rounds;
  document.getElementById('mtRoundMin').value = s.roundMin;
  document.getElementById('mtRestSec').value = s.restSec;
  document.getElementById('mtWarnSec').value = s.warnSec;
  document.getElementById('mtMusicOn').checked = s.musicOn;
  document.getElementById('mtVolume').value = s.volume;
  mtMusic.volume = s.volume;
  mtReset();
  try {
    const res = await fetch(DEFAULT_MUSIC_SRC, { method: 'HEAD' });
    if (res.ok) setMusicSource(DEFAULT_MUSIC_SRC, 'sarama.mp3');
    else throw new Error('missing');
  } catch (e) {
    document.getElementById('mtMusicStatus').textContent = 'No track yet — add audio/sarama.mp3 to the repo, or choose a file from this device.';
  }
}

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
  renderChores();
  renderUniversity();
  initMuay();
}

initTheme();
renderAll();
