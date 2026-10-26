/* ## reviewed */
/* option C helpers (phone build only): wine name under the time, floating Play me / pause pill over the cards, nav hides on scroll down */
(() => {
  const root = document.documentElement, bottle = document.getElementById('wtBottle'), name = document.getElementById('wtWname');
  const slider = document.getElementById('wtSlider'), sec = document.getElementById('winetime');
  const playBtn = document.getElementById('wtPlay'), playMe = document.getElementById('wtPlayMe');
  if (!bottle || !name) return;
  const box = document.getElementById('wtBottleBox');
  // livelier bottle colour on phones: the night run no longer crushes the reds, and Sauvignon gets more saturation
  if (window.WineSky && WineSky.light) {
    const orig = WineSky.light.bind(WineSky), mq0 = matchMedia('(max-width:899px)');
    WineSky.light = () => { const L = orig(); if (!mq0.matches) return L;
      const sauv = /sauvignon/i.test(bottle.getAttribute('alt') || '');
      return Object.assign({}, L, { bright: 0.84 + 0.16 * L.amb, sat: (0.95 + 0.1 * L.amb) * (sauv ? 1.25 : 1) }); };
  }
  // "Slide me": letter shimmer; stop the wiggle once the slider has been touched
  const hint = document.getElementById('wtHint');
  /* phones say "Slide me" with shimmering letters; desktop says "Drag the slider" */
  const phone = matchMedia('(max-width:899px)');
  const setHint = () => { if (!hint) return; hint.innerHTML = phone.matches ? '<span class="hl">' + [...'Slide me'].map((ch, i) => ch === ' ' ? '<span class="sp"></span>' : `<span class="ltr" style="--i:${i}">${ch}</span>`).join('') + '</span>' : 'Drag the slider'; };
  setHint(); phone.addEventListener('change', setHint);
  const touched = () => root.classList.add('wt-touched');
  document.getElementById('wtTrack').addEventListener('pointerdown', touched, { once: true });
  document.getElementById('wtKnob').addEventListener('keydown', touched, { once: true });
  const setSauv = () => box.classList.toggle('is-sauv', /sauvignon/i.test(bottle.getAttribute('alt') || ''));
  const setName = () => { setSauv(); name.textContent = (bottle.getAttribute('alt') || '').replace(/^1659\s+/, '').replace(/\s+bottle$/i, ''); };
  setName(); new MutationObserver(setName).observe(bottle, { attributes: true, attributeFilter: ['alt'] });

  // floating pill: clone of the Play me button, label and icon follow the real play state
  const fp = playMe.cloneNode(true); fp.id = 'wtFloatPlay'; fp.classList.add('wt__fplay'); fp.removeAttribute('aria-label');
  document.body.appendChild(fp);
  const PLAY = '<path d="M7 4.7v14.6a1.1 1.1 0 0 0 1.7.9l11.4-7.3a1.1 1.1 0 0 0 0-1.8L8.7 3.8A1.1 1.1 0 0 0 7 4.7z"/>';
  const PAUSE = '<rect x="5.5" y="3.5" width="4.6" height="17" rx="1.4"/><rect x="13.9" y="3.5" width="4.6" height="17" rx="1.4"/>';
  const letters = t => [...t].map((ch, i) => ch === ' ' ? '<span class="sp"></span>' : `<span class="ltr" style="--i:${i}">${ch}</span>`).join('');
  let shown = '';
  const syncPill = () => {
    const paused = playBtn.classList.contains('is-paused'), label = paused ? 'Play me' : 'Pause';
    if (label === shown) return; shown = label;
    fp.querySelector('svg').innerHTML = paused ? PLAY : PAUSE;
    fp.querySelector('span').innerHTML = letters(label);
    fp.setAttribute('aria-label', paused ? 'Play: start the day' : 'Pause the day');
  };
  syncPill(); new MutationObserver(syncPill).observe(playBtn, { attributes: true, attributeFilter: ['class'] });
  fp.addEventListener('click', () => playBtn.click());

  // "Play me" text under the card player, styled like "Slide me"
  const pt = document.createElement('button'); pt.type = 'button'; pt.className = 'wt__playtext'; pt.id = 'wtPlayText';
  pt.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"></svg><span class="hl"></span>';
  document.getElementById('wtPlayer').insertAdjacentElement('afterend', pt);
  let ptShown = '';
  const syncPt = () => {
    const paused = playBtn.classList.contains('is-paused'), label = paused ? 'Play me' : 'Pause';
    if (label === ptShown) return; ptShown = label;
    pt.querySelector('svg').innerHTML = paused ? PLAY : PAUSE;
    pt.querySelector('.hl').innerHTML = letters(label);
    pt.classList.toggle('is-playing', !paused);
    pt.setAttribute('aria-label', paused ? 'Play: start the day' : 'Pause the day');
  };
  syncPt(); new MutationObserver(syncPt).observe(playBtn, { attributes: true, attributeFilter: ['class'] });
  pt.addEventListener('click', () => playBtn.click());

  // scroll: floating pill while the cards are on screen; nav hides going down, returns going up
  const mq = matchMedia('(max-width:899px)'); let ticking = false, lastY = scrollY;
  const check = () => {
    ticking = false;
    const s = slider.getBoundingClientRect(), w = sec.getBoundingClientRect(), y = scrollY, menuOpen = !!document.querySelector('#menu.open');
    const pl = document.getElementById('wtPlayer').getBoundingClientRect(), playerOnScreen = pl.top < innerHeight && pl.bottom > 0;   // the pill steps aside once the card's own player is visible
    root.classList.toggle('is-cards', mq.matches && s.bottom < 40 && w.bottom > innerHeight * 0.45 && !playerOnScreen);
    if (mq.matches) {
      if (y < 80 || y < lastY - 4) root.classList.remove('nav-hidden');
      else if (y > lastY + 4 && !menuOpen) root.classList.add('nav-hidden');
    } else root.classList.remove('nav-hidden');
    lastY = y;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(check); } }, { passive: true });
  addEventListener('resize', check); check();
})();
