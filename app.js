/* ========== 数据层 ========== */
const Store = {
  KEY: 'xiaowo_',
  get(key, fallback) {
    const v = localStorage.getItem(this.KEY + key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    localStorage.setItem(this.KEY + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(this.KEY + key);
  }
};

/* ========== 全局状态 ========== */
const State = {
  // 用户配置
  goalName: Store.get('goalName', ''),        // 目标用途
  goalIcon: Store.get('goalIcon', '🎯'),      // 目标图标
  goalAmount: Store.get('goalAmount', 0),     // 存钱目标
  income: Store.get('income', 0),             // 月收入
  fixed: Store.get('fixed', []),              // 固定支出 [{name, amount}]
  dailyBudget: Store.get('dailyBudget', 0),   // 每天额度

  // 存款数据
  saved: Store.get('saved', 0),               // 已存
  streak: Store.get('streak', 0),             // 连续存钱天数
  lastSaveDate: Store.get('lastSaveDate', ''),

  // 今日数据
  todaySpent: Store.get('todaySpent', 0),     // 今天花了多少
  todayDate: Store.get('todayDate', ''),      // 今天日期

  // 超支
  overspend: Store.get('overspend', 0),       // 今日超支金额
  overspendDays: Store.get('overspendDays', 0),

  // 邻居
  neighbor: Store.get('neighbor', '小满'),
  neighborMuted: Store.get('neighborMuted', false),

  // 设置
  configured: Store.get('configured', false),
};

/* ========== 每日重置 ========== */
(function dailyReset() {
  const today = new Date().toDateString();
  if (State.todayDate !== today) {
    // 自动结算：今天没花完的，加到明天
    const remaining = Math.max(0, State.dailyBudget - State.todaySpent);
    Store.set('carryOver', remaining);
    State.todaySpent = 0;
    State.todayDate = today;
    State.overspend = 0;
    Store.set('todaySpent', 0);
    Store.set('todayDate', today);
    Store.set('overspend', 0);
  }
})();

/* ========== 计算 ========== */
function calcDailyBudget() {
  const totalFixed = State.fixed.reduce((s, f) => s + (Number(f.amount) || 0), 0);
  const monthlyCanSpend = Math.max(0, State.income - totalFixed - State.goalAmount);
  const daily = Math.round(monthlyCanSpend / 30);
  return daily;
}

/* ========== 渲染：首页 ========== */
function renderHome() {
  // 房子
  const percent = State.goalAmount > 0 ? (State.saved / State.goalAmount) * 100 : 0;
  const houseContainer = document.getElementById('houseMain');
  House.render(houseContainer, percent, State.goalIcon);

  // 房子标签
  document.getElementById('houseLabel').textContent =
    `${House.getStageName(percent)} · ${Math.round(percent)}%`;

  // 今日额度
  const amountEl = document.getElementById('todayAmount');
  if (!State.configured) {
    amountEl.textContent = '¥—';
    document.getElementById('setupTip').classList.remove('hidden');
  } else {
    const carryOver = Store.get('carryOver', 0);
    const baseBudget = State.dailyBudget + carryOver;
    const remaining = Math.max(0, baseBudget - State.todaySpent);
    amountEl.textContent = '¥' + Math.round(remaining);
    amountEl.classList.toggle('warning', State.todaySpent > baseBudget);
    document.getElementById('setupTip').classList.add('hidden');
  }

  // 进度条
  const carryOver = Store.get('carryOver', 0);
  const baseBudget = State.dailyBudget + carryOver;
  const spentPercent = baseBudget > 0 ? Math.min(100, (State.todaySpent / baseBudget) * 100) : 0;
  const progressFill = document.getElementById('todayProgress');
  progressFill.style.width = spentPercent + '%';
  progressFill.classList.toggle('warning', spentPercent >= 100);
  document.getElementById('todayProgressText').textContent =
    `今天已花 ¥${State.todaySpent}`;

  // 连续存钱
  document.getElementById('streakDays').textContent = State.streak;

  // 超支卡片
  const overspendCard = document.getElementById('overspendCard');
  if (State.overspend > 0) {
    overspendCard.classList.remove('hidden');
    document.getElementById('overspendAmount').textContent = '¥' + State.overspend;
  } else {
    overspendCard.classList.add('hidden');
  }

  // 阶段
  const stage = House.getStage(percent, State.saved);
  document.getElementById('stageBadge').textContent =
    `第${stage.index}关 / 共${stage.total}关`;
  document.getElementById('bossName').textContent = stage.boss;

  // 成就墙
  const mem = getMemory();
  document.getElementById('memoryIcon').textContent = mem.icon;
  document.getElementById('memoryTitle').textContent = mem.title;
  document.getElementById('memoryDesc').textContent = mem.desc;

  // 本周报告
  const weekTotal = Store.get('weekTotal', 0);
  document.getElementById('weeklyNum').textContent = '¥' + weekTotal;
  document.getElementById('weeklySub').textContent =
    weekTotal > 0 ? '继续保持' : '还没开始';

  // 邻居消息
  renderNeighborMsg();
}

/* ========== 成就墙 ========== */
function getMemory() {
  const s = State.saved;
  if (s >= 10000) return { icon: '💡', title: '书房的台灯', desc: '你超过了 70% 的同龄人' };
  if (s >= 5000)  return { icon: '🛋️', title: '客厅的沙发', desc: '你可以裸辞 1 个月' };
  if (s >= 1000)  return { icon: '📬', title: '门口的信箱', desc: '你拥有了第一笔应急金' };
  return { icon: '📬', title: '门口的信箱', desc: '存到 1000 元就能解锁' };
}

/* ========== 邻居消息 ========== */
function renderNeighborMsg() {
  const msgEl = document.getElementById('neighborMsg');
  if (State.neighborMuted) {
    msgEl.classList.add('hidden');
    return;
  }
  // 只在有事时说话（超支、存钱、连续存钱）
  let text = '';
  if (State.overspend > 0) {
    text = '我今天也超了，一起补回来';
  } else if (State.streak > 0 && State.streak % 7 === 0) {
    text = `你已经坚持 ${State.streak} 天了，厉害`;
  } else if (State.todaySpent > 0) {
    text = '看到你记了一笔，我也在记';
  }

  if (text) {
    msgEl.classList.remove('hidden');
    document.getElementById('neighborText').textContent = text;
    document.getElementById('neighborAvatar').textContent = getNeighborEmoji();
  } else {
    msgEl.classList.add('hidden');
  }
}

function getNeighborEmoji() {
  const map = { '小满': '👧', '阿哲': '🧑', '林一': '👦' };
  return map[State.neighbor] || '👤';
}

/* ========== 页面切换 ========== */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const page = tab.dataset.page;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
  });
});

