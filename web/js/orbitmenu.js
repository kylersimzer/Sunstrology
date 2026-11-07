// The orbit menu: a second way round the app, drawn as a real orrery. Every page rides a real planet at its true
// heliocentric position today (Earth now is Today, Earth on your birthday is your chart, and so on), on rings spaced
// like the main map. Scroll (or ← →, or 1–7) to choose a page, Enter or a click to open it: the camera dives into it.
// Drag sideways to turn the view; drag the date to move through time. The Sun is a sphere of dots whose brightness follows the real 11-year solar
// cycle, with the odd flare rippling across it; click it for a card on the Sun that day. Music of the spheres is off
// by default: each planet hums at its Cousto tone (its orbital frequency raised by octaves into hearing).
// On a first visit it is the front door: scattered dots pull into the Sun, the rings draw in, the wordmark settles.
import { byCode, bodyState, jdFromDate, dateFromJd, JD_MIN, JD_MAX, solarCycle, computeChart, normDeg } from './astro.js';

const TAU = Math.PI * 2, D2R = Math.PI / 180;
const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const fmt = jd => { const d = dateFromJd(jd); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };

// ring radius for each planet, in Sun radii; spaced evenly, like the main map's default scale
const RING = { MER: 1.4, VEN: 1.75, EAR: 2.1, MAR: 2.45, JUP: 2.85, SAT: 3.25 };
// Hans Cousto's planetary tones: each orbit's frequency, doubled until it can be heard (Hz)
const TONE = { MER: 141.27, VEN: 221.23, EAR: 136.1, MAR: 144.72, JUP: 183.58, SAT: 147.85 };

