const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
const SLOTS = [
  {label:'08:45 – 09:45', start:'08:45', end:'09:45'},
  {label:'09:45 – 10:45', start:'09:45', end:'10:45'},
  {label:'11:00 – 12:00', start:'11:00', end:'12:00'},
  {label:'12:00 – 01:00', start:'12:00', end:'13:00'},
  {label:'01:00 – 02:00', start:'13:00', end:'14:00'},
  {label:'02:00 – 03:00', start:'14:00', end:'15:00'},
  {label:'03:15 – 04:15', start:'15:15', end:'16:15'},
  {label:'04:15 – 05:15', start:'16:15', end:'17:15'},
];

let me = null;
let board = [];          // my connections + me
let selectedDay = null, selectedSlot = null, selectedPersonId = null;
let togetherPicked = new Set();

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>t.classList.remove('show'), 1800);
}

function currentSlotIndex(now){
  const mins = now.getHours()*60 + now.getMinutes();
  for (let i=0;i<SLOTS.length;i++){
    const [sh,sm]=SLOTS[i].start.split(':').map(Number), [eh,em]=SLOTS[i].end.split(':').map(Number);
    if (mins >= sh*60+sm && mins < eh*60+em) return i;
  }
  return -1;
}

/* ---------------- boot ---------------- */
async function boot(){
  try{ me = await Api.me(); }catch(e){ window.location.href = 'index.html'; return; }
  if (!me) return;

  renderMeBox();
  if (new URLSearchParams(location.search).get('setup') || /^user[0-9a-f]{8}$/.test(me.username)){
    document.getElementById('usernameModalBg').classList.add('show');
  }

  try{
    await refreshBoard();
  }catch(e){
    console.error('refreshBoard failed — is the backend running the latest schema/migration?', e);
    board = [{ id: me.id, username: me.username, display_name: me.display_name + ' (you)' }];
    showToast("Couldn't load your board — check the backend console");
  }

  tickClock(); setInterval(tickClock, 1000);
  setInterval(loadLive, 20000);

  wireTabs(); wirePeople(); wireBuilderToolbar(); wireUsernameModal();
  wireNameModal(); wireNicknameModal(); wireRemoveModal();

  const now = new Date();
  const todayName = now.toLocaleDateString('en-US',{weekday:'long'});
  selectedDay = DAYS.includes(todayName) ? todayName : 'Monday';
  const idx = currentSlotIndex(now);
  selectedSlot = idx !== -1 ? idx : 0;

  try{ renderBrowseDayPills(); renderBrowseSlotPills(); await loadBrowse(); }
  catch(e){ console.error('Browse failed to load', e); }

  try{ renderPeopleGrid(); }
  catch(e){ console.error('People grid failed to render', e); }

  try{ renderTogetherSelect(); await renderTogetherResults(); }
  catch(e){ console.error('Together tab failed to load', e); }

  try{ await loadLive(); }
  catch(e){ console.error('Live tab failed to load', e); }
}

function renderMeBox(){
  document.getElementById('meBox').innerHTML = `
    ${me.avatar_url ? `<img src="${me.avatar_url}" alt="">` : ''}
    <div>
      <div class="name">
        <span id="myNameText">${me.display_name}</span>
        <button class="name-edit-btn" id="editMyNameBtn" title="Edit your name">✎</button>
      </div>
      <a href="#" class="logout" id="logoutLink">@${me.username} · log out</a>
    </div>`;
  document.getElementById('logoutLink').onclick = async (e)=>{
    e.preventDefault(); await Api.logout(); window.location.href='index.html';
  };
  document.getElementById('editMyNameBtn').onclick = ()=> openEditNameModal();
}

/* ---------------- custom modals (replace browser prompt()) ---------------- */
const ENTER_SUBMIT_MODALS = ['editNameModalBg', 'editNicknameModalBg'];

