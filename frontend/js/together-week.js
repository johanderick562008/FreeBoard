// Free Together — "Whole week at a glance" grid, shown under the classic list of slots
// when everyone is free. Each box = how many of the chosen people are free in that period
// (brighter = more). Tap a box to see who's free and who's in class.
let twData = null, twPicked = [], twSel = null, twReq = 0;

function twName(id){
  const p = board.find(x => x.id === id);
  return escName(p ? p.display_name : 'Someone');
}

async function renderTogetherWeek(picked){
  const el = document.getElementById('togetherWeek');
  if (!el) return;
  if (picked.length < 2 || !SLOTS.length){ el.innerHTML = ''; twData = null; return; }
  const req = ++twReq;                       // ignore slower, older responses
  let data;
  try { data = await Api.togetherWeek(picked, SLOTS.length); }
  catch(e){ if (req === twReq) el.innerHTML = ''; return; }
  if (req !== twReq) return;
  twData = data; twPicked = picked;
  if (twSel && !(twData[twSel.day] && twData[twSel.day][twSel.i])) twSel = null;
  drawTogetherWeek();
}

function twCellStyle(n, total){
  if (n === 0) return 'background:var(--panel-2);color:var(--mint)';
  if (n === total) return 'background:var(--free);color:#111';
  const pct = Math.round(25 + (n / total) * 60);          // 25%..85% of the highlight colour
  return `background:color-mix(in srgb,var(--free) ${pct}%,var(--panel-2));color:${n / total < .4 ? 'var(--paper)' : '#111'}`;
}

function drawTogetherWeek(){
  const el = document.getElementById('togetherWeek');
  if (!el || !twData) return;
  const total = twPicked.length;
  let grid = `<div class="tw-grid" style="grid-template-columns:40px repeat(${SLOTS.length},minmax(0,1fr))" role="grid" aria-label="Free people per period this week"><span></span>`;
  grid += SLOTS.map(s => `<span class="tw-h">${s.start || s.label}</span>`).join('');
  DAYS.forEach(day => {
    grid += `<span class="tw-d">${day.slice(0, 3)}</span>`;
    (twData[day] || []).forEach((cell, i) => {
      const n = cell.free.length;
      const sel = twSel && twSel.day === day && twSel.i === i;
      const label = `${day} ${SLOTS[i]?.label || ''}: ${n} of ${total} free`;
      grid += `<button type="button" class="tw-c${n === total ? ' all' : ''}${sel ? ' sel' : ''}" data-day="${day}" data-i="${i}"
                 style="${twCellStyle(n, total)}" aria-label="${label}" aria-pressed="${sel}">${n}</button>`;
    });
  });
  grid += '</div>';

  const legend = `<div class="tw-leg">0 free <i style="background:var(--panel-2);border:1px solid var(--line)"></i>
    <i style="${twCellStyle(Math.max(1, Math.round(total / 3)), total)}"></i><i style="${twCellStyle(Math.max(1, total - 1), total)}"></i>
    <i style="background:var(--free)"></i> all ${total} free</div>`;

  let detail = '<div class="tw-hint">Tap any number to see who’s free and who’s in class.</div>';
  if (twSel){
    const cell = twData[twSel.day][twSel.i];
    const free = cell.free.map(id => `<span class="chip free">${twName(id)}</span>`).join('');
    const busy = cell.busy.map(b => `<span class="chip">${twName(b.user_id)} — ${escName(b.label || 'Not set')}</span>`).join('');
    detail = `<div class="tw-detail" aria-live="polite">
      <div class="tw-dt"><b>${twSel.day} · ${SLOTS[twSel.i]?.label || ''}</b><span>${cell.free.length} of ${total} free</span></div>
      ${free ? `<div class="tw-lb">FREE</div><div class="tw-row">${free}</div>` : ''}
      ${busy ? `<div class="tw-lb">IN CLASS</div><div class="tw-row">${busy}</div>` : ''}
    </div>`;
  }

  el.innerHTML = `<div class="tw-wrap">
    <div class="tw-title"><h4>Whole week at a glance</h4><small>${total} people</small></div>
    <p class="tw-sub">Each number is how many of them are free. Tap one to see who.</p>
    ${grid}${legend}${detail}</div>`;

  el.querySelectorAll('.tw-c').forEach(b => b.onclick = () => {
    const day = b.dataset.day, i = parseInt(b.dataset.i);
    twSel = (twSel && twSel.day === day && twSel.i === i) ? null : { day, i };   // tap again to close
    drawTogetherWeek();
    if (twSel) el.querySelector('.tw-detail')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
