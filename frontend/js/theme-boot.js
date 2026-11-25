// Appearance boot — runs in <head> before the page is drawn, so a saved theme never
// "flashes" the default green first. Reads the choice saved by appearance.js.
(function(){
  var KEY = 'freeboard-appearance';
  var p = {};
  try { p = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch(e) {}
  var root = document.documentElement;
  var theme = p.theme || 'classic';
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-font', p.font || 'grotesk');
  root.setAttribute('data-size', p.size || 'm');

  if (theme === 'custom' && p.custom){
    root.style.setProperty('--c-bg', p.custom.bg);
    root.style.setProperty('--c-hi', p.custom.hi);
    if (p.custom.light) root.setAttribute('data-custom-light', '');
  }

  // Load only the web font the chosen look needs.
  var FONT_URL = {
    rounded: 'family=Nunito:wght@500;600;700;800',
    serif: 'family=Fraunces:opsz,wght@9..144,600;9..144,700',
    mono: 'family=JetBrains+Mono:wght@400;500;600;700'
  };
  var need = [];
  if (FONT_URL[p.font]) need.push(FONT_URL[p.font]);
  if (theme === 'doomsday') need.push('family=Cinzel:wght@600;700;900');
  if (need.length){
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + need.join('&') + '&display=swap';
    document.head.appendChild(l);
  }

  // Doomsday launch screen: once per visit (per browser tab), never with reduced motion.
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shown = false;
  try { shown = sessionStorage.getItem('freeboard-dd-splash') === '1'; } catch(e) {}
  if (theme === 'doomsday' && !reduce && !shown) root.setAttribute('data-splash', '');
})();
