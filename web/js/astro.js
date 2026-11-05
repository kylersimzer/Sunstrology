// Sunstrology astronomy engine.
// Real geometry only: JPL approximate Keplerian elements (J2000 + rates per century, valid 1800–2050),
// solved with Kepler's equation; lunations from Meeus. Ported from v1 without changing the maths.
// Nothing in this file assigns meaning; that lives in meaning.js.

export const AUm = 1.495978707e11;      // metres per AU
export const GM = 1.32712440018e20;     // GM of the Sun, m^3/s^2
export const RSUN = 6.957e8;            // solar radius, m
export const MSUN = 1.98892e30;         // kg
export const J2000 = 2451545.0;
export const GRAV = 6.674e-11, C_LIGHT = 299792458, V_GAL = 230;
export const KM_PER_AU = AUm / 1000;

export const PLANETS = [
  { name: 'Mercury', code: 'MER', size: 2.6, mass: 3.301e23,
    el: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], w: [77.45779628, 0.16047689], O: [48.33076593, -0.12534081] } },
  { name: 'Venus', code: 'VEN', size: 3.6, mass: 4.867e24,
    el: { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], w: [131.60246718, 0.00268329], O: [76.67984255, -0.27769418] } },
  { name: 'Earth', code: 'EAR', size: 3.8, mass: 5.972e24,
    el: { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], w: [102.93768193, 0.32327364], O: [0, 0] } },
  { name: 'Mars', code: 'MAR', size: 3.0, mass: 6.417e23,
    el: { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], w: [-23.94362959, 0.44441088], O: [49.55953891, -0.29257343] } },
  { name: 'Jupiter', code: 'JUP', size: 5.6, mass: 1.898e27,
    el: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], w: [14.72847983, 0.21252668], O: [100.47390909, 0.20469106] } },
  { name: 'Saturn', code: 'SAT', size: 5.0, mass: 5.683e26,
    el: { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], w: [92.59887831, -0.41897216], O: [113.66242448, -0.28867794] } },
  { name: 'Uranus', code: 'URA', size: 4.2, mass: 8.681e25,
    el: { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], w: [170.95427630, 0.40805281], O: [74.01692503, 0.04240589] } },
  { name: 'Neptune', code: 'NEP', size: 4.1, mass: 1.024e26,
    el: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], w: [44.96476227, -0.32241464], O: [131.78422574, -0.00508664] } },
  { name: 'Pluto', code: 'PLU', size: 2.4, mass: 1.303e22,
    el: { a: [39.48211675, -0.00031596], e: [0.24882730, 0.00005170], I: [17.14001206, 0.00004818], L: [238.92903833, 145.20780515], w: [224.06891629, -0.04062942], O: [110.30393684, -0.01183482] } },
];
PLANETS.forEach(p => { p.period = 365.256898 * Math.pow(p.el.a[0], 1.5); });
export const byCode = Object.fromEntries(PLANETS.map(p => [p.code, p]));

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const normDeg = d => ((d % 360) + 360) % 360;
export const angleDiff = (a, b) => { const d = Math.abs(normDeg(a) - normDeg(b)); return d > 180 ? 360 - d : d; };
export const wrap180 = d => { d = normDeg(d); return d > 180 ? d - 360 : d; };
export const jdFromDate = date => date.getTime() / 86400000 + 2440587.5;
export const dateFromJd = jd => new Date((jd - 2440587.5) * 86400000);
export const JD_MIN = jdFromDate(new Date(Date.UTC(1800, 0, 1)));
export const JD_MAX = jdFromDate(new Date(Date.UTC(2050, 11, 31)));

function solveKepler(M, e) {
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let i = 0; i < 12; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E;
}

function elementsAt(p, jd) {
  const T = (jd - J2000) / 36525;
  const g = k => p.el[k][0] + p.el[k][1] * T;
  return { a: g('a'), e: g('e'), I: g('I'), L: g('L'), w: g('w'), O: g('O') };
}