/* ========== 引导页 ========== */
document.querySelectorAll('.goal-item').forEach((item) => {
  item.addEventListener('click', () => {
    State.goalName = item.dataset.goal;
    State.goalIcon = item.dataset.icon;
    Store.set('goalName', State.goalName);
    Store.set('goalIcon', State.goalIcon);
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    renderHome();
  });
});

/* ========== 设置页 ========== */
const settingsEl = document.getElementById('settings');

function openSettings() {
  // 填充现有数据
  document.getElementById('inputIncome').value = State.income || '';
  document.getElementById('inputGoal').value = State.goalAmount || '';

  // 固定支出列表
  renderFixedList();

  // 图标网格
  renderIconGrid();

  settingsEl.classList.remove('hidden');
}

function renderFixedList() {
  const list = document.getElementById('fixedList');
  list.innerHTML = '';
  State.fixed.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'fixed-item';
    div.innerHTML = `
      <input class="fixed-name" type="text" value="${f.name}" placeholder="项目">
      <input class="fixed-amount" type="number" value="${f.amount}" placeholder="金额">
      <button data-index="${i}">×</button>
    `;
    div.querySelector('button').addEventListener('click', () => {
      State.fixed.splice(i, 1);
      Store.set('fixed', State.fixed);
      renderFixedList();
    });
    div.querySelector('.fixed-name').addEventListener('input', (e) => {
      State.fixed[i].name = e.target.value;
      Store.set('fixed', State.fixed);
    });
    div.querySelector('.fixed-amount').addEventListener('input', (e) => {
      State.fixed[i].amount = Number(e.target.value) || 0;
      Store.set('fixed', State.fixed);
    });
    list.appendChild(div);
  });
}