function openModalBg(id){
  const bg = document.getElementById(id);
  bg.classList.add('show');
  const input = bg.querySelector('input');
  if (input) setTimeout(()=>{ input.focus(); input.select(); }, 30);
}
function closeModalBg(id){
  document.getElementById(id).classList.remove('show');
}
document.addEventListener('keydown', (e)=>{
  const openBg = document.querySelector('.modal-bg.show');
  if (!openBg) return;
  if (e.key === 'Escape') openBg.classList.remove('show');
  if (e.key === 'Enter' && ENTER_SUBMIT_MODALS.includes(openBg.id)){
    const primaryBtn = openBg.querySelector('.btn.primary');
    if (primaryBtn && document.activeElement && document.activeElement.tagName === 'INPUT') primaryBtn.click();
  }
});

function openEditNameModal(){
  document.getElementById('editNameInput').value = me.display_name;
  document.getElementById('editNameError').textContent = '';
  openModalBg('editNameModalBg');
}

function wireNameModal(){
  const bg = document.getElementById('editNameModalBg');
  const saveBtn = document.getElementById('editNameSaveBtn');
  const cancel = ()=> closeModalBg('editNameModalBg');
  document.getElementById('editNameCancelBtn').onclick = cancel;
  document.getElementById('editNameCloseBtn').onclick = cancel;
  bg.addEventListener('click', (e)=>{ if (e.target === bg) cancel(); });

  saveBtn.onclick = async ()=>{
    const input = document.getElementById('editNameInput');
    const err = document.getElementById('editNameError');
    const next = input.value.trim();
    err.textContent = '';
    if (!next){ err.textContent = 'Name cannot be empty.'; return; }
    if (next === me.display_name){ cancel(); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try{
      me = await Api.updateMyName(next);
      renderMeBox();
      await refreshBoard();
      renderPeopleGrid(); loadLive(); loadBrowse(); renderTogetherSelect();
      cancel();
      showToast('Name updated');
    }catch(e){
      err.textContent = e.message;
    }finally{
      saveBtn.disabled = false; saveBtn.textContent = 'Save changes';
    }
  };
}

let nicknameTargetId = null;
function openNicknameModal(person){
  nicknameTargetId = person.id;
  document.getElementById('nicknameRealName').textContent = person.realName || person.display_name;
  document.getElementById('editNicknameInput').value = person.nickname || '';
  document.getElementById('editNicknameError').textContent = '';
  openModalBg('editNicknameModalBg');
}

function wireNicknameModal(){
  const bg = document.getElementById('editNicknameModalBg');
  const saveBtn = document.getElementById('editNicknameSaveBtn');
  const cancel = ()=> closeModalBg('editNicknameModalBg');
  document.getElementById('editNicknameCancelBtn').onclick = cancel;
  document.getElementById('editNicknameCloseBtn').onclick = cancel;
  bg.addEventListener('click', (e)=>{ if (e.target === bg) cancel(); });

  saveBtn.onclick = async ()=>{
    const input = document.getElementById('editNicknameInput');
    const err = document.getElementById('editNicknameError');
    const person = board.find(p=>p.id===nicknameTargetId);
    if (!person) return;
    const next = input.value.trim();
    err.textContent = '';
    saveBtn.disabled = true; saveBtn.textContent = 'Saving…';
    try{
      const res = await Api.setNickname(nicknameTargetId, next);
      person.nickname = res.nickname;
      person.display_name = res.nickname || person.realName;
      renderPeopleGrid(); loadLive(); loadBrowse(); renderTogetherSelect();
      cancel();
      showToast('Saved');
    }catch(e){
      err.textContent = e.message;
    }finally{
      saveBtn.disabled = false; saveBtn.textContent = 'Save changes';
    }
  };
}

let removeTargetId = null;
function openRemoveModal(person){
  removeTargetId = person.id;
  document.getElementById('removePersonText').textContent =
    `Are you sure you want to remove ${person.realName || person.display_name} from your People list? They will no longer appear in your People/Live/Browse/Together views.`;
  document.getElementById('removePersonError').textContent = '';
  openModalBg('removePersonModalBg');
}

function wireRemoveModal(){
  const bg = document.getElementById('removePersonModalBg');
  const confirmBtn = document.getElementById('removePersonConfirmBtn');
  const cancel = ()=> closeModalBg('removePersonModalBg');
  document.getElementById('removePersonCancelBtn').onclick = cancel;
  document.getElementById('removePersonCloseBtn').onclick = cancel;
  bg.addEventListener('click', (e)=>{ if (e.target === bg) cancel(); });

  confirmBtn.onclick = async ()=>{
    const err = document.getElementById('removePersonError');
    err.textContent = '';
    confirmBtn.disabled = true; confirmBtn.textContent = 'Removing…';
    try{
      await Api.removeConnection(removeTargetId);
      board = board.filter(p=>p.id !== removeTargetId);
      if (selectedPersonId === removeTargetId){
        selectedPersonId = null;
        document.getElementById('personDetail').classList.remove('show');
      }
      renderPeopleGrid(); loadLive(); loadBrowse(); renderTogetherSelect();
      cancel();
      showToast('Removed from People');
    }catch(e){
      err.textContent = e.message;
    }finally{
      confirmBtn.disabled = false; confirmBtn.textContent = 'Remove';
    }
  };
}

function tickClock(){
  const now = new Date();
  document.getElementById('clockLine').textContent =
    now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) + ' · ' +
    now.toLocaleDateString('en-IN',{weekday:'long', day:'numeric', month:'short'});
}

