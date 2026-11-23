// Groups ("shortcuts") — private, named lists of people from your board, like Snapchat
// shortcuts / WhatsApp lists. Only you see your groups.
//
// • People tab: "+ New group" creates one; ✎ on a group edits it (rename, add/remove people, delete).
// • Live Now, Browse and People each show a row:  All · Hostellers · Cricket team · …
//   Picking a group shows only the people in it. The choice is shared by the three tabs
//   and remembered on this device.
//
// Loaded before app.js. app.js calls loadGroups() in boot() and uses groupFilterLive(),
// groupFilterBoard() and groupScopeText() when it renders.

let GROUPS = [];            // [{id, name, member_ids:[...]}]
let activeGroupId = null;   // null = All
const GROUP_KEY = 'freeboard-active-group';
const GROUP_NAME_MAX = 40;

function groupEsc(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function activeGroup(){ return GROUPS.find(g => g.id === activeGroupId) || null; }

// ---- used by app.js while rendering --------------------------------------
function groupFilterLive(data){              // {free:[], busy:[]} from /schedule/live
  const g = activeGroup();
  if (!g || !data) return data;
  const keep = p => g.member_ids.includes(p.user_id);
  return { free: data.free.filter(keep), busy: data.busy.filter(keep) };
}
function groupFilterBoard(list){             // board array (people grid) — "you" always stays
  const g = activeGroup();
  return g ? list.filter(p => (me && p.id === me.id) || g.member_ids.includes(p.id)) : list;
}
function groupScopeText(){                   // "on your board" / "in Hostellers"
  const g = activeGroup();
  return g ? `in ${groupEsc(g.name)}` : 'on your board';
}

// ---- loading + choosing ---------------------------------------------------
async function loadGroups(){
  try{
    GROUPS = (await Api.listGroups()) || [];
  }catch(e){
    console.error('Groups failed to load', e);
    GROUPS = [];
  }
  let saved = null;
  try{ saved = parseInt(localStorage.getItem(GROUP_KEY), 10); }catch(e){}
  activeGroupId = GROUPS.some(g => g.id === saved) ? saved : null;
  renderGroupBars();
}

function setActiveGroup(id){
  activeGroupId = id;
  try{
    if (id === null) localStorage.removeItem(GROUP_KEY); else localStorage.setItem(GROUP_KEY, String(id));
  }catch(e){}
  renderGroupBars();
  refreshGroupViews();
}

function refreshGroupViews(){
  try{ renderPeopleGrid(); }catch(e){}
  loadLive().catch(()=>{});
  loadBrowse().catch(()=>{});
}

// ---- the "All · group · group" rows ----------------------------------------
function renderGroupBars(){
  document.querySelectorAll('[data-group-bar]').forEach(bar => {
    const editable = bar.dataset.groupBar === 'edit';
    if (!GROUPS.length && !editable){ bar.hidden = true; bar.innerHTML = ''; return; }
    bar.hidden = false;
    const others = board.filter(p => me && p.id !== me.id).length;
    const chip = (id, name, count) => {
      const sel = id === activeGroupId;
      const edit = editable && id !== null
        ? `<button type="button" class="gchip-edit" data-edit-gid="${id}" title="Edit ${groupEsc(name)}" aria-label="Edit group ${groupEsc(name)}">✎</button>` : '';
      return `<span class="gchip ${sel ? 'sel' : ''}">
        <button type="button" class="gchip-main" data-gid="${id === null ? '' : id}" aria-pressed="${sel}">
          ${groupEsc(name)} <span class="gchip-n">${count}</span>
        </button>${edit}</span>`;
    };
    bar.innerHTML =
      `<span class="gbar-label">Show</span>` +
      chip(null, 'All', others) +
      GROUPS.map(g => chip(g.id, g.name, g.member_ids.length)).join('') +
      (editable ? `<button type="button" class="gchip-new" data-new-group>+ New group</button>` : '');

    bar.querySelectorAll('.gchip-main').forEach(b => b.onclick = () =>
      setActiveGroup(b.dataset.gid === '' ? null : parseInt(b.dataset.gid, 10)));
    bar.querySelectorAll('[data-edit-gid]').forEach(b => b.onclick = () =>
      openGroupModal(GROUPS.find(g => g.id === parseInt(b.dataset.editGid, 10))));
    bar.querySelector('[data-new-group]')?.addEventListener('click', () => openGroupModal(null));
  });

  const sub = document.getElementById('liveScopeText');
  if (sub){
    const g = activeGroup();
    sub.textContent = g ? `Among ${g.name} (${g.member_ids.length} ${g.member_ids.length === 1 ? 'person' : 'people'}).`
                        : "Among you and the people you've added.";
  }
}

// ---- create / edit modal ---------------------------------------------------
let editingGroup = null;     // null = creating
let groupPicked = new Set();
let deleteArmed = false;

function buildGroupModal(){
  if (document.getElementById('groupModalBg')) return;
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'groupModalBg';
  bg.innerHTML = `
    <div class="modal" role="dialog" aria-labelledby="groupModalTitle">
      <div class="modal-head">
        <h3 id="groupModalTitle">New group</h3>
        <button class="modal-close" id="groupCloseBtn" type="button" aria-label="Close">✕</button>
      </div>
      <p class="section-sub">Only you can see your groups. Use them to filter Live Now, Browse and People.</p>
      <label class="group-label" for="groupNameInput">Group name</label>
      <input class="search-box" id="groupNameInput" maxlength="${GROUP_NAME_MAX}" placeholder="e.g. Hostellers, Cricket team, Class">
      <div class="group-pick-head">
        <span class="group-label">People</span>
        <span class="group-count" id="groupPickCount">0 selected</span>
      </div>
      <input class="search-box group-filter" id="groupPeopleFilter" placeholder="Find someone…">
      <div class="who-select group-people" id="groupPeople"></div>
      <div class="modal-error" id="groupError"></div>
      <div class="modal-actions">
        <button class="btn danger" type="button" id="groupDeleteBtn">Delete group</button>
        <button class="btn ghost" type="button" id="groupCancelBtn">Cancel</button>
        <button class="btn primary" type="button" id="groupSaveBtn">Create group</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const close = () => closeModalBg('groupModalBg');
  document.getElementById('groupCloseBtn').onclick = close;
  document.getElementById('groupCancelBtn').onclick = close;
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.getElementById('groupSaveBtn').onclick = saveGroup;
  document.getElementById('groupDeleteBtn').onclick = deleteGroup;
  document.getElementById('groupNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveGroup(); });
  document.getElementById('groupPeopleFilter').addEventListener('input', renderGroupPeople);
}

function openGroupModal(group){
  buildGroupModal();
  editingGroup = group || null;
  deleteArmed = false;
  groupPicked = new Set(group ? group.member_ids : []);
  document.getElementById('groupModalTitle').textContent = group ? 'Edit group' : 'New group';
  document.getElementById('groupNameInput').value = group ? group.name : '';
  document.getElementById('groupPeopleFilter').value = '';
  document.getElementById('groupError').textContent = '';
  const del = document.getElementById('groupDeleteBtn');
  del.hidden = !group;
  del.textContent = 'Delete group';
  const save = document.getElementById('groupSaveBtn');
  save.textContent = group ? 'Save changes' : 'Create group';
  save.disabled = false;
  renderGroupPeople();
  openModalBg('groupModalBg');
}

function renderGroupPeople(){
  const el = document.getElementById('groupPeople');
  const people = board.filter(p => p.id !== me.id);
  const filterEl = document.getElementById('groupPeopleFilter');
  filterEl.hidden = people.length < 8;
  const q = filterEl.value.trim().toLowerCase();
  const shown = people.filter(p => !q || p.display_name.toLowerCase().includes(q) || (p.username || '').toLowerCase().includes(q));
  if (!people.length){
    el.innerHTML = '<div class="empty-note">Add people to your board first — then you can put them in groups.</div>';
  } else if (!shown.length){
    el.innerHTML = '<div class="empty-note">No one matches that.</div>';
  } else {
    el.innerHTML = shown.map(p => `
      <label class="who-chip ${groupPicked.has(p.id) ? 'on' : ''}">
        <input type="checkbox" data-id="${p.id}" ${groupPicked.has(p.id) ? 'checked' : ''}> ${groupEsc(p.display_name)}
      </label>`).join('');
    el.querySelectorAll('input').forEach(inp => inp.onchange = () => {
      const id = parseInt(inp.dataset.id, 10);
      if (inp.checked) groupPicked.add(id); else groupPicked.delete(id);
      inp.closest('.who-chip').classList.toggle('on', inp.checked);
      updateGroupCount();
    });
  }
  updateGroupCount();
}

function updateGroupCount(){
  const n = groupPicked.size;
  document.getElementById('groupPickCount').textContent = `${n} selected`;
}

async function saveGroup(){
  const err = document.getElementById('groupError');
  const save = document.getElementById('groupSaveBtn');
  const name = document.getElementById('groupNameInput').value.trim().replace(/\s+/g, ' ');
  err.textContent = '';
  if (!name){ err.textContent = 'Give the group a name.'; return; }
  const boardIds = new Set(board.map(p => p.id));
  const ids = [...groupPicked].filter(id => boardIds.has(id) && id !== me.id);
  if (!ids.length){ err.textContent = 'Pick at least one person.'; return; }
  const clash = GROUPS.find(g => g.name.toLowerCase() === name.toLowerCase() && (!editingGroup || g.id !== editingGroup.id));
  if (clash){ err.textContent = `You already have a group called "${clash.name}".`; return; }

  save.disabled = true; save.textContent = 'Saving…';
  try{
    if (editingGroup){
      const res = await Api.updateGroup(editingGroup.id, name, ids);
      GROUPS = GROUPS.map(g => g.id === res.id ? res : g);
      showToast('Group saved');
    } else {
      const res = await Api.createGroup(name, ids);
      GROUPS.push(res);
      showToast(`Group "${res.name}" created`);
    }
    closeModalBg('groupModalBg');
    renderGroupBars();
    refreshGroupViews();
  }catch(e){
    err.textContent = e.message;
  }finally{
    save.disabled = false;
    save.textContent = editingGroup ? 'Save changes' : 'Create group';
  }
}

async function deleteGroup(){
  if (!editingGroup) return;
  const del = document.getElementById('groupDeleteBtn');
  if (!deleteArmed){                       // first tap asks, second tap deletes
    deleteArmed = true;
    del.textContent = 'Tap again to delete';
    return;
  }
  del.disabled = true;
  try{
    await Api.deleteGroup(editingGroup.id);
    GROUPS = GROUPS.filter(g => g.id !== editingGroup.id);
    if (activeGroupId === editingGroup.id) activeGroupId = null;
    try{ if (activeGroupId === null) localStorage.removeItem(GROUP_KEY); }catch(e){}
    closeModalBg('groupModalBg');
    showToast('Group deleted — the people are still on your board');
    renderGroupBars();
    refreshGroupViews();
  }catch(e){
    document.getElementById('groupError').textContent = e.message;
  }finally{
    del.disabled = false;
  }
}
