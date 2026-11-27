// About FreeBoard — the ⓘ button at the right end of the tab bar (visible on all four tabs).
// Two tabs inside:
//   • "How to use FreeBoard" — the user guide, one short section per feature, each with a
//     small picture drawn with the app's own styles (made-up Marvel names, never real users).
//   • "What's new" — the latest updates.
// To announce a future update: add an entry at the TOP of UPDATES and change UPDATES_VERSION,
// so everyone sees the little dot on ⓘ again until they open "What's new".
(function(){
  const UPDATES_VERSION = '2026-11-copy';
  const SEEN_KEY = 'freeboard-seen-updates';

  // ------------------------------------------------------------ What's new ---
  const UPDATES = [
    {
      tag: 'New', title: 'Copy a classmate’s timetable',
      intro: 'Same section, same timetable. Copy a friend’s instead of filling every cell.',
      points: [
        ['How', 'Open <b>People</b>, tap your own name, then <b>Copy</b>. Pick a friend, check the preview, and confirm.'],
        ['After', 'Their classes and period times become yours. Change any cell like before. They aren’t told.'],
      ],
    },
    {
      tag: 'New', title: 'Free Together: whole week at a glance',
      intro: 'Under the usual list of times when everyone is free, there’s now a grid of the whole week.',
      points: [
        ['Numbers', 'Each box shows how many of the people you picked are free in that period. Brighter means more.'],
        ['Tap a box', 'See exactly who’s free and who’s in class, and which class.'],
      ],
    },
    {
      tag: 'New', title: 'Board counts',
      intro: 'Under your name you’ll now see two counts. Tap either one to see the list. <b>Only you can see them</b>, nobody else.',
      points: [
        ['On my board', 'People whose timetable you can see. Remove anyone from here.'],
        ['Can see mine', 'People who can see your timetable. Tap <b>Add back</b> to see theirs too, or <b>Remove</b> to stop them seeing yours. They aren’t told.'],
      ],
    },
    {
      tag: 'New', title: 'Appearance — themes, fonts and the Doomsday Edition',
      intro: 'Make FreeBoard look the way you like. Tap the <b>palette</b> button next to <b>⚙</b> at the top. Your look is only on your device, so your friends keep theirs.',
      points: [
        ['Doomsday', 'A special edition with drifting smoke, forged-iron cards, The Warden watching from the background, its own launch screen, and a spark effect every time you tap.'],
        ['Themes', 'Classic Green, Midnight, Daylight, Sakura Night and Terminal.'],
        ['Custom', 'Pick your own background and highlight colours.'],
        ['Font & size', 'Choose Grotesk, Rounded, Serif or Mono, and make text smaller or larger.'],
      ],
    },
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

  // ----------------------------------------------------------------- Guide ---
  // Each picture is a tiny, non-clickable copy of the real screen.
  const shot = (html) => `<div class="ab-shot" aria-hidden="true">${html}</div>`;
  const GUIDE = [
    {
      id: 'start', icon: '👋', title: 'Getting started',
      text: 'FreeBoard shows which of your friends are free right now — and when you’re all free together.',
      steps: [
        'Sign in with <b>Continue with Google</b>. No password needed.',
        'The first time, pick a <b>username</b> (letters, numbers and _). Friends find you by it.',
        'Set your timetable and add your friends — the next sections show how.',
      ],
    },
    {
      id: 'timings', icon: '⚙', title: 'Match your college timings',
      text: 'Every college has a different bell schedule. Set yours once so every period shows the right time.',
      steps: [
        'Tap <b>⚙</b> at the top of the page.',
        'Change any start or end time. Use <b>+ Add period</b> or <b>− Remove last period</b> if your day is longer or shorter (1–16 periods).',
        'Tap <b>Save</b>. <b>Reset to default</b> brings back the standard 8 periods.',
        'Your times are only for you — a friend at another college keeps theirs.',
      ],
      pic: shot(`
        <div class="ab-title">Period times</div>
        ${[['1','08:45','09:45'],['2','09:45','10:45'],['3','11:00','12:00']].map(([n,a,b]) =>
          `<div class="ab-row"><span class="ab-mono">Period ${n}</span><span class="ab-input">${a}</span><span>–</span><span class="ab-input">${b}</span></div>`).join('')}
        <div class="ab-btns"><span class="btn ghost">+ Add period</span><span class="btn primary">Save</span></div>`),
    },
    {
      id: 'timetable', icon: '📅', title: 'Set your timetable',
      text: 'Your timetable tells FreeBoard when you’re free. Fill it once a semester.',
      steps: [
        'Open <b>People</b> and tap <b>your own card</b> (it says “(you)”).',
        'Tap the cells you want to fill — you can select many at once.',
        'Type the subject (or professor) and tap <b>Apply to selected</b>. Subjects you used before are suggested as you type.',
        'Tap <b>Mark Free</b> for free periods, lunch or anything you skip. Empty cells count as <i>in class</i>, so mark your free ones.',
        '<b>Clear</b> un-selects cells. <b>Clear All</b> wipes your whole timetable (it asks first).',
      ],
      pic: shot(`
        <table class="tt ab-tt">
          <tr><th>Day</th><th>08:45</th><th>09:45</th><th>11:00</th></tr>
          <tr><td class="day">Monday</td><td class="cell busy">Physics</td><td class="cell free">Free</td><td class="cell busy sel-cell">Maths</td></tr>
          <tr><td class="day">Tuesday</td><td class="cell busy">C Lab</td><td class="cell busy">C Lab</td><td class="cell busy sel-cell">Maths</td></tr>
        </table>
        <div class="ab-btns"><span class="ab-input ab-wide">Maths</span><span class="btn primary">Apply to selected</span><span class="btn ghost">Mark Free</span></div>`),
    },
    {
      id: 'friends', icon: '🤝', title: 'Add friends',
      text: 'You only see people who accepted your request — and they only see you after accepting.',
      steps: [
        'In <b>People</b>, search a name or username and tap <b>Send request</b>.',
        'The button turns into <b>Requested</b> while you wait. Changed your mind? Tap <b>Requested</b> → <b>Yes, unsend</b>.',
        'When they accept, it shows <b>✓ Accepted</b> and they appear on your board.',
        'Requests sent to you show under <b>Requests waiting on you</b> — tap <b>Accept</b> or <b>Decline</b>.',
      ],
      pic: shot(`
        <div class="ab-search">Search by username or name…</div>
        <div class="ab-result"><span>Tony Stark <span class="ab-dim">@ironman</span></span><span class="btn ghost req-state accepted">✓ Accepted</span></div>
        <div class="ab-result"><span>Wanda Maximoff <span class="ab-dim">@scarletwitch</span></span><span class="btn ghost req-state">Requested</span></div>
        <div class="ab-result"><span>Thor Odinson <span class="ab-dim">@godofthunder</span></span><span class="btn primary">Send request</span></div>`),
    },
    {
      id: 'live', icon: '🔴', title: 'Live Now',
      text: 'Opens by default. Shows who on your board is free in the period running right now.',
      steps: [
        '<b>Free right now</b> lists who is free; <b>In class right now</b> shows who is busy and with what.',
        'The badge tells you the moment: <b>CLASSES ON</b>, <b>BREAK</b> between periods, or <b>WEEKEND</b>.',
        'On a Saturday it asks if it’s a <b>holiday</b> or a <b>working day</b> — and which weekday’s timetable it follows.',
        'It refreshes by itself every 20 seconds.',
      ],
      pic: shot(`
        <div class="ab-bar"><span class="badge">Classes on</span><span class="ab-mono">Monday · <b>11:00 – 12:00</b></span><span class="ab-count">2 / 4 free</span></div>
        <div class="ab-cards">
          <div class="flip"><div class="name">Tony</div><div class="tag">Free now</div></div>
          <div class="flip"><div class="name">Natasha</div><div class="tag">Free now</div></div>
        </div>
        <div class="ab-lbl">In class right now</div>
        <div class="chip-row"><span class="chip">Bruce — Physics Lab</span><span class="chip">Peter — Maths</span></div>`),
    },
    {
      id: 'browse', icon: '🗓', title: 'Browse',
      text: 'Like Live Now, but for any day and period — great for planning ahead.',
      steps: [
        'Pick a <b>day</b>, then a <b>period</b>.',
        'See who is <b>✓ Free</b> and who is <b>✕ In class</b> at that time.',
      ],
      pic: shot(`
        <div class="ab-pills"><span class="pill">Mon</span><span class="pill sel">Tue</span><span class="pill">Wed</span><span class="pill">Thu</span><span class="pill">Fri</span></div>
        <div class="ab-pills"><span class="pill slot">08:45 – 09:45</span><span class="pill slot sel">09:45 – 10:45</span><span class="pill slot">11:00 – 12:00</span></div>
        <div class="chip-row"><span class="chip free">Steve</span><span class="chip free">Shuri</span><span class="chip">Thor — Chemistry</span></div>`),
    },
    {
      id: 'people', icon: '👥', title: 'People',
      text: 'Everyone on your board, plus you.',
      steps: [
        'Tap someone’s card to see their whole week.',
        '<b>✎</b> gives them a nickname only you can see (e.g. “Cap” for Steve).',
        '<b>🗑</b> removes them from your board.',
        'Tap your own name at the top (<b>✎</b>) to change how your name shows to others.',
      ],
      pic: shot(`
        <div class="ab-cards ab-people">
          ${['Tony','Natasha','Cap','Peter'].map(n => `<div class="ab-person">${n}<span class="ab-tools">✎ 🗑</span></div>`).join('')}
          <div class="ab-person">Bruce (you)</div>
        </div>`),
    },
    {
      id: 'groups', icon: '🏷', title: 'Groups',
      text: 'Your own shortcuts — like Hostellers, Class or Cricket team. Only you can see them.',
      steps: [
        'In <b>People</b>, tap <b>+ New group</b>, name it and tick people (you can include yourself).',
        'Tap a group in <b>Live Now</b>, <b>Browse</b> or <b>People</b> to show only those people. <b>All</b> shows everyone again.',
        'In <b>Free Together</b>, tapping a group ticks all its members at once.',
        'Tap <b>✎</b> next to a group to rename it, add or remove people, or delete it.',
      ],
      pic: shot(`
        <div class="group-bar ab-groupbar">
          <span class="gbar-label">Show</span>
          <span class="gchip"><span class="gchip-main">All <span class="gchip-n">8</span></span></span>
          <span class="gchip sel"><span class="gchip-main">Avengers <span class="gchip-n">4</span></span><span class="gchip-edit">✎</span></span>
          <span class="gchip"><span class="gchip-main">Hostellers <span class="gchip-n">3</span></span><span class="gchip-edit">✎</span></span>
          <span class="gchip-new">+ New group</span>
        </div>`),
    },
    {
      id: 'together', icon: '💛', title: 'Free Together',
      text: 'Find a time when a whole group of you is free — for a meet-up, project or match.',
      steps: [
        'Tick 2 or more people, or tap a group, or use <b>Select All</b>.',
        'FreeBoard lists every period, day by day, when <i>all</i> of them are free.',
        '<b>Deselect</b> clears all the ticks.',
      ],
      pic: shot(`
        <div class="ab-pills">${['Tony','Natasha','Bruce'].map(n => `<span class="who-chip on">☑ ${n}</span>`).join('')}<span class="who-chip">☐ Thor</span></div>
        <div class="ab-lbl">Monday</div>
        <div><span class="slotcard">🕒 09:45 – 10:45</span><span class="slotcard">🕒 02:00 – 03:00</span></div>`),
    },
    {
      id: 'appearance', icon: '🎨', title: 'Change the look',
      text: 'Pick a theme, font and text size. It only changes FreeBoard on the device you’re using.',
      steps: [
        'Tap the <b>palette</b> button next to <b>⚙</b> at the top of the page.',
        'Tap a theme to preview it right away. <b>Doomsday</b> is the special edition, with its own launch screen and tap effect.',
        'Choose <b>Custom…</b> to pick your own background and highlight colours.',
        'Pick a font and text size, then tap <b>Apply</b>. <b>Reset</b> brings back Classic Green.',
      ],
    },
    {
      id: 'privacy', icon: '🔒', title: 'Privacy & account',
      text: '',
      steps: [
        'Only people you have <b>accepted</b> can see your timetable.',
        'Nicknames and groups are private — only you see them.',
        '<b>log out</b> is under your name at the top right.',
      ],
    },
    {
      id: 'dev', icon: '👨‍💻', title: 'Meet the developer',
      text: '',
      steps: [
        'Hover over (or tap) <b>Developed by @Johan_Derick</b> at the bottom-left to open the portfolio, GitHub and LinkedIn.',
      ],
    },
  ];

  const seen = () => { try{ return localStorage.getItem(SEEN_KEY) === UPDATES_VERSION; }catch(e){ return true; } };
  const markSeen = () => { try{ localStorage.setItem(SEEN_KEY, UPDATES_VERSION); }catch(e){} };

  function guideHtml(){
    return `
      <p class="ab-lead">Everything FreeBoard can do, in a few short steps. Tap a topic to jump to it.</p>
      <div class="ab-toc">${GUIDE.map(g => `<button type="button" data-jump="${g.id}">${g.icon} ${g.title}</button>`).join('')}</div>
      ${GUIDE.map(g => `
        <section class="ab-sec" id="ab-${g.id}">
          <h4><span class="ab-ic">${g.icon}</span>${g.title}</h4>
          ${g.text ? `<p class="ab-text">${g.text}</p>` : ''}
          ${g.pic || ''}
          <ol class="ab-steps">${g.steps.map(s => `<li>${s}</li>`).join('')}</ol>
        </section>`).join('')}`;
  }

  function updatesHtml(){
    return `
      <p class="ab-lead">Latest updates — November 2026</p>
      ${UPDATES.map(u => `
        <section class="wn-item">
          <div class="wn-head"><span class="wn-tag">${u.tag}</span><h4>${u.title}</h4></div>
          <p class="wn-intro">${u.intro}</p>
          ${u.points.length ? `<dl class="wn-points">${u.points.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
        </section>`).join('')}`;
  }

  function build(){
    const nav = document.querySelector('nav.tabs');
    if (!nav || document.getElementById('whatsNewBtn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'whatsNewBtn';
    btn.className = 'whatsnew-btn' + (seen() ? '' : ' unseen');
    btn.title = 'About FreeBoard — how to use it & what’s new';
    btn.setAttribute('aria-label', 'About FreeBoard');
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
      <div class="modal about-modal" role="dialog" aria-labelledby="aboutTitle">
        <div class="modal-head">
          <h3 id="aboutTitle">About FreeBoard</h3>
          <button class="modal-close" type="button" id="whatsNewClose" aria-label="Close">✕</button>
        </div>
        <div class="ab-tabs" role="tablist">
          <button type="button" role="tab" class="ab-tab active" data-abtab="guide" aria-selected="true">📖 How to use FreeBoard</button>
          <button type="button" role="tab" class="ab-tab ${seen() ? '' : 'unseen'}" data-abtab="new" aria-selected="false">✨ What's new</button>
        </div>
        <div class="ab-body" id="aboutBody"></div>
        <div class="modal-actions"><button class="btn primary" type="button" id="whatsNewOk">Got it</button></div>
      </div>`;
    document.body.appendChild(bg);

    const body = document.getElementById('aboutBody');
    const show = (tab) => {
      bg.querySelectorAll('.ab-tab').forEach(t => {
        const on = t.dataset.abtab === tab;
        t.classList.toggle('active', on);
        t.setAttribute('aria-selected', String(on));
      });
      body.innerHTML = tab === 'guide' ? guideHtml() : updatesHtml();
      body.scrollTop = 0;
      bg.querySelector('.about-modal').scrollTop = 0;
      if (tab === 'new'){
        markSeen();
        btn.classList.remove('unseen');
        bg.querySelector('[data-abtab="new"]').classList.remove('unseen');
      }
      body.querySelectorAll('[data-jump]').forEach(j => j.onclick = () =>
        document.getElementById('ab-' + j.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    bg.querySelectorAll('.ab-tab').forEach(t => t.onclick = () => show(t.dataset.abtab));

    const close = () => closeModalBg('whatsNewModalBg');
    // Unseen updates? open on "What's new"; otherwise on the guide.
    btn.onclick = () => { show(seen() ? 'guide' : 'new'); openModalBg('whatsNewModalBg'); };
    document.getElementById('whatsNewClose').onclick = close;
    document.getElementById('whatsNewOk').onclick = close;
    bg.addEventListener('click', e => { if (e.target === bg) close(); });
  }

  build();
})();