document.getElementById('btnAddFixed').addEventListener('click', () => {
  State.fixed.push({ name: '', amount: 0 });
  Store.set('fixed', State.fixed);
  renderFixedList();
});

const ICONS = ['📷','✈️','💻','🏠','💰','🎁','🎓','🚗','💍','📱','🎮','🎸','📚','🏋️','🧳','🌱','🎨','☕','🍜','🐱'];

function renderIconGrid() {
  const grid = document.getElementById('iconGrid');
  grid.innerHTML = '';
  ICONS.forEach((icon) => {
    const btn = document.createElement('button');
    btn.className = 'icon-item' + (icon === State.goalIcon ? ' selected' : '');
    btn.textContent = icon;
    btn.addEventListener('click', () => {
      State.goalIcon = icon;
      Store.set('goalIcon', icon);
      renderIconGrid();
    });
    grid.appendChild(btn);
  });
}

document.getElementById('btnSettingsBack').addEventListener('click', () => {
  settingsEl.classList.add('hidden');
});

document.getElementById('btnSaveSettings').addEventListener('click', () => {
  State.income = Number(document.getElementById('inputIncome').value) || 0;
  State.goalAmount = Number(document.getElementById('inputGoal').value) || 0;
  Store.set('income', State.income);
  Store.set('goalAmount', State.goalAmount);

  State.dailyBudget = calcDailyBudget();
  Store.set('dailyBudget', State.dailyBudget);

  State.configured = true;
  Store.set('configured', true);

  settingsEl.classList.add('hidden');
  renderHome();
});

/* ========== 弹窗：存钱 ========== */
const modalSave = document.getElementById('modalSave');
const modalRecord = document.getElementById('modalRecord');

document.getElementById('btnSave').addEventListener('click', () => {
  if (!State.configured) {
    alert('先设置一下哦');
    return;
  }
  document.getElementById('saveAmount').value = '';
  modalSave.classList.remove('hidden');
});

document.getElementById('btnRecord').addEventListener('click', () => {
  if (!State.configured) {
    alert('先设置一下哦');
    return;
  }
  document.getElementById('recordAmount').value = '';
  modalRecord.classList.remove('hidden');
});

// 通用关闭
document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => {
    btn.closest('.modal').classList.add('hidden');
  });
});

// 快捷金额
document.querySelectorAll('#modalSave .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.getElementById('saveAmount').value = chip.dataset.quick;
  });
});

// 确认存钱
document.getElementById('btnConfirmSave').addEventListener('click', () => {
  const amount = Number(document.getElementById('saveAmount').value) || 0;
  if (amount <= 0) return;

  State.saved += amount;
  Store.set('saved', State.saved);

  // 连续存钱
  const today = new Date().toDateString();
  if (State.lastSaveDate !== today) {
    State.streak += 1;
    State.lastSaveDate = today;
    Store.set('streak', State.streak);
    Store.set('lastSaveDate', today);
  }

  // 本周累计
  const weekTotal = Store.get('weekTotal', 0) + amount;
  Store.set('weekTotal', weekTotal);

  modalSave.classList.add('hidden');
  renderHome();
});

