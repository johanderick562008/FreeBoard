// Copy a classmate's timetable.
// People in the same section share one timetable, so instead of filling every cell you can
// copy a friend's: pick them, preview their week, confirm. Their period times come too.
// Only people on your board can be copied, and they aren't told.
let copyCands = [], copyPick = null, copyQuery = '';
const COPY_COLORS = ['#ffd23f','#5fd6a8','#ff7a59','#a9c9ae','#c7a6ff','#7aa2ff','#ffb3c8','#f0c27a'];
const copyEsc = (t) => String(t ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const copyInitials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const copyAv = (p, size = 40) =>
  `<span class="cp-av" style="background:${COPY_COLORS[Math.abs(p.id) % COPY_COLORS.length]};width:${size}px;height:${size}px">${copyEsc(copyInitials(p.display_name))}</span>`;

// Called by app.js renderDetail() whenever your own timetable is shown.
function renderCopyEntry(filledCount){
  let banner = document.getElementById('copyBanner');
  const toolbar = document.getElementById('builderToolbar');
  if (!toolbar) return;
  if (!banner){
    banner = document.createElement('div');
    banner.id = 'copyBanner';
    toolbar.parentElement.insertBefore(banner, toolbar);
  }
  banner.hidden = false;
  if (filledCount === 0){
    banner.className = 'cp-banner';
    banner.innerHTML = `<span class="cp-ic" aria-hidden="true">⚡</span>
      <div class="cp-bt"><b>Same class as a friend?</b><small>Copy their timetable instead of filling every cell.</small></div>
      <button type="button" class="btn primary" id="copyOpenBtn">Copy</button>`;
  } else {
    banner.className = 'cp-link-row';
    banner.innerHTML = `<button type="button" class="cp-link" id="copyOpenBtn">⚡ Copy a friend’s timetable instead</button>`;
  }
  document.getElementById('copyOpenBtn').onclick = () => openCopyPicker(filledCount);
}
function hideCopyEntry(){ const b = document.getElementById('copyBanner'); if (b) b.hidden = true; }

function copyModal(){
  let bg = document.getElementById('copyModalBg');
  if (bg) return bg;
  bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'copyModalBg';
  bg.innerHTML = `<div class="modal cp-modal" role="dialog" aria-modal="true" aria-labelledby="copyTitle"><div id="copyBody"></div></div>`;
  document.body.appendChild(bg);
  bg.addEventListener('click', (e) => { if (e.target === bg) bg.classList.remove('show'); });
  return bg;
}

async function openCopyPicker(myFilled){
  const bg = copyModal();
  copyPick = null; copyQuery = '';
  document.getElementById('copyBody').innerHTML = `<div class="cp-loading">Loading your board…</div>`;
  bg.classList.add('show');
  try { copyCands = await Api.copyCandidates(); }
  catch(e){ document.getElementById('copyBody').innerHTML = `<p class="cp-err">${copyEsc(e.message)}</p>`; return; }
  drawPicker(myFilled);
}

function drawPicker(myFilled){
  const filled = Object.fromEntries(copyCands.map(c => [c.user_id, c.filled]));
  let people = board.filter(p => p.id !== me.id && p.id in filled);
  people.sort((a, b) => (filled[b.id] > 0) - (filled[a.id] > 0) || a.display_name.localeCompare(b.display_name));
  if (copyQuery) people = people.filter(p => (p.display_name + ' ' + p.username).toLowerCase().includes(copyQuery));

  const rows = people.map(p => {
    const n = filled[p.id], off = n === 0;
    return `<button type="button" class="cp-row ${copyPick === p.id ? 'on' : ''}" data-id="${p.id}" ${off ? 'disabled' : ''} aria-pressed="${copyPick === p.id}">
      ${copyAv(p)}<span class="cp-who"><b>${copyEsc(p.display_name)}</b><small>@${copyEsc(p.username)} · ${off ? 'nothing set yet' : `${n} period${n === 1 ? '' : 's'} set`}</small></span>
      <span class="cp-rad" aria-hidden="true"></span></button>`;
  }).join('');

  const none = copyCands.length === 0
    ? `<p class="cp-empty">No one on your board yet. Add a classmate in People first, then copy their timetable.</p>`
    : (!rows ? `<p class="cp-empty">No one matches that search.</p>` : '');

  document.getElementById('copyBody').innerHTML = `
    <div class="modal-head"><h3 id="copyTitle">Copy a timetable</h3><button class="modal-close" type="button" aria-label="Close">✕</button></div>
    <p class="section-sub">Pick a friend in the same class. Only people on your board are shown.</p>
    ${copyCands.length > 4 ? `<input class="search-box cp-search" id="copySearch" placeholder="Search" value="${copyEsc(copyQuery)}" autocomplete="off">` : ''}
    <div class="cp-list">${rows}${none}</div>
    <div class="modal-actions"><button type="button" class="btn ghost" id="copyCancel">Cancel</button>
      <button type="button" class="btn primary" id="copyNext" ${copyPick ? '' : 'disabled'}>Next</button></div>`;

  const body = document.getElementById('copyBody');
  body.querySelector('.modal-close').onclick = body.querySelector('#copyCancel').onclick =
    () => document.getElementById('copyModalBg').classList.remove('show');
  body.querySelectorAll('.cp-row:not([disabled])').forEach(r => r.onclick = () => { copyPick = parseInt(r.dataset.id); drawPicker(myFilled); });
  const s = body.querySelector('#copySearch');
  if (s){
    s.oninput = (e) => { copyQuery = e.target.value.trim().toLowerCase(); drawPicker(myFilled); };
    if (copyQuery){ s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }
  body.querySelector('#copyNext').onclick = () => drawPreview(copyPick, myFilled);
}

async function drawPreview(id, myFilled){
  const p = board.find(x => x.id === id);
  const body = document.getElementById('copyBody');
  body.innerHTML = `<div class="cp-loading">Loading ${copyEsc(p.display_name)}’s week…</div>`;
  let entries, slots;
  try {
    const [tt, pr] = await Promise.all([Api.getTimetable(id), Api.getPeriods(id)]);
    entries = tt; slots = (pr && Array.isArray(pr.slots) && pr.slots.length) ? pr.slots : SLOTS;
  } catch(e){ body.innerHTML = `<p class="cp-err">${copyEsc(e.message)}</p>`; return; }

  const map = {}; entries.forEach(e => { map[`${e.day}|${e.slot_index}`] = e; });
  const classes = entries.filter(e => !e.is_free).length, frees = entries.length - classes;
  let mini = `<div class="cp-mini" style="grid-template-columns:34px repeat(${slots.length},1fr)"><span></span>` +
    slots.map((s, i) => `<span class="cp-mh" title="${copyEsc(s.label)}">P${i + 1}</span>`).join('');
  DAYS.forEach(d => {
    mini += `<span class="cp-md">${d.slice(0, 3)}</span>` + slots.map((s, i) => {
      const e = map[`${d}|${i}`];
      return `<span class="${!e ? 'n' : e.is_free ? 'f' : 'b'}" title="${copyEsc(e ? e.label : 'Not set')}"></span>`;
    }).join('');
  });
  mini += '</div>';
  const first = p.display_name.replace(/\s*\(you\)$/, '').split(' ')[0];

  body.innerHTML = `
    <div class="cp-ph">${copyAv(p, 46)}<div><h3 id="copyTitle">Copy ${copyEsc(first)}’s timetable?</h3>
      <small>${classes} class${classes === 1 ? '' : 'es'} · ${frees} free period${frees === 1 ? '' : 's'} · ${slots.length} periods a day</small></div></div>
    ${mini}
    <div class="cp-legend"><i class="f"></i>Free <i class="b"></i>Class <i class="n"></i>Not set</div>
    <p class="cp-note">${myFilled > 0 ? '<b>This replaces your current timetable and period times.</b> ' : 'Their period times are copied too. '}You can change any class afterwards. ${copyEsc(first)} isn’t told.</p>
    <p class="cp-err" id="copyErr"></p>
    <div class="modal-actions"><button type="button" class="btn ghost" id="copyBack">Back</button>
      <button type="button" class="btn primary" id="copyGo">Copy timetable</button></div>`;

  document.getElementById('copyBack').onclick = () => drawPicker(myFilled);
  const go = document.getElementById('copyGo');
  go.onclick = async () => {
    go.disabled = true; go.textContent = 'Copying…';
    try {
      const res = await Api.copyTimetable(id);
      document.getElementById('copyModalBg').classList.remove('show');
      await loadMyPeriods();                          // my period times may have changed
      if (typeof renderBrowseSlotPills === 'function') renderBrowseSlotPills();
      selectedCells.clear();
      await renderDetail();
      loadLive(); loadBrowse(); renderTogetherResults();
      showToast(`Copied ${res.count} periods from ${first}`);
    } catch(e){
      document.getElementById('copyErr').textContent = e.message;
      go.disabled = false; go.textContent = 'Copy timetable';
    }
  };
}
