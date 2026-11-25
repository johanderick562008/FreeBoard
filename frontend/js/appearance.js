// Appearance — the palette button next to ⚙ opens a panel to pick a theme, font and text size.
// Choices are saved in this browser only (localStorage), so each person's look is their own.
// js/theme-boot.js applies the saved look in <head>; this file adds the panel and the
// Doomsday Edition extras (launch screen, tap effect, The Warden in the background).
(function(){
  const KEY = 'freeboard-appearance';
  const DEFAULT = { theme: 'classic', font: 'grotesk', size: 'm', custom: { bg: '#14161f', hi: '#ff9f43' } };
  const root = document.documentElement;
  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const load = () => {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e) {}
    return { ...DEFAULT, ...p, custom: { ...DEFAULT.custom, ...(p.custom || {}) } };
  };
  const save = (p) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch(e) {} };

  // Theme cards: [key, name, background, panel, line, free, busy, text]
  const THEMES = [
    ['classic',  'Classic Green', '#101d17', '#16261e', '#33493c', '#ffd23f', '#ff7a59', '#f3efe3'],
    ['midnight', 'Midnight',      '#0b1020', '#121a30', '#2a3a66', '#ffd166', '#ff7b8a', '#eef2ff'],
    ['daylight', 'Daylight',      '#eef1f4', '#ffffff', '#d5dce3', '#c47f00', '#d9482b', '#16202b'],
    ['sakura',   'Sakura Night',  '#1b1220', '#241829', '#4a3352', '#ffb3c8', '#ff9466', '#fbeef3'],
    ['terminal', 'Terminal',      '#050806', '#0b110d', '#1f3a27', '#39ff88', '#ffb000', '#c8ffd4'],
  ];
  const FONTS = [
    ['grotesk', 'Grotesk', "'Space Grotesk',sans-serif"],
    ['rounded', 'Rounded', "'Nunito',sans-serif"],
    ['serif',   'Serif',   "'Fraunces',serif"],
    ['mono',    'Mono',    "'JetBrains Mono',monospace"],
  ];
  const FONT_URL = {
    rounded: 'family=Nunito:wght@500;600;700;800',
    serif: 'family=Fraunces:opsz,wght@9..144,600;9..144,700',
    mono: 'family=JetBrains+Mono:wght@400;500;600;700',
    cinzel: 'family=Cinzel:wght@600;700;900',
  };
  const loadedFonts = new Set();
  function loadFont(k){
    if (!FONT_URL[k] || loadedFonts.has(k)) return;
    if ([...document.querySelectorAll('link[href*="fonts.googleapis.com"]')].some(l => l.href.includes(FONT_URL[k].split(':')[0]))){ loadedFonts.add(k); return; }
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?${FONT_URL[k]}&display=swap`;
    document.head.appendChild(l);
    loadedFonts.add(k);
  }

  // ------------------------------------------------------------------ art ---
  // The Doomsday emblem: a riveted iron clock face with an "F" (FreeBoard = time).
  function sigil(forSplash){
    let ticks = '', rivets = '';
    for (let i = 0; i < 12; i++){
      const a = (i * 30 - 90) * Math.PI / 180, big = i % 3 === 0;
      const r1 = big ? 56 : 59, r2 = big ? 66 : 65;
      const d = forSplash ? ` style="animation-delay:${(0.35 + i * 0.055).toFixed(2)}s"` : '';
      ticks += `<line class="tick"${d} x1="${(100 + r1 * Math.cos(a)).toFixed(1)}" y1="${(100 + r1 * Math.sin(a)).toFixed(1)}" x2="${(100 + r2 * Math.cos(a)).toFixed(1)}" y2="${(100 + r2 * Math.sin(a)).toFixed(1)}" stroke-width="${big ? 4 : 2.4}"/>`;
    }
    for (let i = 0; i < 8; i++){
      const a = (i * 45 + 22.5) * Math.PI / 180, x = 100 + 79 * Math.cos(a), y = 100 + 79 * Math.sin(a);
      rivets += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="#0a0d0b"/><circle cx="${(x - .6).toFixed(1)}" cy="${(y - .7).toFixed(1)}" r="1.3" fill="#a4afa5"/>`;
    }
    const id = forSplash ? 's' : 'c';
    return `<svg viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="ir${id}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="#3a443c"/><stop offset=".55" stop-color="#1a201b"/><stop offset="1" stop-color="#0a0d0b"/></radialGradient>
        <linearGradient id="rm${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e9a8f"/><stop offset=".5" stop-color="#2c342e"/><stop offset="1" stop-color="#5b665c"/></linearGradient>
        <filter id="gl${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#rm${id})"/>
      <circle cx="100" cy="100" r="86" fill="url(#ir${id})"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="#050706" stroke-width="2"/>
      <circle cx="100" cy="100" r="71.5" fill="none" stroke="rgba(255,255,255,.07)"/>
      ${rivets}
      <g filter="url(#gl${id})" stroke="#8ff0a4" stroke-linecap="round" fill="none">${ticks}</g>
      <text x="100" y="124" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="74" fill="#0d120e">F</text>
      <text class="core" x="100" y="124" text-anchor="middle" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="74" fill="#b9f8c6" filter="url(#gl${id})">F</text>
      ${forSplash ? `<line class="hand" x1="100" y1="100" x2="100" y2="50" stroke="#8ff0a4" stroke-width="2" stroke-linecap="round" filter="url(#gl${id})"/>` : ''}
    </svg>`;
  }

  // The Warden — FreeBoard's own iron-crowned knight, watching from the smoke.
  function warden(){
    const rv = (x, y) => `<circle cx="${x}" cy="${y}" r="2.4" fill="#070908"/><circle cx="${x - .5}" cy="${y - .6}" r="1.2" fill="#aab5ab"/>`;
    const rivets = [128, 152, 176, 224, 248, 272].map(x => rv(x, 190)).join('');
    const breaths = [164, 174, 220, 230].map(x => `<rect x="${x}" y="276" width="4" height="16" rx="2"/>`).join('');
    return `<svg viewBox="0 0 400 520" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
<defs>
 <linearGradient id="wm1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1a1f1b"/><stop offset=".28" stop-color="#7d897e"/><stop offset=".45" stop-color="#3c463e"/><stop offset=".75" stop-color="#20271f"/><stop offset="1" stop-color="#0c0f0d"/></linearGradient>
 <linearGradient id="wm2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55605a"/><stop offset="1" stop-color="#121613"/></linearGradient>
 <linearGradient id="wsh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a554c"/><stop offset=".5" stop-color="#1b211c"/><stop offset="1" stop-color="#090b0a"/></linearGradient>
 <radialGradient id="wbl"><stop offset="0" stop-color="#b9f8c6" stop-opacity=".9"/><stop offset=".35" stop-color="#8ff0a4" stop-opacity=".45"/><stop offset="1" stop-color="#8ff0a4" stop-opacity="0"/></radialGradient>
 <filter id="wgl" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="3"/></filter>
 <filter id="wtx"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" seed="12"/><feColorMatrix values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .12 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
 <linearGradient id="wfd" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
 <mask id="wfm"><rect width="400" height="520" fill="url(#wfd)"/></mask>
</defs>
<g mask="url(#wfm)">
 <path d="M20 520 C20 420 70 372 150 356 L250 356 C330 372 380 420 380 520 Z" fill="url(#wsh)"/>
 <path d="M40 470 C60 410 100 384 150 376 M360 470 C340 410 300 384 250 376" stroke="#6b766d" stroke-width="2" fill="none" opacity=".5"/>
 <path d="M135 330 Q200 350 265 330 L272 362 Q200 384 128 362 Z" fill="url(#wm2)"/>
 <path d="M140 306 Q200 324 260 306 L265 332 Q200 352 135 332 Z" fill="#1c221e"/>
 <path id="whelm" d="M112 196 C112 120 150 92 200 92 C250 92 288 120 288 196 L282 290 C276 316 246 334 200 338 C154 334 124 316 118 290 Z" fill="url(#wm1)"/>
 <path d="M112 196 C112 120 150 92 200 92 C250 92 288 120 288 196 L282 290 C276 316 246 334 200 338 C154 334 124 316 118 290 Z" fill="#fff" filter="url(#wtx)"/>
 <path d="M200 96 L200 336" stroke="#0b0e0c" stroke-width="3"/><path d="M197 98 L197 334" stroke="#9aa69c" opacity=".5"/>
 <path d="M108 178 Q200 160 292 178 L292 200 Q200 182 108 200 Z" fill="url(#wm2)" stroke="#050605" stroke-width="1.5"/>
 ${rivets}
 <path d="M122 176 L116 120 L142 170 Z M158 168 L160 96 L178 165 Z M222 165 L240 96 L242 168 Z M258 170 L284 120 L278 176 Z" fill="url(#wm2)" stroke="#050605" stroke-width="1.5"/>
 <path d="M190 163 L200 62 L210 163 Z" fill="url(#wm1)" stroke="#050605" stroke-width="1.5"/>
 <path d="M134 238 Q200 226 266 238 L266 250 Q200 240 134 250 Z" fill="#020302"/>
 <path d="M194 250 L194 306 L206 306 L206 250 Z" fill="#020302"/>
 <g class="dd-eyes">
  <ellipse cx="200" cy="241" rx="95" ry="26" fill="url(#wbl)"/>
  <path d="M140 241 Q200 232 260 241" stroke="#8ff0a4" stroke-width="3" fill="none" filter="url(#wgl)"/>
  <ellipse cx="170" cy="239" rx="9" ry="3" fill="#e6ffec" filter="url(#wgl)"/><ellipse cx="230" cy="239" rx="9" ry="3" fill="#e6ffec" filter="url(#wgl)"/>
  <ellipse cx="170" cy="239" rx="4" ry="1.6" fill="#fff"/><ellipse cx="230" cy="239" rx="4" ry="1.6" fill="#fff"/>
 </g>
 <g fill="#020302">${breaths}</g>
 <path d="M114 200 C114 126 152 96 200 94" stroke="#8ff0a4" stroke-width="1.5" fill="none" opacity=".35"/>
</g></svg>`;
  }

  const TAB_ICONS = {
    live: '<circle cx="12" cy="12" r="3"/><path d="M6.3 6.3a8 8 0 0 0 0 11.4M17.7 6.3a8 8 0 0 1 0 11.4"/>',
    browse: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    people: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19c.8-3.2 3.2-5 6-5s5.2 1.8 6 5"/><path d="M15.5 5.6a3 3 0 0 1 0 5.8M17.5 14.3c1.8.6 3 2.2 3.5 4.7"/>',
    together: '<circle cx="8" cy="12" r="5"/><circle cx="16" cy="12" r="5"/>',
  };
  const PALETTE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.1-.9-1.5-.9-2.5 0-.9.8-1.6 1.7-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.1"/><circle cx="10" cy="7.3" r="1.1"/><circle cx="14.6" cy="7.3" r="1.1"/></svg>';

  // -------------------------------------------------------------- applying ---
  function isLight(hex){
    const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.6;
  }
  function apply(p){
    root.setAttribute('data-theme', p.theme);
    root.setAttribute('data-font', p.font);
    root.setAttribute('data-size', p.size);
    if (p.theme === 'custom'){
      root.style.setProperty('--c-bg', p.custom.bg);
      root.style.setProperty('--c-hi', p.custom.hi);
      root.toggleAttribute('data-custom-light', isLight(p.custom.bg));
    } else {
      root.style.removeProperty('--c-bg'); root.style.removeProperty('--c-hi');
      root.removeAttribute('data-custom-light');
    }
    loadFont(p.font);
    if (p.theme === 'doomsday') loadFont('cinzel');
  }

  // ------------------------------------------------------- Doomsday extras ---
  function decoratePage(){
    // Tab icons: keep the emoji for normal themes, show line icons in Doomsday.
    document.querySelectorAll('nav.tabs button[data-tab]').forEach(b => {
      if (b.querySelector('.tab-emoji')) return;
      const t = b.textContent.trim(), sp = t.indexOf(' ');
      if (sp < 1 || !TAB_ICONS[b.dataset.tab]) return;
      b.innerHTML = `<span class="tab-emoji">${t.slice(0, sp)}</span><svg class="tab-ico" viewBox="0 0 24 24" aria-hidden="true">${TAB_ICONS[b.dataset.tab]}</svg>${t.slice(sp + 1)}`;
    });
    const brand = document.querySelector('.brand');
    if (brand && !brand.querySelector('.dd-edition')) brand.insertAdjacentHTML('beforeend', '<div class="dd-edition">Doomsday edition</div>');
    if (!document.querySelector('.dd-warden')){
      const w = document.createElement('div');
      w.className = 'dd-warden';
      w.setAttribute('aria-hidden', 'true');
      w.innerHTML = warden();
      document.body.insertBefore(w, document.body.firstChild);
    }
  }

  function runSplash(){
    if (!root.hasAttribute('data-splash')) return;
    try { sessionStorage.setItem('freeboard-dd-splash', '1'); } catch(e) {}
    const s = document.createElement('div');
    s.className = 'dd-splash';
    s.setAttribute('role', 'img');
    s.setAttribute('aria-label', 'FreeBoard, Doomsday edition');
    s.innerHTML = `<div class="halo"></div><div class="sig">${sigil(true)}</div>
      <div class="wm"><h1>FREEBOARD</h1><p>Doomsday edition</p></div><div class="bar"><i></i></div>`;
    document.body.appendChild(s);
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      root.removeAttribute('data-splash');
      s.classList.add('out');
      setTimeout(() => s.remove(), 450);
    };
    setTimeout(finish, 1900);
  }

  // Tap effect: an iron ring with clock ticks, a few sparks and a puff of smoke.
  function tapSvg(){
    let ticks = '', sparks = '';
    for (let i = 0; i < 12; i++){
      const a = i * 30 * Math.PI / 180, big = i % 3 === 0, R = 36;
      const r1 = R - (big ? 4 : 2.5), r2 = R + (big ? 4 : 2.5);
      ticks += `<line x1="${(60 + r1 * Math.cos(a)).toFixed(1)}" y1="${(60 + r1 * Math.sin(a)).toFixed(1)}" x2="${(60 + r2 * Math.cos(a)).toFixed(1)}" y2="${(60 + r2 * Math.sin(a)).toFixed(1)}" stroke-width="${big ? 2.2 : 1.4}"/>`;
    }
    for (let i = 0; i < 9; i++){
      const a = (i * 40 + Math.random() * 24 - 12) * Math.PI / 180, r = 40 + Math.random() * 6, L = 5 + Math.random() * 6;
      sparks += `<line x1="${(60 + r * Math.cos(a)).toFixed(1)}" y1="${(60 + r * Math.sin(a)).toFixed(1)}" x2="${(60 + (r + L) * Math.cos(a)).toFixed(1)}" y2="${(60 + (r + L) * Math.sin(a)).toFixed(1)}"/>`;
    }
    return `<div class="smoke"></div><svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
      <defs><filter id="tg${Date.now()}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <g class="ring"><circle cx="60" cy="60" r="36" fill="none" stroke="#8ff0a4" opacity=".7"/><g stroke="#b9f8c6" stroke-linecap="round">${ticks}</g></g>
      <g class="sparks" stroke="#d6ffe0" stroke-linecap="round" stroke-width="1">${sparks}</g>
      <circle class="core" cx="60" cy="60" r="6" fill="#d6ffe0"/><circle class="core" cx="60" cy="60" r="14" fill="rgba(143,240,164,.18)"/>
    </svg>`;
  }
  const TAP_TARGETS = 'button, a, .gchip, .flip, [role="button"], [role="tab"], label, select';
  document.addEventListener('pointerdown', (e) => {
    if (root.getAttribute('data-theme') !== 'doomsday' || reduceMotion()) return;
    if (!e.target.closest || !e.target.closest(TAP_TARGETS)) return;
    const t = document.createElement('div');
    t.className = 'dd-tap';
    const z = parseFloat(getComputedStyle(document.body).zoom) || 1;  // text size uses body zoom
    t.style.left = (e.clientX / z) + 'px';
    t.style.top = (e.clientY / z) + 'px';
    t.innerHTML = tapSvg();
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 600);
  }, { passive: true, capture: true });

  // ---------------------------------------------------------------- panel ---
  let saved = load();
  let draft = null;

  function themeCard([key, name, bg, panel, line, free, busy, text]){
    return `<button type="button" class="ap-card" data-theme-pick="${key}" aria-pressed="false">
      <div class="ap-prev" style="background:${bg}">
        <span class="ap-bar" style="background:${free}"></span>
        <span class="ap-tile" style="background:${panel};border-color:${line}"><i style="background:${text}"></i><b style="background:${free}"></b></span>
        <span class="ap-tile" style="background:${panel};border-color:${line}"><i style="background:${text}"></i><b style="background:${busy}"></b></span>
      </div><div class="ap-name">${name}<span class="ck">✓</span></div></button>`;
  }

  function buildPanel(){
    if (document.getElementById('appearanceModalBg')) return;
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'appearanceModalBg';
    bg.innerHTML = `
      <div class="modal ap-modal" role="dialog" aria-modal="true" aria-labelledby="apTitle">
        <div class="modal-head"><h3 id="apTitle">Appearance</h3><button class="modal-close" type="button" id="apClose" aria-label="Close">✕</button></div>
        <p class="section-sub">Changes how FreeBoard looks on this device only. Your friends keep their own look.</p>

        <div class="ap-label">Special edition</div>
        <button type="button" class="ap-special" data-theme-pick="doomsday" aria-pressed="false">
          <span class="ap-sp-art">${sigil(false)}</span>
          <span class="ap-sp-txt"><span class="ap-sp-tag">LIMITED</span><b>DOOMSDAY</b><small>Smoke and forged iron, with its own launch screen and tap effect.</small></span>
          <span class="ck">✓</span>
        </button>

        <div class="ap-label">Themes</div>
        <div class="ap-grid">
          ${THEMES.map(themeCard).join('')}
          <button type="button" class="ap-card" data-theme-pick="custom" aria-pressed="false">
            <div class="ap-prev ap-cprev" style="background:#14161f"><span style="background:#ff6b6b"></span><span style="background:#ffd166"></span><span style="background:#06d6a0"></span><span style="background:#118ab2"></span><span style="background:#8338ec"></span></div>
            <div class="ap-name">Custom…<span class="ck">✓</span></div>
          </button>
        </div>
        <div class="ap-custom-row" id="apCustomRow">
          <label>Background <input type="color" id="apCustomBg"></label>
          <label>Highlight <input type="color" id="apCustomHi"></label>
        </div>

        <div class="ap-label">Font</div>
        <div class="ap-fonts">${FONTS.map(([k, n, f]) => `<button type="button" class="ap-font" data-font-pick="${k}" aria-pressed="false"><span style="font-family:${f}">Aa</span><small>${n}</small></button>`).join('')}</div>

        <div class="ap-label">Text size</div>
        <div class="ap-seg" role="group" aria-label="Text size">
          <button type="button" data-size-pick="s" aria-pressed="false" aria-label="Smaller">A−</button>
          <button type="button" data-size-pick="m" aria-pressed="false" aria-label="Normal">A</button>
          <button type="button" data-size-pick="l" aria-pressed="false" aria-label="Larger">A+</button>
        </div>
        <p class="ap-note" id="apMotionNote" hidden>Your device is set to reduce motion, so the Doomsday launch screen and tap effect stay off.</p>

        <div class="modal-actions"><button class="btn ghost" type="button" id="apReset">Reset</button><button class="btn primary" type="button" id="apApply">Apply</button></div>
      </div>`;
    document.body.appendChild(bg);

    bg.addEventListener('click', (e) => {
      const th = e.target.closest('[data-theme-pick]');
      const fo = e.target.closest('[data-font-pick]');
      const sz = e.target.closest('[data-size-pick]');
      if (th) draft.theme = th.dataset.themePick;
      else if (fo) draft.font = fo.dataset.fontPick;
      else if (sz) draft.size = sz.dataset.sizePick;
      else if (e.target === bg) { close(); return; }
      else return;
      apply(draft); sync();
    });
    const cBg = document.getElementById('apCustomBg'), cHi = document.getElementById('apCustomHi');
    cBg.addEventListener('input', () => { draft.custom.bg = cBg.value; apply(draft); });
    cHi.addEventListener('input', () => { draft.custom.hi = cHi.value; apply(draft); });
    document.getElementById('apClose').onclick = close;
    document.getElementById('apReset').onclick = () => { draft = JSON.parse(JSON.stringify(DEFAULT)); apply(draft); sync(); };
    document.getElementById('apApply').onclick = () => {
      const was = saved.theme;
      saved = JSON.parse(JSON.stringify(draft));
      save(saved);
      draft = null;
      bg.classList.remove('show');
      // First time switching to Doomsday: play the launch screen once so it can be seen.
      if (saved.theme === 'doomsday' && was !== 'doomsday' && !reduceMotion()){
        root.setAttribute('data-splash', '');
        runSplash();
      }
    };
    // Closing any other way (✕, Escape, tapping outside) keeps the old look.
    new MutationObserver(() => { if (!bg.classList.contains('show') && draft){ draft = null; apply(saved); } })
      .observe(bg, { attributes: true, attributeFilter: ['class'] });
  }

  function sync(){
    const bg = document.getElementById('appearanceModalBg');
    bg.querySelectorAll('[data-theme-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.themePick === draft.theme)));
    bg.querySelectorAll('[data-font-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fontPick === draft.font)));
    bg.querySelectorAll('[data-size-pick]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sizePick === draft.size)));
    document.getElementById('apCustomRow').classList.toggle('show', draft.theme === 'custom');
    document.getElementById('apCustomBg').value = draft.custom.bg;
    document.getElementById('apCustomHi').value = draft.custom.hi;
    document.getElementById('apMotionNote').hidden = !(draft.theme === 'doomsday' && reduceMotion());
  }
  function open(){
    buildPanel();
    saved = load();
    draft = JSON.parse(JSON.stringify(saved));
    sync();
    ['rounded', 'serif', 'mono', 'cinzel'].forEach(loadFont);  // so the "Aa" previews show the real fonts
    document.getElementById('appearanceModalBg').classList.add('show');
    setTimeout(() => document.querySelector('#appearanceModalBg [aria-pressed="true"]')?.focus(), 30);
  }
  function close(){ document.getElementById('appearanceModalBg').classList.remove('show'); }

  function addButton(){
    const meBox = document.getElementById('meBox');
    if (!meBox || document.getElementById('appearanceBtn')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.id = 'appearanceBtn';
    b.className = 'palette-btn';
    b.title = 'Appearance';
    b.setAttribute('aria-label', 'Appearance: theme, font and text size');
    b.innerHTML = PALETTE_ICON;
    b.onclick = open;
    // Keep ⚙ and the palette side by side: app.js adds ⚙ just before #meBox a moment later.
    const tools = document.createElement('span');
    tools.className = 'hdr-tools';
    tools.appendChild(b);
    const header = meBox.parentElement;
    header.insertBefore(tools, meBox);
    const takeGear = () => {
      const g = document.getElementById('periodSettingsBtn');
      if (g && g.parentElement !== tools){ tools.insertBefore(g, b); return true; }
      return !!g;
    };
    if (!takeGear()){
      const mo = new MutationObserver(() => { if (takeGear()) mo.disconnect(); });
      mo.observe(header, { childList: true });
    }
  }

  function init(){
    apply(saved);
    decoratePage();
    addButton();
    runSplash();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