async function refreshBoard(){
  const connections = await Api.listConnections(); // [{id: connectionId, user:{...}, nickname}]
  board = connections.map(c => ({
    id: c.user.id,
    connectionId: c.id,
    username: c.user.username,
    display_name: c.nickname || c.user.display_name,
    realName: c.user.display_name,
    nickname: c.nickname,
  }));
  board.push({ id: me.id, username: me.username, display_name: me.display_name + ' (you)' });
}

/* ---------------- tabs ---------------- */
function wireTabs(){
  document.querySelectorAll('nav.tabs button').forEach(btn=>{
    btn.onclick = ()=>{
      document.querySelectorAll('nav.tabs button').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('panel-'+btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'people') loadIncomingRequests();
    };
  });
}

/* ---------------- LIVE ---------------- */
async function loadLive(){
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US',{weekday:'long'});
  const badge=document.getElementById('liveBadge'), slotLine=document.getElementById('liveSlotLine'),
        heading=document.getElementById('liveHeading'), boardEl=document.getElementById('liveBoard'),
        busyEl=document.getElementById('liveBusy'), countEl=document.getElementById('liveCount');

  if (!DAYS.includes(dayName)){
    badge.textContent='WEEKEND'; badge.classList.add('off');
    slotLine.textContent='No classes today'; heading.textContent="It's the weekend 🎉";
    boardEl.innerHTML=''; busyEl.innerHTML=''; countEl.textContent=''; return;
  }
  const idx = currentSlotIndex(now);
  if (idx === -1){
    badge.textContent='BREAK'; badge.classList.add('off');
    slotLine.textContent='Between periods'; heading.textContent='Break time ☕';
    boardEl.innerHTML=''; busyEl.innerHTML=''; countEl.textContent=''; return;
  }
  badge.textContent='CLASSES ON'; badge.classList.remove('off');
  slotLine.innerHTML = `${dayName} · <b>${SLOTS[idx].label}</b>`;

  const data = await Api.live(dayName, idx);
  countEl.textContent = `${data.free.length} / ${data.free.length + data.busy.length} free`;
  heading.textContent = data.free.length ? 'Free right now' : "Nobody's free this period";
  boardEl.innerHTML = data.free.length
    ? data.free.map((p,i)=>`<div class="flip" style="animation-delay:${i*45}ms"><div class="name">${p.display_name}</div><div class="tag">Free now</div></div>`).join('')
    : '<div class="empty-note">No one on your board is free this period.</div>';
  busyEl.innerHTML = data.busy.length
    ? data.busy.map(p=>`<span class="chip">${p.display_name} — ${p.label}</span>`).join('')
    : '<span class="chip free">Nobody — everyone free!</span>';
}