export function createOrbitMenu({ items, onPick, onClose, birthJd }) {
  const root = document.createElement('div');
  root.className = 'omenu'; root.hidden = true;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Menu');
  root.innerHTML = `
    <canvas class="omenu-cv"></canvas>
    <div class="omenu-top">
      <div class="omenu-brand"><span class="omenu-mark"></span><span>SUNSTROLOGY</span><em class="mono">MENU</em></div>
      <div class="omenu-right">
        <button class="omenu-sound mono" aria-pressed="false" title="Music of the spheres: each planet hums at its own orbital tone">SOUND <i>OFF</i></button>
        <button class="omenu-close mono" aria-label="Close menu"><span class="lbl">CLOSE</span> <kbd>ESC</kbd></button>
      </div>
    </div>
    <div class="omenu-intro">
      <div class="omenu-word" aria-hidden="true">SUNSTROLOGY</div>
      <div class="omenu-tag mono" aria-hidden="true">YOUR BIRTH CHART, SEEN FROM THE SUN</div>
      <div class="omenu-menu mono">
        <div class="omenu-menu-head">CHOOSE A PAGE</div>
        <nav class="omenu-pages" aria-label="Pages">${items.map((it, i) => `<button data-i="${i}"><b>${String(i + 1).padStart(2, '0')}</b>${it.name.toUpperCase()}</button>`).join('')}</nav>
      </div>
    </div>
    <div class="omenu-date mono"><button class="omenu-scrub" aria-label="Drag to move through time">‹ <span class="d"></span> ›</button><button class="omenu-now" hidden>BACK TO TODAY</button></div>
    <button class="omenu-step prev" aria-label="Previous">←</button>
    <button class="omenu-step next" aria-label="Next">→</button>
    <div class="omenu-hint mono"><span class="wide">SCROLL OR ← → TO CHOOSE · ENTER TO OPEN · DRAG THE DATE TO MOVE THROUGH TIME</span><span class="narrow">TAP A PAGE · DRAG THE DATE FOR TIME</span></div>
    <ul class="omenu-list">${items.map((it, i) => `<li><button data-i="${i}">${it.name}<span>${it.sub}</span></button></li>`).join('')}</ul>`;
  document.body.append(root);
  const cv = root.querySelector('canvas'), g = cv.getContext('2d');
  const dateEl = root.querySelector('.omenu-scrub .d'), pageBtns = [...root.querySelectorAll('.omenu-pages button')], nowBtn = root.querySelector('.omenu-now'), soundBtn = root.querySelector('.omenu-sound');

  // the Sun: points spread evenly over a sphere (a Fibonacci lattice), each with a scattered start for the intro
  const N = 1100, dots = [], scatter = [], delay = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    dots.push([r * Math.cos(th), y, r * Math.sin(th)]);
    scatter.push([(Math.random() * 2 - 1) * 7, (Math.random() * 2 - 1) * 4, (Math.random() * 2 - 1) * 3]);
    delay.push(Math.random() * 0.75);
  }
  const codes = [...new Set(items.map(it => it.planet))];
  const TILT = 17 * D2R, ROLL = -6 * D2R;   // rings seen nearly edge-on

  const S = { open: false, yaw: 0, target: null, vel: 0, drag: null, hover: -1, focus: 0, pin: -1, current: null, t: 0, t0: 0, last: 0,
    pos: [], W: 0, H: 0, dpr: 1, intro: false, dive: null, live: null, liveFor: null, liveAt: 0, timeTo: null,
    sel: 0, wheelAcc: 0, jd: jdFromDate(new Date()), today: jdFromDate(new Date()), lon: {}, flares: [], nextFlare: 3, sun: null, sunAt: -9, mouse: null };
  const SUN = -2;
  const rotX = ([x, y, z], a) => [x, y * Math.cos(a) - z * Math.sin(a), y * Math.sin(a) + z * Math.cos(a)];
  const rotY = ([x, y, z], a) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
  const rotZ = ([x, y, z], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a), z];
  const onRing = (r, a) => rotZ(rotX([r * Math.cos(a), 0, r * Math.sin(a)], TILT), ROLL);   // z toward the viewer
  // where each page sits: its planet's true longitude on that date (the birthday Earth at your birth), turned by the camera
  const lonOf = i => items[i].ghost ? S.lon.BIRTH ?? normDeg((S.lon.EAR ?? 0) + 180) : S.lon[items[i].planet] ?? 0;
  const angleOf = i => lonOf(i) * D2R + S.yaw;
  const ringOf = i => RING[items[i].planet];
  function positions() {
    codes.forEach(c => { S.lon[c] = bodyState(byCode[c], S.jd).lon; });
    const b = birthJd?.(); S.lon.BIRTH = b != null ? bodyState(byCode.EAR, b).lon : null;
  }

  function size() {
    const r = root.getBoundingClientRect(); S.dpr = Math.min(2, window.devicePixelRatio || 1);
    S.W = r.width; S.H = r.height; cv.width = r.width * S.dpr; cv.height = r.height * S.dpr;
  }
  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '236, 235, 230';

  /* ---------- live details: the focused page's own, or the Sun's ---------- */
  const imgs = new Map();
  function sealImage(svg) {
    if (!svg) return null;
    if (!imgs.has(svg)) { const im = new Image(); im.src = 'data:image/svg+xml,' + encodeURIComponent(svg.includes('xmlns') ? svg : svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); imgs.set(svg, im); }
    const im = imgs.get(svg); return im.complete ? im : null;
  }
  function sunCard() {
    if (S.t - S.sunAt > 1 || !S.sun) {
      const c = computeChart(S.jd), cyc = solarCycle(S.jd), e = c.earth;
      S.sun = { cyc, lines: [
        cyc ? `SOLAR CYCLE ${cyc.n} · ${cyc.mood.toUpperCase()}` : 'SOLAR CYCLE · OUTSIDE THE RECORD',
        cyc ? `${Math.round(cyc.phase * 100)}% THROUGH ITS 11 YEARS${cyc.predicted ? ' (PREDICTED)' : ''}` : '',
        `OFF-CENTRE BY ${c.wobble.rsun.toFixed(2)} SOLAR RADII`,
        `LIGHT TAKES ${(e.r * 499.005 / 60).toFixed(1)} MIN TO REACH EARTH`,
      ].filter(Boolean) };
      S.sunAt = S.t;
    }
    return S.sun;
  }
  function liveOf(i) {
    if (i === SUN) return { lines: sunCard().lines };
    if (i !== S.liveFor || S.t - S.liveAt > 0.25) {
      S.liveFor = i; S.liveAt = S.t;
      try { S.live = items[i].live?.() || null; } catch { S.live = null; }
    }
    return S.live;
  }
  // how lively the Sun is: peaks about 40% of the way through each cycle
  const activity = () => { const c = S.sun?.cyc ?? solarCycle(S.jd); return c ? Math.exp(-Math.pow((c.phase - 0.4) / 0.24, 2)) : 0.4; };

  /* ---------- music of the spheres ---------- */
  const audio = { ctx: null, master: null, voices: {}, on: false };
  function startSound() {
    if (!audio.ctx) {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const ctx = new C(), master = ctx.createGain(), lp = ctx.createBiquadFilter(), delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
      master.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 1400; delay.delayTime.value = 0.38; fb.gain.value = 0.35; wet.gain.value = 0.3;
      master.connect(lp); lp.connect(ctx.destination); lp.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(ctx.destination);
      codes.forEach(c => {
        const gn = ctx.createGain(); gn.gain.value = 0; gn.connect(master);
        [[1, 'sine'], [1.003, 'triangle'], [2, 'sine']].forEach(([m, type], j) => {
          const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = TONE[c] * m; og.gain.value = [0.6, 0.25, 0.08][j];
          o.connect(og); og.connect(gn); o.start();
        });
        audio.voices[c] = gn;
      });
      audio.ctx = ctx; audio.master = master;
    }
    audio.ctx.resume(); audio.on = true;
    audio.master.gain.setTargetAtTime(0.16, audio.ctx.currentTime, 0.6);
  }
  function stopSound(soft = true) {
    if (!audio.ctx) return;
    audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, soft ? 0.4 : 0.05);
    audio.on = false;
  }
  function mix() {
    if (!audio.on || !audio.ctx) return;
    const now = audio.ctx.currentTime, fp = S.focus >= 0 ? items[S.focus].planet : null;
    codes.forEach(c => {
      // louder in focus; louder still when it lines up with another planet (a chord, as seen from the Sun)
      let near = 0; codes.forEach(o => { if (o !== c) { const d = Math.abs(((S.lon[c] - S.lon[o]) % 360 + 540) % 360 - 180); near = Math.max(near, clamp01(1 - d / 12)); } });
      audio.voices[c].gain.setTargetAtTime(0.05 + (c === fp ? 0.16 : 0) + near * 0.14, now, 0.3);
    });
  }
  const showSound = () => { soundBtn.setAttribute('aria-pressed', audio.on); soundBtn.querySelector('i').textContent = audio.on ? 'ON' : 'OFF'; };
  soundBtn.onclick = () => { audio.on ? stopSound() : startSound(); showSound(); };

  /* ---------- time ---------- */
  function setJd(jd) {
    S.jd = Math.max(JD_MIN, Math.min(JD_MAX, jd)); positions();
    const off = S.jd - S.today, ad = Math.abs(off);
    const rel = ad < 0.5 ? 'TODAY' : ad < 60 ? `${Math.round(ad)} DAYS ${off < 0 ? 'AGO' : 'AHEAD'}` : ad < 730 ? `${Math.round(ad / 30.44)} MONTHS ${off < 0 ? 'AGO' : 'AHEAD'}` : `${Math.round(ad / 365.25)} YEARS ${off < 0 ? 'AGO' : 'AHEAD'}`;
    dateEl.textContent = `${fmt(S.jd)} · ${rel}`;
    nowBtn.hidden = ad < 0.5;
  }
  nowBtn.onclick = () => { S.timeTo = S.today; };

  function frame(now) {
    if (!S.open) return;
    const dt = Math.min(0.05, (now - (S.last || now)) / 1000); S.last = now; S.t += dt;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (S.target != null) { const d = S.target - S.yaw; S.yaw += d * Math.min(1, dt * 5); if (Math.abs(d) < 0.001) { S.yaw = S.target; S.target = null; } }
    else if (!S.drag && !S.dive) { S.yaw += S.vel * dt; S.vel *= Math.pow(0.04, dt); if (!still && S.hover === -1 && S.pin === -1 && Math.abs(S.vel) < 0.01) S.yaw += Math.sin(S.t * 0.35) * 0.0006; }
    if (S.timeTo != null) { const d = S.timeTo - S.jd; setJd(Math.abs(d) < 0.5 ? S.timeTo : S.jd + d * Math.min(1, dt * 4)); if (Math.abs(S.timeTo - S.jd) < 0.01) S.timeTo = null; }
    // flares: more often when the Sun is near maximum
    if (!still && S.t > S.nextFlare) {
      const v = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1], m = Math.hypot(...v) || 1;
      S.flares.push({ dir: v.map(x => x / m), t0: S.t }); S.nextFlare = S.t + 2 + Math.random() * (9 - 6 * activity());
    }
    S.flares = S.flares.filter(f => S.t - f.t0 < 1.8);
    draw(still); mix();
    if (S.dive && S.t - S.dive.t0 >= 0.8) { const v = items[S.dive.i].view; S.dive = null; close(true); onPick(v); return; }
    requestAnimationFrame(frame);
  }

  // the scene's frame, shared by drawing and hit-testing
  function frameGeom() {
    const W = S.W, H = S.H, narrow = W < 700, cx = W / 2, cy = H * (narrow ? 0.34 : 0.39);
    const unit = Math.min((W / 2 - (narrow ? 14 : 40)) / 3.55, H / 5.6), cam = 8;
    return { W, H, narrow, cx, cy, unit, cam, sunR: unit * cam / Math.sqrt(cam * cam - 1) };
  }

  function draw(still) {
    const I = ink(), A = a => `rgba(${I}, ${a})`;
    const { W, H, narrow, cx, cy, unit, cam, sunR } = frameGeom();
    g.setTransform(S.dpr, 0, 0, S.dpr, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, W, H);
    const proj = ([x, y, z]) => { const s = cam / (cam - z); return [cx + x * unit * s, cy - y * unit * s, z, s]; };
    const hidden = ([px, py, z]) => z < 0 && Math.hypot(px - cx, py - cy) < sunR * 0.98;
    // cursor gravity: things near the pointer lean toward it, like light bending round a mass
    const M = S.mouse && !S.dive ? S.mouse : null;
    const bend = (x, y, amt = 9) => {
      if (!M) return [x, y];
      const dx = M[0] - x, dy = M[1] - y, d = Math.hypot(dx, dy), R = 130;
      if (d > R || d < 1) return [x, y];
      const f = Math.pow(1 - d / R, 2) * amt / d; return [x + dx * f, y + dy * f];
    };
    const T = S.t - S.t0, intro = S.intro && !still;
    const ringIn = ri => intro ? easeOut(clamp01((T - 1.0 - ri * 0.12) / 0.9)) : 1;
    const worldsIn = intro ? clamp01((T - 1.9) / 0.6) : 1;

    // the dive: the camera falls toward the chosen world, which slides to the centre, and everything else streams out
    let k = 0;
    if (S.dive) {
      k = easeIn(clamp01((S.t - S.dive.t0) / 0.8));
      const [px, py] = S.dive.p, s = 1 + 11 * k;
      g.translate((cx - px) * k, (cy - py) * k); g.translate(px, py); g.scale(s, s); g.translate(-px, -py);
      g.globalAlpha = 1 - clamp01((k - 0.55) / 0.45);
    }

    // the ruler across the middle
    g.strokeStyle = A(0.12 * ringIn(0)); g.lineWidth = 1; g.beginPath(); g.moveTo(-W, cy); g.lineTo(2 * W, cy); g.stroke();
    for (let x = cx % 44; x < W; x += 44) { g.beginPath(); g.moveTo(x, cy - 3); g.lineTo(x, cy + 3); g.stroke(); }
    [[cx, cy - sunR * 1.7], [cx, cy + sunR * 1.7]].forEach(([x, y]) => { g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke(); });

    // the planets' rings, as fine dotted lines: back halves first (fainter, behind the Sun), front halves after it
    const focusRing = S.focus >= 0 ? items[S.focus].planet : null;
    const rings = front => codes.forEach((c, ri) => {
      const reach = ringIn(ri), r = RING[c], lit = c === focusRing; if (reach <= 0) return;
      for (let d = 0; d < 360; d++) {
        const off = Math.abs((((d - 90) % 360) + 540) % 360 - 180) / 180;
        if (off > reach) continue;
        const p = proj(onRing(r, d / 360 * TAU));
        if ((p[2] >= 0) !== front || hidden(p)) continue;
        const [x, y] = bend(p[0], p[1], 6);
        g.fillStyle = A((front ? 0.5 : 0.14) * (lit ? 1.2 : 0.7));
        g.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
      }
    });
    rings(false);

    // the Sun: lit from the upper right, brighter near solar maximum, with flares rippling out across it
    const act = activity(), sunLit = 0.7 + 0.45 * act, sunHot = S.focus === SUN;
    const spin = S.yaw * 0.6 + (still ? 0 : S.t * 0.04), L = [0.55, 0.5, 0.67];
    for (let i = 0; i < N; i++) {
      let q = rotX(rotY(dots[i], spin), 0.32);
      const e = intro ? easeOut(clamp01((T - delay[i]) / 1.3)) : 1;
      if (e >= 1 && q[2] < -0.05) continue;
      const lum = Math.max(0, q[0] * L[0] + q[1] * L[1] + q[2] * L[2]);
      let a = Math.min(1, (0.04 + lum * 0.95) * sunLit) * (0.35 + 0.65 * Math.max(0, q[2]));
      for (const f of S.flares) {
        const ft = S.t - f.t0, ang = Math.acos(Math.max(-1, Math.min(1, dots[i][0] * f.dir[0] + dots[i][1] * f.dir[1] + dots[i][2] * f.dir[2])));
        a += 0.9 * Math.exp(-Math.pow((ang - ft * 0.9) / 0.1, 2)) * (1 - ft / 1.8) * Math.max(0, q[2] + 0.2);
      }
      if (sunHot) a = Math.min(1, a * 1.25 + 0.04);
      if (e < 1) { const s0 = scatter[i]; q = [s0[0] + (q[0] - s0[0]) * e, s0[1] + (q[1] - s0[1]) * e, s0[2] + (q[2] - s0[2]) * e]; a = 0.4 * (1 - e) + (q[2] < -0.05 ? 0 : a) * e; }
      if (k) { const f = 1 + k * 3.2; q = [q[0] * f, q[1] * f, q[2] * f]; }
      if (a < 0.03) continue;
      const p = proj(q), s = 0.7 + lum * 0.9, [x, y] = bend(p[0], p[1]);
      g.fillStyle = A(Math.min(1, a)); g.fillRect(x - s / 2, y - s / 2, s, s);
    }

    rings(true);

    // the worlds, at their real places on that date
    S.pos = items.map((it, i) => { const p = proj(onRing(ringOf(i), angleOf(i))); const [x, y] = bend(p[0], p[1], 5); return [x, y, p[2], p[3]]; });
    const fr = i => Math.sin(angleOf(i));
    let front = 0; S.pos.forEach((p, i) => { if (fr(i) > fr(front)) front = i; });
    S.focus = S.dive ? S.dive.i : S.pin !== -1 ? S.pin : S.hover !== -1 ? S.hover : S.sel != null ? S.sel : front;
    pageBtns.forEach((b, i) => b.classList.toggle('on', i === S.focus));
    if (worldsIn <= 0) return;
    const ga = g.globalAlpha; g.globalAlpha = ga * worldsIn;
    g.textBaseline = 'middle';
    const fs = narrow ? 10 : 11;
    S.pos.forEach((p, i) => {
      if (hidden(p)) return;
      const f = i === S.focus, cur = items[i].view === S.current, depth = 0.5 + 0.5 * Math.max(-1, Math.min(1, p[2] / 3)), ghost = items[i].ghost;
      // a short trail: where this planet really was over the last stretch of its year
      if (!ghost && !k) {
        const per = byCode[items[i].planet].period;
        for (let j = 1; j <= 10; j++) {
          const lon = bodyState(byCode[items[i].planet], S.jd - j * per * 0.012).lon;
          const q = proj(onRing(ringOf(i), lon * D2R + S.yaw)); if (hidden(q)) continue;
          g.fillStyle = A((f ? 0.5 : 0.25) * (1 - j / 11) * (0.5 + depth / 2)); g.fillRect(q[0] - 0.8, q[1] - 0.8, 1.6, 1.6);
        }
      }
      // a soft glow, stronger in focus
      const gr = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], f ? 22 : 12);
      gr.addColorStop(0, A(f ? 0.32 : 0.12 * depth)); gr.addColorStop(1, A(0));
      g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], f ? 22 : 12, 0, TAU); g.fill();
      if (ghost) { g.strokeStyle = A(f ? 1 : 0.35 + 0.45 * depth); g.lineWidth = 1.2; g.setLineDash(S.lon.BIRTH == null ? [2, 2] : []); g.beginPath(); g.arc(p[0], p[1], f ? 3.6 : 2.8, 0, TAU); g.stroke(); g.setLineDash([]); }
      else { g.fillStyle = A(f ? 1 : 0.35 + 0.45 * depth); g.beginPath(); g.arc(p[0], p[1], f ? 3.2 : 2.4, 0, TAU); g.fill(); }
      if (cur && !S.intro) { g.strokeStyle = A(f ? 0.9 : 0.5); g.lineWidth = 1; g.beginPath(); g.arc(p[0], p[1], 7, 0, TAU); g.stroke(); }
      if (!f && !k) {
        g.font = `500 ${fs}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = A(0.22 + 0.5 * depth); g.textAlign = 'left';
        g.fillText(items[i].name.toUpperCase(), p[0] + 9, p[1] - 9);
      }
    });

    // the callout: for the world in focus, or the Sun
    const isSun = S.focus === SUN, p = isSun ? [cx + sunR * 0.55, cy - sunR * 0.55, 1] : S.pos[S.focus];
    if (p && !hidden(p) && !k) {
      const right = narrow ? true : p[0] < cx + sunR * 2 || p[0] < W * 0.7, dir = right ? 1 : -1;
      let ey, tx;
      if (narrow) {
        ey = cy + unit * 1.45; tx = cx;
        g.strokeStyle = A(0.45); g.lineWidth = 1; g.setLineDash([2, 3]);
        g.beginPath(); g.moveTo(p[0], p[1] + 5); g.lineTo(p[0], ey - 30); g.lineTo(cx, ey - 30); g.stroke(); g.setLineDash([]);
      } else {
        const ex = p[0] + dir * 44; ey = p[1] - 70; const lx = ex + dir * 18; tx = lx + dir * 6;
        g.strokeStyle = A(0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(p[0] + dir * 4, p[1] - 4); g.lineTo(ex, ey); g.lineTo(lx, ey); g.stroke();
      }
      g.textAlign = narrow ? 'center' : right ? 'left' : 'right';
      const it = items[S.focus];
      const name = isSun ? 'THE SUN' : it.name.toUpperCase();
      const sub = isSun ? `${fmt(S.jd)} · THE CENTRE OF IT ALL` : `${it.sub} · ${it.ghost ? (S.lon.BIRTH == null ? 'ADD A BIRTHDAY TO PLACE IT' : 'EARTH ON YOUR BIRTHDAY') : byCode[it.planet].name}`.toUpperCase();
      g.font = `500 ${fs - 1}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = A(0.35);
      if (!isSun) g.fillText(`${String(S.focus + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`, tx, ey - 18);
      g.font = `600 ${fs + 2}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = A(1);
      g.fillText(name, tx, ey - 1);
      g.font = `500 ${fs - 1}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = A(0.45);
      g.fillText(sub, tx, ey + 15);
      let y = ey + 33;
      const live = liveOf(S.focus);
      if (live?.lines?.length) {
        g.strokeStyle = A(0.18); g.beginPath(); g.moveTo(narrow ? tx - 60 : tx, y - 8); g.lineTo(narrow ? tx + 60 : tx + dir * 120, y - 8); g.stroke();
        g.font = `500 ${fs - 1}px 'Geist Mono', ui-monospace, monospace`;
        live.lines.forEach((ln, j) => { g.fillStyle = A(j ? 0.6 : 0.92); g.fillText(String(ln).toUpperCase(), tx, y); y += 14; });
      }
      const gx = narrow ? tx - 20 : right ? tx : tx - 40;
      const seal = sealImage(live?.seal);
      if (seal) { g.globalAlpha = ga * worldsIn * 0.95; g.drawImage(seal, gx, y - 2, 40, 40); g.globalAlpha = ga * worldsIn; y += 44; }
      if (live?.mini === 'orrery') { miniOrrery(gx + 20, y + 16, A); y += 40; }
      if (!isSun && it.view === S.current && !S.intro) { g.font = `500 ${fs - 1}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = A(0.32); g.fillText('YOU ARE HERE', tx, y); }
    }
    g.globalAlpha = ga;
    cv.style.cursor = S.drag ? 'grabbing' : S.hover !== -1 ? 'pointer' : 'grab';
  }

  function miniOrrery(x, y, A) {
    g.fillStyle = A(1); g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    [[18, 0.42, 0.9], [11, 0.42, 1.6]].forEach(([r, sq, sp], j) => {
      g.save(); g.translate(x, y); g.rotate(-0.2 + Math.sin(S.t * 0.4 + j) * 0.12);
      g.strokeStyle = A(0.45); g.lineWidth = 1; g.beginPath(); g.ellipse(0, 0, r, r * sq, 0, 0, TAU); g.stroke();
      const t = S.t * sp + j * 2;
      g.fillStyle = A(0.95); g.beginPath(); g.arc(Math.cos(t) * r, Math.sin(t) * r * sq, 1.8, 0, TAU); g.fill();
      g.restore();
    });
  }

  // turn the camera so world i comes round to the front, the short way
  function bring(i) {
    let a = Math.PI / 2 - lonOf(i) * D2R;
    a += Math.round((S.yaw - a) / TAU) * TAU;
    S.target = a; S.vel = 0;
  }
  // choosing: by page number, 01 to 07 and round again; the chosen world turns to the front
  const select = i => { S.sel = (i + items.length) % items.length; S.hover = -1; S.pin = -1; bring(S.sel); };
  const step = d => select((S.sel ?? S.focus ?? 0) + d);

  function pick(x, y) {
    let best = -1, bd = 26;
    const { cx, cy, sunR } = frameGeom();
    S.pos.forEach((p, i) => { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd && !(p[2] < 0 && Math.hypot(p[0] - cx, p[1] - cy) < sunR)) { bd = d; best = i; } });
    if (best === -1 && Math.hypot(x - cx, y - cy) < sunR) return SUN;     // anywhere on the Sun's disc
    return best;
  }
  const busy = () => S.dive || (S.intro && S.t - S.t0 < 1.9);
  cv.addEventListener('pointerdown', e => { if (busy()) return; S.drag = { x: e.clientX, y: e.clientY, moved: 0, axis: null }; cv.setPointerCapture(e.pointerId); S.target = null; });
  cv.addEventListener('pointermove', e => {
    const r = cv.getBoundingClientRect(); S.mouse = [e.clientX - r.left, e.clientY - r.top];
    if (S.drag) {
      const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.moved += Math.abs(dx) + Math.abs(dy);
      // dragging turns the view (time is the date's job)
      S.yaw += dx * 0.006; S.vel = dx * 0.006 * 60;
      S.drag.x = e.clientX; S.drag.y = e.clientY; return;
    }
    if (e.pointerType !== 'touch' && !busy()) S.hover = pick(S.mouse[0], S.mouse[1]);
  });
  cv.addEventListener('pointerup', e => {
    const r = cv.getBoundingClientRect(), moved = S.drag?.moved || 0; S.drag = null;
    if (e.pointerType === 'touch') S.mouse = null;
    if (busy() || moved >= 6) return;
    const i = pick(e.clientX - r.left, e.clientY - r.top);
    if (i === SUN) { S.pin = S.pin === SUN ? -1 : SUN; return; }
    S.pin = -1;
    if (i >= 0) { if (e.pointerType === 'touch' && S.focus !== i) select(i); else choose(i); }
  });
  cv.addEventListener('pointerleave', () => { S.hover = -1; S.mouse = null; });
  // the scroll wheel steps through the pages, one notch (or one good swipe on a trackpad) at a time
  root.addEventListener('wheel', e => {
    e.preventDefault(); if (busy()) return;
    S.wheelAcc += e.deltaY;
    if (Math.abs(S.wheelAcc) >= 60) { step(Math.sign(S.wheelAcc)); S.wheelAcc = 0; }
  }, { passive: false });
  // drag the date to move through time: about three days a pixel, faster the further you pull
  const scrub = root.querySelector('.omenu-scrub');
  scrub.addEventListener('pointerdown', e => { e.preventDefault(); try { scrub.setPointerCapture(e.pointerId); } catch { } S.scrub = { x: e.clientX }; S.timeTo = null; scrub.classList.add('on'); });
  scrub.addEventListener('pointermove', e => { if (!S.scrub) return; const dx = e.clientX - S.scrub.x; S.scrub.x = e.clientX; setJd(S.jd + dx * (3 + Math.abs(dx) * 0.6)); });
  const endScrub = () => { S.scrub = null; scrub.classList.remove('on'); };
  scrub.addEventListener('pointerup', endScrub); scrub.addEventListener('pointercancel', endScrub);
  scrub.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); S.timeTo = (S.timeTo ?? S.jd) + (e.key === 'ArrowRight' ? 30 : -30); } });
  root.querySelector('.omenu-pages').onclick = e => { const b = e.target.closest('[data-i]'); if (b) choose(+b.dataset.i); };
  root.querySelector('.omenu-pages').addEventListener('pointerover', e => { const b = e.target.closest('[data-i]'); if (b && !busy()) select(+b.dataset.i); });
  root.querySelector('.omenu-close').onclick = () => S.intro ? choose(Math.max(0, items.findIndex(it => it.view === S.current))) : close();
  root.querySelector('.omenu-step.prev').onclick = () => step(-1);
  root.querySelector('.omenu-step.next').onclick = () => step(1);
  root.querySelector('.omenu-list').onclick = e => { const b = e.target.closest('[data-i]'); if (b) choose(+b.dataset.i); };
  window.addEventListener('keydown', e => {
    if (!S.open) return;
    if (e.key === 'Escape') { e.preventDefault(); if (S.pin !== -1) S.pin = -1; else if (S.intro) choose(Math.max(0, items.findIndex(it => it.view === S.current))); else close(); }
    else if (busy()) { /* let the intro or the dive finish */ }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (/^[1-9]$/.test(e.key) && +e.key <= items.length) { e.preventDefault(); select(+e.key - 1); }
    else if (e.key === 't' || e.key === 'T') S.timeTo = S.today;
    else if (e.key === 'Enter' && !e.target.closest('button') && S.focus >= 0) { e.preventDefault(); choose(S.focus); }
    e.stopPropagation();
  }, true);
  new ResizeObserver(() => S.open && size()).observe(root);

  function choose(i) {
    if (i < 0 || S.dive) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !S.pos[i]) { close(true); onPick(items[i].view); return; }
    S.target = null; S.vel = 0; S.hover = -1; S.pin = -1;
    S.dive = { i, t0: S.t, p: S.pos[i].slice(0, 2) };
    root.classList.add('diving');
  }
  function open(current, mark, { intro = false } = {}) {
    if (mark) root.querySelector('.omenu-mark').innerHTML = mark;
    S.current = current; S.open = true; S.intro = intro; S.dive = null; S.pin = -1; root.hidden = false; S.last = 0; S.hover = -1; S.t0 = S.t; S.liveFor = null; S.mouse = null;
    S.today = jdFromDate(new Date()); S.timeTo = null; setJd(S.today); S.sunAt = -9;
    root.classList.toggle('intro', intro); root.classList.remove('diving');
    root.querySelector('.omenu-close .lbl').textContent = intro ? 'SKIP' : 'CLOSE';
    size();
    const i = Math.max(0, items.findIndex(it => it.view === current)); S.sel = i; S.wheelAcc = 0; bring(i); S.yaw = S.target - (intro ? 1.6 : 0.9);
    if (audio.wasOn) { startSound(); showSound(); }
    requestAnimationFrame(t => { root.classList.add('on'); frame(t); });
  }
  function close(quick = false) {
    const wasIntro = S.intro;
    S.open = false; S.intro = false; root.classList.remove('on');
    audio.wasOn = audio.on; if (audio.on) stopSound();     // fade out, and pick up again next time it opens
    if (quick) root.classList.add('quick');
    setTimeout(() => { if (!S.open) { root.hidden = true; root.classList.remove('quick', 'diving', 'intro'); } }, quick ? 120 : 220);
    onClose?.({ intro: wasIntro });
  }
  return { open, close, get isOpen() { return S.open; } };
}
