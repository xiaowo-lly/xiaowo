/* ========== 数据层 ========== */
const Store = {
  KEY: 'xiaowo_',
  get(key, fallback) {
    const v = localStorage.getItem(this.KEY + key);
    if (v === null) return fallback;
    try { return JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) { localStorage.setItem(this.KEY + key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(this.KEY + key); }
};

/* ========== 全局状态 ========== */
const State = {
  goalName: Store.get('goalName', ''),
  goalIcon: Store.get('goalIcon', '🎯'),
  goalAmount: Store.get('goalAmount', 0),
  income: Store.get('income', 0),
  fixed: Store.get('fixed', []),
  dailyBudget: Store.get('dailyBudget', 0),

  saved: Store.get('saved', 0),
  streak: Store.get('streak', 0),
  lastSaveDate: Store.get('lastSaveDate', ''),

  todaySpent: Store.get('todaySpent', 0),
  todayDate: Store.get('todayDate', ''),

  overspend: Store.get('overspend', 0),
  neighbor: Store.get('neighbor', '小满'),
  neighborMuted: Store.get('neighborMuted', false),
  configured: Store.get('configured', false),
};

/* ========== 每日重置 ========== */
(function dailyReset() {
  const today = new Date().toDateString();
  if (State.todayDate !== today) {
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
  return Math.round(monthlyCanSpend / 30);
}

/* ========== 渲染：首页 ========== */
function renderHome() {
  const percent = State.goalAmount > 0 ? (State.saved / State.goalAmount) * 100 : 0;
  House.render(document.getElementById('houseMain'), percent, State.goalIcon);
  document.getElementById('houseLabel').textContent = `${House.getStageName(percent)} · ${Math.round(percent)}%`;

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

  const carryOver = Store.get('carryOver', 0);
  const baseBudget = State.dailyBudget + carryOver;
  const spentPercent = baseBudget > 0 ? Math.min(100, (State.todaySpent / baseBudget) * 100) : 0;
  const progressFill = document.getElementById('todayProgress');
  progressFill.style.width = spentPercent + '%';
  progressFill.classList.toggle('warning', spentPercent >= 100);
  document.getElementById('todayProgressText').textContent = `今天已花 ¥${State.todaySpent}`;

  document.getElementById('streakDays').textContent = State.streak;

  const overspendCard = document.getElementById('overspendCard');
  if (State.overspend > 0) {
    overspendCard.classList.remove('hidden');
    document.getElementById('overspendAmount').textContent = '¥' + State.overspend;
  } else {
    overspendCard.classList.add('hidden');
  }

  const stage = House.getStage(percent, State.saved);
  document.getElementById('stageBadge').textContent = `第${stage.index}关 / 共${stage.total}关`;
  document.getElementById('bossName').textContent = stage.boss;

  const mem = getMemory();
  document.getElementById('memoryIcon').textContent = mem.icon;
  document.getElementById('memoryTitle').textContent = mem.title;
  document.getElementById('memoryDesc').textContent = mem.desc;

  const weekTotal = Store.get('weekTotal', 0);
  document.getElementById('weeklyNum').textContent = '¥' + weekTotal;
  document.getElementById('weeklySub').textContent = weekTotal > 0 ? '继续保持' : '还没开始';

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

/* ========== 邻居 ========== */
function getNeighborEmoji() {
  const map = { '小满': '👧', '阿哲': '🧑', '林一': '👦' };
  return map[State.neighbor] || '👤';
}

function renderNeighborMsg() {
  const msgEl = document.getElementById('neighborMsg');
  if (State.neighborMuted) { msgEl.classList.add('hidden'); return; }
  
  let text = '';
  if (State.overspend > 0) text = '我今天也超了，一起补回来';
  else if (State.streak > 0 && State.streak % 7 === 0) text = `你已经坚持 ${State.streak} 天了，厉害`;
  else if (State.todaySpent > 0) text = '看到你记了一笔，我也在记';

  if (text) {
    msgEl.classList.remove('hidden');
    document.getElementById('neighborText').textContent = text;
    document.getElementById('neighborAvatar').textContent = getNeighborEmoji();
  } else {
    msgEl.classList.add('hidden');
  }
}

/* ========== 渲染：地图 ========== */
function renderMap() {
  document.getElementById('mapSaved').textContent = '¥' + State.saved;
  
  // 节点状态判断
  const nodes = [
    { id: 'node2', amount: 1000 },
    { id: 'node3', amount: 5000 },
    { id: 'node4', amount: 10000 }
  ];
  
  nodes.forEach(n => {
    const el = document.getElementById(n.id);
    if (State.saved >= n.amount) {
      el.className = 'timeline-item past';
    } else {
      el.className = 'timeline-item';
      el.querySelector('.dot').style.background = '#d6d0bf';
    }
  });

  // 预测未来（假设每月存目标的一半）
  const monthlySave = State.goalAmount > 0 ? State.goalAmount : 1000;
  document.getElementById('futureAmt1').textContent = '¥' + (State.saved + monthlySave * 3);
  document.getElementById('futureAmt2').textContent = '¥' + (State.saved + monthlySave * 12);
}

/* ========== 渲染：邻居页 ========== */
function renderNeighborPage() {
  document.getElementById('neighborName').textContent = State.neighbor;
  document.getElementById('neighborBigHouse').textContent = getNeighborEmoji() + '🏠';
  
  const percent = State.goalAmount > 0 ? (State.saved / State.goalAmount) * 100 : 0;
  // 邻居进度稍微滞后一点，显得真实
  const neighborPercent = Math.max(0, percent - 5);
  document.getElementById('neighborProgress').textContent = `进度 ${Math.round(neighborPercent)}%`;

  renderChatHistory();
}

/* 预设对话库 */
const NEIGHBOR_DIALOGUES = {
  greet: [
    "今天也要加油哦！我也在努力盖房子。",
    "早，又要开始省钱的一天了哈哈。",
    "嗯，新的一天。"
  ],
  replyEncourage: [
    "谢谢！我们一起盖完它！",
    "好，我也存了！"
  ],
  replyHard: [
    "没关系，我也经常没忍住。明天继续。",
    "抱抱，明天少花点就好。",
    "难就休息一天，别有压力。"
  ],
  replySaved: [
    "厉害啊！我也得跟上进度了。",
    "看到你存了，我也来存一点。"
  ]
};

function renderChatHistory() {
  const box = document.getElementById('neighborChatBox');
  // 简单起见，每次进入显示一句随机问候
  const greets = NEIGHBOR_DIALOGUES.greet;
  const msg = greets[Math.floor(Math.random() * greets.length)];
  box.innerHTML = `<div class="chat-bubble">${msg}</div>`;
}

// 邻居页交互
document.querySelectorAll('#neighborActionBox .chip').forEach(btn => {
  btn.addEventListener('click', () => {
    const reply = btn.dataset.reply;
    const box = document.getElementById('neighborChatBox');
    // 显示用户回复
    box.innerHTML += `<div class="chat-bubble" style="align-self:flex-end; background:#2c2b26; color:white; margin-top:8px; margin-left:auto; width:fit-content;">${reply}</div>`;
    
    // 邻居反馈
    setTimeout(() => {
      let replyText = '';
      if (reply.includes('难')) replyText = NEIGHBOR_DIALOGUES.replyHard[Math.floor(Math.random()*3)];
      else if (reply.includes('存了')) replyText = NEIGHBOR_DIALOGUES.replySaved[Math.floor(Math.random()*2)];
      else replyText = NEIGHBOR_DIALOGUES.replyEncourage[Math.floor(Math.random()*2)];
      
      box.innerHTML += `<div class="chat-bubble" style="margin-top:8px;">${replyText}</div>`;
      box.scrollTop = box.scrollHeight;
    }, 600);
    
    box.scrollTop = box.scrollHeight;
  });
});

/* ========== 页面切换 ========== */
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const page = tab.dataset.page;
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    
    // 渲染对应页面
    if (page === 'map') renderMap();
    if (page === 'neighbor') renderNeighborPage();
    if (page === 'home') renderHome();
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
  document.getElementById('inputIncome').value = State.income || '';
  document.getElementById('inputGoal').value = State.goalAmount || '';
  renderFixedList();
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
      State.fixed.splice(i, 1); Store.set('fixed', State.fixed); renderFixedList();
    });
    div.querySelector('.fixed-name').addEventListener('input', (e) => {
      State.fixed[i].name = e.target.value; Store.set('fixed', State.fixed);
    });
    div.querySelector('.fixed-amount').addEventListener('input', (e) => {
      State.fixed[i].amount = Number(e.target.value) || 0; Store.set('fixed', State.fixed);
    });
    list.appendChild(div);
  });
}

