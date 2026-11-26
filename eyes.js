/*
 * eyes.js — a tiny canvas "digital pet eyes" engine.
 *
 * A Creature is a pair of eyes that:
 *   - breathes (slow vertical bob + squash/stretch)
 *   - follows a look target with its own lag (exponential smoothing) and a
 *     slightly springy overshoot
 *   - blinks on a random timer and does idle moves (happy, hop, surprise,
 *     sleepy, angry, wink, look-around)
 *   - turns its "head" (foreshortens the far eye) when looking sideways
 *
 * A Showcase is a grey disc packed with circular screens, each with its own
 * Creature, that pop in one by one.
 *
 * Exposed as window.Eyes (plain script, works from file://).
 */
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- helpers
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smoothstep = (e0, e1, x) => {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const ease = {
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
    outBack: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };
  // 0 → 1 → 0: rises until a, holds, falls after b (t, a, b all in 0..1)
  const envelope = (t, a, b) =>
    t < a ? smoothstep(0, 1, t / a) : t > b ? 1 - smoothstep(0, 1, (t - b) / (1 - b)) : 1;

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function roundRect(p, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
  }

  // ------------------------------------------------------------ the looks
  // Eye sizes are fractions of the screen radius R. sep = centre-to-centre / 2.
  const SHAPES = {
    pill: { w: 0.24, h: 0.42, sep: 0.27 },
    dot:  { w: 0.2,  h: 0.2,  sep: 0.25 },
    ring: { w: 0.34, h: 0.34, sep: 0.3 },
    cat:  { w: 0.38, h: 0.3,  sep: 0.3 },
    bean: { w: 0.3,  h: 0.38, sep: 0.28 },
  };
  const STYLES = Object.keys(SHAPES);

  const PALETTES = [
    { name: 'mint',      eye: '#6ff7c1' },
    { name: 'tangerine', eye: '#ff9b3d' },
    { name: 'lagoon',    eye: '#38c7ff', eye2: '#7b5cff' },
    { name: 'rose',      eye: '#ff6fa5' },
    { name: 'lemon',     eye: '#ffe55c' },
    { name: 'lavender',  eye: '#b99cff' },
    { name: 'frost',     eye: '#f2fbff' },
    { name: 'coral',     eye: '#ff6b5b' },
    { name: 'lime',      eye: '#b6ff4a' },
    { name: 'aqua',      eye: '#4ff0e6', eye2: '#2f8bff' },
    { name: 'sunrise',   eye: '#ffd36b', eye2: '#ff5f8f' },
    { name: 'grape',     eye: '#a66bff', eye2: '#ff6bd6' },
    { name: 'ember',     eye: '#ffb03b', eye2: '#ff4b2b' },
    { name: 'moss',      eye: '#9bd25a' },
    { name: 'cobalt',    eye: '#5b7bff' },
    { name: 'peach',     eye: '#ffb38a' },
    { name: 'aurora',    eye: '#5cffb0', eye2: '#5c9dff' },
    { name: 'cherry',    eye: '#ff2d55' },
    { name: 'honey',     eye: '#ffc23d' },
    { name: 'glacier',   eye: '#bff3ff', eye2: '#6fb8ff' },
  ];

  // ------------------------------------------------------------- actions
  const ACTIONS = {
    blink:      { dur: 160 },
    double:     { dur: 160 }, // expands to two blinks
    wink:       { dur: 650 },
    happy:      { dur: 1500 },
    surprise:   { dur: 950 },
    hop:        { dur: 720 },
    sleepy:     { dur: 2600 },
    angry:      { dur: 1700 },
    lookaround: { dur: 1800 },
  };
  const IDLE_POOL = ['happy', 'hop', 'surprise', 'sleepy', 'wink', 'angry', 'lookaround', 'double', 'lookaround', 'hop'];

  // ------------------------------------------------------------- creature
  class Creature {
    constructor(o = {}) {
      this.style = o.style || pick(STYLES);
      this.palette = o.palette || pick(PALETTES);
      this.clock = rand(0, 10000);
      this.breathPeriod = o.breathPeriod || rand(2800, 3800);
      this.tau = o.tau != null ? o.tau : rand(50, 500); // look lag (ms)
      this.autoActions = o.autoActions != null ? o.autoActions : true;

      this.look = { x: 0, y: 0 }; // smoothed target, normalised, y up
      this.pos = { x: 0, y: 0 };  // displayed (spring)
      this.vel = { x: 0, y: 0 };
      this.wander = { x: 0, y: 0 };
      this.nextWander = rand(500, 2500);
      this.nextBlink = rand(800, 4000);
      this.nextIdle = rand(4000, 9000);
      this.actions = [];
      this.pending = null;
      this.p = this._params();
    }

    trigger(type, opts = {}) {
      if (!ACTIONS[type]) return;
      if (type === 'double') {
        this.trigger('blink');
        this.actions.push({ type: 'blink', start: this.clock + 230, dur: ACTIONS.blink.dur });
        return;
      }
      // don't stack the same long action
      if (type !== 'blink') this.actions = this.actions.filter((a) => a.type !== type);
      this.actions.push({
        type,
        start: this.clock + (opts.delay || 0),
        dur: ACTIONS[type].dur,
        side: opts.side || (Math.random() < 0.5 ? -1 : 1),
      });
    }

    /** Swap look behind a blink so it feels natural. */
    changeLook(style, palette) {
      this.trigger('blink');
      this.pending = { style: style || this.style, palette: palette || this.palette, at: this.clock + 70 };
    }

    _params() {
      const p = {
        openL: 1, openR: 1, lid: 0, angry: 0, happy: 0,
        scale: 1, hopY: 0, sx: 1, sy: 1, pupil: 1,
        overrideW: 0, overrideX: 0, overrideY: 0,
      };
      for (const a of this.actions) {
        const t = (this.clock - a.start) / a.dur;
        if (t < 0 || t > 1) continue;
        switch (a.type) {
          case 'blink': {
            const c = t < 0.4 ? ease.inOutCubic(t / 0.4) : t < 0.55 ? 1 : 1 - ease.inOutCubic((t - 0.55) / 0.45);
            p.openL = Math.min(p.openL, 1 - c);
            p.openR = Math.min(p.openR, 1 - c);
            break;
          }
          case 'wink': {
            const c = envelope(t, 0.2, 0.7);
            if (a.side < 0) p.openL = Math.min(p.openL, 1 - c);
            else p.openR = Math.min(p.openR, 1 - c);
            p.hopY -= 0.02 * c;
            break;
          }
          case 'happy': {
            const e = envelope(t, 0.12, 0.85);
            p.happy = Math.max(p.happy, e);
            p.hopY -= Math.abs(Math.sin(t * TAU * 2)) * 0.045 * e;
            break;
          }
          case 'surprise': {
            const e = envelope(t, 0.08, 0.6);
            const pop = t < 0.08 ? ease.outBack(t / 0.08) : 1;
            p.scale *= 1 + 0.2 * e * pop;
            p.pupil *= 1 - 0.45 * e;
            p.hopY -= 0.05 * e;
            break;
          }
          case 'hop': {
            let sq = 0, stretch = 0;
            if (t < 0.15) sq = 0.14 * smoothstep(0, 1, t / 0.15);           // anticipation
            else if (t < 0.75) {                                               // airborne
              const u = (t - 0.15) / 0.6;
              p.hopY -= Math.sin(Math.PI * u) * 0.17;
              stretch = 0.1 * Math.sin(Math.PI * u);
            } else sq = 0.16 * Math.sin(Math.PI * ((t - 0.75) / 0.25));     // landing
            p.sy *= 1 - sq + stretch;
            p.sx *= 1 + sq * 0.7 - stretch * 0.5;
            break;
          }
          case 'sleepy': {
            const e = envelope(t, 0.25, 0.8);
            p.lid = Math.max(p.lid, 0.55 * e);
            p.hopY += 0.035 * e;
            break;
          }
          case 'angry': {
            const e = envelope(t, 0.1, 0.85);
            p.lid = Math.max(p.lid, 0.3 * e);
            p.angry = Math.max(p.angry, e);
            break;
          }
          case 'lookaround': {
            const e = envelope(t, 0.12, 0.85);
            p.overrideW = Math.max(p.overrideW, e);
            // left, hold, right, hold — with a little saccade snap
            const phase = t * 2;
            const s = Math.sin(Math.PI * (phase < 1 ? smoothstep(0, 1, phase) : 1 + smoothstep(0, 1, phase - 1)));
            p.overrideX = (phase < 1 ? -1 : 1) * 0.6 * Math.abs(s) * a.side;
            p.overrideY = 0.12;
            break;
          }
        }
      }
      return p;
    }

    /**
     * @param {number} dt  ms since last frame
     * @param {{x:number,y:number}|null} target normalised look target (y up), null = wander
     */
    update(dt, target) {
      this.clock += dt;

      if (this.pending && this.clock >= this.pending.at) {
        this.style = this.pending.style;
        this.palette = this.pending.palette;
        this.pending = null;
      }

      if (this.autoActions) {
        this.nextBlink -= dt;
        if (this.nextBlink <= 0) {
          this.trigger(Math.random() < 0.2 ? 'double' : 'blink');
          this.nextBlink = rand(2500, 6000);
        }
        this.nextIdle -= dt;
        if (this.nextIdle <= 0) {
          this.trigger(pick(IDLE_POOL));
          this.nextIdle = rand(6000, 12000);
        }
      }

      this.p = this._params();
      const p = this.p;

      // where do we want to look?
      let tx, ty;
      if (target) {
        tx = target.x; ty = target.y;
      } else {
        this.nextWander -= dt;
        if (this.nextWander <= 0) {
          this.wander = Math.random() < 0.35 ? { x: 0, y: 0 } : { x: rand(-0.6, 0.6), y: rand(-0.4, 0.4) };
          this.nextWander = rand(700, 2800);
        }
        tx = this.wander.x; ty = this.wander.y;
      }
      if (p.overrideW > 0) {
        tx += (p.overrideX - tx) * p.overrideW;
        ty += (p.overrideY - ty) * p.overrideW;
      }

      // per-creature lag
      const k = 1 - Math.exp(-dt / this.tau);
      this.look.x += (tx - this.look.x) * k;
      this.look.y += (ty - this.look.y) * k;

      // springy follow (slightly under-damped → tiny overshoot)
      const K = 260, C = 22;
      const total = Math.min(dt, 64) / 1000;
      const steps = Math.max(1, Math.ceil(total / 0.008));
      const h = total / steps;
      for (let i = 0; i < steps; i++) {
        this.vel.x += (K * (this.look.x - this.pos.x) - C * this.vel.x) * h;
        this.vel.y += (K * (this.look.y - this.pos.y) - C * this.vel.y) * h;
        this.pos.x += this.vel.x * h;
        this.pos.y += this.vel.y * h;
      }

      this.actions = this.actions.filter((a) => this.clock < a.start + a.dur);
    }

    /**
     * Draw the pair of eyes centred at (cx, cy) on a screen of radius R.
     * opt.glow: shadow blur in canvas px (0 = off)
     */
    draw(ctx, cx, cy, R, opt = {}) {
      const S = SHAPES[this.style];
      const p = this.p;
      const breath = Math.sin((this.clock / this.breathPeriod) * TAU);
      const lx = this.pos.x, ly = this.pos.y;
      const scale = p.scale;

      const baseX = cx + lx * 0.26 * R;
      const baseY = cy - ly * 0.22 * R + breath * 0.028 * R + p.hopY * R;
      const sep = S.sep * R * (1 - 0.14 * Math.abs(lx)) * (1 + (scale - 1) * 0.5);

      for (const side of [-1, 1]) {
        const toward = side * lx; // > 0: this eye is on the side the face turns to
        const fore = toward > 0 ? 1 - 0.3 * toward : 1 - 0.08 * toward;
        const w = S.w * R * scale * p.sx * fore * (1 - 0.012 * breath);
        const h = S.h * R * scale * p.sy * (1 + 0.03 * breath) * (1 - 0.08 * Math.abs(ly));
        const open = side < 0 ? p.openL : p.openR;
        drawEye(ctx, this.style, this.palette, baseX + side * sep, baseY, w, h, side, open, p, lx, ly, R, opt.glow || 0);
      }
    }
  }

  function eyePath(style, x, y, w, h, side) {
    const path = new Path2D();
    if (style === 'pill') {
      roundRect(path, x - w / 2, y - h / 2, w, h, Math.min(w, h) / 2);
    } else if (style === 'cat') {
      const k = h * 0.15;
      const outerY = y - k, innerY = y + k * 0.3;
      const leftY = side < 0 ? outerY : innerY;
      const rightY = side < 0 ? innerY : outerY;
      path.moveTo(x - w / 2, leftY);
      path.quadraticCurveTo(x, y - h, x + w / 2, rightY);
      path.quadraticCurveTo(x, y + h, x - w / 2, leftY);
      path.closePath();
    } else {
      path.ellipse(x, y, w / 2, h / 2, 0, 0, TAU);
    }
    return path;
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(r, 0), 0, TAU);
    ctx.fill();
  }

  function drawEye(ctx, style, pal, x, y, w, h, side, open, p, lx, ly, R, glow) {
    const happyT = smoothstep(0, 0.5, p.happy);
    const arcT = smoothstep(0.35, 1, p.happy);
    const o = open * (1 - happyT);
    const minT = R * 0.045;
    const hh = Math.max(h * o, minT);

    ctx.save();

    // eyelids (sleepy / angry) — clip away everything above a (tilted) lid line
    if (p.lid > 0.001) {
      const top = y - h / 2 + h * p.lid;
      const tilt = h * 0.32 * p.angry;
      const innerY = top + tilt, outerY = top - tilt * 0.4;
      const leftY = side < 0 ? outerY : innerY;
      const rightY = side < 0 ? innerY : outerY;
      const slope = (rightY - leftY) / w;
      const clip = new Path2D();
      clip.moveTo(x - w, leftY - (slope * w) / 2);
      clip.lineTo(x + w, rightY + (slope * w) / 2);
      clip.lineTo(x + w, y + h * 2);
      clip.lineTo(x - w, y + h * 2);
      clip.closePath();
      ctx.clip(clip);
    }

    let fill = pal.eye;
    if (pal.eye2) {
      const g = ctx.createLinearGradient(x, y - h / 2, x, y + h / 2);
      g.addColorStop(0, pal.eye);
      g.addColorStop(1, pal.eye2);
      fill = g;
    }
    const glowOn = () => {
      if (glow) { ctx.shadowColor = pal.eye2 || pal.eye; ctx.shadowBlur = glow; }
    };

    const eyeAlpha = 1 - arcT;
    if (eyeAlpha > 0.001) {
      const path = eyePath(style, x, y, w, hh, side);
      glowOn();
      ctx.globalAlpha = eyeAlpha;
      ctx.fillStyle = fill;
      ctx.fill(path);
      ctx.shadowBlur = 0;

      const d = smoothstep(0.3, 0.7, o) * eyeAlpha;
      if (d > 0.01) {
        ctx.save();
        ctx.clip(path);
        ctx.globalAlpha = d;
        drawDetails(ctx, style, pal, x, y, w, h, hh, p, lx, ly);
        ctx.restore();
      }
    }

    // happy: ^ ^
    if (arcT > 0.001) {
      const rr = w * 0.46;
      glowOn();
      ctx.globalAlpha = arcT;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(minT * 1.1, w * 0.26);
      ctx.strokeStyle = pal.eye;
      ctx.beginPath();
      ctx.arc(x, y + rr * 0.5, rr, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawDetails(ctx, style, pal, x, y, w, h, hh, p, lx, ly) {
    const glint = pal.glint || '#ffffff';
    const pupil = pal.pupil || '#0a0a0a';
    switch (style) {
      case 'ring': {
        ctx.fillStyle = pupil;
        circle(ctx, x + lx * w * 0.16, y - ly * h * 0.16, w * 0.27 * p.pupil);
        ctx.fillStyle = glint;
        circle(ctx, x - w * 0.17, y - h * 0.19, w * 0.11);
        ctx.globalAlpha *= 0.8;
        circle(ctx, x + w * 0.14, y + h * 0.14, w * 0.05);
        break;
      }
      case 'cat': {
        ctx.fillStyle = pupil;
        ctx.beginPath();
        ctx.ellipse(x + lx * w * 0.14, y - ly * hh * 0.05, (w * 0.09) / p.pupil, hh * 0.46, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = glint;
        circle(ctx, x - w * 0.17, y - hh * 0.14, w * 0.07);
        break;
      }
      case 'bean': {
        ctx.fillStyle = glint;
        circle(ctx, x - w * 0.14, y - h * 0.18, w * 0.17);
        circle(ctx, x + w * 0.16, y - h * 0.01, w * 0.075);
        break;
      }
      case 'pill': {
        ctx.fillStyle = glint;
        ctx.globalAlpha *= 0.9;
        ctx.beginPath();
        ctx.ellipse(x - w * 0.12, y - h * 0.24, w * 0.13, h * 0.08, -0.35, 0, TAU);
        ctx.fill();
        break;
      }
      case 'dot': {
        ctx.fillStyle = glint;
        ctx.globalAlpha *= 0.85;
        circle(ctx, x - w * 0.17, y - w * 0.17, w * 0.14);
        break;
      }
    }
  }

  // ------------------------------------------------------------- showcase
  /** Pack circles into the unit disc: a few big ones, then fill the gaps. */
  function packCircles(maxCount = 38) {
    const GAP = 0.025;
    const sizes = [0.3, 0.24, 0.19, 0.16, 0.14, 0.13, 0.12, 0.11, 0.1, 0.09, 0.08, 0.07];
    const items = [];
    const fits = (x, y, r) => {
      if (Math.hypot(x, y) + r > 1 - GAP) return false;
      for (const c of items) if (Math.hypot(x - c.x, y - c.y) < r + c.r + GAP) return false;
      return true;
    };
    for (let r of sizes) {
      let placed = false;
      while (!placed && r > 0.05) {
        for (let i = 0; i < 600 && !placed; i++) {
          const a = rand(0, TAU), d = Math.sqrt(Math.random()) * (1 - r - GAP);
          const x = Math.cos(a) * d, y = Math.sin(a) * d;
          if (fits(x, y, r)) { items.push({ x, y, r }); placed = true; }
        }
        if (!placed) r *= 0.92;
      }
    }
    const clearance = (x, y) => {
      let c = 1 - Math.hypot(x, y) - GAP;
      for (const it of items) c = Math.min(c, Math.hypot(x - it.x, y - it.y) - it.r - GAP);
      return c;
    };
    while (items.length < maxCount) {
      let best = null;
      for (let i = 0; i < 1500; i++) {
        const a = rand(0, TAU), d = Math.sqrt(Math.random());
        const x = Math.cos(a) * d, y = Math.sin(a) * d;
        const c = clearance(x, y);
        if (!best || c > best.c) best = { x, y, c };
      }
      for (let i = 0; i < 200; i++) {
        const x = best.x + rand(-0.03, 0.03), y = best.y + rand(-0.03, 0.03);
        if (Math.hypot(x, y) >= 1) continue;
        const c = clearance(x, y);
        if (c > best.c) best = { x, y, c };
      }
      const r = Math.min(best.c, 0.14);
      if (r < 0.045) break;
      items.push({ x: best.x, y: best.y, r });
    }
    return items;
  }

  class Showcase {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.bg = opts.bg || '#e9e9e7';
      this.glow = opts.glow != null ? opts.glow : true;
      this.started = -1;
      this.hovered = null;

      const looks = [];
      for (const s of STYLES) for (const pal of PALETTES) looks.push({ style: s, palette: pal });
      this.looks = shuffle(looks);
      this.lookIndex = 0;

      const circles = packCircles(opts.count || 38);
      const delays = shuffle(circles.map((_, i) => (circles.length > 1 ? (i / (circles.length - 1)) * 1100 : 0)));
      this.items = circles.map((c, i) => ({
        ...c,
        delay: delays[i],
        hover: 0,
        swap: null,
        creature: new Creature(this._nextLook()),
      }));

      canvas.addEventListener('pointermove', (e) => {
        this.hovered = this._hit(e) || null;
        canvas.style.cursor = this.hovered ? 'pointer' : 'default';
      });
      canvas.addEventListener('pointerleave', () => { this.hovered = null; });
      canvas.addEventListener('click', (e) => {
        const it = this._hit(e);
        if (it && !it.swap) it.swap = { start: performance.now(), done: false };
      });
      this.resize();
    }

    _nextLook() {
      const l = this.looks[this.lookIndex++ % this.looks.length];
      return { style: l.style, palette: l.palette };
    }

    _hit(e) {
      const r = this.canvas.getBoundingClientRect();
      const half = r.width / 2;
      const x = (e.clientX - r.left - half) / half;
      const y = (e.clientY - r.top - half) / half;
      return this.items.find((it) => Math.hypot(x - it.x, y - it.y) <= it.r);
    }

    resize() {
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const s = Math.round((this.canvas.clientWidth || 600) * dpr);
      this.canvas.width = this.canvas.height = s;
    }

    start(now) { if (this.started < 0) this.started = now; }

    update(dt, now, lookAt) {
      const rect = this.canvas.getBoundingClientRect();
      const half = rect.width / 2;
      for (const it of this.items) {
        const sx = rect.left + half + it.x * half;
        const sy = rect.top + half + it.y * half;
        it.creature.update(dt, lookAt(sx, sy));
        const target = it === this.hovered ? 1 : 0;
        const step = dt / 400;
        it.hover += clamp(target - it.hover, -step, step);
      }
    }

    draw(now) {
      const ctx = this.ctx, W = this.canvas.width, half = W / 2;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, W);
      ctx.fillStyle = this.bg;
      ctx.beginPath();
      ctx.arc(half, half, half, 0, TAU);
      ctx.fill();
      if (this.started < 0) return;

      for (const it of this.items) {
        const age = now - this.started - it.delay;
        if (age <= 0) continue;
        const pop = ease.outBack(Math.min(age / 550, 1));

        let swapScale = 1;
        if (it.swap) {
          const t = (now - it.swap.start) / 600;
          if (t < 0.35) swapScale = 1 - ease.inOutCubic(t / 0.35);
          else {
            if (!it.swap.done) {
              const look = this._nextLook();
              it.creature.style = look.style;
              it.creature.palette = look.palette;
              it.creature.trigger('happy');
              it.swap.done = true;
            }
            swapScale = t >= 1 ? 1 : ease.outBack((t - 0.35) / 0.65);
            if (t >= 1) it.swap = null;
          }
        }

        const hoverScale = 1 - 0.05 * ease.inOutCubic(it.hover);
        const cx = half + it.x * half, cy = half + it.y * half;
        const r = it.r * half * pop * hoverScale * swapScale;
        if (r <= 0.5) continue;

        ctx.save();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
        ctx.clip();
        const R = r * 0.9;
        it.creature.draw(ctx, cx, cy, R, { glow: this.glow ? R * 0.12 : 0 });
        ctx.restore();
      }
    }
  }

  global.Eyes = { Creature, Showcase, STYLES, PALETTES, ACTIONS, ease, rand, pick, clamp };
})(window);
