// ポモドーロ ご褒美タイマー - Popup Script

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const DEFAULT_REWARDS = [
  { text: '🎬 大当たり！好きな動画を5分見る',    type: 'big-win',   label: '🏆 大当たり！' },
  { text: '🍰 大当たり！特別なお菓子を食べる',    type: 'big-win',   label: '🏆 大当たり！' },
  { text: '☕ 小当たり！好きな飲み物を飲む',      type: 'small-win', label: '✨ 小当たり！' },
  { text: '📱 小当たり！SNSを5分見る',           type: 'small-win', label: '✨ 小当たり！' },
  { text: '💪 ハズレ… 腹筋を20回する',           type: 'lose',      label: '😅 ハズレ…' },
  { text: '🗑️ ハズレ… 部屋のゴミ捨てをする',     type: 'lose',      label: '😅 ハズレ…' },
];

// Elements
const header        = document.getElementById('header');
const phaseTitle    = document.getElementById('phaseTitle');
const sessionBadge  = document.getElementById('sessionBadge');
const timerDisplay  = document.getElementById('timerDisplay');
const progressBar   = document.getElementById('progressBar');
const startBtn      = document.getElementById('startBtn');
const resetBtn      = document.getElementById('resetBtn');
const diceSection   = document.getElementById('diceSection');
const diceFace      = document.getElementById('diceFace');
const rollBtn       = document.getElementById('rollBtn');
const rewardResult  = document.getElementById('rewardResult');
const rewardType    = document.getElementById('rewardType');
const rewardContent = document.getElementById('rewardContent');
const diceNum       = document.getElementById('diceNum');
const rewardsList   = document.getElementById('rewardsList');
const rewardsToggle = document.getElementById('rewardsToggle');
const toggleArrow   = document.getElementById('toggleArrow');
const settingsBtn   = document.getElementById('settingsBtn');
const mainView      = document.getElementById('mainView');
const settingsView  = document.getElementById('settingsView');
const backBtn       = document.getElementById('backBtn');
const workMinInput  = document.getElementById('workMinInput');
const breakMinInput = document.getElementById('breakMinInput');
const rewardEditList= document.getElementById('rewardEditList');
const saveBtn       = document.getElementById('saveBtn');
const saveMsg       = document.getElementById('saveMsg');

let tickInterval = null;
let state = {
  phase: 'work',
  isRunning: false,
  endTime: null,
  pausedRemaining: null,
  completedSessions: 0,
  needsDiceRoll: false,
  diceResult: null,
  workMinutes: 25,
  breakMinutes: 5,
  rewards: DEFAULT_REWARDS
};

// ===== INIT =====
async function init() {
  const stored = await chrome.storage.local.get([
    'phase', 'isRunning', 'endTime', 'pausedRemaining',
    'completedSessions', 'needsDiceRoll', 'diceResult',
    'workMinutes', 'breakMinutes', 'rewards'
  ]);

  state = {
    phase:             stored.phase             || 'work',
    isRunning:         stored.isRunning         || false,
    endTime:           stored.endTime           || null,
    pausedRemaining:   stored.pausedRemaining   || null,
    completedSessions: stored.completedSessions || 0,
    needsDiceRoll:     stored.needsDiceRoll     || false,
    diceResult:        stored.diceResult        || null,
    workMinutes:       stored.workMinutes       || 25,
    breakMinutes:      stored.breakMinutes      || 5,
    rewards:           stored.rewards           || DEFAULT_REWARDS,
  };

  renderRewardsList();
  updateUI();

  if (state.isRunning) {
    startTick();
  }
}

// ===== TICK =====
function startTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = setInterval(tick, 250);
}

function stopTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
}

async function tick() {
  // Re-read storage to detect background changes (phase flip etc.)
  const stored = await chrome.storage.local.get([
    'phase', 'isRunning', 'endTime', 'pausedRemaining',
    'completedSessions', 'needsDiceRoll', 'diceResult'
  ]);

  const prevPhase = state.phase;
  state.phase             = stored.phase             || state.phase;
  state.isRunning         = stored.isRunning         ?? state.isRunning;
  state.endTime           = stored.endTime           ?? state.endTime;
  state.pausedRemaining   = stored.pausedRemaining   ?? null;
  state.completedSessions = stored.completedSessions ?? state.completedSessions;
  state.needsDiceRoll     = stored.needsDiceRoll     ?? state.needsDiceRoll;
  state.diceResult        = stored.diceResult        ?? state.diceResult;

  if (!state.isRunning) {
    stopTick();
  }

  updateUI();
}

