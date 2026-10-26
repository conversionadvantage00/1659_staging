/* 1659 Wine Time: the "What's your wine time?" section.

   ONE CLOCK RUNS EVERYTHING. S.T is the time of day in minutes (750 = 12:30). The clock digits, the slider knob, the
   sky, sun and moon, the bottle's light, which card is showing and the progress line under the card are all
   worked out from S.T and nothing else, so they cannot drift apart.

   - Play: the clock runs. Each card has a dwell time; the clock speeds up and slows down smoothly so it arrives at
     each card's time exactly when that card arrives (a monotone cubic through the card times).
   - At the end of the day the clock runs on through the night (moon sets, sun rises) and the day starts again at lunch.
   - Dragging the knob, clicking a time, or the back/forward buttons move S.T by hand. Hands-on use pauses play,
     except back, forward and the progress line, which keep playing.
   - A card is "showing" from its time until the next card's time. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stageEl = $('#winetime');
  if (!stageEl || !window.gsap) return;

  /* ---------- the wines ---------- */
  const M0 = 720, M_END = 1380, M_WRAP = 2160;          // 12:00, 23:00, and 12:00 the next day
  const WINES = [
    { m: 750, line: "The sun's out. So are we.", sub: "Lunch is over, the afternoon isn't.",
      name: 'Sauvignon Blanc', short: 'Sauvignon Blanc', strap: 'Break the pairing rules.', tint: ['#8a9356', '#2f3418'], img: 'assets/img/sauvignon.webp', glow: '#B9C77A',
      occTag: 'Lunch with the fun ones', pairTag: 'Pick one. Or both.',
      style: 'Medium-bodied and fruit-driven, 12.75% alc', notes: 'Tropical fruit with a hint of lime, zesty and lingering', pair: 'Shellfish, sushi, a fresh green salad', award: 'Double Gold, 91 pts. Just saying.',
      occImg: 'assets/img/occ-sauvignon.jpg', occPos: '50% 30%', occAlt: 'Friends raising glasses of white wine at an outdoor lunch under the trees.',
      pairImg: 'assets/img/pair-sauvignon.webp', pairL: 'rgb(50,47,34)', pairR: 'rgb(24,21,15)', pairAlt: 'This or that: sushi or shellfish. Both pair with 1659 Sauvignon Blanc.' },
    { m: 1019, line: 'Best enjoyed at golden hour.', sub: 'For those special golden moments with friends.',
      name: 'Natural Sweet Rosé', short: 'Sweet Rosé', strap: 'Where every sunset begins.', tint: ['#c98a90', '#4f2230'], img: 'assets/img/rose.webp', glow: '#D9A3A0',
      occTag: 'Sunset. Glasses up.', pairTag: "Pick one. We won't tell.",
      style: 'Fruit-driven and easy drinking, 10.28% alc', notes: 'Sweet strawberries and fresh raspberries, soft and sweet to finish', pair: "A light lunch, goat's cheese, grilled fish", award: 'Double Gold, 90 pts. Not bad for a pink.',
      occImg: 'assets/img/occ-rose.jpg', occPos: '50% 8%', occAlt: 'Friends toasting at sunset in a field of wildflowers, glasses raised.',
      pairImg: 'assets/img/pair-rose.webp', pairL: 'rgb(42,17,18)', pairR: 'rgb(24,21,15)', pairAlt: "This or that: grilled fish or goat's cheese. Both pair with 1659 Natural Sweet Rosé." },
    { m: 1140, line: 'We came to play. We stayed for the wine.', sub: "One more round. And we're not talking about the game.",
      name: 'Classic Red', short: 'Classic Red', strap: 'Stay for one more glass.', tint: ['#6e1224', '#190709'], img: 'assets/img/classic.webp', glow: '#8E0B25',
      occTag: 'Friendly game night (allegedly)', pairTag: 'Pick a side.',
      style: 'Medium-bodied and fruit-driven, 13.41% alc', notes: 'Deep, ripe dark fruit with spice and vanilla, violets and berries', pair: 'Filet mignon, and any dinner party', award: 'Double Gold, 94 pts. Top of the class.',
      occImg: 'assets/img/occ-classic.jpg', occPos: '50% 57%', occAlt: 'Friends laughing over a board game and red wine by lamplight.',
      pairImg: 'assets/img/pair-filet-shellfish.webp', pairL: 'rgb(39,16,17)', pairR: 'rgb(24,21,15)', pairAlt: 'This or that: filet mignon or shellfish. Both pair with 1659 Classic Red.' },
    { m: 1290, line: 'Made for dinner parties that run a little late.', sub: "Dinner ended an hour ago. Nobody's moved.",
      name: 'Sweet Red', short: 'Sweet Red', strap: 'Make the moment your own.', tint: ['#b3182f', '#2c070d'], img: 'assets/img/sweetred.webp', glow: '#BA0C2F',
      occTag: 'Blankets. Snacks. No plans.', pairTag: 'Tough call.',
      style: 'Medium-bodied and fruit-driven, 13.41% alc', notes: 'Violets and berries, fruit pastille, raspberry, plums, delicate spice', pair: 'Lamb chops, burgers, and any dinner party', award: '',
      occImg: 'assets/img/occ-couch.jpg', occPos: '50% 38%', occAlt: 'Friends relaxing under blankets on a couch late at night, wine on the coffee table.',
      pairImg: 'assets/img/pair-lamb-burgers.webp', pairL: 'rgb(39,16,17)', pairR: 'rgb(24,21,15)', pairAlt: 'This or that: lamb chops or burgers. Both pair with 1659 Sweet Red.' }
  ];
  // three cards per wine: the info post, the occasion photo, the pairing card
  const BEATS = [];
  WINES.forEach((w, i) => {
    const end = WINES[i + 1] ? WINES[i + 1].m : M_END, span = end - w.m;
    BEATS.push({ wine: i, type: 'info', m: w.m });
    BEATS.push({ wine: i, type: 'occ', m: Math.round(w.m + span / 3) });
    BEATS.push({ wine: i, type: 'pair', m: Math.round(w.m + span * 2 / 3) });
  });
  const NB = BEATS.length;

  /* ---------- the timeline: seconds -> time of day ---------- */
  const DWELL = BEATS.map(b => (b.type === 'info' ? 9 : 6.5));            // seconds each card stays up, at normal speed (the whole day takes about a minute and a half)
  const KNOT = [0]; DWELL.forEach(d => KNOT.push(KNOT[KNOT.length - 1] + d));
  const TOTAL = KNOT[NB];                                                 // seconds for the whole day
  const KNOT_T = BEATS.map(b => b.m).concat([M_END]);                     // the time of day at each knot
  const PRE = 1.6, NIGHT = 5.5;                                           // morning glide, and the run through the night (seconds)
  // monotone cubic (Fritsch-Carlson), so the clock never stalls or overshoots between cards
  const D = [], SL = [];
  for (let i = 0; i < NB; i++) D.push((KNOT_T[i + 1] - KNOT_T[i]) / (KNOT[i + 1] - KNOT[i]));
  SL.push(D[0]); for (let i = 1; i < NB; i++) SL.push(D[i - 1] * D[i] <= 0 ? 0 : 2 * D[i - 1] * D[i] / (D[i - 1] + D[i])); SL.push(D[NB - 1]);
  const dayT = u => {
    u = clamp(u, 0, TOTAL);
    let i = 0; while (i < NB - 1 && u > KNOT[i + 1]) i++;
    const h = KNOT[i + 1] - KNOT[i], t = (u - KNOT[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * KNOT_T[i] + (t3 - 2 * t2 + t) * h * SL[i] + (-2 * t3 + 3 * t2) * KNOT_T[i + 1] + (t3 - t2) * h * SL[i + 1];
  };
  const ease = t => t * t * (3 - 2 * t);
  const tauToT = tau => {
    if (tau < 0) return M0 + (KNOT_T[0] - M0) * ease(clamp((tau + PRE) / PRE));
    if (tau <= TOTAL) return dayT(tau);
    return M_END + (M_WRAP - M_END) * ease(clamp((tau - TOTAL) / NIGHT));
  };
  const tauOfT = T => {                                                   // the other way round, by bisection (it only ever rises)
    if (T >= M_END) return TOTAL;
    let lo = -PRE, hi = TOTAL;
    for (let k = 0; k < 28; k++) { const mid = (lo + hi) / 2; (tauToT(mid) < T) ? lo = mid : hi = mid; }
    return (lo + hi) / 2;
  };
  const beatAt = T => { let n = 0; for (let i = 0; i < NB; i++) if (BEATS[i].m <= T) n = i; return n; };   // the card showing at time T

  /* ---------- elements ---------- */
  const digitsEl = $('#wtDigits'), partEl = $('#wtPart'), track = $('#wtTrack'), fill = $('#wtFill'), knob = $('#wtKnob'), knobTime = $('#wtKnobTime'),
    stopsEl = $('#wtStops'), ticksEl = $('#wtTicks'), hint = $('#wtHint'), glowEl = $('#wtGlow'),
    bottle = $('#wtBottle'), bottleBox = $('#wtBottleBox'), rim = $('#wtRim'), card = $('#wtCard'), pairEl = $('#wtPair'), pairImg = $('#wtPairImg'),
    occEl = $('#wtOcc'), occImg = $('#wtOccImg'), facesEl = $('#wtFaces'), faces = [card, occEl, pairEl], playBtn = $('#wtPlay'),
    cta = $('#wtCta'), playMe = $('#wtPlayMe'), pBar = $('#wtPbar'), pFill = $('#wtPfill'), pKnob = $('#wtPknob'), pTicks = $('#wtPticks'), col = $('.wt__cardcol');

  /* ## reviewed (2026-10-22): desktop layout. "Play me" sits under the card player, the hint is centred under the bottle,
     the pairing dots are hidden by CSS. On phones everything goes back where it was. */
  const wide = matchMedia('(min-width: 900px)'), sliderEl = $('#wtSlider'), bottleCol = $('.wt__bottle');
  const playRow = document.createElement('div'); playRow.className = 'wt__playrow';
  const alignHint = () => {
    cta.style.transform = '';
    if (!wide.matches) return;
    const b = bottleCol.getBoundingClientRect(), r = sliderEl.getBoundingClientRect();
    cta.style.transform = `translateX(${Math.round((b.left + b.width / 2) - (r.left + r.width / 2))}px)`;
  };
  const placeCta = () => {
    if (wide.matches) { playRow.appendChild(playMe); col.appendChild(playRow); }
    else { cta.insertBefore(playMe, hint); }
    alignHint();
  };
  placeCta(); wide.addEventListener('change', placeCta); addEventListener('resize', alignHint);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignHint);

  /* ---------- clock digits: hours and tens of minutes roll, units just change ---------- */
  const fmt = T => { const m = Math.round(T) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
  const slots = [];
  digitsEl.innerHTML = '';
  ['', '', ':', '', ''].forEach((c, i) => {
    const el = document.createElement('span');
    if (c === ':') { el.className = 'wt__colon'; el.textContent = ':'; }
    else { el.className = 'wt__d'; el.innerHTML = '<span class="wt__din">0</span>'; slots.push(el); }
    digitsEl.appendChild(el);
  });
  const curDigits = ['', '', '', ''];
  function setDigits(str, dir, fast) {
    const d = str.replace(':', '');
    for (let i = 0; i < 4; i++) {
      if (curDigits[i] === d[i]) continue;
      const first = curDigits[i] === ''; curDigits[i] = d[i];
      const slot = slots[i], old = slot.lastElementChild;
      if (first || rm || i === 3 || (i === 2 && fast)) { old.textContent = d[i]; continue; }
      const nu = document.createElement('span'); nu.className = 'wt__din'; nu.textContent = d[i]; slot.appendChild(nu);
      gsap.fromTo(nu, { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });
      gsap.to(old, { yPercent: -100 * dir, opacity: 0, duration: 0.5, ease: 'power3.out', onComplete: () => old.remove() });
    }
  }
  // day-part label, cross-fading
  const partOf = Tm => { const m = Tm % 1440;
    return m >= 720 && m < 780 ? 'Technically still lunch' : m >= 780 && m < 960 ? 'The long afternoon' : m >= 960 && m < 1080 ? 'Golden hour, golden glass'
      : m >= 1080 && m < 1170 ? 'Dusk, the good bit' : m >= 1170 && m < 1260 ? 'Cards out, lights low' : m >= 1260 ? "Nobody's checking the time"
      : m < 330 ? 'Lights out. See you at sunrise.' : m < 480 ? 'Sunrise. Back to lunch plans.' : 'Morning. Nobody is thinking about wine yet.'; };
  let curPart = '';
  function setPart(txt) {
    if (txt === curPart) return; const first = !curPart; curPart = txt;
    if (first || rm) { partEl.textContent = txt; return; }
    gsap.killTweensOf(partEl);
    gsap.to(partEl, { opacity: 0, y: -8, duration: 0.18, ease: 'power2.in', onComplete() { partEl.textContent = txt; gsap.fromTo(partEl, { opacity: 0, y: 9 }, { opacity: 0.95, y: 0, duration: 0.5, ease: 'power3.out' }); } });
  }

  /* ---------- the Instagram post template (three posts share one header and one heart row) ---------- */
  const IC = {
    heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/></svg>',
    repost: '<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    share: '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
  };
  const setScale = () => { const w = card.offsetWidth, base = matchMedia('(min-width: 900px)').matches ? 391 : 340; if (w) col.style.setProperty('--s', (w / base).toFixed(3)); };
  setScale(); addEventListener('resize', setScale); if (document.fonts && document.fonts.ready) document.fonts.ready.then(setScale);

  let shown = card;
  function pulseHeart(btn, onFlip) {                      // contracts to a dot, flips colour, pulses back out with a ripple
    const svg = $('svg', btn);
    if (rm) { onFlip(); return; }
    gsap.killTweensOf(svg);
    const ring = document.createElement('span'); ring.className = 'pulse-ring'; btn.appendChild(ring);
    gsap.timeline()
      .to(svg, { scale: 0.14, duration: 0.15, ease: 'power2.in' })
      .add(onFlip)
      .fromTo(ring, { scale: 0.3, opacity: 0.6 }, { scale: 2.3, opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => ring.remove() }, '<')
      .to(svg, { scale: 1.3, duration: 0.2, ease: 'power2.out' }, '<')
      .to(svg, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
  }
  const pHeart = $('#wtPheart');
  const syncHeart = () => pHeart.classList.toggle('is-liked', shown.classList.contains('is-liked'));
  faces.forEach(f => {
    f.insertAdjacentHTML('afterbegin', '<div class="igp__head"><span class="igp__ring"><img src="assets/img/logo-white.png" alt=""></span><span class="igp__user">1659_wines</span><span class="igp__dots" aria-hidden="true"><i></i><i></i><i></i></span></div>');
    $('.igp__media', f).insertAdjacentHTML('afterend',
      '<div class="igp__actions"><button class="igp__heart" type="button" aria-label="Like">' + IC.heart + '</button><button type="button" aria-label="Comment" tabindex="-1">' + IC.comment +
      '</button><button type="button" aria-label="Repost" tabindex="-1">' + IC.repost + '</button><button type="button" aria-label="Share" tabindex="-1">' + IC.share +
      '</button><button class="sp" type="button" aria-label="Save" tabindex="-1">' + IC.save + '</button></div><p class="igp__likes">1,659 likes</p>');
    const heart = $('.igp__heart', f), likes = $('.igp__likes', f);
    f._like = on => {
      const flip = () => { f.classList.toggle('is-liked', on); likes.textContent = on ? '1,660 likes (one is you)' : '1,659 likes'; syncHeart(); };
      pulseHeart(heart, flip);
      if (f === shown) pulseHeart(pHeart, () => {});
    };
    heart.addEventListener('click', () => f._like(!f.classList.contains('is-liked')));
    $('.igp__media', f).addEventListener('dblclick', e => {              // double-tap the picture to like it
      if (!f.classList.contains('is-liked')) f._like(true); if (rm) return;
      const m = $('.igp__media', f), r = m.getBoundingClientRect(), s = document.createElement('span');
      s.innerHTML = '<svg class="igp__pop" viewBox="0 0 24 24"><path fill="#fff" d="M12 21s-7.5-4.6-9.6-9.3C.8 8.1 2.9 4.5 6.4 4.5c2 0 3.6 1 4.6 2.6l1 1.5 1-1.5c1-1.6 2.6-2.6 4.6-2.6 3.5 0 5.6 3.6 4 7.2C19.5 16.4 12 21 12 21z"/></svg>';
      const p = s.firstChild; p.style.left = (e.clientX - r.left) + 'px'; p.style.top = (e.clientY - r.top) + 'px'; m.appendChild(p);
      gsap.fromTo(p, { scale: 0, rotation: -12 }, { scale: 1.15, rotation: 0, duration: 0.35, ease: 'back.out(2.2)' });
      gsap.to(p, { y: -60, opacity: 0, duration: 0.6, delay: 0.55, ease: 'power2.in', onComplete: () => p.remove() });
    });
  });

  /* ---------- the track: hour ticks, one dot or label per card, and chapter ticks on the progress line ---------- */
  const tOf = m => (m - M0) / (M_END - M0);
  for (let h = 12; h <= 23; h++) { const i = document.createElement('i'); i.style.left = tOf(h * 60) * 100 + '%'; ticksEl.appendChild(i); }
  const stopBtns = BEATS.map((b, i) => {
    const w = WINES[b.wine], el = document.createElement('button');
    el.className = 'stop' + (b.type !== 'info' ? ' stop--pair' : ''); el.style.left = tOf(b.m) * 100 + '%';
    el.innerHTML = b.type === 'info' ? `<b>${fmt(b.m)}</b><small>${w.short}</small>` : `<b></b><small>${b.type === 'occ' ? 'Moment' : 'Pairing'}</small>`;
    el.setAttribute('aria-label', b.type === 'info' ? `${fmt(b.m)}, ${w.name}` : b.type === 'occ' ? `${w.name} occasion photo` : `${w.name} food pairing`);
    el.title = b.type === 'info' ? `${fmt(b.m)} ${w.name}` : b.type === 'occ' ? `${w.name}: the moment` : `${w.name}: the pairing`;
    el.addEventListener('click', () => goTo(i, 0.9, 'manual'));
    stopsEl.appendChild(el); return el;
  });
  for (let i = 1; i < NB; i++) { const t = document.createElement('i'); t.style.left = (KNOT[i] / TOTAL * 100) + '%'; if (i % 3 === 0) t.className = 'wine'; pTicks.appendChild(t); }
  const nearestBeat = T => { let n = 0, best = 1e9; BEATS.forEach((b, i) => { const d = Math.abs(b.m - T); if (d < best) { best = d; n = i; } }); return n; };

  /* ---------- state ---------- */
  const S = { T: BEATS[0].m, tau: 0 };
  let active = -1, swapping = 0, touched = false, bottleWine = -1, lastT = S.T;
  let playing = false, inView = false, hovering = false, dragging = false, glide = null, speed = 1, seeking = false;
  if (!rm) gsap.set(faces, { transformPerspective: 1200 });
  const night = () => S.tau > TOTAL;
  const canRun = () => playing && inView && !hovering && !dragging && !seeking && !document.hidden;

  /* ---------- render: everything below is a pure function of S.T ---------- */
  function render() {
    const T = S.T, Tk = clamp(T, M0, M_END), dir = T >= lastT ? 1 : -1, fast = !!glide || night() || dragging;
    lastT = T;
    const clock = fmt(T);
    setDigits(clock, dir, fast); setPart(partOf(Math.round(T)));
    knobTime.textContent = clock;
    const t = tOf(Tk); knob.style.left = t * 100 + '%'; fill.style.width = t * 100 + '%';
    knob.setAttribute('aria-valuenow', Math.round(Tk)); knob.setAttribute('aria-valuetext', clock);
    if (window.WineSky) WineSky.setTime(T);
    paintLight();
    const n = beatAt(T); if (n !== active) setBeat(n);
    drawProg();
  }
  function paintLight() {                               // the sky's light falls on the bottle and tints the track
    if (!window.WineSky) return;
    const L = WineSky.light();
    drawRim(L);
    bottleBox.style.setProperty('--bb', L.bright.toFixed(3)); bottleBox.style.setProperty('--bs', L.sat.toFixed(3));
    if (L.sun) stageEl.style.setProperty('--sun', L.sun);
  }
  function drawProg() {                                 // the progress line: where we are in the day
    const pos = S.T >= M_END ? 1 : clamp(S.tau, 0, TOTAL) / TOTAL;
    pFill.style.width = (pos * 100) + '%'; pKnob.style.left = (pos * 100) + '%';
    pBar.setAttribute('aria-valuenow', Math.max(0, active));
    syncHeart();
  }

  /* ---------- the cards ---------- */
  function fillCard(w) {
    $('#cWine').textContent = w.name; $('#cLine').textContent = w.line; $('#cStrap').textContent = w.strap; $('#cSub').textContent = w.sub;
    $('#cStyle').textContent = w.style; $('#cNotes').textContent = w.notes; $('#cPair').textContent = w.pair;
    $('#cAward').textContent = w.award; $('#cAwardRow').style.display = w.award ? '' : 'none';
    $('#cTile').style.setProperty('--a', w.tint[0]); $('#cTile').style.setProperty('--b', w.tint[1]);
  }
  // The rim light is painted on a small canvas and cut to the bottle's own outline (drawn this way because Chrome
  // blocks CSS image masks for pages opened straight from a file, and canvas drawing works everywhere).
  const rimCtx = rim.getContext('2d'), sil = document.createElement('canvas'), silCtx = sil.getContext('2d');
  let lastRim = null;
  function buildSil() {
    const w = Math.round(bottle.naturalWidth / 2), h = Math.round(bottle.naturalHeight / 2); if (!w || !h) return;
    rim.width = sil.width = w; rim.height = sil.height = h;
    silCtx.globalCompositeOperation = 'source-over'; silCtx.clearRect(0, 0, w, h); silCtx.drawImage(bottle, 0, 0, w, h);
    silCtx.globalCompositeOperation = 'source-in'; silCtx.fillStyle = '#fff'; silCtx.fillRect(0, 0, w, h);
    if (lastRim) drawRim(lastRim);
  }
  bottle.addEventListener('load', buildSil); if (bottle.complete && bottle.naturalWidth) buildSil();
  function drawRim(L) {
    lastRim = L; const w = rim.width, h = rim.height; if (!w || !sil.width) return;
    const c = (o, a) => `rgba(${Math.round(o.c[0])},${Math.round(o.c[1])},${Math.round(o.c[2])},${a})`;
    rimCtx.globalCompositeOperation = 'source-over'; rimCtx.clearRect(0, 0, w, h);
    const g = rimCtx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, c(L.rimL, L.rimL.a)); g.addColorStop(0.3, c(L.rimL, 0)); g.addColorStop(0.7, c(L.rimR, 0)); g.addColorStop(1, c(L.rimR, L.rimR.a));
    rimCtx.fillStyle = g; rimCtx.fillRect(0, 0, w, h);
    rimCtx.globalCompositeOperation = 'destination-in'; rimCtx.drawImage(sil, 0, 0); rimCtx.globalCompositeOperation = 'source-over';
  }
  const setBottle = w => { bottle.src = w.img; bottle.alt = `1659 ${w.name} bottle`; };
  const fillFace = (b, w) => {
    if (b.type === 'info') fillCard(w);
    else if (b.type === 'occ') { occImg.src = w.occImg; occImg.alt = w.occAlt; occImg.style.objectPosition = w.occPos; $('#wtOccTag').textContent = w.occTag; }
    else { pairImg.src = w.pairImg; pairImg.alt = w.pairAlt; pairImg.parentNode.style.setProperty('--pl', w.pairL); pairImg.parentNode.style.setProperty('--pr', w.pairR); $('#wtPairTag').textContent = w.pairTag; }
  };
  const faceOf = b => b.type === 'info' ? card : b.type === 'occ' ? occEl : pairEl;

  function setBeat(n) {
    const first = active < 0, dir = n > active ? 1 : -1;
    active = n;
    const b = BEATS[n], w = WINES[b.wine], id = ++swapping, face = faceOf(b);
    stopBtns.forEach((s, i) => s.classList.toggle('is-on', i === n));
    glowEl.style.setProperty('--wine', w.glow);
    if (first || rm) {
      fillFace(b, w); setBottle(w); bottleWine = b.wine;
      faces.forEach(f => gsap.set(f, { autoAlpha: f === face ? 1 : 0 }));
      shown = face; return;
    }
    if (bottleWine !== b.wine) {                        // the bottle changes only when the wine does; tracked by wine so a fast drag ends on the right one
      bottleWine = b.wine; const wi = b.wine;
      gsap.killTweensOf(bottleBox);
      gsap.to(bottleBox, { opacity: 0, y: 50 * dir, rotate: 6 * dir, duration: 0.25, ease: 'power2.in', onComplete() {
        if (bottleWine !== wi) return;
        setBottle(w);
        gsap.fromTo(bottleBox, { opacity: 0, y: -60 * dir, rotate: -6 * dir }, { opacity: 1, y: 0, rotate: 0, duration: 0.8, ease: 'back.out(1.4)' });
      } });
    }
    const out = shown;                                  // the card flips like a card turned over
    gsap.killTweensOf(faces);
    gsap.to(out, { rotationY: -78 * dir, opacity: 0, duration: 0.28, ease: 'power2.in', onComplete() {
      if (id !== swapping) return;
      gsap.set(out, { autoAlpha: 0 });
      fillFace(b, w);
      gsap.fromTo(face, { rotationY: 78 * dir, opacity: 0, autoAlpha: 1 }, { rotationY: 0, opacity: 1, autoAlpha: 1, duration: 0.7, ease: 'power3.out' });
      shown = face;
    } });
  }

  /* ---------- moving the clock ---------- */
  function updatePlayUI() {
    playBtn.classList.toggle('is-paused', !playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause the cards' : 'Play the cards');
    playBtn.setAttribute('aria-pressed', String(!playing));
    col.classList.toggle('is-playing', playing);
    cta.classList.toggle('is-playing', playing);                       // "Play me" shows whenever the day is paused
    playBtn.classList.toggle('is-nudge', !playing && !touched);        // and the play button pulses until someone has touched anything
  }
  function userPause() { playing = false; updatePlayUI(); }
  function hideHint() { touched = true; playBtn.classList.remove('is-nudge'); }
  // glide the clock to a card's time. 'manual' pauses play, 'seek' keeps it playing.
  function goTo(i, dur = 0.9, mode = 'manual') {
    touched = true; hideHint();
    if (mode === 'manual') userPause();
    if (glide) glide.kill();
    if (night()) { S.tau = tauOfT(BEATS[i].m); S.T = BEATS[i].m; glide = null; render(); return; }
    glide = gsap.to(S, { T: BEATS[i].m, duration: rm ? 0 : dur, ease: 'power3.inOut',
      onUpdate() { S.tau = tauOfT(S.T); render(); }, onComplete() { glide = null; S.tau = tauOfT(S.T); render(); } });
  }
  // play: advance the clock along the timeline
  gsap.ticker.add((time, dtms) => {
    if (!canRun() || glide) return;
    S.tau += Math.min(dtms, 100) / 1000 / speed;
    if (S.tau > TOTAL + NIGHT) S.tau = -PRE;            // a new day: it wakes up at noon and glides to lunch
    S.T = tauToT(S.tau); render();
  });

  // dragging the knob
  const tFromX = x => { const r = track.getBoundingClientRect(); return M0 + clamp((x - r.left) / r.width) * (M_END - M0); };
  track.addEventListener('pointerdown', e => {
    dragging = true; touched = true; hideHint(); userPause(); track.setPointerCapture(e.pointerId);
    if (glide) glide.kill(); glide = gsap.to(S, { T: tFromX(e.clientX), duration: rm ? 0 : 0.25, ease: 'power2.out', onUpdate() { S.tau = tauOfT(S.T); render(); }, onComplete() { glide = null; } });
  });
  track.addEventListener('pointermove', e => { if (dragging) { if (glide) { glide.kill(); glide = null; } S.T = tFromX(e.clientX); S.tau = tauOfT(S.T); render(); } });
  const release = () => { if (!dragging) return; dragging = false; goTo(nearestBeat(S.T), 0.7, 'manual'); };
  track.addEventListener('pointerup', release); track.addEventListener('pointercancel', release);
  knob.addEventListener('keydown', e => {
    const k = e.key; let n = active;
    if (k === 'ArrowRight' || k === 'ArrowUp') n = Math.min(NB - 1, active + 1);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') n = Math.max(0, active - 1);
    else if (k === 'Home') n = 0; else if (k === 'End') n = NB - 1; else return;
    e.preventDefault(); goTo(n, 0.8, 'manual');
  });

  // the player under the card
  const bump = btn => { if (!rm) gsap.fromTo($('svg', btn), { scale: 0.7 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' }); };
  const togglePlay = () => { playing = !playing; touched = true; updatePlayUI(); bump(playBtn); };
  playBtn.addEventListener('click', togglePlay);
  playMe.addEventListener('click', () => { playing = true; touched = true; updatePlayUI(); });
  $('#wtPrev').addEventListener('click', e => { bump(e.currentTarget); goTo((active - 1 + NB) % NB, 1.1, 'seek'); });
  $('#wtNext').addEventListener('click', e => { bump(e.currentTarget); goTo((active + 1) % NB, 1.1, 'seek'); });
  pHeart.addEventListener('click', () => shown._like && shown._like(!shown.classList.contains('is-liked')));
  // the progress line: click or drag to jump to a card; chapter ticks mark where each card starts (it keeps playing)
  let seekIdx = -1;
  const idxFromX = x => { const r = pBar.getBoundingClientRect(), tau = clamp((x - r.left) / r.width) * TOTAL; let n = 0; for (let i = 0; i < NB; i++) if (KNOT[i] <= tau) n = i; return n; };
  const seekTo = x => { const i = idxFromX(x); if (i !== seekIdx) { seekIdx = i; goTo(i, 0.9, 'seek'); } };
  pBar.addEventListener('pointerdown', e => { seeking = true; seekIdx = -1; pBar.setPointerCapture(e.pointerId); seekTo(e.clientX); });
  pBar.addEventListener('pointermove', e => { if (seeking) seekTo(e.clientX); });
  const endSeek = () => { seeking = false; };
  pBar.addEventListener('pointerup', endSeek); pBar.addEventListener('pointercancel', endSeek);
  pBar.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo((active + 1) % NB, 0.9, 'seek'); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo((active - 1 + NB) % NB, 0.9, 'seek'); }
  });
  // the speed menu (three dots)
  const menuBtn = $('#wtPmenu'), menuList = $('#wtPmenuList');
  const closeSpeed = () => { menuList.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', e => { e.stopPropagation(); const open = menuList.hidden; menuList.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open)); });
  $$('button', menuList).forEach(b => b.addEventListener('click', () => {
    speed = parseFloat(b.dataset.speed);
    $$('button', menuList).forEach(o => { o.classList.toggle('is-on', o === b); o.setAttribute('aria-checked', String(o === b)); });
    closeSpeed();
  }));
  document.addEventListener('click', e => { if (!menuList.hidden && !menuList.contains(e.target)) closeSpeed(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSpeed(); });

  // play only while the section is on screen, and wait while someone is reading a card
  if (!rm) {
    new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: 0.25 }).observe(stageEl);
    if (matchMedia('(hover: hover)').matches) {
      facesEl.addEventListener('pointerenter', () => { hovering = true; });
      facesEl.addEventListener('pointerleave', () => { hovering = false; });
    }
  }

  // the card under the pointer tilts toward it and lifts a little
  if (!rm) {
    gsap.matchMedia().add('(min-width: 900px) and (hover: hover)', () => {
      gsap.set(facesEl, { transformPerspective: 1100 });
      const rx = gsap.quickTo(facesEl, 'rotationX', { duration: 0.5, ease: 'power3.out' });
      const ry = gsap.quickTo(facesEl, 'rotationY', { duration: 0.5, ease: 'power3.out' });
      const offs = faces.map(f => {
        const move = e => { const r = f.getBoundingClientRect(), px = clamp((e.clientX - r.left) / r.width), py = clamp((e.clientY - r.top) / r.height); ry((px - 0.5) * 12); rx((0.5 - py) * 10); };
        const enter = () => gsap.to(facesEl, { scale: 1.025, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        const leave = () => { rx(0); ry(0); gsap.to(facesEl, { scale: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); };
        f.addEventListener('pointermove', move); f.addEventListener('pointerenter', enter); f.addEventListener('pointerleave', leave);
        return () => { f.removeEventListener('pointermove', move); f.removeEventListener('pointerenter', enter); f.removeEventListener('pointerleave', leave); };
      });
      return () => { offs.forEach(f => f()); gsap.set(facesEl, { clearProps: 'transform' }); };
    });
  }

  window.__wt = { S, TOTAL, NIGHT, PRE };               // handle for testing the loop

  /* ---------- go ---------- */
  if (window.WineSky) WineSky.init($('#wtScene'), stageEl, $('.wt__bottle'));
  updatePlayUI();
  render();
})();