// 确认记一笔
let recordCategory = '其他';
document.querySelectorAll('#modalRecord .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    recordCategory = chip.dataset.cat;
    document.querySelectorAll('#modalRecord .chip').forEach((c) => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

document.getElementById('btnConfirmRecord').addEventListener('click', () => {
  const amount = Number(document.getElementById('recordAmount').value) || 0;
  if (amount <= 0) return;

  State.todaySpent += amount;
  Store.set('todaySpent', State.todaySpent);

  // 检查是否超支
  const carryOver = Store.get('carryOver', 0);
  const baseBudget = State.dailyBudget + carryOver;
  if (State.todaySpent > baseBudget) {
    State.overspend = State.todaySpent - baseBudget;
    Store.set('overspend', State.overspend);
    // 超支后弹出后悔药
    setTimeout(() => openRemedy(), 400);
  }

  modalRecord.classList.add('hidden');
  renderHome();
});

/* ========== 弹窗：后悔药 ========== */
const modalRemedy = document.getElementById('modalRemedy');

function openRemedy() {
  const amt = State.overspend;
  document.getElementById('remedyOverspend').textContent = '¥' + amt;
  document.getElementById('remedyTomorrow').textContent = '¥' + amt;
  document.getElementById('remedyDeposit').textContent = '¥' + amt;
  modalRemedy.classList.remove('hidden');
}

document.querySelectorAll('.remedy-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const type = btn.dataset.remedy;
    if (type === 'tomorrow') {
      // 明天额度减
      Store.set('carryOver', -(State.overspend));
    } else if (type === 'deposit') {
      // 从存款扣
      State.saved = Math.max(0, State.saved - State.overspend);
      Store.set('saved', State.saved);
      State.streak = 0;
      Store.set('streak', 0);
    } else if (type === 'task') {
      // 打开小任务
      modalRemedy.classList.add('hidden');
      openTask();
      return;
    }
    State.overspend = 0;
    Store.set('overspend', 0);
    modalRemedy.classList.add('hidden');
    renderHome();
  });
});

/* ========== 弹窗：小任务 ========== */
const modalTask = document.getElementById('modalTask');
const TASKS = [
  { name: '今天不喝奶茶', hint: '平时你买奶茶大概 5 - 30 元' },
  { name: '今天不点外卖', hint: '平时你点外卖大概 15 - 40 元' },
  { name: '今天不网购',   hint: '你平时网购大概 20 - 100 元' },
  { name: '删掉购物车一件', hint: '看看购物车，删掉一件' },
  { name: '今天只花现金', hint: '增加一点消费摩擦' },
  { name: '今天不打开购物 App', hint: '忍住不逛' },
  { name: '今天午饭控制在 20 元内', hint: '平时午饭大概 15 - 30 元' },
  { name: '今天不买饮料，只喝水', hint: '平时饮料大概 3 - 10 元' }
];

let currentTask = null;

function openTask() {
  currentTask = TASKS[Math.floor(Math.random() * TASKS.length)];
  document.getElementById('taskName').textContent = currentTask.name;
  document.getElementById('taskHint').textContent = currentTask.hint;
  document.getElementById('taskAmount').value = '';
  modalTask.classList.remove('hidden');
}

document.getElementById('btnReroll').addEventListener('click', () => {
  currentTask = TASKS[Math.floor(Math.random() * TASKS.length)];
  document.getElementById('taskName').textContent = currentTask.name;
  document.getElementById('taskHint').textContent = currentTask.hint;
});

document.getElementById('btnConfirmTask').addEventListener('click', () => {
  const amount = Number(document.getElementById('taskAmount').value) || 0;
  if (amount <= 0) return;

  // 抵消
  const remaining = Math.max(0, State.overspend - amount);
  const extra = Math.max(0, amount - State.overspend);

  State.overspend = remaining;
  Store.set('overspend', remaining);

  // 额外节省累计
  if (extra > 0) {
    const totalExtra = Store.get('extraSaved', 0) + extra;
    Store.set('extraSaved', totalExtra);
  }

  modalTask.classList.add('hidden');
  renderHome();
});

/* ========== 设置入口 ========== */
document.getElementById('btnSetup').addEventListener('click', openSettings);
document.getElementById('meSettings').addEventListener('click', openSettings);

/* ========== 初始化 ========== */
function init() {
  if (State.goalName && !State.configured) {
    // 已经选过目标，但没设置额度
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  } else if (State.configured) {
    // 全部设置好了
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  } else {
    // 首次打开
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
  renderHome();
}

init();

/* ========== Service Worker ========== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => console.log(err));
  });
}