// ===== UI UPDATE =====
function updateUI() {
  const isBreak   = state.phase === 'break';
  const isRunning = state.isRunning;

  // Header
  header.className = 'header' + (isBreak ? ' break-mode' : '');
  phaseTitle.textContent = isBreak ? '☕ 休憩中' : '🍅 作業中';
  sessionBadge.textContent = `${state.completedSessions} セッション完了`;

  // Timer
  let remaining = 0;
  let totalTime = (isBreak ? state.breakMinutes : state.workMinutes) * 60 * 1000;

  if (isRunning && state.endTime) {
    remaining = Math.max(0, state.endTime - Date.now());
  } else if (!isRunning && state.pausedRemaining != null) {
    remaining = state.pausedRemaining;
  } else if (!isRunning && !state.endTime) {
    remaining = totalTime;
  } else {
    remaining = Math.max(0, state.endTime - Date.now());
  }

  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  timerDisplay.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  timerDisplay.className = 'timer-display' + (isBreak ? ' break-mode' : '');

  // Progress bar
  const progress = totalTime > 0 ? Math.max(0, Math.min(100, ((totalTime - remaining) / totalTime) * 100)) : 0;
  progressBar.style.width = `${progress}%`;
  progressBar.className = 'progress-bar' + (isBreak ? ' break-mode' : '');

  // Start button
  startBtn.className = 'btn btn-primary' + (isBreak ? ' break-mode' : '');
  if (isRunning) {
    startBtn.textContent = '⏸ 一時停止';
  } else if (state.pausedRemaining != null) {
    startBtn.textContent = '▶ 再開';
  } else {
    startBtn.textContent = '▶ 開始';
  }

  // Dice section
  if (isBreak) {
    diceSection.classList.add('visible');
    if (state.needsDiceRoll) {
      rollBtn.disabled = false;
      rewardResult.classList.remove('visible');
      if (!diceFace.classList.contains('rolling')) {
        diceFace.textContent = '🎲';
      }
    } else if (state.diceResult != null) {
      rollBtn.disabled = true;
      showRewardResult(state.diceResult);
    }
  } else {
    diceSection.classList.remove('visible');
    rewardResult.classList.remove('visible');
    diceFace.textContent = '🎲';
    rollBtn.disabled = false;
  }
}

function showRewardResult(roll) {
  const idx = roll - 1;
  const reward = state.rewards[idx] || DEFAULT_REWARDS[idx];

  rewardType.textContent = reward.label;
  rewardType.className = `reward-type ${reward.type}`;
  rewardContent.textContent = reward.text;
  diceNum.textContent = `サイコロの目：${DICE_FACES[idx]}（${roll}）`;
  rewardResult.classList.add('visible');
  diceFace.textContent = DICE_FACES[idx];
}

// ===== REWARDS LIST =====
function renderRewardsList() {
  rewardsList.innerHTML = '';
  state.rewards.forEach((r, i) => {
    const item = document.createElement('div');
    item.className = 'reward-item';

    const badge = document.createElement('div');
    const isLose = r.type === 'lose';
    const isBig  = r.type === 'big-win';
    badge.className = 'reward-num-badge ' + (isLose ? 'lose' : 'win');
    badge.textContent = i + 1;

    const text = document.createElement('div');
    text.className = 'reward-item-text';
    text.textContent = r.text;

    item.appendChild(badge);
    item.appendChild(text);
    rewardsList.appendChild(item);
  });
}

// ===== DICE ROLL =====
function rollDice() {
  rollBtn.disabled = true;
  diceFace.classList.add('rolling');

  let count = 0;
  const rollInterval = setInterval(() => {
    const rand = Math.floor(Math.random() * 6);
    diceFace.textContent = DICE_FACES[rand];
    count++;
    if (count > 18) {
      clearInterval(rollInterval);
      diceFace.classList.remove('rolling');
      const result = Math.floor(Math.random() * 6) + 1;
      diceFace.textContent = DICE_FACES[result - 1];

      // Save result
      chrome.storage.local.set({ diceResult: result, needsDiceRoll: false });
      state.diceResult = result;
      state.needsDiceRoll = false;

      showRewardResult(result);
    }
  }, 60);
}

