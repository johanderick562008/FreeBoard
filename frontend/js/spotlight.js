// "New feature" pointers — a small bubble with an arrow that points at a new button.
// Each feature is shown on up to MAX_SHOWS app opens. It stops for good as soon as the
// person taps "Got it" or uses the feature. Only one bubble is shown at a time.
//
// TO ANNOUNCE A NEW FEATURE: add one line to the top of FEATURES below with a new id.
// Everyone (new and existing users) will see it; old ones they finished never come back.
(function(){
  const FEATURES = [
    { id: 'appearance-2026-11', target: '#appearanceBtn', title: 'Make it yours', text: 'New themes, fonts and the Doomsday Edition.' },
    { id: 'about-2026-11',      target: '.whatsnew-btn',  title: 'New here?',     text: 'Tap for the guide and what’s new.' },
  ];
  const MAX_SHOWS = 5;
  const KEY = 'freeboard-spotlight';

  const root = document.documentElement;
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} };
  const rec = (id) => (state[id] = state[id] || { shown: 0, done: false });

  let bubble = null, current = null, targetEl = null, countedThisLoad = new Set(), skippedThisLoad = new Set(), timer = 0;

  const pending = () => FEATURES.filter(f => !rec(f.id).done && !skippedThisLoad.has(f.id) && (rec(f.id).shown < MAX_SHOWS || countedThisLoad.has(f.id)));

  function visible(el){
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  }
  function pageIsReady(){
    if (root.hasAttribute('data-splash')) return false;                 // Doomsday launch screen playing
    if (document.querySelector('.modal-bg.show')) return false;          // a popup is open
    const tabs = document.querySelector('nav.tabs');
    if (!tabs || getComputedStyle(tabs).display === 'none') return false; // signup step / not logged in
    return true;
  }

  function finish(markDone){
    if (current && markDone){ rec(current.id).done = true; save(); }
    if (targetEl) targetEl.classList.remove('spot-target');
    if (bubble) bubble.remove();
    bubble = null; current = null; targetEl = null;
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    if (markDone) setTimeout(tryShow, 900);                               // then the next new feature, if any
  }

  function place(){
    if (!bubble || !targetEl) return;
    if (!visible(targetEl)){ bubble.style.visibility = 'hidden'; return; }
    bubble.style.visibility = '';
    const r = targetEl.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();
    const vw = document.documentElement.clientWidth, gap = 12, edge = 10;
    const below = r.bottom + gap + b.height < window.innerHeight - edge || r.top - gap - b.height < edge;
    const cx = r.left + r.width / 2;
    const left = Math.min(Math.max(cx - b.width / 2, edge), vw - b.width - edge);
    bubble.style.left = left + 'px';
    bubble.style.top = (below ? r.bottom + gap : r.top - gap - b.height) + 'px';
    bubble.classList.toggle('above', !below);
    bubble.style.setProperty('--arrow-x', Math.min(Math.max(cx - left, 18), b.width - 18) + 'px');
  }

  function show(f, el){
    current = f; targetEl = el;
    if (!countedThisLoad.has(f.id)){ countedThisLoad.add(f.id); rec(f.id).shown++; save(); }
    bubble = document.createElement('div');
    bubble.className = 'spot';
    bubble.setAttribute('role', 'status');
    bubble.innerHTML = `<span class="spot-new">NEW</span>
      <div class="spot-txt"><b></b><span></span></div>
      <button type="button" class="spot-ok">Got it</button>`;
    bubble.querySelector('b').textContent = f.title;
    bubble.querySelector('.spot-txt span').textContent = f.text;
    bubble.querySelector('.spot-ok').onclick = () => finish(true);
    // Appended to <html>, not <body>, so the text-size setting doesn't throw off the position.
    root.appendChild(bubble);
    el.classList.add('spot-target');
    place();
    requestAnimationFrame(() => bubble && bubble.classList.add('in'));
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
  }

  function tryShow(){
    if (bubble) return;
    if (!pageIsReady()) return;
    for (const f of pending()){
      const el = document.querySelector(f.target);
      if (visible(el)){ show(f, el); return; }
    }
  }

  // Using the feature counts as "got it".
  document.addEventListener('click', (e) => {
    for (const f of FEATURES){
      if (e.target.closest && e.target.closest(f.target)){
        if (!rec(f.id).done){ rec(f.id).done = true; save(); }
        if (current && current.id === f.id) finish(false);
      }
    }
  }, true);

  // Hide while any popup is open; it comes back when the popup closes.
  new MutationObserver((muts) => {
    if (muts.every(m => bubble && bubble.contains(m.target))) return;
    if (bubble && !pageIsReady()){
      if (targetEl) targetEl.classList.remove('spot-target');
      bubble.remove(); bubble = null; current = null; targetEl = null;
    } else if (!bubble){
      clearTimeout(timer); timer = setTimeout(tryShow, 700);
    }
  }).observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['class', 'data-splash', 'style'] });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && bubble){ skippedThisLoad.add(current.id); finish(false); } });

  // Wait a moment after the app loads, so the bubble doesn't appear before the page settles.
  function start(){ setTimeout(tryShow, 1200); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