/** Heliocentric ecliptic state of one planet at a Julian date. */
export function bodyState(p, jd) {
  const el = elementsAt(p, jd);
  const Mdeg = normDeg(el.L - el.w);
  const M = (Mdeg > 180 ? Mdeg - 360 : Mdeg) * D2R;
  const E = solveKepler(M, el.e);
  const xv = el.a * (Math.cos(E) - el.e);
  const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
  const nu = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);
  const om = (el.w - el.O) * D2R, Om = el.O * D2R, inc = el.I * D2R;
  const cu = Math.cos(nu + om), su = Math.sin(nu + om);
  const x = r * (Math.cos(Om) * cu - Math.sin(Om) * su * Math.cos(inc));
  const y = r * (Math.sin(Om) * cu + Math.cos(Om) * su * Math.cos(inc));
  const z = r * su * Math.sin(inc);
  const lon = normDeg(Math.atan2(y, x) * R2D);
  const speed = Math.sqrt(GM * (2 / (r * AUm) - 1 / (el.a * AUm))) / 1000;
  const frac = Mdeg / 360;
  return { p, code: p.code, name: p.name, size: p.size, x, y, z, r, lon, nu, speed, frac, el, period: p.period };
}

/** The planet's full orbit as points (for drawing the true ellipse). */
export function orbitPath(p, jd, n = 128) {
  const el = elementsAt(p, jd);
  const om = (el.w - el.O) * D2R, Om = el.O * D2R, inc = el.I * D2R;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const E = i / n * Math.PI * 2;
    const xv = el.a * (Math.cos(E) - el.e);
    const yv = el.a * Math.sqrt(1 - el.e * el.e) * Math.sin(E);
    const nu = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
    const cu = Math.cos(nu + om), su = Math.sin(nu + om);
    pts.push({ x: r * (Math.cos(Om) * cu - Math.sin(Om) * su * Math.cos(inc)), y: r * (Math.sin(Om) * cu + Math.cos(Om) * su * Math.cos(inc)) });
  }
  return pts;
}

/** Which planets would look retrograde from Earth (the geocentric illusion). */
function retroSet(bodies, jd) {
  const later = PLANETS.map(p => bodyState(p, jd + 0.6));
  const e0 = bodies.find(b => b.code === 'EAR'), e1 = later.find(b => b.code === 'EAR');
  const set = new Set();
  bodies.forEach((b, i) => {
    if (b.code === 'EAR') return;
    const l0 = Math.atan2(b.y - e0.y, b.x - e0.x) * R2D;
    const l1 = Math.atan2(later[i].y - e1.y, later[i].x - e1.x) * R2D;
    if (wrap180(l1 - l0) < 0) set.add(b.code);
  });
  return set;
}

/** The Sun's displacement from the solar-system barycentre. */
function sunWobble(bodies) {
  let mx = 0, my = 0, mz = 0, mt = MSUN;
  bodies.forEach(b => { mx += b.p.mass * b.x; my += b.p.mass * b.y; mz += b.p.mass * b.z; mt += b.p.mass; });
  const bx = mx / mt, by = my / mt, bz = mz / mt;
  const dist = Math.hypot(bx, by, bz);
  return { bx, by, bz, dist, rsun: dist * AUm / RSUN, km: dist * AUm / 1000, lon: normDeg(Math.atan2(by, bx) * R2D) };
}

export const ASPECTS = [
  { n: 'Merge', d: 0, o: 7, glyph: '☌' },
  { n: 'Signal', d: 60, o: 4, glyph: '⚹' },
  { n: 'Friction', d: 90, o: 5, glyph: '□' },
  { n: 'Flow', d: 120, o: 5, glyph: '△' },
  { n: 'Mirror', d: 180, o: 6, glyph: '☍' },
];

