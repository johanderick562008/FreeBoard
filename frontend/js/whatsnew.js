// "What's new" — the ⓘ button at the right end of the tab bar (visible on all four tabs).
// To announce a future update: add an entry at the TOP of UPDATES and change UPDATES_VERSION,
// so everyone sees the little dot again until they open it.
(function(){
  const UPDATES_VERSION = '2026-11-groups';
  const SEEN_KEY = 'freeboard-seen-updates';

  const UPDATES = [
    {
      tag: 'New', title: 'Groups — your own shortcuts',
      intro: 'Make groups like Hostellers, Class or Cricket team and see just those people. Only you can see your groups.',
      points: [
        ['Create', 'In <b>People</b>, tap <b>+ New group</b>, give it a name and tick people from your board. You can add yourself too.'],
        ['Live Now', 'Tap a group to see who in that group is free right now, and who is in class.'],
        ['Browse', 'Pick a day, a period and a group to see who in that group is free then.'],
        ['People', 'Tap a group to show only its people. Your own card always stays, so you can still edit your timetable.'],
        ['Free Together', 'Tap a group to tick all its members at once and see when the whole group is free together.'],
        ['Edit', 'Tap <b>✎</b> next to a group to rename it, add or remove people, or delete it. Deleting a group never removes anyone from your board.'],
      ],
    },
    {
      tag: 'New', title: 'Meet the developer',
      intro: 'Hover over (or tap) <b>Developed by @Johan_Derick</b> at the bottom-left corner to open the portfolio, GitHub and LinkedIn profiles.',
      points: [],
    },
  ];

  const seen = () => { try{ return localStorage.getItem(SEEN_KEY) === UPDATES_VERSION; }catch(e){ return true; } };
  const markSeen = () => { try{ localStorage.setItem(SEEN_KEY, UPDATES_VERSION); }catch(e){} };

  function build(){
    const nav = document.querySelector('nav.tabs');
    if (!nav || document.getElementById('whatsNewBtn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'whatsNewBtn';
    btn.className = 'whatsnew-btn' + (seen() ? '' : ' unseen');
    btn.title = "What's new";
    btn.setAttribute('aria-label', "What's new in FreeBoard");
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r="0.6" fill="currentColor"/></svg>`;
    // Sit at the right end of the tab bar, but outside <nav> so the tab-switching code
    // (which wires every button inside nav.tabs) never treats it as a tab.
    const row = document.createElement('div');
    row.className = 'tabs-row';
    nav.parentNode.insertBefore(row, nav);
    row.appendChild(nav);
    row.appendChild(btn);

    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.id = 'whatsNewModalBg';
    bg.innerHTML = `
      <div class="modal whatsnew-modal" role="dialog" aria-labelledby="whatsNewTitle">
        <div class="modal-head">
          <h3 id="whatsNewTitle">What's new in FreeBoard</h3>
          <button class="modal-close" type="button" id="whatsNewClose" aria-label="Close">✕</button>
        </div>
        <p class="section-sub">Latest updates — November 2026</p>
        ${UPDATES.map(u => `
          <section class="wn-item">
            <div class="wn-head"><span class="wn-tag">${u.tag}</span><h4>${u.title}</h4></div>
            <p class="wn-intro">${u.intro}</p>
            ${u.points.length ? `<dl class="wn-points">${u.points.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
          </section>`).join('')}
        <div class="modal-actions"><button class="btn primary" type="button" id="whatsNewOk">Got it</button></div>
      </div>`;
    document.body.appendChild(bg);

    const close = () => closeModalBg('whatsNewModalBg');
    btn.onclick = () => { openModalBg('whatsNewModalBg'); markSeen(); btn.classList.remove('unseen'); };
    document.getElementById('whatsNewClose').onclick = close;
    document.getElementById('whatsNewOk').onclick = close;
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
  }

  build();
})();
