// Drawing: the wheel (the Sun's-eye view of the system) and the seal (a person's sky as a single figure).
// One ink at different strengths, like stems.fm and GODMIX. Aspect types are told apart by line style, not colour.
import { PLANETS, orbitPath, normDeg, D2R, bodyState } from './astro.js';
import { STATIONS, ROMAN, WORLDS } from './meaning.js';
import { WANDERERS, wandererAt, PROBES, probeAt, moonSystems, MOON_NAMES } from './objects.js';

// 'even' spaces the orbits evenly, like an orrery (interpolating between semi-major axes, so ellipses keep their shape).
const RUNGS = [[0, 0], [0.387, 1], [0.723, 2], [1, 3], [1.524, 4], [5.2, 5], [9.54, 6], [19.2, 7], [30.07, 8], [39.5, 9], [60, 10.6]];
const even = r => {
  for (let i = 1; i < RUNGS.length; i++) if (r <= RUNGS[i][0]) { const [a0, i0] = RUNGS[i - 1], [a1, i1] = RUNGS[i]; return 0.9 + i0 + (r - a0) / (a1 - a0) * (i1 - i0); }
  return 11.5;
};
export const SCALES = {
  even,
  sqrt: r => Math.sqrt(r),
  log: r => Math.log1p(r * 1.7),
  true: r => r,
};
const RMAX = 46;

/** Screen radius → distance from the Sun in AU, for the wheel at radius R (inverts the scale). */
export function radiusToAU(rad, R, scale = 'even') {
  const f = SCALES[scale] || SCALES.even, rIn = R * 0.83, k = r => f(r) / f(RMAX) * rIn;
  if (rad <= 0 || rad > k(RMAX)) return null;
  let lo = 0, hi = RMAX;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; k(mid) < rad ? lo = mid : hi = mid; }
  return (lo + hi) / 2;
}

export function ink() {
  const cs = getComputedStyle(document.documentElement);
  const rgb = cs.getPropertyValue('--ink').trim() || '236, 235, 230';
  const bg = cs.getPropertyValue('--bg').trim() || '#000';
  return { a: x => `rgba(${rgb}, ${x})`, solid: `rgb(${rgb})`, bg, light: document.documentElement.dataset.theme === 'light' };
}

const LINE = {
  Merge: { dash: [], w: 1.4, a: 0.7 },
  Signal: { dash: [1, 4], w: 1, a: 0.55 },
  Friction: { dash: [], w: 1.25, a: 0.62 },
  Flow: { dash: [], w: 0.8, a: 0.42 },
  Mirror: { dash: [6, 5], w: 1, a: 0.55 },
};
export const lineStyle = t => LINE[t];

const orbitCache = new Map();
function orbitFor(p, jd) {
  const key = p.code + ':' + Math.round(jd / 3650);
  if (!orbitCache.has(key)) orbitCache.set(key, orbitPath(p, jd, p.code === 'PLU' ? 220 : 160));
  return orbitCache.get(key);
}

/**
 * Draw the wheel into a 2D context.
 * opts: { chart, natal?, other?, scale, cx, cy, R, hover?, focus?, showAspects, showOrbits, showStations, labels, t }
 * Returns the screen position of every drawn world, for hit-testing.
 */