/* ---------------- BROWSE ---------------- */
function renderBrowseDayPills(){
  const el = document.getElementById('browseDays');
  el.innerHTML = DAYS.map(d=>`<button class="pill ${d===selectedDay?'sel':''}" data-day="${d}">${d}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ selectedDay=b.dataset.day; renderBrowseDayPills(); loadBrowse(); });
}
function renderBrowseSlotPills(){
  const el = document.getElementById('browseSlots');
  el.innerHTML = SLOTS.map((s,i)=>`<button class="pill slot ${i===selectedSlot?'sel':''}" data-i="${i}">${s.label}</button>`).join('');
  el.querySelectorAll('button').forEach(b=>b.onclick=()=>{ selectedSlot=parseInt(b.dataset.i); renderBrowseSlotPills(); loadBrowse(); });
}
async function loadBrowse(){
  const data = await Api.live(selectedDay, selectedSlot);
  document.getElementById('browseFree').innerHTML = data.free.length
    ? data.free.map(p=>`<span class="chip free">${p.display_name}</span>`).join('')
    : '<span class="chip">Nobody free</span>';
  document.getElementById('browseBusy').innerHTML = data.busy.length
    ? data.busy.map(p=>`<span class="chip">${p.display_name} — ${p.label}</span>`).join('')
    : '<span class="chip free">Nobody busy</span>';
}

/* ---------------- PEOPLE ---------------- */
function wirePeople(){
  const search = document.getElementById('userSearch');
  let debounce;
  search.addEventListener('input', ()=>{
    clearTimeout(debounce);
    debounce = setTimeout(async ()=>{
      const q = search.value.trim();
      const results = document.getElementById('searchResults');
      if (q.length < 2){ results.innerHTML=''; return; }
      const users = await Api.searchUsers(q);
      results.innerHTML = users.map(u=>`
        <div class="search-row">
          <span>${u.display_name} <span style="color:var(--mint)">@${u.username}</span></span>
          <button class="btn primary" data-id="${u.id}">Send request</button>
        </div>`).join('') || '<div class="empty-note">No matches.</div>';
      results.querySelectorAll('button[data-id]').forEach(btn=>{
        btn.onclick = async ()=>{
          const res = await Api.addConnection(parseInt(btn.dataset.id));
          if (res.status === 'accepted'){
            showToast('Already on your board');
          } else {
            btn.textContent = 'Requested'; btn.disabled = true;
            showToast('Request sent — they need to accept it');
          }
        };
      });
    }, 350);
  });
  loadIncomingRequests();
}

async function loadIncomingRequests(){
  const block = document.getElementById('requestsBlock');
  const list = document.getElementById('requestsList');
  const requests = await Api.incomingRequests();
  if (!requests.length){ block.style.display = 'none'; list.innerHTML=''; return; }
  block.style.display = '';
  list.innerHTML = requests.map(r=>`
    <div class="search-row">
      <span>${r.user.display_name} <span style="color:var(--mint)">@${r.user.username}</span> wants to add you</span>
      <span style="display:flex;gap:6px;">
        <button class="btn primary" data-accept="${r.request_id}">Accept</button>
        <button class="btn ghost" data-decline="${r.request_id}">Decline</button>
      </span>
    </div>`).join('');
  list.querySelectorAll('button[data-accept]').forEach(btn=>{
    btn.onclick = async ()=>{
      await Api.acceptRequest(parseInt(btn.dataset.accept));
      showToast('Request accepted');
      await loadIncomingRequests();
    };
  });
  list.querySelectorAll('button[data-decline]').forEach(btn=>{
    btn.onclick = async ()=>{
      await Api.declineRequest(parseInt(btn.dataset.decline));
      showToast('Request declined');
      await loadIncomingRequests();
    };
  });
}

function renderPeopleGrid(){
  const el = document.getElementById('peopleGrid');
  el.innerHTML = board.map(p=>`
    <div class="person-card-wrap">
      <button class="person-btn ${p.id===selectedPersonId?'sel':''}" data-id="${p.id}">${p.display_name}</button>
      ${p.id!==me.id ? `
        <div class="person-card-actions">
          <button data-rename="${p.id}" title="Rename for you only">✎</button>
          <button class="remove-btn" data-remove="${p.id}" title="Remove from People">🗑</button>
        </div>` : ''}
    </div>`).join('');
  el.querySelectorAll('button.person-btn').forEach(b=>b.onclick=async ()=>{
    selectedPersonId = parseInt(b.dataset.id);
    renderPeopleGrid();
    await renderDetail();
  });
  el.querySelectorAll('button[data-rename]').forEach(b=>b.onclick=(e)=>{
    e.stopPropagation();
    const person = board.find(p=>p.id===parseInt(b.dataset.rename));
    openNicknameModal(person);
  });
  el.querySelectorAll('button[data-remove]').forEach(b=>b.onclick=(e)=>{
    e.stopPropagation();
    const person = board.find(p=>p.id===parseInt(b.dataset.remove));
    openRemoveModal(person);
  });
}

let selectedCells = new Set(); // "day|slotIdx" keys, only used for my own timetable

async function renderDetail(){
  const wrap = document.getElementById('personDetail');
  if (!selectedPersonId){ wrap.classList.remove('show'); return; }
  wrap.classList.add('show');
  const person = board.find(p=>p.id===selectedPersonId);
  document.getElementById('detailName').textContent = person.display_name;

  const entries = await Api.getTimetable(selectedPersonId);
  const map = {};
  entries.forEach(e=>{ map[`${e.day}|${e.slot_index}`] = e; });
  const isMine = selectedPersonId === me.id;

  const toolbar = document.getElementById('builderToolbar');
  toolbar.style.display = isMine ? '' : 'none';

  if (isMine){
    // subject suggestions from what's already on the timetable, for the "or select" part
    const subjects = [...new Set(entries.map(e=>e.label).filter(l=>l && l!=='Free' && l!=='Not set'))];
    document.getElementById('subjectSuggestions').innerHTML = subjects.map(s=>`<option value="${s}">`).join('');
  }

  let thead = '<tr><th>Day</th>' + SLOTS.map(s=>`<th>${s.label}</th>`).join('') + '</tr>';
  let rows = DAYS.map(day=>{
    const cells = SLOTS.map((s,i)=>{
      const e = map[`${day}|${i}`];
      const label = e ? e.label : 'Not set';
      const isFree = e ? e.is_free : false;
      const cls = isFree ? 'free' : 'busy';
      const key = `${day}|${i}`;
      if (isMine){
        const sel = selectedCells.has(key) ? ' sel-cell' : '';
        return `<td class="cell ${cls}${sel}" data-day="${day}" data-idx="${i}" data-label="${label==='Not set'?'':label}">${label}</td>`;
      }
      return `<td class="cell ${cls}">${label}</td>`;
    }).join('');
    return `<tr><td class="day">${day}</td>${cells}</tr>`;
  }).join('');
  document.getElementById('detailTable').innerHTML = thead + rows;

  if (isMine) wireBuilderCells();
  updateSelectionCount();
}

function wireBuilderCells(){
  document.querySelectorAll('#detailTable td.cell[data-day]').forEach(td=>{
    td.onclick = ()=>{
      const key = `${td.dataset.day}|${td.dataset.idx}`;
      const turningOn = !selectedCells.has(key);
      if (turningOn){
        selectedCells.add(key);
        if (selectedCells.size === 1){
          document.getElementById('subjectInput').value = td.dataset.label || '';
        }
      } else {
        selectedCells.delete(key);
      }
      td.classList.toggle('sel-cell', turningOn);
      updateSelectionCount();
    };
  });
}

function updateSelectionCount(){
  const el = document.getElementById('selectionCount');
  if (!el) return;
  const n = selectedCells.size;
  el.textContent = n === 0 ? 'Tap cells to select' : `${n} slot${n>1?'s':''} selected`;
}

function wireBuilderToolbar(){
  const subjectInput = document.getElementById('subjectInput');

  const applySelection = async (forcedLabel)=>{
    if (selectedCells.size === 0){ showToast('Select at least one slot first'); return; }
    const label = (forcedLabel !== undefined ? forcedLabel : subjectInput.value.trim());
    const cells = [...selectedCells].map(key=>{
      const [day, slot_index] = key.split('|');
      return { day, slot_index: parseInt(slot_index), label };
    });
    document.getElementById('applyBtn').disabled = true;
    try{
      await Api.saveTimetable(cells);
      selectedCells.clear();
      subjectInput.value = '';
      showToast('Saved');
      await renderDetail();
      loadLive(); loadBrowse(); renderTogetherResults();
    }catch(e){
      showToast(e.message);
    }finally{
      document.getElementById('applyBtn').disabled = false;
    }
  };

  document.getElementById('applyBtn').onclick = ()=> applySelection();
  document.getElementById('markFreeBtn').onclick = ()=> applySelection('Free');
  document.getElementById('clearSelectionBtn').onclick = ()=>{
    selectedCells.clear();
    subjectInput.value = '';
    document.querySelectorAll('#detailTable td.cell.sel-cell').forEach(td=>td.classList.remove('sel-cell'));
    updateSelectionCount();
  };
  subjectInput.addEventListener('keydown', (e)=>{ if (e.key === 'Enter') applySelection(); });
}

/* ---------------- TOGETHER ---------------- */
function renderTogetherSelect(){
  const el = document.getElementById('togetherSelect');
  el.innerHTML = board.map(p=>`
    <label class="who-chip ${togetherPicked.has(p.id)?'on':''}">
      <input type="checkbox" data-id="${p.id}" ${togetherPicked.has(p.id)?'checked':''}> ${p.display_name}
    </label>`).join('');
  el.querySelectorAll('input').forEach(inp=>{
    inp.onchange = ()=>{
      const id = parseInt(inp.dataset.id);
      if (inp.checked) togetherPicked.add(id); else togetherPicked.delete(id);
      renderTogetherSelect(); renderTogetherResults();
    };
  });
}
async function renderTogetherResults(){
  const el = document.getElementById('togetherResults');
  const picked = Array.from(togetherPicked);
  if (picked.length < 2){ el.innerHTML = '<div class="empty-note">Pick at least 2 people above.</div>'; return; }
  const data = await Api.together(picked);
  let html='', any=false;
  DAYS.forEach(day=>{
    const idxs = data[day] || [];
    if (idxs.length){ any=true; html += `<div class="dayblock"><h4>${day}</h4>${idxs.map(i=>`<span class="slotcard">🕒 ${SLOTS[i].label}</span>`).join('')}</div>`; }
  });
  el.innerHTML = any ? html : '<div class="empty-note">No common free period this week.</div>';
}

/* ---------------- USERNAME SETUP ---------------- */
function wireUsernameModal(){
  document.getElementById('usernameSaveBtn').onclick = async ()=>{
    const val = document.getElementById('usernameInput').value.trim();
    const errEl = document.getElementById('usernameError');
    try{
      me = await Api.setUsername(val);
      document.getElementById('usernameModalBg').classList.remove('show');
      renderMeBox();
    }catch(e){ errEl.textContent = e.message; }
  };
}


boot();