/** Angular relationships, measured from the Sun. Pass the same array twice for a single chart. */
export function findAspects(A, B) {
  const same = A === B, out = [];
  for (let i = 0; i < A.length; i++)
    for (let j = same ? i + 1 : 0; j < B.length; j++) {
      const diff = angleDiff(A[i].lon, B[j].lon);
      for (const t of ASPECTS)
        if (Math.abs(diff - t.d) <= t.o) out.push({ a: A[i], b: B[j], type: t.n, glyph: t.glyph, diff, orb: Math.abs(diff - t.d) });
    }
  return out.sort((x, y) => x.orb - y.orb);
}

function classify(bodies) {
  const items = bodies.map(b => ({ lon: b.lon, name: b.name })).sort((a, b) => a.lon - b.lon);
  const angles = items.map(x => x.lon), n = angles.length;
  const gaps = angles.map((a, i) => normDeg(angles[(i + 1) % n] - a));
  const maxGap = Math.max(...gaps);
  const span = 360 - maxGap;
  if (maxGap < 62) return { pattern: 'Solar Ring' };
  if (span <= 125) return { pattern: 'The Ember' };
  for (let i = 0; i < n; i++) {
    const rest = angles.filter((_, k) => k !== i).sort((a, b) => a - b);
    const rgaps = rest.map((a, k) => normDeg(rest[(k + 1) % rest.length] - a));
    const rspan = 360 - Math.max(...rgaps);
    if (rspan <= 165) {
      let minD = 360;
      rest.forEach(a => { minD = Math.min(minD, angleDiff(a, angles[i])); });
      if (minD >= 40) return { pattern: 'The Lantern', singleton: items[i].name };
    }
  }
  if (span <= 190) return { pattern: 'The Chalice' };
  const big80 = gaps.filter(g => g >= 80).length;
  const big62 = gaps.filter(g => g >= 62).length;
  if (big80 === 2) return { pattern: 'The Scales' };
  if (big62 === 3) return { pattern: 'The Trident' };
  const inner = bodies.slice(0, 4).map(b => b.lon);
  let ispan = 0;
  for (const a of inner) for (const b of inner) ispan = Math.max(ispan, angleDiff(a, b));
  if (ispan < 70) return { pattern: 'Inner Flame' };
  if (maxGap >= 150) return { pattern: 'Split Crown' };
  return { pattern: 'Open Spiral' };
}

function findBadges(bodies, aspects) {
  const badges = [];
  const has = (t, a, b) => aspects.some(x => x.type === t && ((x.a.code === a && x.b.code === b) || (x.a.code === b && x.b.code === a)));
  riv: for (let i = 0; i < bodies.length; i++)
    for (let j = i + 1; j < bodies.length; j++)
      for (let k = j + 1; k < bodies.length; k++) {
        const A = bodies[i].code, B = bodies[j].code, C = bodies[k].code;
        if (has('Flow', A, B) && has('Flow', B, C) && has('Flow', A, C)) {
          badges.push({ name: 'The River', detail: `${bodies[i].name}, ${bodies[j].name} and ${bodies[k].name} in mutual Flow: a closed harmonic circuit` });
          break riv;
        }
      }
  anv: for (const m of aspects.filter(x => x.type === 'Mirror')) {
    for (const b of bodies) {
      if (b.code === m.a.code || b.code === m.b.code) continue;
      if (has('Friction', b.code, m.a.code) && has('Friction', b.code, m.b.code)) {
        badges.push({ name: 'The Anvil', detail: `${m.a.name} and ${m.b.name} opposed, both squared by ${b.name} at the apex` });
        break anv;
      }
    }
  }
  const bySector = {};
  bodies.forEach(b => { const s = Math.floor(normDeg(b.lon) / 30); (bySector[s] = bySector[s] || []).push(b); });
  for (const s in bySector) {
    if (bySector[s].length >= 3) { badges.push({ name: 'The Choir', detail: `${bySector[s].map(b => b.name).join(', ')} gathered in one station`, station: +s }); break; }
  }
  return badges;
}