export function drawWheel(g, o) {
  const I = ink();
  const { chart, cx, cy, R } = o;
  const f = SCALES[o.scale] || SCALES.even;
  const rIn = R * 0.83;                                 // outer edge of the system
  const k = r => f(r) / f(RMAX) * rIn;
  const P = (lon, rad) => [cx + rad * Math.cos(lon * D2R), cy - rad * Math.sin(lon * D2R)];
  const pos = {};

  // station ring
  if (o.showStations !== false) {
    const r0 = R * 0.88, r1 = R;
    g.lineWidth = 1;
    g.strokeStyle = I.a(0.14);
    ring(g, cx, cy, r0); g.stroke();
    ring(g, cx, cy, r1); g.stroke();
    const st = chart.station;
    for (let s = 0; s < 12; s++) {
      const a0 = s * 30, a1 = a0 + 30;
      if (s === st) {
        g.fillStyle = I.a(0.07);
        g.beginPath(); g.arc(cx, cy, r1, -a1 * D2R, -a0 * D2R); g.arc(cx, cy, r0, -a0 * D2R, -a1 * D2R, true); g.closePath(); g.fill();
      }
      const [x0, y0] = P(a0, r0), [x1, y1] = P(a0, r1);
      g.strokeStyle = I.a(0.14); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      if (o.labels !== false && R > 150) {
        const mid = a0 + 15, rr = (r0 + r1) / 2;
        const [lx, ly] = P(mid, rr);
        g.save(); g.translate(lx, ly);
        let rot = -mid * D2R + Math.PI / 2;
        if (mid > 0 && mid < 180) rot += Math.PI;
        g.rotate(rot);
        g.fillStyle = s === st ? I.a(0.95) : I.a(0.42);
        g.font = `500 ${Math.max(8, Math.min(10.5, R * 0.03))}px 'Geist Mono', ui-monospace, monospace`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(STATIONS[s].name.toUpperCase(), 0, 0);
        g.restore();
      }
    }
    // degree ticks inside the ring
    g.strokeStyle = I.a(0.12);
    for (let d = 0; d < 360; d += 5) {
      const len = d % 30 === 0 ? 0 : d % 10 === 0 ? 5 : 2.5;
      if (!len) continue;
      const [a, b] = [P(d, r0), P(d, r0 - len)];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
  }

  // the natal wheel, ghosted on the inside edge of the station ring
  if (o.natal) {
    const rr = R * 0.86;
    o.natal.bodies.forEach(b => {
      const [x, y] = P(b.lon, rr), [x2, y2] = P(b.lon, rr - 8);
      g.strokeStyle = b.code === 'EAR' ? I.a(0.9) : I.a(0.45); g.lineWidth = b.code === 'EAR' ? 1.6 : 1;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    });
  }

  // orbits
  if (o.showOrbits !== false) {
    PLANETS.forEach(p => {
      const pts = orbitFor(p, chart.jd);
      g.beginPath();
      pts.forEach((q, i) => {
        const r = Math.hypot(q.x, q.y), lon = Math.atan2(q.y, q.x) * 180 / Math.PI;
        const [x, y] = P(lon, k(r));
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.strokeStyle = p.code === 'EAR' ? I.a(0.32) : I.a(o.focus && o.focus !== p.code ? 0.06 : 0.11);
      g.lineWidth = p.code === 'EAR' ? 1.1 : 1;
      g.stroke();
    });
  }

  // positions
  chart.bodies.forEach(b => { pos[b.code] = P(b.lon, k(b.r)); });

  // aspects: the seal, drawn through the actual positions
  if (o.showAspects !== false) {
    chart.aspects.forEach(a => {
      const st = LINE[a.type];
      const dim = o.focus && a.a.code !== o.focus && a.b.code !== o.focus;
      const [x1, y1] = pos[a.a.code], [x2, y2] = pos[a.b.code];
      g.setLineDash(st.dash); g.lineWidth = st.w;
      g.strokeStyle = I.a(dim ? st.a * 0.2 : st.a * (1 - a.orb / 9));
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    });
    g.setLineDash([]);
  }

  // second person's worlds (compare), as rings on their own orbits
  if (o.other) {
    o.other.bodies.forEach(b => {
      const [x, y] = P(b.lon, k(b.r));
      g.strokeStyle = I.a(b.code === 'EAR' ? 0.95 : 0.5); g.lineWidth = 1.2;
      ring(g, x, y, b.code === 'EAR' ? 6.5 : Math.max(3, b.size * 0.9 + 1.5)); g.stroke();
      if (b.code === 'EAR') {
        g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.moveTo(x, y - 3); g.lineTo(x, y + 3); g.stroke();
        if (o.labels !== false) {
          g.font = `600 ${R > 220 ? 11 : 9.5}px 'Geist Mono', ui-monospace, monospace`;
          g.fillStyle = I.a(1); g.textAlign = 'right'; g.textBaseline = 'middle';
          g.fillText('EARTH', x - 11, y - 6);
          if (o.otherSub) subLabel(g, I, o.otherSub, x - 11, y - 6 + (R > 220 ? 12 : 10.5), R, 'right');
        }
      }
    });
  }

  // the retrograde illusion: from Earth these worlds would seem to slide backward (from the Sun, nothing does)
  if (o.retro && chart.retro.size) {
    const [ex, ey] = pos.EAR;
    g.setLineDash([2, 4]); g.lineWidth = 1; g.strokeStyle = I.a(0.38);
    chart.retro.forEach(code => { const [x, y] = pos[code]; g.beginPath(); g.moveTo(ex, ey); g.lineTo(x, y); g.stroke(); });
    g.setLineDash([]);
  }

  // comets and asteroids, on their own two-body tracks
  if (o.wanderers) {
    const small = R < 220;
    WANDERERS.forEach(w => {
      const s = wandererAt(w, chart.jd);
      if (s.r > RMAX) return;
      const [x, y] = P(s.lon, k(s.r)), key = 'W:' + w.n, hov = o.hover === key;
      if (w.t === 'com') {
        // the tail points away from the Sun, longer the closer the comet is
        const d = Math.hypot(x - cx, y - cy) || 1, ux = (x - cx) / d, uy = (y - cy) / d;
        const dl = Math.min(28, Math.max(5, 14 / (s.r * s.r))) * Math.max(0.8, R / 300);
        const gr = g.createLinearGradient(x, y, x + ux * dl, y + uy * dl); gr.addColorStop(0, I.a(0.7)); gr.addColorStop(1, I.a(0));
        g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + ux * dl, y + uy * dl); g.stroke();
        g.fillStyle = I.a(hov ? 1 : 0.85); g.beginPath(); g.arc(x, y, 1.9, 0, Math.PI * 2); g.fill();
      } else {
        g.fillStyle = I.a(hov ? 1 : 0.7);
        g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-1.6, -1.6, 3.2, 3.2); g.restore();
      }
      if (hov) { g.strokeStyle = I.a(0.9); g.lineWidth = 1; ring(g, x, y, 6); g.stroke(); }
      // comet names always (there are few); asteroid names on hover or when the wheel is big enough for the belt to breathe
      if (o.labels !== false && (hov || (w.t === 'com' ? !small : R > 320))) {
        g.font = `400 ${small ? 8 : 9}px 'Geist Mono', ui-monospace, monospace`;
        g.fillStyle = I.a(hov ? 0.95 : 0.36); g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(w.n, x + 5, y + 3);
      }
      pos[key] = [x, y];
    });
  }

  // the spacecraft leaving: far past the drawing, so they sit on its edge, pointing the way they are going
  if (o.probes) {
    PROBES.forEach((p, i) => {
      const s = probeAt(p, chart.jd); if (!s) return;
      const rr = s.r > RMAX ? rIn + 4 : k(s.r), key = 'P:' + p.n, hov = o.hover === key;
      const [x, y] = P(p.lam, rr), a = -p.lam * D2R;
      g.save(); g.translate(x, y); g.rotate(a);
      g.fillStyle = I.a(hov ? 1 : 0.75); g.beginPath(); g.moveTo(5, 0); g.lineTo(-3, -3.2); g.lineTo(-1.2, 0); g.lineTo(-3, 3.2); g.closePath(); g.fill();
      g.restore();
      if (hov) { g.strokeStyle = I.a(0.9); g.lineWidth = 1; ring(g, x, y, 8); g.stroke(); }
      if (o.labels !== false) {
        // short tags (V1, V2, NH); the full name and distance on hover
        g.font = `500 ${R > 220 ? 9 : 8}px 'Geist Mono', ui-monospace, monospace`;
        g.fillStyle = I.a(hov ? 0.95 : 0.45); g.textBaseline = 'middle';
        const tag = hov ? `${p.n.toUpperCase()} · ${Math.round(s.r)} AU` : p.tag;
        const [tx, ty] = P(p.lam, rr - 13);
        g.textAlign = 'center'; g.fillText(tag, tx + (hov ? 0 : [0, -10, 10][i]), ty + (hov ? [0, -10, 10][i] : 0));
      }
      pos[key] = [x, y];
    });
  }

  // trails: where each world was over the last few days to weeks, so you can see which way it is going
  if (o.trails) {
    g.lineCap = 'round';
    chart.bodies.forEach(b => {
      const step = Math.max(1.5, b.period * 0.009);
      g.beginPath();
      for (let i = 0; i <= 8; i++) { const st = bodyState(b.p, chart.jd - i * step), [x, y] = P(st.lon, k(st.r)); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.strokeStyle = I.a(o.focus && o.focus !== b.code ? 0.08 : 0.26); g.lineWidth = 1.6; g.stroke();
    });
    g.lineCap = 'butt';
  }

  // the Sun
  const sunR = Math.max(5, R * 0.022);
  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, sunR * 7);
  glow.addColorStop(0, I.a(I.light ? 0.25 : 0.32)); glow.addColorStop(0.25, I.a(0.08)); glow.addColorStop(1, I.a(0));
  g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, sunR * 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = I.solid; g.beginPath(); g.arc(cx, cy, sunR, 0, Math.PI * 2); g.fill();
  const t = o.t || 0;
  g.strokeStyle = I.a(0.35); g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = i * 30 + t * 4;
    const [x0, y0] = P(a, sunR + 3), [x1, y1] = P(a, sunR + (i % 3 === 0 ? 7 : 5));
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }

  // the balance point of the whole system, which the Sun wobbles around (offset magnified so it shows)
  if (o.bary !== false) {
    const w = chart.wobble, mag = Math.min(w.dist / 0.012, 1) * Math.max(7, sunR * 2.2);
    const [bx, by] = P(w.lon, mag), hov = o.hover === 'BARY';
    g.strokeStyle = I.a(hov ? 1 : 0.6); g.lineWidth = 1;
    g.beginPath(); g.moveTo(bx - 4, by); g.lineTo(bx + 4, by); g.moveTo(bx, by - 4); g.lineTo(bx, by + 4); g.stroke();
    if (hov) { ring(g, bx, by, 7); g.stroke(); }
    pos.BARY = [bx, by];
  }

  // worlds
  chart.bodies.forEach(b => {
    const [x, y] = pos[b.code];
    const isE = b.code === 'EAR', hov = o.hover === b.code, dim = o.focus && o.focus !== b.code && !isE;
    const r = Math.max(2.2, b.size * (R / 360) * 1.5);
    g.fillStyle = I.bg; g.beginPath(); g.arc(x, y, r + 2.5, 0, Math.PI * 2); g.fill();
    if (isE) {
      g.fillStyle = I.solid; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = I.a(0.55); g.lineWidth = 1; ring(g, x, y, r + 5 + Math.sin(t * 2) * 0.8); g.stroke();
    } else {
      g.fillStyle = I.a(dim ? 0.35 : hov ? 1 : 0.82);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      if (b.code === 'SAT') { g.strokeStyle = I.a(dim ? 0.3 : 0.7); g.lineWidth = 1; g.beginPath(); g.ellipse(x, y, r + 4, (r + 4) * 0.36, -0.35, 0, Math.PI * 2); g.stroke(); }
    }
    if (hov || o.pin === b.code) { g.strokeStyle = I.a(0.9); g.lineWidth = 1; ring(g, x, y, r + 8); g.stroke(); }
    if (o.labels !== false) {
      g.font = `${isE ? 600 : 500} ${R > 220 ? 11 : 9.5}px 'Geist Mono', ui-monospace, monospace`;
      g.fillStyle = isE ? I.a(1) : I.a(dim ? 0.3 : 0.6);
      g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(isE ? 'EARTH' : b.code, x + r + 6, y - r - 3);
      if (isE && o.earthSub) subLabel(g, I, o.earthSub, x + r + 6, y - r - 3 + (R > 220 ? 12 : 10.5), R);
    }
  });

  // moons: bearings and tilts true, orbits magnified so they show
  if (o.moons) {
    const SYS = moonSystems(chart), sc = Math.max(0.8, R / 320);
    for (const code in MOON_PX) {
      const b = chart.bodies.find(q => q.code === code), [hx, hy] = pos[code];
      const hr = Math.max(2.2, b.size * (R / 360) * 1.5), mine = k => typeof k === 'string' && k.startsWith(`M:${code}:`);
      const lit = o.hover === code || o.focus === code || mine(o.hover) || mine(o.pin);
      SYS[code].forEach((st, i) => {
        const Rm = hr + MOON_PX[code][i] * sc, key = `M:${code}:${i}`, me = o.hover === key || o.pin === key;
        if (lit && (me || !(mine(o.hover) || mine(o.pin)))) {
          g.strokeStyle = I.a(0.28); g.lineWidth = 0.8; g.beginPath();
          for (let q = 0; q <= 48; q++) { const aa = q / 48 * Math.PI * 2, c = Math.cos(aa), sn = Math.sin(aa); const px = hx + (st.p1[0] * c + st.p2[0] * sn) * Rm, py = hy - (st.p1[1] * c + st.p2[1] * sn) * Rm; q ? g.lineTo(px, py) : g.moveTo(px, py); }
          g.stroke();
        }
        const mx = hx + st.v[0] * Rm, my = hy - st.v[1] * Rm;
        g.fillStyle = I.a(lit ? 1 : 0.75);
        g.beginPath(); g.arc(mx, my, MOON_DOT[code][i] * 0.75 * sc * (me ? 1.4 : 1), 0, Math.PI * 2); g.fill();
        if (me) {
          g.strokeStyle = I.a(0.9); g.lineWidth = 1; ring(g, mx, my, 5); g.stroke();
          if (o.labels !== false) { g.font = "500 9px 'Geist Mono', ui-monospace, monospace"; g.fillStyle = I.a(0.95); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(MOON_NAMES[code][i].toUpperCase(), mx + 8, my - 6); }
        }
        pos[key] = [mx, my];
      });
    }
  }

  return { pos, cx, cy, R };
}
// How far out each moon is drawn from its host's edge, in pixels at R = 320 (v1's spacing), and its dot size.
const MOON_PX = { EAR: [7.5], MAR: [4.5, 6.2], JUP: [5.5, 7.2, 9.0, 11.8], SAT: [4.8, 5.8, 6.8, 7.9, 9.2, 11.5, 14.5], URA: [4.2, 5.2, 6.3, 7.6, 9.0], NEP: [6.5] };
const MOON_DOT = { EAR: [2.1], MAR: [1.3, 1.2], JUP: [1.5, 1.4, 1.8, 1.6], SAT: [1.1, 1.2, 1.3, 1.3, 1.4, 1.9, 1.5], URA: [1.2, 1.3, 1.3, 1.5, 1.5], NEP: [1.7] };

