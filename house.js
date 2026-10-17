/* ========== 房子渲染 ==========
   6 个阶段：
   0%   空地 + 牌子
   5%   地基
   15%  墙
   30%  屋顶
   50%  门 + 窗
   70%  烟囱
   100% 亮灯 + 烟 + 花
================================ */

const House = {
  /**
   * 渲染房子到指定容器
   * @param {HTMLElement} container - 容器
   * @param {number} percent - 进度 0-100
   * @param {string} icon - 目标图标（emoji）
   */
  render(container, percent, icon = '🎯') {
    const p = Math.max(0, Math.min(100, percent));

    // 各阶段是否显示
    const show = {
      ground: true,                          // 空地
      sign: p < 5,                           // 牌子（没地基时才显示）
      foundation: p >= 5,                    // 地基
      wall: p >= 15,                         // 墙
      roof: p >= 30,                         // 屋顶
      door: p >= 50,                         // 门
      window: p >= 50,                       // 窗
      chimney: p >= 70,                      // 烟囱
      light: p >= 100,                       // 亮灯
      smoke: p >= 100,                       // 冒烟
      flower: p >= 100                       // 花园开花
    };

    container.innerHTML = `
      <svg viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg">
        <!-- 草地 -->
        <ellipse cx="100" cy="160" rx="80" ry="10" fill="#c8d6b0" opacity="0.6"/>

        <!-- 牌子（空地时显示） -->
        ${show.sign ? `
          <rect x="94" y="100" width="4" height="40" fill="#a5835c"/>
          <rect x="72" y="88" width="48" height="24" rx="4" fill="#f0e2d0" stroke="#cbb99b" stroke-width="1.5"/>
          <text x="96" y="105" font-size="14" text-anchor="middle">${icon}</text>
        ` : ''}

        <!-- 地基 -->
        ${show.foundation ? `
          <rect class="part foundation" x="30" y="130" width="140" height="16" rx="4" fill="#b7a98b"/>
        ` : ''}

        <!-- 墙 -->
        ${show.wall ? `
          <rect class="part wall" x="45" y="72" width="110" height="58" rx="4" fill="#e8d9c0" stroke="#cbb99b" stroke-width="2"/>
        ` : ''}

        <!-- 屋顶 -->
        ${show.roof ? `
          <path class="part roof" d="M28 74 L100 24 L172 74 Z" fill="#b85e2e" stroke="#a04e26" stroke-width="2" stroke-linejoin="round"/>
        ` : ''}

        <!-- 烟囱 -->
        ${show.chimney ? `
          <rect class="part chimney" x="128" y="36" width="14" height="28" rx="3" fill="#a5835c" stroke="#8a6b4b" stroke-width="1.5"/>
          ${show.smoke ? `
            <circle cx="135" cy="28" r="4" fill="#d8d4c8" opacity="0.7"/>
            <circle cx="140" cy="20" r="5" fill="#d8d4c8" opacity="0.5"/>
          ` : ''}
        ` : ''}

        <!-- 门 -->
        ${show.door ? `
          <rect class="part door" x="84" y="96" width="32" height="34" rx="4" fill="#b99b7a" stroke="#a07f5c" stroke-width="1.5"/>
          <circle cx="110" cy="114" r="3" fill="#f0e2d0"/>
        ` : ''}

        <!-- 窗 -->
        ${show.window ? `
          <rect class="part window" x="52" y="84" width="24" height="22" rx="3" fill="#a8d0e6" stroke="#7aa5bb" stroke-width="1.5"/>
          <line x1="64" y1="84" x2="64" y2="106" stroke="#7aa5bb" stroke-width="1.2"/>
          <line x1="52" y1="95" x2="76" y2="95" stroke="#7aa5bb" stroke-width="1.2"/>
          <rect class="part window" x="124" y="84" width="24" height="22" rx="3" fill="#a8d0e6" stroke="#7aa5bb" stroke-width="1.5"/>
          <line x1="136" y1="84" x2="136" y2="106" stroke="#7aa5bb" stroke-width="1.2"/>
          <line x1="124" y1="95" x2="148" y2="95" stroke="#7aa5bb" stroke-width="1.2"/>
        ` : ''}

        <!-- 亮灯 -->
        ${show.light ? `
          <circle class="light" cx="64" cy="95" r="14" fill="#ffe9a8" opacity="0.5"/>
          <circle class="light" cx="136" cy="95" r="14" fill="#ffe9a8" opacity="0.5"/>
          <circle class="light" cx="100" cy="113" r="16" fill="#ffe9a8" opacity="0.4"/>
        ` : ''}

        <!-- 花园开花 -->
        ${show.flower ? `
          <circle cx="42" cy="148" r="5" fill="#f4a4a4"/>
          <circle cx="46" cy="144" r="4" fill="#f7c6c6"/>
          <circle cx="158" cy="150" r="5" fill="#f4a4a4"/>
          <circle cx="154" cy="146" r="4" fill="#f7c6c6"/>
          <circle cx="70" cy="152" r="4" fill="#f4c2a4"/>
          <circle cx="130" cy="150" r="4" fill="#f4c2a4"/>
        ` : ''}
      </svg>
    `;

    // 逐帧显示动画
    this.animate(container, p);
  },

  /**
   * 让每个 part 有入场动画
   */
  animate(container, percent) {
    const parts = container.querySelectorAll('.part');
    parts.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

      // 不同元素不同动画
      const classList = el.classList;
      if (classList.contains('wall')) {
        el.style.transform = 'translateY(10px)';
      } else if (classList.contains('roof')) {
        el.style.transform = 'scaleX(0.6)';
        el.style.transformOrigin = 'center bottom';
      } else if (classList.contains('door') || classList.contains('window')) {
        el.style.transform = 'scale(0.8)';
        el.style.transformOrigin = 'center';
      } else if (classList.contains('chimney')) {
        el.style.transform = 'translateY(-8px)';
      }

      setTimeout(() => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }, 30 + i * 40);
    });

    // 亮灯闪烁
    const lights = container.querySelectorAll('.light');
    lights.forEach((el) => {
      el.style.animation = 'lightPulse 2s ease-in-out infinite';
    });
  },

  /**
   * 获取当前阶段名称
   */
  getStageName(percent) {
    if (percent < 5) return '空地';
    if (percent < 15) return '打地基';
    if (percent < 30) return '砌墙中';
    if (percent < 50) return '盖屋顶';
    if (percent < 70) return '装门窗';
    if (percent < 100) return '加烟囱';
    return '完工亮灯';
  },

  /**
   * 获取当前关卡 / BOSS
   */
  getStage(percent, saved) {
    const STAGES = [
      { target: 500,  name: '打地基',   boss: '连续 7 天不超支' },
      { target: 1500, name: '砌墙',     boss: '这周不点外卖' },
      { target: 3000, name: '盖屋顶',   boss: '连续 14 天存钱' },
      { target: 5000, name: '完工',     boss: '无' }
    ];
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (saved < STAGES[i].target) { idx = i; break; }
      idx = i;
    }
    return {
      index: idx + 1,
      total: STAGES.length,
      name: STAGES[idx].name,
      boss: STAGES[idx].boss
    };
  }
};

/* ========== 亮灯动画 CSS 注入 ========== */
(function injectLightKeyframe() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes lightPulse {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }
  `;
  document.head.appendChild(style);
})();