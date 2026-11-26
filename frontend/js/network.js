// Board counts — like Instagram following / followers, but private to you.
//   On my board  = people whose timetable you can see
//   Can see mine = people who can see your timetable
// Counts sit under your name; tapping one opens the list. Nobody else can see your lists
// (the backend only ever returns the signed-in person's own lists).
let NETWORK = { on_board: [], can_see_mine: [] };
let netTab = 'board', netQuery = '';
const NET_COLORS = ['#ffd23f','#5fd6a8','#ff7a59','#a9c9ae','#c7a6ff','#7aa2ff','#ffb3c8','#f0c27a'];
const NET_LOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

const netEsc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const netInitials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const netColor = (id) => NET_COLORS[Math.abs(Number(id) || 0) % NET_COLORS.length];

async function loadNetwork(){
  try {
    NETWORK = await Api.myNetwork();
  } catch(e) { return; }
  renderNetStats();
  if (document.getElementById('networkModalBg')?.classList.contains('show')) renderNetList();
}

function renderNetStats(){
  const el = document.getElementById('netStats');
  if (!el) return;
  el.innerHTML = `
    <div class="net-stats">
      <button type="button" class="net-stat" data-net="board"><b>${NETWORK.on_board.length}</b><span>On my board</span></button>
      <button type="button" class="net-stat" data-net="seeme"><b>${NETWORK.can_see_mine.length}</b><span>Can see mine</span></button>
    </div>
    <div class="net-lock">${NET_LOCK} Only you can see these</div>`;
  el.querySelectorAll('[data-net]').forEach(b => b.onclick = () => openNetwork(b.dataset.net));
}

function buildNetModal(){
  if (document.getElementById('networkModalBg')) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'networkModalBg';
  bg.innerHTML = `
    <div class="modal net-modal" role="dialog" aria-modal="true" aria-labelledby="netTitle">
      <div class="net-head"><h3 id="netTitle"></h3><button class="modal-close" type="button" aria-label="Close">✕</button></div>
      <div class="net-tabs" role="tablist">
        <button type="button" role="tab" data-tab="board"></button>
        <button type="button" role="tab" data-tab="seeme"></button>
      </div>
      <input class="search-box net-search" id="netSearch" placeholder="Search" autocomplete="off">
      <div class="net-privacy">${NET_LOCK}<span>Private. Only you can see these lists and counts. Nobody else, not even people on them.</span></div>
      <div class="net-list" id="netList"></div>
    </div>`;
  document.body.appendChild(bg);
  const close = () => bg.classList.remove('show');
  bg.querySelector('.modal-close').onclick = close;
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  bg.querySelectorAll('.net-tabs button').forEach(b => b.onclick = () => { netTab = b.dataset.tab; renderNetList(); });
  document.getElementById('netSearch').oninput = (e) => { netQuery = e.target.value.trim().toLowerCase(); renderNetList(); };
}

function openNetwork(tab){
  buildNetModal();
  netTab = tab; netQuery = '';
  document.getElementById('netSearch').value = '';
  renderNetList();
  document.getElementById('networkModalBg').classList.add('show');
  loadNetwork();   // refresh in the background so the list is current
}