// The person's name under Earth's label: same mono, toned down, so Earth stays Earth.
function subLabel(g, I, text, x, y, R, align = 'left') {
  g.font = `500 ${R > 220 ? 10 : 9}px 'Geist Mono', ui-monospace, monospace`;
  g.fillStyle = I.a(0.42); g.textAlign = align; g.textBaseline = 'middle';
  g.fillText(String(text).toUpperCase().slice(0, 16), x, y);
}
function ring(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }

/**
 * The seal: a person's sky reduced to one figure. Nine points on a circle at each world's longitude,
 * joined in order from the Sun outward, with Earth marked. Returns SVG markup.
 */
export function sealSVG(chart, { size = 24, stroke = 'currentColor', weight = 1.4, ringW = 1, dot = true } = {}) {
  const c = size / 2, R = size * 0.38;
  const pt = lon => [+(c + R * Math.cos(lon * D2R)).toFixed(2), +(c - R * Math.sin(lon * D2R)).toFixed(2)];
  const pts = chart.bodies.map(b => pt(b.lon));
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
  const e = pt(chart.earth.lon);
  const sw = weight * size / 24;
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none" aria-hidden="true">`
    + `<circle cx="${c}" cy="${c}" r="${(size * 0.47).toFixed(2)}" stroke="${stroke}" stroke-opacity=".28" stroke-width="${ringW * size / 24}"/>`
    + `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`
    + (dot ? `<circle cx="${e[0]}" cy="${e[1]}" r="${(size * 0.085).toFixed(2)}" fill="${stroke}"/>` : '')
    + `</svg>`;
}