/** Everything about the solar system at one moment. */
export function computeChart(jd) {
  const bodies = PLANETS.map(p => bodyState(p, jd));
  const aspects = findAspects(bodies, bodies);
  let sx = 0, sy = 0;
  bodies.forEach(b => { sx += Math.cos(b.lon * D2R); sy += Math.sin(b.lon * D2R); });
  const conc = Math.hypot(sx, sy) / bodies.length;
  const count = t => aspects.filter(a => a.type === t).length;
  const cls = classify(bodies);
  const earth = bodies.find(b => b.code === 'EAR');
  return {
    jd, bodies, aspects, earth,
    station: Math.floor(normDeg(earth.lon) / 30),
    retro: retroSet(bodies, jd),
    wobble: sunWobble(bodies),
    pattern: cls.pattern, singleton: cls.singleton || null,
    badges: findBadges(bodies, aspects),
    symmetry: Math.round((1 - conc) * 100), cluster: Math.round(conc * 100),
    counts: { Merge: count('Merge'), Signal: count('Signal'), Friction: count('Friction'), Flow: count('Flow'), Mirror: count('Mirror') },
    above: bodies.filter(b => b.z > 0).length, below: bodies.filter(b => b.z < 0).length,
  };
}

/* ---------- cycles, pulls, returns ---------- */

const SYN_PAIRS = [['VEN', 'EAR'], ['EAR', 'MAR'], ['JUP', 'SAT'], ['SAT', 'URA'], ['URA', 'NEP'], ['JUP', 'NEP']];
export function synodics(chart) {
  return SYN_PAIRS.map(([c1, c2]) => {
    const b1 = chart.bodies.find(b => b.code === c1), b2 = chart.bodies.find(b => b.code === c2);
    const fast = b1.period < b2.period ? b1 : b2, slow = b1.period < b2.period ? b2 : b1;
    const elong = normDeg(fast.lon - slow.lon);
    const synDays = 1 / Math.abs(1 / fast.period - 1 / slow.period);
    return { fast, slow, phase: elong / 360, years: synDays / 365.25, nextConjJd: chart.jd + (1 - elong / 360) * synDays };
  });
}

const CYCLE_MIN = [1798.3, 1810.6, 1823.3, 1833.9, 1843.5, 1855.9, 1867.2, 1878.9, 1890.1, 1902.0, 1913.6, 1923.6, 1933.8, 1944.2, 1954.3, 1964.9, 1976.5, 1986.8, 1996.4, 2008.9, 2019.9, 2031.0, 2042.0, 2053.0];
export function solarCycle(jd) {
  const y = 2000 + (jd - J2000) / 365.25;
  for (let i = 0; i < CYCLE_MIN.length - 1; i++) {
    if (y >= CYCLE_MIN[i] && y < CYCLE_MIN[i + 1]) {
      const phase = (y - CYCLE_MIN[i]) / (CYCLE_MIN[i + 1] - CYCLE_MIN[i]);
      const mood = phase < 0.35 ? 'rising' : phase < 0.55 ? 'near maximum' : 'declining';
      return { n: 5 + i, phase, mood, predicted: i >= 15 };
    }
  }
  return null;
}

/** Gravitational tug of each world on Earth. */
export function pulls(chart) {
  const e = chart.earth;
  const arr = chart.bodies.filter(b => b.code !== 'EAR').map(b => {
    const d = Math.hypot(b.x - e.x, b.y - e.y, b.z - e.z) * AUm;
    return { name: b.name, code: b.code, acc: GRAV * b.p.mass / (d * d), au: d / AUm };
  }).sort((a, b) => b.acc - a.acc);
  return { arr, total: arr.reduce((s, x) => s + x.acc, 0), sun: GM / Math.pow(e.r * AUm, 2) };
}