function renderNetList(){
  const bg = document.getElementById('networkModalBg');
  if (!bg) return;
  document.getElementById('netTitle').textContent = me.display_name;
  const [tb, ts] = bg.querySelectorAll('.net-tabs button');
  tb.innerHTML = `<b>${NETWORK.on_board.length}</b> On my board`;
  ts.innerHTML = `<b>${NETWORK.can_see_mine.length}</b> Can see mine`;
  tb.classList.toggle('on', netTab === 'board'); tb.setAttribute('aria-selected', netTab === 'board');
  ts.classList.toggle('on', netTab === 'seeme'); ts.setAttribute('aria-selected', netTab === 'seeme');

  let rows = netTab === 'board' ? NETWORK.on_board : NETWORK.can_see_mine;
  if (netQuery) rows = rows.filter(x =>
    [x.nickname, x.user.display_name, x.user.username].some(v => (v || '').toLowerCase().includes(netQuery)));

  const list = document.getElementById('netList');
  if (!rows.length){
    const empty = netQuery ? 'No one matches that search.'
      : netTab === 'board' ? 'No one here yet. Search a username in People to add someone.'
      : 'No one here yet. People who accept your timetable show up here.';
    list.innerHTML = `<div class="net-empty">${empty}</div>`;
    return;
  }
  list.innerHTML = rows.map(x => {
    const u = x.user, shown = x.nickname || u.display_name;
    const sub = x.nickname ? `@${netEsc(u.username)} · <i>${netEsc(u.display_name)}</i>` : `@${netEsc(u.username)}`;
    let action;
    if (netTab === 'board') action = `<button type="button" class="net-btn" data-remove-board="${u.id}">Remove</button>`;
    else {
      const add = x.my_request === 'none' ? `<button type="button" class="net-btn pri" data-addback="${u.id}">Add back</button>`
        : x.my_request === 'requested' ? `<button type="button" class="net-btn sent" disabled>Requested</button>` : '';
      action = `${add}<button type="button" class="net-btn ghost" data-remove-viewer="${u.id}" aria-label="Remove ${netEsc(u.display_name)}">Remove</button>`;
    }
    return `<div class="net-row">
      <span class="net-av" style="background:${netColor(u.id)}">${netEsc(netInitials(shown))}</span>
      <div class="net-who"><div class="n"><span>${netEsc(shown)}</span></div><div class="u">${sub}</div></div>
      <div class="net-acts">${action}</div>
    </div>`;
  }).join('');

  list.querySelectorAll('[data-addback]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await Api.addConnection(parseInt(b.dataset.addback)); showToast('Request sent'); }
    catch(e) { showToast(e.message); b.disabled = false; return; }
    loadNetwork();
  });
  list.querySelectorAll('[data-remove-viewer]').forEach(b => b.onclick = () =>
    netConfirm(rows.find(x => x.user.id === parseInt(b.dataset.removeViewer)), 'viewer'));
  list.querySelectorAll('[data-remove-board]').forEach(b => b.onclick = () =>
    netConfirm(rows.find(x => x.user.id === parseInt(b.dataset.removeBoard)), 'board'));
}

function netConfirm(x, kind){
  if (!x) return;
  let bg = document.getElementById('netConfirmBg');
  if (!bg){
    bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'netConfirmBg';
    bg.style.zIndex = '120';
    bg.innerHTML = `<div class="modal net-confirm" role="alertdialog" aria-modal="true" aria-labelledby="netConfirmTitle">
      <span class="net-av"></span><h3 id="netConfirmTitle"></h3><p></p>
      <div class="acts"><button type="button" class="net-danger">Remove</button><button type="button" class="btn ghost">Cancel</button></div></div>`;
    document.body.appendChild(bg);
    bg.querySelector('.btn.ghost').onclick = () => bg.classList.remove('show');
    bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('show'); });
  }
  const u = x.user, first = (x.nickname || u.display_name).split(' ')[0];
  const av = bg.querySelector('.net-av');
  av.style.background = netColor(u.id); av.textContent = netInitials(x.nickname || u.display_name);
  bg.querySelector('h3').textContent = `Remove ${first}?`;
  bg.querySelector('p').textContent = kind === 'viewer'
    ? `${first} will no longer see your timetable. They won’t be told, and they can send you a new request later.`
    : `${first} will be removed from your board, and you’ll stop seeing their timetable. They won’t be told.`;
  const go = bg.querySelector('.net-danger');
  go.disabled = false;
  go.onclick = async () => {
    go.disabled = true;
    try {
      if (kind === 'viewer') await Api.removeViewer(u.id);
      else {
        await Api.removeConnection(u.id);
        if (typeof refreshBoard === 'function'){ await refreshBoard(); renderPeopleGrid(); loadLive(); loadBrowse(); renderTogetherSelect(); }
      }
      bg.classList.remove('show');
      showToast('Removed');
      loadNetwork();
    } catch(e) { showToast(e.message); go.disabled = false; }
  };
  bg.classList.add('show');
}