/** Edge-on: each world's height above or below the plane of Earth's orbit, as SVG (heights exaggerated). */
export function edgeSVG(chart, { w = 320, h = 132 } = {}) {
  const mid = h / 2, span = w - 56, x0 = 30;
  const fx = a => x0 + even(a) / even(RMAX) * span * 1.08;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" fill="none" aria-label="Heights above and below the plane">`;
  s += `<line x1="8" y1="${mid}" x2="${w - 8}" y2="${mid}" stroke="currentColor" stroke-opacity=".3" stroke-dasharray="3 4"/>`;
  s += `<circle cx="${x0 - 12}" cy="${mid}" r="4" fill="currentColor"/>`;
  chart.bodies.forEach(b => {
    const x = +fx(b.el.a).toFixed(1), y = +Math.max(16, Math.min(h - 16, mid - Math.sign(b.z) * Math.sqrt(Math.abs(b.z)) * 16)).toFixed(1), isE = b.code === 'EAR';
    s += `<line x1="${x}" y1="${mid}" x2="${x}" y2="${y}" stroke="currentColor" stroke-opacity=".22"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${isE ? 3.2 : 2.6}" fill="currentColor" fill-opacity="${isE ? 1 : 0.8}"/>`;
    if (isE) s += `<circle cx="${x}" cy="${y}" r="6" stroke="currentColor" stroke-opacity=".6"/>`;
    const up = b.z >= 0;
    s += `<text x="${x}" y="${up ? y - 8 : y + 14}" text-anchor="middle" font-family="'Geist Mono', monospace" font-size="9" fill="currentColor" fill-opacity=".6">${b.code}</text>`;
  });
  s += `<text x="10" y="${mid - 6}" font-family="'Geist Mono', monospace" font-size="8" fill="currentColor" fill-opacity=".35">PLANE OF EARTH’S ORBIT</text></svg>`;
  return s;
}