// ===== SETTINGS RENDER =====
function renderSettingsView() {
  workMinInput.value  = state.workMinutes;
  breakMinInput.value = state.breakMinutes;

  rewardEditList.innerHTML = '';
  const typeLabels = ['大当たり', '大当たり', '小当たり', '小当たり', 'ハズレ', 'ハズレ'];

  state.rewards.forEach((r, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'reward-edit-item';

    const row = document.createElement('div');
    row.className = 'reward-edit-row';

    const num = document.createElement('div');
    num.className = 'reward-edit-num';
    num.textContent = i + 1;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'reward-edit-input';
    input.value = r.text;
    input.dataset.index = i;
    input.placeholder = `${i + 1}番のご褒美を入力...`;

    row.appendChild(num);
    row.appendChild(input);

    const typeNote = document.createElement('div');
    typeNote.className = 'reward-edit-type';
    const isLose = i >= 4;
    typeNote.textContent = `→ ${typeLabels[i]}（${isLose ? 'ハズレ' : '当たり'}）`;

    wrap.appendChild(row);
    wrap.appendChild(typeNote);
    rewardEditList.appendChild(wrap);
  });
}

// ===== EVENT LISTENERS =====

// Start / Pause / Resume
startBtn.addEventListener('click', async () => {
  if (state.isRunning) {
    // Pause
    const remaining = state.endTime ? Math.max(0, state.endTime - Date.now()) : 0;
    await chrome.runtime.sendMessage({ action: 'pause', remaining });
    state.isRunning = false;
    state.pausedRemaining = remaining;
    stopTick();
    updateUI();
  } else if (state.pausedRemaining != null) {
    // Resume
    await chrome.runtime.sendMessage({ action: 'resume' });
    state.isRunning = true;
    state.endTime = Date.now() + state.pausedRemaining;
    state.pausedRemaining = null;
    startTick();
    updateUI();
  } else {
    // Fresh start
    await chrome.runtime.sendMessage({ action: 'start', phase: state.phase });
    const minutes = state.phase === 'work' ? state.workMinutes : state.breakMinutes;
    state.isRunning = true;
    state.endTime = Date.now() + minutes * 60 * 1000;
    state.pausedRemaining = null;
    startTick();
    updateUI();
  }
});

// Reset
resetBtn.addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ action: 'reset' });
  stopTick();
  state.isRunning = false;
  state.phase = 'work';
  state.endTime = null;
  state.pausedRemaining = null;
  state.needsDiceRoll = false;
  state.diceResult = null;
  diceFace.textContent = '🎲';
  rewardResult.classList.remove('visible');
  updateUI();
});

// Roll Dice
rollBtn.addEventListener('click', () => {
  if (state.needsDiceRoll) {
    rollDice();
  }
});

// Rewards toggle
rewardsToggle.addEventListener('click', () => {
  const isOpen = rewardsList.classList.toggle('open');
  toggleArrow.classList.toggle('open', isOpen);
});

// Settings button
settingsBtn.addEventListener('click', () => {
  renderSettingsView();
  mainView.classList.add('hidden');
  settingsView.classList.remove('hidden');
});

// Back button
backBtn.addEventListener('click', () => {
  settingsView.classList.add('hidden');
  mainView.classList.remove('hidden');
});

// Save settings
saveBtn.addEventListener('click', async () => {
  const wm = parseInt(workMinInput.value) || 25;
  const bm = parseInt(breakMinInput.value) || 5;

  // Collect reward edits
  const inputs = rewardEditList.querySelectorAll('.reward-edit-input');
  const typeMap = ['big-win', 'big-win', 'small-win', 'small-win', 'lose', 'lose'];
  const labelMap = ['🏆 大当たり！', '🏆 大当たり！', '✨ 小当たり！', '✨ 小当たり！', '😅 ハズレ…', '😅 ハズレ…'];

  const newRewards = Array.from(inputs).map((inp, i) => ({
    text:  inp.value.trim() || DEFAULT_REWARDS[i].text,
    type:  typeMap[i],
    label: labelMap[i],
  }));

  state.workMinutes  = wm;
  state.breakMinutes = bm;
  state.rewards      = newRewards;

  await chrome.storage.local.set({
    workMinutes:  wm,
    breakMinutes: bm,
    rewards:      newRewards
  });

  renderRewardsList();

  saveMsg.textContent = '✅ 保存しました！';
  setTimeout(() => { saveMsg.textContent = ''; }, 2000);
});

// ===== START =====
init();
