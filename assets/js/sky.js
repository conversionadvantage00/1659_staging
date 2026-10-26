/* 1659 Wine Time: the sky.
   One canvas draws the whole backdrop of the slider section, driven by a single number: the time of day in minutes.

   The idea (an instrument, not a picture): the sun and the moon sit on opposite ends of ONE arm that turns around a
   pivot on the horizon. When the sun goes down on the left the moon comes up on the right, because they cannot do
   anything else. A faint dotted day-arc with tick marks shows the path, like the scale of an instrument.
   (South Africa faces north to the sun, so the sun travels right to left and sets on the left, away from the cards.)

   Layers, back to front: sky colour, sun wash, stars and a Milky Way that wheel slowly, moon, the day-arc, sun,
   thin haze bands, mountains, low mist, three dark hill layers with fine vineyard rows, and the bottle's cast shadow.
   Film grain and a vignette are added in CSS on top.

   API: WineSky.init(canvas, section, bottleBox), WineSky.setTime(T), WineSky.light(), WineSky.setActive(bool). */
(() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const rng = seed => { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- the palette through the day: T is minutes since midnight, 720 = noon, 2160 = noon the next day.
   A film-still grade, not a storybook: bleached bone and champagne at noon, amber and oxblood at golden hour, near-black at night,
   built from the site's own near-black, gold and red. ---------- */
  // top, mid, bottom of the sky, haze at the horizon, sun, mountains, far / mid / near hills, cloud, ambient light, stars
  const KEYS = [
    [720,  '#2f2c27', '#7d745f', '#cfc19c', '#d9cdaa', '#fff1c9', '#5a554a', '#35362a', '#262719', '#1b1b12', '#e8dcc0', 1.00, 0.00],
    [900,  '#2c2a29', '#8a7a60', '#dbc08a', '#e2c995', '#ffe7ae', '#5d5043', '#3a3426', '#292417', '#1c1911', '#f0d9a8', 0.92, 0.00],
    [1020, '#1d1814', '#7a4a26', '#e5a24a', '#eab25c', '#ffd28a', '#4a2f22', '#32261a', '#221a12', '#17110c', '#ffcf8f', 0.75, 0.00],
    [1100, '#15101a', '#5a1d27', '#d2542c', '#e06a35', '#ff8a45', '#34161c', '#25131a', '#1a0e14', '#110a0e', '#e07a4a', 0.50, 0.00],
    [1155, '#0d0a13', '#3d0f1f', '#a8261f', '#b8301f', '#ff5a30', '#25101a', '#1c0d15', '#140a10', '#0d070b', '#b0402e', 0.34, 0.05],
    [1200, '#0a0810', '#25101c', '#5a1424', '#4c1222', '#ff5a30', '#1a0c14', '#150a11', '#0f070c', '#09050a', '#4a1e30', 0.22, 0.50],
    [1260, '#07060b', '#150c16', '#2c0f1c', '#240d18', '#ff5a30', '#12090f', '#0f070c', '#0b0509', '#070307', '#2a1624', 0.15, 0.85],
    [1380, '#050409', '#0d0911', '#1c0c16', '#180a12', '#ff5a30', '#0d070d', '#0b060b', '#080408', '#050205', '#1c1120', 0.10, 1.00],
    [1500, '#050509', '#0a0a12', '#140d18', '#120b15', '#ff5a30', '#0b0a12', '#0a070b', '#070408', '#050205', '#181320', 0.10, 1.00],
    [1740, '#06070c', '#0e1018', '#1f1520', '#1a111a', '#ff9a5a', '#0e0e16', '#0b080c', '#080509', '#050305', '#1e1624', 0.12, 0.95],
    [1790, '#0c0d16', '#2a1a2a', '#7a3a30', '#8a4a38', '#ff9a5a', '#1c141d', '#161019', '#100b12', '#0a070c', '#6a3a3a', 0.20, 0.45],
    [1830, '#1d1a22', '#7a5a52', '#e8b27a', '#efc28a', '#ffc890', '#4a3a3a', '#2e2623', '#211b19', '#161210', '#f0c294', 0.55, 0.05],
    [1900, '#2b2a2c', '#8c8068', '#d9c8a0', '#e0d0a8', '#fff0c4', '#5a5446', '#37372b', '#272819', '#1c1c12', '#e8dcc0', 0.85, 0.00],
    [2160, '#2f2c27', '#7d745f', '#cfc19c', '#d9cdaa', '#fff1c9', '#5a554a', '#35362a', '#262719', '#1b1b12', '#e8dcc0', 1.00, 0.00]
  ].map(k => ({ t: k[0], c: k.slice(1, 11).map(hex), amb: k[11], stars: k[12] }));

  // phones: a fresher, richer daytime (the original bone and champagne reads dull next to the green bottle)
  const rich = (k, c) => Object.assign({}, k, { c: c.map(hex) });
  const DAY_A = ['#233426', '#8fa35a', '#dfd68c', '#ece3a0', '#fff4c4', '#566246', '#33402a', '#26311d', '#1b2415', '#f2eac2'];
  const DAY_B = ['#27321f', '#9ba357', '#e8cf84', '#eed890', '#ffeab0', '#5a5a3e', '#38402a', '#282e1c', '#1c2114', '#f3e4b2'];
  const KEYS_M = KEYS.map((k, i) => (i === 0 || i === 13) ? rich(k, DAY_A) : (i === 1 || i === 12) ? rich(k, DAY_B) : k);
  function palette(T) {
    T = clamp(T, 720, 2160);
    const KEYS_ = W < 900 ? KEYS_M : KEYS;
    let i = 0; while (i < KEYS_.length - 2 && T > KEYS_[i + 1].t) i++;
    const a = KEYS_[i], b = KEYS_[i + 1], f = smooth(clamp((T - a.t) / (b.t - a.t)));
    return { top: mixC(a.c[0], b.c[0], f), mid: mixC(a.c[1], b.c[1], f), bot: mixC(a.c[2], b.c[2], f), haze: mixC(a.c[3], b.c[3], f),
      sun: mixC(a.c[4], b.c[4], f), mtn: mixC(a.c[5], b.c[5], f), hf: mixC(a.c[6], b.c[6], f), hm: mixC(a.c[7], b.c[7], f), hn: mixC(a.c[8], b.c[8], f),
      cloud: mixC(a.c[9], b.c[9], f), amb: lerp(a.amb, b.amb, f), stars: lerp(a.stars, b.stars, f) };
  }

  // The sun's angle round the pivot, in degrees: 0 at noon, 90 at sunset, 270 at sunrise, 360 at the next noon.
  const ANG = [[720, 0], [1155, 90], [1380, 125], [1785, 270], [2160, 360]];   // the moon climbs slowly through the evening, then the night runs on
  function angleOf(T) {
    T = clamp(T, 720, 2160);
    let i = 0; while (i < ANG.length - 2 && T > ANG[i + 1][0]) i++;
    const a = ANG[i], b = ANG[i + 1];
    return lerp(a[1], b[1], (T - a[0]) / (b[0] - a[0])) * Math.PI / 180;
  }

  /* ---------- state ---------- */
  let cv, ctx, section, bottleBox, W = 0, Hc = 0, dpr = 1, T = 750, running = false, raf = 0, active = false, lastNow = 0, frameN = 0;
  const bottle = { cx: 0, base: 0, w: 120, h: 480, ok: false };
  const G = {};                       // geometry for the current size
  const mouse = { x: 0, tx: 0 };
  let stars = [], milky = null, moonSprite = null, streaks = [], terrain = null, shooting = null, nextShoot = 6;

  /* ---------- sprites and terrain, built once per size ---------- */
  function makeMoon(size) {
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'), r = rng(77), R = size / 2;
    const g = x.createRadialGradient(R * 0.8, R * 0.75, R * 0.1, R, R, R);
    g.addColorStop(0, '#fbf5e6'); g.addColorStop(0.7, '#e6dcc4'); g.addColorStop(1, '#bdb29c');
    x.fillStyle = g; x.beginPath(); x.arc(R, R, R, 0, TAU); x.fill();
    x.save(); x.beginPath(); x.arc(R, R, R, 0, TAU); x.clip();
    for (let i = 0; i < 6; i++) {                                   // the dark seas
      const cx = R * (0.35 + 1.1 * r() * 0.8), cy = R * (0.3 + 1.2 * r() * 0.7), rad = R * (0.18 + 0.26 * r());
      const mg = x.createRadialGradient(cx, cy, 0, cx, cy, rad); mg.addColorStop(0, 'rgba(120,108,90,.38)'); mg.addColorStop(1, 'rgba(120,108,90,0)');
      x.fillStyle = mg; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
    }
    for (let i = 0; i < 26; i++) {                                  // craters with a lit rim
      const cx = R * 2 * r(), cy = R * 2 * r(), rad = R * (0.03 + 0.07 * r());
      x.strokeStyle = 'rgba(255,250,235,.28)'; x.lineWidth = 1; x.beginPath(); x.arc(cx - 0.6, cy - 0.6, rad, 0, TAU); x.stroke();
      x.fillStyle = 'rgba(90,80,66,.18)'; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
    }
    x.restore(); return c;
  }
  function makeMilky() {
    const w = Math.ceil(W * 1.3), h = Math.ceil(G.hy * 1.25), c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = rng(4242), cols = [[190, 200, 255], [255, 235, 210], [200, 170, 255], [170, 210, 255]];
    const ang = -0.5, ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 0; i < 1500; i++) {
      const s = (r() - 0.5) * w * 1.1, p = (r() + r() + r() - 1.5) * h * 0.2;     // spread across the band, thicker in the middle
      const px = w * 0.5 + s * ca - p * sa, py = h * 0.5 + s * sa + p * ca, rad = 5 + r() * 30, col = cols[(r() * cols.length) | 0];
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, css(col, 0.045 + r() * 0.05)); g.addColorStop(1, css(col, 0));
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill();
    }
    x.globalCompositeOperation = 'destination-out';                                 // dark dust lanes
    for (let i = 0; i < 26; i++) {
      const s = (r() - 0.5) * w * 0.9, p = (r() - 0.5) * h * 0.1;
      const px = w * 0.5 + s * ca - p * sa, py = h * 0.5 + s * sa + p * ca, rad = 10 + r() * 28;
      const g = x.createRadialGradient(px, py, 0, px, py, rad); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, rad, 0, TAU); x.fill();
    }
    return c;
  }
  function buildStars() {
    const r = rng(1659), n = W < 700 ? 120 : 220; stars = [];
    const pole = { x: W * 0.5, y: G.Hs * 1.35 };
    for (let i = 0; i < n; i++) {
      const x = r() * W * 1.2 - W * 0.1, y = r() * G.hy * 1.05, dx = x - pole.x, dy = y - pole.y;
      stars.push({ rad: Math.hypot(dx, dy), th: Math.atan2(dy, dx), s: 0.35 + Math.pow(r(), 3.2) * 1.5, ph: r() * TAU, sp: 0.6 + r() * 1.8, tint: r(), big: r() < 0.045 });
    }
    G.pole = pole;
  }
  function buildClouds() {                     // thin, long haze bands, like anamorphic cloud streaks
    const r = rng(909); streaks = [];
    for (let i = 0; i < 9; i++) streaks.push({ x: r() * (W + 600) - 300, y: G.Hs * (0.14 + r() * 0.5), w: 260 + r() * 640, h: 3 + r() * 9, sp: 2 + r() * 7, a: 0.1 + r() * 0.16, k: r() });
  }
  // ridge height functions, set once so they never "pop"
  function profileAt(u, pts) {
    let i = 0; while (i < pts.length - 2 && u > pts[i + 1][0]) i++;
    const a = pts[i], b = pts[i + 1], t = smooth(clamp((u - a[0]) / (b[0] - a[0])));
    return lerp(a[1], b[1], t);
  }
  function buildTerrain() {
    const r = rng(8), n = Math.ceil(W / 5) + 4, noise = [];
    for (let i = 0; i < n + 8; i++) noise.push(r());
    const vn = x => { const f = x / 40, i = Math.floor(f), t = smooth(f - i); return lerp(noise[((i % noise.length) + noise.length) % noise.length], noise[(((i + 1) % noise.length) + noise.length) % noise.length], t); };
    // far range: low rolling on the left (so the sun sets behind hills), a flat-topped mountain behind the middle, falling away to the right
    const farPts = [[-0.1, 0.05], [0.12, 0.07], [0.30, 0.10], [0.42, 0.20], [0.48, 0.29], [0.56, 0.31], [0.72, 0.31], [0.80, 0.27], [0.88, 0.14], [1.1, 0.09]];
    const nearPts = [[-0.1, 0.03], [0.2, 0.05], [0.4, 0.09], [0.55, 0.15], [0.66, 0.19], [0.84, 0.17], [0.95, 0.09], [1.1, 0.06]];
    terrain = { vn, farPts, nearPts };
  }

  /* ---------- layout ---------- */
  function measureBottle() {
    if (!bottleBox || !section) return;
    const b = bottleBox.getBoundingClientRect(), s = section.getBoundingClientRect();
    if (!b.width && !b.height) return;
    bottle.cx = b.left - s.left + b.width / 2; bottle.base = b.bottom - s.top; bottle.w = b.width; bottle.h = b.height; bottle.ok = true;
  }
  function layout() {
    const s = section.getBoundingClientRect(); if (s.width < 10) return;      // not laid out yet (hidden tab): the resize observer will call again
    W = Math.round(s.width);
    measureBottle();
    const stageH = Math.round(s.height);
    const Hs = bottle.ok ? Math.max(260, bottle.base) : stageH * 0.79;                  // sky height: down to where the bottle stands
    const desktop = W >= 900;
    G.Hs = Hs; G.hy = Hs * 0.93;
    G.px = desktop ? W * 0.335 : W * 0.5; G.Rx = desktop ? W * 0.285 : W * 0.44;
    G.peak = Hs * 0.43 + (desktop ? 0 : 44); /* phones: sun and moon sit a little lower, clear of the heading */ G.Ry = G.hy - G.peak;
    Hc = Math.min(stageH, Math.round(Hs + Math.max(120, Hs * 0.24)));
    G.Rsun = clamp(W * 0.0185, 15, 27);
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.25 : 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr);
    cv.style.width = W + 'px'; cv.style.height = Hc + 'px';
    buildStars(); buildClouds(); buildTerrain(); milky = makeMilky(); if (!moonSprite) moonSprite = makeMoon(160);
    draw(T, 0);
  }

  /* ---------- drawing ---------- */
  // ## reviewed: on phones the sun turns clockwise (down the right, moon rises on the left); desktop keeps the original direction
  const flip = () => (W < 900 ? -1 : 1);
  const sunPos = psi => ({ x: G.px - flip() * G.Rx * Math.sin(psi), y: G.hy - G.Ry * Math.cos(psi), e: Math.cos(psi) });
  const moonPos = psi => ({ x: G.px + flip() * G.Rx * Math.sin(psi), y: G.hy + G.Ry * Math.cos(psi), e: -Math.cos(psi) });

  function ridgeY(layer, x) {
    const t = terrain, Hs = G.Hs, hy = G.hy, u = x / W;
    if (layer === 'far') return hy - Hs * 0.30 * profileAt(u, t.farPts) - t.vn(x * 1.3 + 90) * Hs * 0.014;
    if (layer === 'nearM') return hy - Hs * 0.22 * profileAt(u, t.nearPts) - t.vn(x * 0.9 + 400) * Hs * 0.016 + Hs * 0.012;
    if (layer === 'h1') return hy + Hs * 0.012 + Math.sin(x * 0.0042 + 1.2) * Hs * 0.016 + Math.sin(x * 0.011 + 2) * Hs * 0.008 - Math.max(0, 0.18 - u) * Hs * 0.05;
    if (layer === 'h2') return hy + Hs * 0.062 + Math.sin(x * 0.0035 + 4) * Hs * 0.02 + Math.sin(x * 0.0105 + 1) * Hs * 0.009;
    // near ground: level where the bottle stands, rolling away from it
    const g = Math.exp(-Math.pow((x - bottle.cx) / Math.max(120, bottle.w * 2.6), 2));
    const roll = Math.sin(x * 0.0031 + 0.5) * Hs * 0.022 + Math.sin(x * 0.0094 + 3) * Hs * 0.01;
    return lerp(Hs + roll * 1.0 - Hs * 0.012, Hs + 2, g);
  }
  function polyFor(layer, step = 6) {
    const pts = [];
    for (let x = -10; x <= W + 10; x += step) pts.push([x, ridgeY(layer, x)]);
    return pts;
  }
  function fillPoly(pts, bottomY) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], bottomY);
    for (const p of pts) ctx.lineTo(p[0], p[1]);
    ctx.lineTo(pts[pts.length - 1][0], bottomY); ctx.closePath();
  }

  function drawSky(p, sun) {
    const g = ctx.createLinearGradient(0, 0, 0, G.hy);
    g.addColorStop(0, css(p.top)); g.addColorStop(0.55, css(p.mid)); g.addColorStop(1, css(p.bot));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hc);
    // the sun's wash: warm light spreading from wherever the sun is, strongest when it is low
    const low = clamp(1 - sun.e * 1.15, 0, 1), vis = clamp((sun.e + 0.25) / 0.45);
    const R = W * (0.3 + 0.3 * low), a = (0.14 + 0.32 * low) * vis * (0.5 + 0.5 * p.amb);
    const w = ctx.createRadialGradient(sun.x, Math.min(sun.y, G.hy), 0, sun.x, Math.min(sun.y, G.hy), R);
    w.addColorStop(0, css(p.sun, a)); w.addColorStop(0.45, css(mixC(p.sun, p.bot, 0.5), a * 0.4)); w.addColorStop(1, css(p.sun, 0));
    ctx.fillStyle = w; ctx.fillRect(0, 0, W, G.hy + 30);
    // a band of warm light along the horizon
    const hb = ctx.createLinearGradient(0, G.hy - G.Hs * 0.22, 0, G.hy + 8);
    hb.addColorStop(0, css(p.haze, 0)); hb.addColorStop(1, css(p.haze, 0.4 * (0.35 + 0.65 * vis)));
    ctx.fillStyle = hb; ctx.fillRect(0, G.hy - G.Hs * 0.22, W, G.Hs * 0.23);
  }

  function drawStars(p, now) {
    const a = p.stars; if (a < 0.02) return;
    const rot = (T - 1155) * 0.00012;
    ctx.save();
    if (milky) { ctx.globalAlpha = a * 0.6; ctx.translate(G.pole.x, G.pole.y); ctx.rotate(rot); ctx.drawImage(milky, -milky.width / 2, -milky.height / 2 - G.Hs * 0.97); ctx.restore(); ctx.save(); }
    for (const s of stars) {
      const th = s.th + rot, x = G.pole.x + s.rad * Math.cos(th), y = G.pole.y + s.rad * Math.sin(th);
      if (y > G.hy || y < -4 || x < -4 || x > W + 4) continue;
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(now * 0.001 * s.sp + s.ph);
      const fade = clamp((G.hy - y) / (G.hy * 0.35)) * a * tw;
      ctx.fillStyle = s.tint < 0.25 ? `rgba(255,224,190,${fade})` : s.tint < 0.55 ? `rgba(200,215,255,${fade})` : `rgba(255,255,255,${fade})`;
      ctx.beginPath(); ctx.arc(x, y, s.s, 0, TAU); ctx.fill();
      if (s.big && fade > 0.15) {                                      // the brightest few get a fine cross
        ctx.strokeStyle = `rgba(255,255,255,${fade * 0.5})`; ctx.lineWidth = 0.6; ctx.beginPath();
        ctx.moveTo(x - s.s * 5, y); ctx.lineTo(x + s.s * 5, y); ctx.moveTo(x, y - s.s * 5); ctx.lineTo(x, y + s.s * 5); ctx.stroke();
      }
    }
    ctx.restore();
    // a shooting star every so often, only when it is properly dark
    if (!reduce && a > 0.6) {
      if (!shooting && now / 1000 > nextShoot) {
        const r = Math.random(); shooting = { x: W * (0.15 + 0.6 * r), y: G.hy * (0.06 + 0.3 * Math.random()), vx: 520 + 260 * Math.random(), vy: 190 + 120 * Math.random(), life: 0 };
        nextShoot = now / 1000 + 8 + Math.random() * 7;
      }
      if (shooting) {
        shooting.life += 1 / 60; const k = shooting.life / 0.85;
        if (k >= 1) shooting = null; else {
          const x = shooting.x + shooting.vx * shooting.life, y = shooting.y + shooting.vy * shooting.life, tl = 90;
          const nx = shooting.vx / Math.hypot(shooting.vx, shooting.vy), ny = shooting.vy / Math.hypot(shooting.vx, shooting.vy);
          const lg = ctx.createLinearGradient(x, y, x - nx * tl, y - ny * tl); const al = Math.sin(k * Math.PI) * 0.85 * a;
          lg.addColorStop(0, `rgba(255,255,255,${al})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = lg; ctx.lineWidth = 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - nx * tl, y - ny * tl); ctx.stroke();
        }
      }
    }
  }

  // a ring with fine ticks round the sun or the moon, like a dial
  function drawDialRing(x, y, r, col, alpha, spin) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
    ctx.strokeStyle = css(col, alpha); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, l = i % 4 === 0 ? 8 : 4; ctx.moveTo(Math.cos(a) * (r + 2), Math.sin(a) * (r + 2)); ctx.lineTo(Math.cos(a) * (r + 2 + l), Math.sin(a) * (r + 2 + l)); }
    ctx.stroke(); ctx.restore();
  }

  function drawMoon(p, psi) {
    const m = moonPos(psi), R = G.Rsun * 0.86;
    const vis = clamp((m.e + 0.12) / 0.3) * clamp(1 - p.amb * 1.1 + 0.1);
    if (vis <= 0.01) return m;
    // glow
    const g = ctx.createRadialGradient(m.x, m.y, R * 0.6, m.x, m.y, R * 7);
    g.addColorStop(0, `rgba(215,222,240,${0.2 * vis})`); g.addColorStop(0.35, `rgba(160,170,210,${0.06 * vis})`); g.addColorStop(1, 'rgba(120,130,190,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, R * 7, 0, TAU); ctx.fill();
    // the disc: a faint earthshine, then the lit part (a waxing gibbous, lit on the left as seen from here)
    ctx.save(); ctx.globalAlpha = 0.13 * vis; ctx.drawImage(moonSprite, m.x - R, m.y - R, R * 2, R * 2); ctx.restore();
    const phase = 0.56 + 0.16 * clamp((T - 1170) / 700), a = R * Math.abs(2 * phase - 1);
    ctx.save(); ctx.globalAlpha = vis; ctx.beginPath(); ctx.arc(m.x, m.y, R, -Math.PI / 2, Math.PI / 2, true);
    ctx.ellipse(m.x, m.y, Math.max(a, 0.01), R, 0, Math.PI / 2, -Math.PI / 2, phase > 0.5); ctx.closePath(); ctx.clip();
    ctx.drawImage(moonSprite, m.x - R, m.y - R, R * 2, R * 2); ctx.restore();
    drawDialRing(m.x, m.y, R * 1.9, [200, 215, 255], 0.2 * vis, T * 0.0016);
    m.vis = vis; return m;
  }

  function drawArc(p, sun, moon) {
    const night = 1 - p.amb;
    const col = mixC([255, 255, 255], [190, 205, 255], night), a = 0.17 + 0.05 * night;
    ctx.save(); ctx.strokeStyle = css(col, a); ctx.lineWidth = 1; ctx.setLineDash([1.2, 7]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(G.px, G.hy, G.Rx, G.Ry, 0, Math.PI, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath();                                                    // fifteen-degree ticks, longer every 45
    for (let d = -90; d <= 90; d += 15) {
      const t = d * Math.PI / 180, x = G.px + G.Rx * Math.sin(t), y = G.hy - G.Ry * Math.cos(t), nx = Math.sin(t) / G.Rx, ny = -Math.cos(t) / G.Ry, nl = Math.hypot(nx, ny), l = d % 45 === 0 ? 11 : 6;
      ctx.moveTo(x - nx / nl * 2, y - ny / nl * 2); ctx.lineTo(x + nx / nl * l, y + ny / nl * l);
    }
    ctx.stroke();
    ctx.strokeStyle = css(col, 0.06);                                   // the arm itself, a hairline from the pivot
    ctx.beginPath(); ctx.moveTo(G.px, G.hy); ctx.lineTo(sun.x, sun.y); ctx.moveTo(G.px, G.hy); ctx.lineTo(moon.x, moon.y); ctx.stroke();
    ctx.restore();
  }

  function drawSun(p, sun, now) {
    const vis = clamp((sun.e + 0.18) / 0.3); if (vis <= 0.01) return;
    const low = clamp(1 - sun.e * 1.1, 0, 1), R = G.Rsun * (1 + 0.38 * Math.pow(low, 1.4)), c = p.sun;
    const g1 = ctx.createRadialGradient(sun.x, sun.y, R * 0.5, sun.x, sun.y, R * 7);
    g1.addColorStop(0, css(c, 0.34 * vis)); g1.addColorStop(0.3, css(c, 0.1 * vis)); g1.addColorStop(1, css(c, 0));
    ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(sun.x, sun.y, R * 7, 0, TAU); ctx.fill();
    const g2 = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, R * 1.15);
    g2.addColorStop(0, css(mixC(c, [255, 255, 255], 0.75), vis)); g2.addColorStop(0.7, css(mixC(c, [255, 255, 255], 0.25), vis)); g2.addColorStop(1, css(c, vis * 0.9));
    ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(sun.x, sun.y, R, 0, TAU); ctx.fill();
    drawDialRing(sun.x, sun.y, R * 2.15, [255, 245, 220], 0.28 * vis, -T * 0.0021);
  }

  function drawStreaks(p, now, dt) {
    const dayA = lerp(0.35, 1, clamp(p.amb * 1.3));
    for (const c of streaks) {
      if (!reduce) { c.x += c.sp * dt; if (c.x > W + c.w) c.x = -c.w - 40; }
      const x = c.x + mouse.x * -6 * (0.5 + c.k), g = ctx.createLinearGradient(x, 0, x + c.w, 0);
      g.addColorStop(0, css(p.cloud, 0)); g.addColorStop(0.5, css(p.cloud, c.a * dayA)); g.addColorStop(1, css(p.cloud, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + c.w / 2, c.y, c.w / 2, c.h / 2, 0, 0, TAU); ctx.fill();
    }
  }

  function drawMountains(p, sun) {
    const px = mouse.x * 4, hz = css(p.haze);
    const far = polyFor('far', 7), near = polyFor('nearM', 7);
    const shape = (pts, base, topC, botC, off) => {
      ctx.save(); ctx.translate(off, 0);
      const g = ctx.createLinearGradient(0, G.hy - G.Hs * 0.34, 0, G.hy + 20); g.addColorStop(0, css(topC)); g.addColorStop(1, css(botC));
      ctx.fillStyle = g; fillPoly(pts, G.hy + 40); ctx.fill();
      // the lit edge on the side facing the sun
      const rim = clamp((sun.e + 0.1) / 0.5), sg = ctx.createLinearGradient(0, 0, W, 0), sx = clamp(sun.x / W);
      sg.addColorStop(clamp(sx - 0.28), css(p.sun, 0)); sg.addColorStop(sx, css(p.sun, 0.5 * rim * (0.3 + 0.7 * (1 - p.amb * 0.4)))); sg.addColorStop(clamp(sx + 0.28), css(p.sun, 0));
      ctx.strokeStyle = sg; ctx.lineWidth = 1.4; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
      ctx.restore();
    };
    shape(far, 'far', mixC(p.mtn, p.haze, 0.45), mixC(p.haze, p.mtn, 0.15), px * 0.5);
    shape(near, 'near', mixC(p.mtn, [0, 0, 0], 0.2), mixC(p.mtn, p.haze, 0.45), px);
  }

  function drawHills(p, sun, dt) {
    const layers = [['h1', p.hf, 0.016, 8], ['h2', p.hm, 0.03, 12], ['near', p.hn, 0.05, 16]];
    const rows = (name) => name === 'near' ? 52 : name === 'h2' ? 40 : 0;
    layers.forEach(([name, col, spreadK, step], li) => {
      const off = name === 'near' ? 0 : mouse.x * (name === 'h2' ? 9 : 5);
      const pts = polyFor(name, step);
      ctx.save(); ctx.translate(off, 0);
      const top = Math.min(...pts.map(q => q[1]));
      const g = ctx.createLinearGradient(0, top, 0, Hc); g.addColorStop(0, css(mixC(col, p.haze, 0.05 + 0.05 * (2 - li)))); g.addColorStop(0.5, css(col)); g.addColorStop(1, css(mixC(col, [0, 0, 0], 0.35)));
      ctx.fillStyle = g; fillPoly(pts, Hc + 10); ctx.fill();
      ctx.save(); fillPoly(pts, Hc + 10); ctx.clip();
      // warm light across the hills from the sun's side
      const vis = clamp((sun.e + 0.1) / 0.5), lw = ctx.createRadialGradient(sun.x, G.hy, 0, sun.x, G.hy, W * 0.62);
      lw.addColorStop(0, css(p.sun, 0.2 * vis * (li * 0.2 + 0.5))); lw.addColorStop(1, css(p.sun, 0));
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lw; ctx.fillRect(-20, G.hy - G.Hs * 0.2, W + 40, Hc); ctx.globalCompositeOperation = 'source-over';
      // vineyard rows: lines running away from us to a point on the horizon
      const n = rows(name);
      if (n) {
        const vx = G.px + W * 0.12, vy = G.hy - G.Hs * 0.01, spread = W * (name === 'near' ? 0.09 : 0.045);
        ctx.lineWidth = name === 'near' ? 1.3 : 1;
        for (let i = -n; i <= n; i++) {
          const bx = vx + i * spread * 0.8, by = Hc + 40, dark = i % 2 === 0;
          ctx.strokeStyle = dark ? css(mixC(col, [0, 0, 0], 0.6), 0.34 * (0.4 + 0.6 * p.amb)) : css(mixC(col, p.sun, 0.35), 0.05 * (0.3 + 0.7 * p.amb));
          ctx.beginPath(); ctx.moveTo(vx + (bx - vx) * 0.05, vy + (by - vy) * 0.05); ctx.lineTo(bx, by); ctx.stroke();
        }
      }
      ctx.restore();
      // the ridge catches the light
      const rg = ctx.createLinearGradient(0, 0, W, 0), sx = clamp(sun.x / W), rim = clamp((sun.e + 0.1) / 0.5);
      rg.addColorStop(clamp(sx - 0.3), css(p.sun, 0)); rg.addColorStop(sx, css(p.sun, 0.55 * rim)); rg.addColorStop(clamp(sx + 0.3), css(p.sun, 0));
      ctx.strokeStyle = rg; ctx.lineWidth = 1.2; ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
      ctx.restore();
      if (name === 'h1') {                                               // low mist between the far hills
        const mist = ctx.createLinearGradient(0, G.hy - 10, 0, G.hy + G.Hs * 0.12);
        mist.addColorStop(0, css(p.haze, 0)); mist.addColorStop(0.5, css(p.haze, 0.1 + 0.08 * (1 - p.amb))); mist.addColorStop(1, css(p.haze, 0));
        ctx.fillStyle = mist; ctx.fillRect(0, G.hy - 10, W, G.Hs * 0.13);
      }
    });
  }

  // the bottle's shadow on the ground: it points away from the sun, lengthens as the sun drops, and the moon casts a fainter one
  function drawShadow(p, sun, moon) {
    if (!bottle.ok) return;
    const bx = bottle.cx, by = bottle.base + 1, bw = bottle.w, bh = bottle.h;
    const ao = ctx.createRadialGradient(bx, by, 0, bx, by, bw * 0.95); ao.addColorStop(0, 'rgba(0,0,0,.55)'); ao.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(0, by); ctx.scale(1, 0.14); ctx.translate(0, -by); ctx.fillStyle = ao; ctx.beginPath(); ctx.arc(bx, by, bw * 0.95, 0, TAU); ctx.fill(); ctx.restore();
    const cast = (src, strength, tint) => {
      if (strength < 0.02) return;
      const dir = src.x < bx ? 1 : -1, elev = Math.max(0.1, Math.asin(clamp(src.e, 0, 1)));
      const len = Math.min(bh * 1.7, bh * 0.42 / Math.tan(elev)) * (src.e > 0.97 ? 0.15 : 1), a = 0.62 * strength;
      if (len < 6) return;
      for (let k = 0; k < 3; k++) {                                     // three passes, widening and fading, for a soft edge
        const wk = 1 + k * 0.28, ak = a / (1 + k * 1.1);
        const x1 = bx - bw * 0.36 * wk, x2 = bx + bw * 0.36 * wk, tip = bx + dir * len, drop = len * 0.13;
        const g = ctx.createLinearGradient(bx, by, tip, by + drop); g.addColorStop(0, css(tint, ak)); g.addColorStop(0.45, css(tint, ak * 0.62)); g.addColorStop(1, css(tint, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x1, by); ctx.lineTo(x2, by);
        ctx.lineTo(tip, by + drop + bw * 0.16 * wk); ctx.lineTo(tip + dir * 4, by + drop - bw * 0.04); ctx.closePath(); ctx.fill();
      }
    };
    cast(sun, clamp((sun.e + 0.02) / 0.3) * (0.35 + 0.65 * p.amb), [8, 6, 14]);
    cast(moon, (moon.vis || 0) * 0.4, [4, 4, 14]);
  }

  /* ---------- one frame ---------- */
  function draw(t, now, dt = 0) {
    if (!ctx || W < 10) return;
    T = t; frameN++;
    if (frameN % 45 === 0) measureBottle();
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, Hc);
    const p = palette(T), psi = angleOf(T), sun = sunPos(psi), moon0 = moonPos(psi);
    drawSky(p, sun);
    drawStars(p, now);
    const moon = drawMoon(p, psi) || moon0;
    drawArc(p, sun, moon);
    drawSun(p, sun, now);
    drawStreaks(p, now, dt);                                            // thin haze veils the sun
    drawMountains(p, sun);
    drawHills(p, sun, dt);
    drawShadow(p, sun, moon);
    G.last = { p, sun, moon };
    if (section) section.style.setProperty('--ground', css(mixC(p.hn, [0, 0, 0], 0.35)));
  }

  function loop(now) {
    raf = 0; if (!running) return;
    const dt = Math.min(0.05, (now - (lastNow || now)) / 1000); lastNow = now;
    draw(T, now, dt);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; lastNow = 0; if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = 0; }

  /* ---------- the light on the bottle, for the page to use ---------- */
  function light() {
    const L = G.last; if (!L) return { amb: 1, rimL: { c: [0, 0, 0], a: 0 }, rimR: { c: [0, 0, 0], a: 0 }, bright: 1, sat: 1 };
    const { p, sun, moon } = L, bx = bottle.cx || W * 0.37;
    const sunVis = clamp((sun.e + 0.05) / 0.3) * (0.4 + 0.6 * (1 - sun.e * 0.7)), moonVis = (moon.vis || 0);
    const cool = mixC(p.mid, [190, 210, 255], 0.5);
    const sunSide = sun.x < bx ? 'left' : 'right', moonSide = moon.x < bx ? 'left' : 'right';
    const rim = { left: { c: cool, a: 0.14 }, right: { c: cool, a: 0.14 } };
    rim[sunSide] = { c: mixC(p.sun, [255, 255, 255], 0.2), a: 0.95 * sunVis };
    if (moonVis > 0.05) rim[moonSide] = { c: [205, 220, 255], a: 0.55 * moonVis };
    return { amb: p.amb, rimL: rim.left, rimR: rim.right, bright: 0.5 + 0.5 * p.amb, sat: 0.8 + 0.2 * p.amb, sun: css(p.sun), sunVis };
  }

  window.WineSky = {
    init(canvas, sec, box) {
      cv = canvas; ctx = cv.getContext('2d'); section = sec; bottleBox = box;
      layout();
      addEventListener('resize', () => { clearTimeout(init._t); init._t = setTimeout(layout, 120); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
      addEventListener('load', layout);
      if (!reduce && matchMedia('(hover: hover)').matches) section.addEventListener('pointermove', e => { const r = section.getBoundingClientRect(); mouse.tx = clamp((e.clientX - r.left) / r.width) * 2 - 1; });
      new IntersectionObserver(es => { active = es[0].isIntersecting; active ? start() : stop(); }, { threshold: 0.01 }).observe(section);
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { clearTimeout(init._t); init._t = setTimeout(layout, 120); }).observe(section);
    },
    setTime(t) { T = t; if (!running) draw(T, performance.now(), 0); },
    layout, light, palette, angleOf
  };
  const init = {};
})();