/** A tiny station glyph: the ring with its 30° sector drawn heavy. */
export function stationSVG(s, size = 16) {
  const c = size / 2, r = size * 0.38;
  const p = a => [+(c + r * Math.cos(a * D2R)).toFixed(2), +(c - r * Math.sin(a * D2R)).toFixed(2)];
  const [x0, y0] = p(s * 30), [x1, y1] = p(s * 30 + 30);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="none" aria-hidden="true">`
    + `<circle cx="${c}" cy="${c}" r="${r}" stroke="currentColor" stroke-opacity=".3" stroke-width="${size / 16}"/>`
    + `<path d="M${x0} ${y0}A${r} ${r} 0 0 0 ${x1} ${y1}" stroke="currentColor" stroke-width="${size / 8}" stroke-linecap="round"/>`
    + `<circle cx="${c}" cy="${c}" r="${size / 12}" fill="currentColor"/></svg>`;
}

/** The poster: a 1080 × 1350 black-and-white print of one person's sky. */
export function drawPoster(g, W, H, { person, chart, theme = 'dark' }) {
  const dark = theme === 'dark';
  const inkRGB = dark ? '236, 235, 230' : '21, 21, 21';
  const A = x => `rgba(${inkRGB}, ${x})`;
  g.fillStyle = dark ? '#000' : '#F2F1EC'; g.fillRect(0, 0, W, H);
  const cx = W / 2, cy = H * 0.43, R = W * 0.4;
  const P = (lon, r) => [cx + r * Math.cos(lon * D2R), cy - r * Math.sin(lon * D2R)];

  // fine station ring
  g.strokeStyle = A(0.16); g.lineWidth = 1.5;
  [R, R * 0.93].forEach(r => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); });
  for (let s = 0; s < 12; s++) {
    const [a, b] = [P(s * 30, R * 0.93), P(s * 30, R)];
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    const [lx, ly] = P(s * 30 + 15, R * 0.965);
    g.save(); g.translate(lx, ly); let rot = -(s * 30 + 15) * D2R + Math.PI / 2; if (s * 30 + 15 < 180) rot += Math.PI; g.rotate(rot);
    g.fillStyle = s === chart.station ? A(1) : A(0.4); g.font = `500 15px 'Geist Mono', monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ROMAN[s], 0, 0); g.restore();
  }
  for (let d = 0; d < 360; d += 2) {
    const len = d % 10 === 0 ? 10 : 5; const [a, b] = [P(d, R * 0.93), P(d, R * 0.93 - len)];
    g.strokeStyle = A(d % 10 === 0 ? 0.3 : 0.14); g.lineWidth = 1; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }

  // orbits as perfect rings (the poster is an emblem, not a map), worlds on them
  const rr = i => R * (0.16 + i * 0.085);
  chart.bodies.forEach((b, i) => { g.strokeStyle = A(b.code === 'EAR' ? 0.4 : 0.12); g.lineWidth = 1.2; g.beginPath(); g.arc(cx, cy, rr(i), 0, Math.PI * 2); g.stroke(); });
  const pos = chart.bodies.map((b, i) => P(b.lon, rr(i)));
  // seal path through the worlds
  g.strokeStyle = A(0.9); g.lineWidth = 2.2; g.lineJoin = 'round';
  g.beginPath(); pos.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
  // aspect hairlines
  chart.aspects.forEach(a => {
    const i = chart.bodies.indexOf(a.a), j = chart.bodies.indexOf(a.b), st = LINE[a.type];
    g.setLineDash(st.dash.map(x => x * 2)); g.strokeStyle = A(st.a * 0.7); g.lineWidth = st.w * 1.4;
    g.beginPath(); g.moveTo(...pos[i]); g.lineTo(...pos[j]); g.stroke();
  });
  g.setLineDash([]);
  // Sun
  g.fillStyle = A(1); g.beginPath(); g.arc(cx, cy, 13, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) { const [a, b] = [P(i * 30, 22), P(i * 30, i % 3 ? 29 : 34)]; g.strokeStyle = A(0.7); g.lineWidth = 2; g.lineCap = 'round'; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
  chart.bodies.forEach((b, i) => {
    const [x, y] = pos[i], isE = b.code === 'EAR';
    g.fillStyle = dark ? '#000' : '#F2F1EC'; g.beginPath(); g.arc(x, y, isE ? 14 : 10, 0, Math.PI * 2); g.fill();
    g.fillStyle = A(1); g.beginPath(); g.arc(x, y, isE ? 8 : 5.5, 0, Math.PI * 2); g.fill();
    if (isE) { g.strokeStyle = A(0.8); g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.stroke(); }
  });

  // type
  const st = STATIONS[chart.station];
  const y0 = H * 0.82;
  g.textAlign = 'center'; g.fillStyle = A(1);
  g.font = `600 64px Geist, Inter, sans-serif`;
  if ('letterSpacing' in g) g.letterSpacing = '-2px';
  g.fillText(st.name, cx, y0);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.font = `500 20px 'Geist Mono', monospace`; g.fillStyle = A(0.55);
  g.fillText(`STATION ${ROMAN[chart.station]}  ·  ${st.gloss.toUpperCase()}  ·  ${chart.pattern.toUpperCase()}`, cx, y0 + 46);
  g.font = `500 20px 'Geist Mono', monospace`; g.fillStyle = A(0.8);
  g.fillText(`${person.name.toUpperCase()}  ·  EARTH ${chart.earth.lon.toFixed(1)}°`, cx, y0 + 84);
  g.font = `500 16px 'Geist Mono', monospace`; g.fillStyle = A(0.35);
  g.fillText('SUNSTROLOGY · THE SKY FROM THE SUN', cx, H - 52);
}