/** Next time a planet returns to a longitude after jd (coarse scan + bisection). */
export function nextReturn(p, lon, jd) {
  const f = t => wrap180(bodyState(p, t).lon - lon);
  const step = Math.max(1, p.period / 72);
  let t0 = jd + 0.5, v0 = f(t0);
  for (let k = 1; k <= 90; k++) {
    const t1 = jd + 0.5 + k * step, v1 = f(t1);
    if (v0 < 0 && v1 >= 0 && v1 - v0 < 180) {
      let lo = t0, hi = t1;
      for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; f(mid) < 0 ? lo = mid : hi = mid; }
      return (lo + hi) / 2;
    }
    t0 = t1; v0 = v1;
  }
  return null;
}

/** When does Earth enter each of the 12 stations in the year containing jd? */
export function stationCalendar(year) {
  const out = [];
  let jd = jdFromDate(new Date(Date.UTC(year, 0, 1)));
  const end = jd + 366;
  let prev = Math.floor(bodyState(byCode.EAR, jd).lon / 30);
  out.push({ station: prev, jd });
  for (let t = jd + 1; t <= end; t += 1) {
    const s = Math.floor(bodyState(byCode.EAR, t).lon / 30);
    if (s !== prev) {
      let lo = t - 1, hi = t;
      for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; Math.floor(bodyState(byCode.EAR, mid).lon / 30) === s ? hi = mid : lo = mid; }
      out.push({ station: s, jd: hi });
      prev = s;
    }
  }
  return out;
}

/** The date range (month/day) Earth spends in each station, for a typical year. */
export function stationRanges(year = new Date().getUTCFullYear()) {
  const cal = stationCalendar(year).concat(stationCalendar(year + 1));
  const ranges = {};
  for (let i = 1; i < cal.length - 1; i++) {
    const s = cal[i].station;
    if (ranges[s]) continue;
    ranges[s] = { start: dateFromJd(cal[i].jd), end: dateFromJd(cal[i + 1].jd - 1) };
  }
  return ranges;
}

/* ---------- the Moon (Meeus, lunations) ---------- */

export const SYNMONTH = 29.530588861;
function lunationJd(k, full) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jd = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * D2R;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * D2R;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * D2R;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * D2R;
  const s = Math.sin;
  jd += full
    ? -0.40614 * s(Mp) + 0.17302 * E * s(M) + 0.01614 * s(2 * Mp) + 0.01043 * s(2 * F) + 0.00734 * E * s(Mp - M) - 0.00515 * E * s(Mp + M) + 0.00209 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om)
    : -0.40720 * s(Mp) + 0.17241 * E * s(M) + 0.01608 * s(2 * Mp) + 0.01039 * s(2 * F) + 0.00739 * E * s(Mp - M) - 0.00514 * E * s(Mp + M) + 0.00208 * E * E * s(2 * M) - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F) + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(Om);
  return { jd };
}
const kNear = jd => Math.round((jd - 2451550.09766) / SYNMONTH);
export function moonAt(jd) {
  let k = kNear(jd);
  let nm = lunationJd(k, false);
  if (nm.jd > jd) { k -= 1; nm = lunationJd(k, false); }
  else { const nx = lunationJd(k + 1, false); if (nx.jd <= jd) { k += 1; nm = nx; } }
  const age = jd - nm.jd, ph = age / SYNMONTH;
  const ill = (1 - Math.cos(ph * Math.PI * 2)) / 2;
  const name = ph < 0.02 || ph > 0.98 ? 'New Moon' : ph < 0.23 ? 'Waxing crescent' : ph < 0.27 ? 'First quarter'
    : ph < 0.48 ? 'Waxing gibbous' : ph < 0.52 ? 'Full Moon' : ph < 0.73 ? 'Waning gibbous' : ph < 0.77 ? 'Last quarter' : 'Waning crescent';
  return { age, ill, name, phase: ph, nextNewJd: lunationJd(k + 1, false).jd };
}

/** Distance Earth has travelled around the Sun between two moments, km (mean orbital speed). */
export function orbitKm(jd0, jd1) {
  const circumference = 2 * Math.PI * KM_PER_AU * 1.00000261;   // ~940 million km
  return (jd1 - jd0) / 365.256363 * circumference;
}