document.getElementById('btnAddFixed').addEventListener('click', () => {
  State.fixed.push({ name: '', amount: 0 }); Store.set('fixed', State.fixed); renderFixedList();
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
      State.goalIcon = icon; Store.set('goalIcon', icon); renderIconGrid();
    });
    grid.appendChild(btn);
  });
}

document.getElementById('btnSettingsBack').addEventListener('click', () => settingsEl.classList.add('hidden'));

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

/* ========== 动作与弹窗 ========== */
const modalSave = document.getElementById('modalSave');
const modalRecord = document.getElementById('modalRecord');
const modalRemedy = document.getElementById('modalRemedy');
const modalTask = document.getElementById('modalTask');

document.getElementById('btnSave').addEventListener('click', () => {
  if (!State.configured) { alert('先设置一下哦'); return; }
  document.getElementById('saveAmount').value = ''; modalSave.classList.remove('hidden');
});

document.getElementById('btnRecord').addEventListener('click', () => {
  if (!State.configured) { alert('先设置一下哦'); return; }
  document.getElementById('recordAmount').value = ''; modalRecord.classList.remove('hidden');
});

document.querySelectorAll('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => btn.closest('.modal').classList.add('hidden'));
});

document.querySelectorAll('#modalSave .chip').forEach((chip) => {
  chip.addEventListener('click', () => document.getElementById('saveAmount').value = chip.dataset.quick);
});

