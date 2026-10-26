/* 1659 Wine Time, v3 */
/* ## reviewed (2026-10-22): whole file read; gradient reveal removed, hero tween fixed */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (rm) document.documentElement.classList.add('rm');

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!rm && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const goTo = (hash) => {
    const el = $(hash); if (!el) return;
    if (lenis) lenis.scrollTo(el, { duration: 1.4, offset: matchMedia('(max-width: 899px)').matches ? -64 : 0 }); else el.scrollIntoView({ behavior: rm ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const h = a.getAttribute('href');
    if (h.length < 2) { e.preventDefault(); return; }
    e.preventDefault(); closeMenu(); goTo(h);
  }));

  /* ---------- desktop nav: liquid hover blob ----------
     Two pills (a quick head and a slower tail) chase the hovered link; blurred and contrast-boosted together by the #navGoo filter they stretch
     like one drop of liquid. The text sits above, so it stays sharp. Each pill is moved by a small spring-style chase on the page's ticker (not a restarted
     tween), so quick hops between links just redirect it and never jerk. The goo filter is only switched on while a pill is visible. Safari gets the
     same two pills without the goo filter, reduced motion and touch screens get nothing. */
  (() => {
    const links = $('.nav__links');
    if (!links || rm || !matchMedia('(min-width: 900px) and (hover: hover)').matches) return;
    const items = $$('a', links);
    const goo = document.createElement('span');
    goo.className = 'nav__goo'; goo.setAttribute('aria-hidden', 'true'); links.prepend(goo);
    /* four pills, each chasing the same target a little slower than the one before and a little slimmer, so the goo filter draws a tapering liquid trail between two links */
    const DEF = [{ rate: 24, fat: 1 }, { rate: 15, fat: 0.86 }, { rate: 9.5, fat: 0.74 }, { rate: 6, fat: 0.62 }];
    const canGoo = !/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const mk = el => ({ el, x: 0, y: 0, w: 0, h: 0, s: 0.2, o: 0, tx: 0, ty: 0, tw: 0, th: 0, ts: 0.2, to: 0 });
    const P = DEF.map(d => { const el = document.createElement('i'); goo.append(el); return Object.assign(mk(el), d); });
    const KEYS = [['x', 'tx'], ['y', 'ty'], ['w', 'tw'], ['h', 'th'], ['s', 'ts'], ['o', 'to']];
    let on = false, cur = null, running = false;
    const box = a => { const r = a.getBoundingClientRect(), p = links.getBoundingClientRect(); return { x: r.left - p.left, y: r.top - p.top, w: r.width, h: r.height }; };
    function step(p, rate, dt) {
      const k = 1 - Math.exp(-rate * dt); let moving = false;
      for (const [c, t] of KEYS) { const d = p[t] - p[c]; if (Math.abs(d) > 0.02) { p[c] += d * k; moving = true; } else p[c] = p[t]; }
      p.el.style.cssText = `width:${p.w}px;height:${p.h}px;opacity:${p.o};transform:translate3d(${p.x}px,${p.y}px,0) scale(${p.s})`;
      return moving;
    }
    function tick() {
      const dt = Math.min(gsap.ticker.deltaRatio(60) / 60, 0.05);
      let moving = false; for (const p of P) if (step(p, p.rate, dt)) moving = true;
      if (!moving) { gsap.ticker.remove(tick); running = false; if (!on) goo.classList.remove('is-goo'); }
    }
    const run = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
    const aim = (p, b, vis) => { const f = vis ? p.fat : 1; p.tx = b.x + b.w * (1 - f) / 2 * 0.35; p.ty = b.y + b.h * (1 - f) / 2; p.tw = b.w * (vis ? 1 - (1 - f) * 0.35 : 1); p.th = b.h * f; p.ts = vis ? 1 : 0.2; p.to = vis ? 1 : 0; };
    function enter(a) {
      const b = box(a); cur = a; items.forEach(i => i.classList.toggle('is-lit', i === a));
      if (canGoo) goo.classList.add('is-goo');
      if (!on) { on = true; for (const p of P) { p.x = b.x + b.w / 2 - b.h / 2; p.y = b.y; p.w = b.h; p.h = b.h; p.s = 0.2; p.o = 0; } }
      for (const p of P) aim(p, b, true); run();
    }
    function leave() {
      if (!on) return; on = false; items.forEach(i => i.classList.remove('is-lit'));
      const b = box(cur), d = { x: b.x + b.w / 2 - b.h / 2, y: b.y, w: b.h, h: b.h };
      for (const p of P) aim(p, d, false); run();
    }
    items.forEach(a => { a.addEventListener('mouseenter', () => enter(a)); a.addEventListener('focus', () => enter(a)); a.addEventListener('blur', leave); });
    links.addEventListener('mouseleave', leave);
  })();

  /* ---------- nav + menu ---------- */ // ## reviewed
  const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
  function closeMenu() { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-hidden', 'true'); if (lenis) lenis.start(); }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('open');
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); menu.setAttribute('aria-hidden', !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
  /* the bar goes solid once you scroll, slides away on the way down and returns on the way up (never while the menu is open), so it no longer sits over the content */
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const y = s.scroll();
    nav.classList.toggle('is-solid', y > 60);
    nav.classList.toggle('is-hidden', y > 160 && s.direction === 1 && !menu.classList.contains('open'));
  } });

  /* ---------- hero ---------- */
  if (!rm) {
    /* intro fade/zoom runs on the wrapper; the scroll parallax owns the image's own transform, so they never fight */
    gsap.from('.hero__img', { opacity: 0, scale: 1.08, duration: 2.2, ease: 'power3.out' });
    /* hero lines are revealed by the text motion block below */
    /* desktop banner: arches 1 and 3 drop in from the top, 2 and 4 rise from the bottom, then the gold figure fades up; scrolling on drifts them apart the same way */
    if (matchMedia('(min-width: 900px)').matches) {
      const up = $$('.hd__t[data-from="top"]'), down = $$('.hd__t[data-from="bottom"]'), man = $('.hd__man');
      gsap.set(up, { y: -170, autoAlpha: 0 }); gsap.set(down, { y: 170, autoAlpha: 0 }); gsap.set(man, { autoAlpha: 0, scale: 0.92, transformOrigin: '50% 100%' });
      gsap.timeline({ delay: 0.25 })
        .to([...up, ...down], { y: 0, autoAlpha: 1, duration: 1.5, ease: 'power3.out', stagger: { each: 0.12, from: 'start' } })
        .to(man, { autoAlpha: 1, scale: 1, duration: 1.1, ease: 'power2.out' }, '-=0.7');
      const drift = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to(up, { yPercent: -9, ease: 'none', scrollTrigger: drift });
      gsap.to(down, { yPercent: 9, ease: 'none', scrollTrigger: drift });
    }
  }

  /* ---------- slider heading: the small line rises letter by letter, then a gold wave runs through it ---------- */
  const eb = $('.wt__head .eyebrow');
  if (eb && !rm) {
    const txt = eb.textContent.trim();
    eb.setAttribute('aria-label', txt); eb.textContent = '';
    txt.split(' ').forEach((w, wi, all) => {
      const word = document.createElement('span'); word.className = 'eb-word'; word.setAttribute('aria-hidden', 'true');
      [...w].forEach(ch => { const s = document.createElement('span'); s.className = 'eb-ch'; s.textContent = ch; word.appendChild(s); });
      eb.appendChild(word); if (wi < all.length - 1) eb.appendChild(document.createTextNode(' '));
    });
    const chars = $$('.eb-ch', eb);
    gsap.set(chars, { yPercent: 115, opacity: 0 });
    gsap.set('#wtTitle', { y: 34, opacity: 0 });
    ScrollTrigger.create({ trigger: '#winetime', start: 'top 70%', once: true, onEnter() {
      gsap.to(chars, { yPercent: 0, opacity: 1, duration: 0.8, ease: 'power3.out', stagger: 0.028 });
      gsap.to('#wtTitle', { y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.55 });
      gsap.to(chars, { color: '#f6d58f', duration: 0.28, ease: 'sine.inOut', stagger: { each: 0.045, repeat: 1, yoyo: true }, repeat: -1, repeatDelay: 3.6, delay: 2.2 });
    } });
  }

  /* ---------- equal bottles on phones: every wine scene gets the same bottle height ----------
     Each phone scene has a different amount of room for its bottle (the pairing text under it varies), so measure all four
     and use the smallest, then every bottle is the same size and none runs into its wine name. */
  const syncBottles = () => {
    const split = $('#split'); if (!split) return;
    if (!matchMedia('(max-width: 899px)').matches) { split.style.removeProperty('--bh'); return; }
    split.classList.add('is-measuring');
    const hs = $$('#split .scene__bottle').map(b => b.getBoundingClientRect().height).filter(h => h > 50);
    split.classList.remove('is-measuring');
    if (hs.length) split.style.setProperty('--bh', Math.min(...hs) + 'px');
  };
  syncBottles(); addEventListener('resize', syncBottles); addEventListener('load', syncBottles);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncBottles);

  /* ---------- keep the page light ----------
     Endless CSS animations (film grain, the scroll cue) pause when their section is off screen, and layout is re-measured once images have loaded. */
  const pauseOff = (sel, target) => { const host = $(sel); if (!host || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(es => host.classList.toggle('is-in', es[0].isIntersecting), { rootMargin: '10% 0px' }).observe(target || host); };
  pauseOff('.wt'); pauseOff('.hero');
  addEventListener('load', () => ScrollTrigger.refresh());

  /* ---------- text motion ----------
     Headlines: each word rises out of a clipped line, one after another (a mask reveal, not a fade).
     Small gold lines: a soft left-to-right wipe. Body copy and cards: a quiet rise with a touch of blur that clears.
     Everything runs once, on entry, with long expo easing so it settles slowly. Reduced motion skips all of it. */
  if (!rm) {
    const splitWords = el => {
      el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
      const words = [];
      const walk = node => [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'wm'; w.setAttribute('aria-hidden', 'true');
            const i = document.createElement('span'); i.className = 'wm__i'; i.textContent = tok;
            w.appendChild(i); frag.appendChild(w); words.push(i);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
      walk(el); return words;
    };
    const onEnter = (el, fn, start = 'top 88%') => ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fn });

    $$('.hero__line--big, .wines-head h2, .events h2').forEach(h => {
      const w = splitWords(h); gsap.set(w, { yPercent: 112 });
      const run = () => gsap.to(w, { yPercent: 0, duration: 1.35, ease: 'expo.out', stagger: 0.075 });
      h.closest('.hero') ? gsap.delayedCall(1, run) : onEnter(h, run);
    });
    $$('.hero__line:not(.hero__line--big), .wines-head .eyebrow, .events .eyebrow').forEach(el => {
      gsap.set(el, { clipPath: 'inset(0 100% 0 0)' });
      const run = () => gsap.to(el, { clipPath: 'inset(0 0% 0 0)', duration: 1.5, ease: 'expo.out', onComplete: () => gsap.set(el, { clearProps: 'clipPath' }) });
      el.closest('.hero') ? gsap.delayedCall(0.7, run) : onEnter(el, run);
    });
    const rise = (el, run0, delay = 0) => {
      gsap.set(el, { opacity: 0, y: 28, filter: 'blur(6px)' });
      const run = () => gsap.to(el, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', delay, onComplete: () => gsap.set(el, { clearProps: 'filter,transform' }) });
      el.closest('.hero') ? gsap.delayedCall(run0, run) : onEnter(el, run, 'top 92%');
    };
    $$('.hero__sub').forEach(el => rise(el, 1.7));
    $$('.events__btns, .form--ig').forEach(el => rise(el, 0));
  }

  /* =====================================================
     SERVING SUGGESTIONS: split scenes that slide past each other
     Desktop: two halves, left slides up while right slides down.
     Mobile: one wine per screen, alternating directions.
     ===================================================== */
  if (!rm) {
    const mm = gsap.matchMedia();
    const scenes = $$('#split .scene');
    const [l1, r1, l2, r2] = scenes;
    mm.add('(min-width: 900px)', () => {
      gsap.set([l2, r2], { zIndex: 3 });
      gsap.set(l2, { yPercent: 100 }); gsap.set(r2, { yPercent: -100 });
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 }, scrollTrigger: { trigger: '#split', start: 'top top', end: '+=130%', pin: true, scrub: 0.8 } });
      tl.to({}, { duration: 0.25 })
        .to(l1, { yPercent: -100 }, '>')
        .to(r1, { yPercent: 100 }, '<')
        .to($('.scene__bottle', l1), { yPercent: -18 }, '<')
        .to($('.scene__bottle', r1), { yPercent: 18 }, '<')
        .to(l2, { yPercent: 0 }, '<')
        .to(r2, { yPercent: 0 }, '<')
        .from([$('.scene__bottle', l2), $('.scene__bottle', r2)], { yPercent: (i) => i ? -22 : 22, duration: 1 }, '<')
        .to({}, { duration: 0.35 });
      return () => gsap.set(scenes.concat(scenes.map(s => $('.scene__bottle', s))), { clearProps: 'transform,zIndex' });
    });
    mm.add('(max-width: 899px)', () => {
      scenes.forEach((s, i) => gsap.set(s, { zIndex: i + 1, yPercent: i === 0 ? 0 : 100 }));   // ## reviewed: every wine comes up from the bottom, like Sauvignon into Classic Red
      const tl = gsap.timeline({ defaults: { ease: 'power2.inOut', duration: 1 }, scrollTrigger: { trigger: '#split', start: 'top top', end: '+=330%', pin: true, scrub: 0.8 } });
      scenes.slice(1).forEach((s, k) => {
        const i = k + 1, prev = scenes[k];
        tl.to({}, { duration: 0.2 })
          .to(s, { yPercent: 0 }, '>')
          .to(prev, { yPercent: -30 }, '<');
      });
      tl.to({}, { duration: 0.2 });
      return () => gsap.set(scenes, { clearProps: 'transform,zIndex' });
    });
  }

  /* ---------- Instagram event cards ---------- */
  const igCards = $$('.ig__card');
  const heartSvg = '<svg class="ig__heart" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M12 21s-7.5-4.6-9.6-9.3C.8 8.1 2.9 4.5 6.4 4.5c2 0 3.6 1 4.6 2.6l1 1.5 1-1.5c1-1.6 2.6-2.6 4.6-2.6 3.5 0 5.6 3.6 4 7.2C19.5 16.4 12 21 12 21z"/></svg>';
  igCards.forEach(card => {
    const inner = $('.ig__inner', card);
    // double-tap or double-click pops a heart, like the real thing
    inner.addEventListener('dblclick', e => {
      if (rm) return;
      const r = inner.getBoundingClientRect();
      const wrap = document.createElement('span'); wrap.innerHTML = heartSvg;
      const heart = wrap.firstChild; heart.style.left = (e.clientX - r.left) + 'px'; heart.style.top = (e.clientY - r.top) + 'px';
      inner.appendChild(heart);
      gsap.fromTo(heart, { scale: 0, rotation: -12 }, { scale: 1.15, rotation: 0, duration: 0.35, ease: 'back.out(2.2)' });
      gsap.to(heart, { y: -60, opacity: 0, duration: 0.6, delay: 0.55, ease: 'power2.in', onComplete: () => heart.remove() });
    });
  });
  if (!rm && igCards.length) {
    const inners = igCards.map(c => $('.ig__inner', c));
    const mmIg = gsap.matchMedia();
    // entrance: cards fan up from slightly rotated positions, one after another
    gsap.from(inners, { opacity: 0, y: 110, rotation: i => [-8, 0, 8][i] || 0, scale: 0.9, duration: 1.3, ease: 'power3.out', stagger: 0.16,
      scrollTrigger: { trigger: '#ig', start: 'top 85%', once: true } });
    mmIg.add('(min-width: 900px)', () => {
      // slow scroll drift: outer cards rise, the middle one sinks, so the row breathes as you pass it
      igCards.forEach((card, i) => gsap.fromTo(card, { yPercent: i === 1 ? -4 : 5 }, { yPercent: i === 1 ? 5 : -4, ease: 'none',
        scrollTrigger: { trigger: '#ig', start: 'top bottom', end: 'bottom top', scrub: 0.6 } }));
      // pointer tilt with a moving highlight (mouse only)
      if (!matchMedia('(hover: hover)').matches) return;
      const cleanups = inners.map(inner => {
        gsap.set(inner, { transformPerspective: 1000 });
        const rx = gsap.quickTo(inner, 'rotationX', { duration: 0.5, ease: 'power3.out' });
        const ry = gsap.quickTo(inner, 'rotationY', { duration: 0.5, ease: 'power3.out' });
        const move = e => {
          const r = inner.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          ry((px - 0.5) * 14); rx((0.5 - py) * 12);
        };
        const enter = () => gsap.to(inner, { scale: 1.03, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        const leave = () => { rx(0); ry(0); gsap.to(inner, { scale: 1, duration: 0.6, ease: 'power3.out', overwrite: 'auto' }); };
        inner.addEventListener('pointermove', move); inner.addEventListener('pointerenter', enter); inner.addEventListener('pointerleave', leave);
        return () => { inner.removeEventListener('pointermove', move); inner.removeEventListener('pointerenter', enter); inner.removeEventListener('pointerleave', leave); };
      });
      return () => cleanups.forEach(f => f());
    });
  }

  /* ---------- form ---------- */
  const form = $('#form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }   // name, surname and a real email are required before anything is shown as sent
    // Demo only: the real build posts to the site's form handler, going to info@1659.co.za.
    $$('input,textarea,button,label', form).forEach(el => { if (el.tagName !== 'LABEL' || true) el.style.display = 'none'; });
    const t = $('#thanks'); t.hidden = false; t.style.display = 'block';
    if (!rm) gsap.from(t, { opacity: 0, y: 20, duration: 0.8 });
  });
  $$('[data-todo]').forEach(a => a.addEventListener('click', e => e.preventDefault()));
})();