document.getElementById('btnConfirmSave').addEventListener('click', () => {
  const amount = Number(document.getElementById('saveAmount').value) || 0;
  if (amount <= 0) return;

  State.saved += amount; Store.set('saved', State.saved);

  const today = new Date().toDateString();
  if (State.lastSaveDate !== today) {
    State.streak += 1; State.lastSaveDate = today;
    Store.set('streak', State.streak); Store.set('lastSaveDate', today);
  }

  const weekTotal = Store.get('weekTotal', 0) + amount; Store.set('weekTotal', weekTotal);
  modalSave.classList.add('hidden');
  renderHome();
});

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

  State.todaySpent += amount; Store.set('todaySpent', State.todaySpent);

  const carryOver = Store.get('carryOver', 0);
  const baseBudget = State.dailyBudget + carryOver;
  if (State.todaySpent > baseBudget) {
    State.overspend = State.todaySpent - baseBudget;
    Store.set('overspend', State.overspend);
    setTimeout(() => openRemedy(), 400);
  }

  modalRecord.classList.add('hidden');
  renderHome();
});

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
    if (type === 'tomorrow') Store.set('carryOver', -(State.overspend));
    else if (type === 'deposit') {
      State.saved = Math.max(0, State.saved - State.overspend);
      Store.set('saved', State.saved);
      State.streak = 0; Store.set('streak', 0);
    } else if (type === 'task') {
      modalRemedy.classList.add('hidden'); openTask(); return;
    }
    State.overspend = 0; Store.set('overspend', 0);
    modalRemedy.classList.add('hidden');
    renderHome();
  });
});

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

  const remaining = Math.max(0, State.overspend - amount);
  const extra = Math.max(0, amount - State.overspend);

  State.overspend = remaining; Store.set('overspend', remaining);

  if (extra > 0) {
    const totalExtra = Store.get('extraSaved', 0) + extra;
    Store.set('extraSaved', totalExtra);
  }

  modalTask.classList.add('hidden');
  renderHome();
});

/* ========== 我的页交互 ========== */
document.getElementById('btnSetup').addEventListener('click', openSettings);
document.getElementById('meSettings').addEventListener('click', openSettings);

// 数据导出
document.getElementById('meExport').addEventListener('click', () => {
  const data = `小窝存钱数据导出\n日期: ${new Date().toLocaleDateString()}\n目标: ${State.goalName} (¥${State.goalAmount})\n已存: ¥${State.saved}\n连续天数: ${State.streak}天`;
  const blob = new Blob([data], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'xiaowo_data.txt'; a.click();
  URL.revokeObjectURL(url);
});

// 清除数据
document.getElementById('meReset').addEventListener('click', () => {
  if (confirm('确定要清除所有数据吗？这无法恢复！')) {
    localStorage.clear();
    location.reload();
  }
});

// 关于
document.getElementById('meAbout').addEventListener('click', () => {
  alert('小窝 · 砌砖存钱\n版本 1.1\n工资不高，也能一块砖一块砖，盖出自己的小窝。');
});

/* ========== 初始化 ========== */
function init() {
  if (State.goalName && !State.configured) {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  } else if (State.configured) {
    document.getElementById('onboarding').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  } else {
    document.getElementById('onboarding').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }
  renderHome();
  renderMap();
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(console.log));
}
