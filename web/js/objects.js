// Everything in the sky besides the nine worlds: comets and asteroids, the three departing spacecraft, and the moons.
// Ported from v1 without changing the maths. Positions are heliocentric ecliptic (AU) like astro.js.
// Comets and asteroids are two-body tracks from epoch elements (comet timing drifts months per century;
// Apophis's track is rewritten by its April 2029 Earth encounter). Moon bearings and tilts are true;
// only their orbit radii are magnified when drawn, or they would be smaller than a pixel.
import { J2000, D2R, R2D, normDeg, AUm, C_LIGHT, bodyState } from './astro.js';

export const WANDERERS = [
  { n: 'Ceres', d: 'dwarf planet, queen of the belt', t: 'ast', a: 2.7656157, e: 0.0795763, i: 10.58789, O: 80.24963, w: 73.29974, T: 2459920.20, P: 1679.9 },
  { n: 'Pallas', d: 'belt giant on a steep, tilted road', t: 'ast', a: 2.7696173, e: 0.2305974, i: 34.92592, O: 172.89787, w: 310.90014, T: 2459956.35, P: 1683.8 },
  { n: 'Juno', d: 'one of the original four asteroids', t: 'ast', a: 2.6707723, e: 0.2557728, i: 12.99055, O: 169.85207, w: 247.84061, T: 2459782.61, P: 1594.3 },
  { n: 'Vesta', d: 'brightest of the belt, visited by Dawn', t: 'ast', a: 2.3618479, e: 0.0902211, i: 7.14179, O: 103.80404, w: 151.61078, T: 2460483.66, P: 1325.5 },
  { n: 'Hygiea', d: 'the belt’s dark fourth giant', t: 'ast', a: 3.1481581, e: 0.1082217, i: 3.83154, O: 283.19495, w: 312.42544, T: 2461645.28, P: 2039.7 },
  { n: 'Eros', d: 'near-Earth stone, the first ever orbited (2000)', t: 'ast', a: 1.4581785, e: 0.2227507, i: 10.82849, O: 304.27306, w: 178.90087, T: 2461038.11, P: 643.1 },
  { n: 'Phaethon', d: 'rock-comet, parent of the Geminids', t: 'ast', a: 1.2713920, e: 0.8898332, i: 22.30542, O: 265.21926, w: 322.23413, T: 2460742.63, P: 523.7 },
  { n: 'Bennu', d: 'sampled by OSIRIS-REx (2020)', t: 'ast', a: 1.1263910, e: 0.2037450, i: 6.03494, O: 1.98511, w: 66.22307, T: 2460640.15, P: 436.4 },
  { n: 'Ryugu', d: 'sampled by Hayabusa2 (2019)', t: 'ast', a: 1.1911911, e: 0.1910618, i: 5.86635, O: 251.05922, w: 211.42963, T: 2460423.87, P: 474.8 },
  { n: 'Psyche', d: 'a metal world, a probe is on its way', t: 'ast', a: 2.9230603, e: 0.1342512, i: 3.09630, O: 150.01718, w: 229.35659, T: 2459286.35, P: 1825.6 },
  { n: 'Apophis', d: 'the famous near miss of April 2029', t: 'ast', a: 0.9223820, e: 0.1911496, i: 3.34099, O: 203.90419, w: 126.67242, T: 2460395.75, P: 323.6 },
  { n: '1P/Halley', d: 'the once-in-a-lifetime comet, parent of the η-Aquariids and Orionids', t: 'com', a: 17.9418, e: 0.9672769, i: 162.24217, O: 58.86013, w: 111.86566, T: 2446470.95895, P: 27758.0 },
  { n: '2P/Encke', d: 'the shortest period of any comet, parent of the Taurids', t: 'com', a: 2.2152, e: 0.8483, i: 11.78, O: 334.57, w: 186.55, T: 2460240.0, P: 1204.0 },
  { n: '8P/Tuttle', d: 'parent of the Ursids', t: 'com', a: 5.6997, e: 0.8198, i: 54.98, O: 270.34, w: 207.51, T: 2454492.5, P: 4970.3 },
  { n: '21P/G-Zinner', d: 'parent of the Draconids', t: 'com', a: 3.4985, e: 0.7105, i: 31.997, O: 195.40, w: 172.85, T: 2458371.7, P: 2390.1 },
  { n: '55P/T-Tuttle', d: 'parent of the Leonids, the storm-maker', t: 'com', a: 10.3453, e: 0.9056, i: 162.49, O: 235.27, w: 172.50, T: 2450872.5, P: 12153.9 },
  { n: '109P/S-Tuttle', d: 'parent of the Perseids', t: 'com', a: 26.0734, e: 0.9632, i: 113.45, O: 139.38, w: 152.98, T: 2448968.5, P: 48628.9 },
  { n: 'C/1861 Thatcher', d: 'parent of the Lyrids, next back around 2283', t: 'com', a: 55.8000, e: 0.9835, i: 79.77, O: 31.87, w: 213.45, T: 2400924.9, P: 152247.3 },
];

export function wandererAt(w, jd) {
  let M = ((jd - w.T) / w.P) * Math.PI * 2;
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); if (M > Math.PI) M -= 2 * Math.PI;
  let lo = -Math.PI, hi = Math.PI;
  for (let k = 0; k < 64; k++) { const mid = (lo + hi) / 2; (mid - w.e * Math.sin(mid) - M < 0) ? lo = mid : hi = mid; }
  const E = (lo + hi) / 2;
  const xv = w.a * (Math.cos(E) - w.e), yv = w.a * Math.sqrt(1 - w.e * w.e) * Math.sin(E);
  const nu = Math.atan2(yv, xv), r = Math.hypot(xv, yv);
  const u = nu + w.w * D2R, cu = Math.cos(u), su = Math.sin(u);
  const cO = Math.cos(w.O * D2R), sO = Math.sin(w.O * D2R), ci = Math.cos(w.i * D2R), si = Math.sin(w.i * D2R);
  const x = r * (cO * cu - sO * su * ci), y = r * (sO * cu + cO * su * ci), z = r * su * si;
  return { x, y, z, r, lon: normDeg(Math.atan2(y, x) * R2D) };
}
/** The next time a wanderer rounds the Sun (perihelion) after jd. */
export const nextPerihelion = (w, jd) => w.T + Math.ceil((jd - w.T) / w.P) * w.P;

/* ---------- the three machines leaving the solar system (distances true; escape directions approximate) ---------- */
const yr = jd => 2000 + (jd - J2000) / 365.25;
export const PROBES = [
  { n: 'Voyager 1', tag: 'V1', d: 'the farthest human-made object', lam: 256, bet: 35, at: jd => { const y = yr(jd); if (y < 1977.68) return null; return y < 1980.87 ? 1 + (y - 1977.68) / (1980.87 - 1977.68) * 8.5 : y < 2006.6 ? 9.5 + (y - 1980.87) / (2006.6 - 1980.87) * 90.5 : 100 + 3.57 * (y - 2006.6); } },
  { n: 'Voyager 2', tag: 'V2', d: 'the grand tourist: four worlds visited', lam: 290, bet: -48, at: jd => { const y = yr(jd); if (y < 1977.63) return null; return y < 1989.65 ? 1 + (y - 1977.63) / (1989.65 - 1977.63) * 29.1 : 30.1 + 3.13 * (y - 1989.65); } },
  { n: 'New Horizons', tag: 'NH', d: 'flew past Pluto in 2015', lam: 289, bet: 2, at: jd => { const y = yr(jd); if (y < 2006.05) return null; return y < 2015.54 ? 1 + (y - 2006.05) / (2015.54 - 2006.05) * 31.9 : 32.9 + 2.95 * (y - 2015.54); } },
];
export function probeAt(p, jd) {
  const r = p.at(jd); if (r == null) return null;
  const cb = Math.cos(p.bet * D2R);
  return { r, lon: p.lam, x: r * cb * Math.cos(p.lam * D2R), y: r * cb * Math.sin(p.lam * D2R), z: r * Math.sin(p.bet * D2R), lightHours: r * AUm / C_LIGHT / 3600 };
}

/* ---------- moons: Luna (Meeus ch. 47), the Galileans (Meeus ch. 44), fitted moons of Mars, Saturn and Uranus, Triton ---------- */
function lunaAt(jd) {
  const T = (jd - J2000) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * D2R;
  const M = (357.5291092 + 35999.0502909 * T - 0.0001536 * T * T) * D2R;
  const Mp = (134.9633964 + 477198.8675055 * T + 0.0087414 * T * T) * D2R;
  const F = (93.2720950 + 483202.0175233 * T - 0.0036539 * T * T) * D2R;
  const s = Math.sin;
  const lon = Lp + 6.288774 * s(Mp) + 1.274027 * s(2 * D - Mp) + 0.658314 * s(2 * D) + 0.213618 * s(2 * Mp) - 0.185116 * s(M) - 0.114332 * s(2 * F)
    + 0.058793 * s(2 * D - 2 * Mp) + 0.057066 * s(2 * D - M - Mp) + 0.053322 * s(2 * D + Mp) + 0.045758 * s(2 * D - M) - 0.040923 * s(M - Mp) - 0.034720 * s(D) - 0.030383 * s(M + Mp);
  const lat = 5.128122 * s(F) + 0.280602 * s(Mp + F) + 0.277693 * s(Mp - F) + 0.173237 * s(2 * D - F);
  const distKm = 385000.56 - 20905.355 * Math.cos(Mp) - 3699.111 * Math.cos(2 * D - Mp) - 2955.968 * Math.cos(2 * D) - 569.925 * Math.cos(2 * Mp);
  return { lon: normDeg(lon), lat, distKm };
}
function galileanAngles(chart) {
  const j = chart.bodies.find(b => b.code === 'JUP'), e = chart.earth;
  const delta = Math.hypot(j.x - e.x, j.y - e.y, j.z - e.z);
  const t = chart.jd - J2000 - delta / 173.144;
  const s = Math.sin, c = Math.cos;
  const V = (172.74 + 0.00111588 * t) * D2R, M = (357.529 + 0.9856003 * t) * D2R;
  const N = (20.020 + 0.0830853 * t + 0.329 * s(V)) * D2R;
  const Jm = 66.115 + 0.9025179 * t - 0.329 * s(V);
  const A = 1.915 * s(M) + 0.020 * s(2 * M), B = 5.555 * s(N) + 0.168 * s(2 * N);
  const K = (Jm + A - B) * D2R;
  const R = 1.00014 - 0.01671 * c(M) - 0.00014 * c(2 * M);
  const rj = 5.20872 - 0.25208 * c(N) - 0.00611 * c(2 * N);
  const Dd = Math.sqrt(rj * rj + R * R - 2 * rj * R * Math.cos(K));
  const psi = Math.asin(Math.max(-1, Math.min(1, R / Dd * Math.sin(K)))) * R2D;
  const G = (331.18 + 50.310482 * t) * D2R, H = (87.45 + 21.569231 * t) * D2R;
  const u = [163.8069 + 203.4058646 * t, 358.4140 + 101.2916335 * t, 5.7176 + 50.2345180 * t, 224.8092 + 21.4879800 * t].map(x => x + psi - B);
  u[0] += 0.473 * s(2 * (u[0] - u[1]) * D2R); u[1] += 1.065 * s(2 * (u[1] - u[2]) * D2R); u[2] += 0.165 * s(G); u[3] += 0.843 * s(H);
  const bear = Math.atan2(e.y - j.y, e.x - j.x) * R2D;
  return u.map(x => normDeg(bear + 180 + x));
}
const MOONS_FIT = {
  MAR: [{ n: 'Phobos', i: 26.7712, O: 82.6739, u0: 359.4589, nd: 1128.8440668 }, { n: 'Deimos', i: 25.4453, O: 79.1731, u0: 41.0480, nd: 285.1619090 }],
  SAT: [{ n: 'Mimas', i: 27.6858, O: 169.0337, u0: 285.5631, nd: 381.9944781, la: 39.953, lw: 0.0137274, lf: 117.5422 },
    { n: 'Enceladus', i: 28.0593, O: 169.5234, u0: 322.2702, nd: 262.7319157 },
    { n: 'Tethys', i: 28.9987, O: 170.6033, u0: 327.9509, nd: 190.6979651, la: 1.672, lw: 0.0137274, lf: 297.9749 },
    { n: 'Dione', i: 28.0664, O: 169.4895, u0: 316.8599, nd: 131.5349582 },
    { n: 'Rhea', i: 27.9153, O: 169.4645, u0: 192.0457, nd: 79.6900941 },
    { n: 'Titan', i: 28.0522, O: 169.5275, u0: 147.6154, nd: 22.5769768, e2: 3.3002, w0: 350.4438, wd: 0.0014010 },
    { n: 'Iapetus', i: 17.1434, O: 139.1059, u0: 258.0603, nd: 4.5379953, e2: 3.2600, w0: 50.6743 }],
  URA: [{ n: 'Miranda', i: 97.9186, O: 168.0299, u0: 143.4629, nd: 254.6907312 }, { n: 'Ariel', i: 97.7701, O: 167.1469, u0: 17.9930, nd: 142.8356608 },
    { n: 'Umbriel', i: 97.7535, O: 167.6513, u0: 66.2659, nd: 86.8688765 }, { n: 'Titania', i: 97.7674, O: 167.4827, u0: 96.6390, nd: 41.3514005 },
    { n: 'Oberon', i: 97.8850, O: 167.7345, u0: 167.5730, nd: 26.7394793 }],
};
const TRITON = { R: [[0.8715563143, -0.3372487192, 0.3558832569], [0.4498372457, 0.8387573482, -0.3068103048], [-0.1950283145, 0.4274920025, 0.8827312979]],
  i: 156.8142 * D2R, Om0: 182.2457, u0: 118.4393, udot: 61.2585806, Omdot: 0.0014326, epoch: 2454619.5 };
const JUP_PLANE = { O: 337.8247, i: 2.2167 };
const planeBasis = (Od, id) => { const O = Od * D2R, i = id * D2R; return [[Math.cos(O), Math.sin(O), 0], [-Math.sin(O) * Math.cos(i), Math.cos(O) * Math.cos(i), Math.sin(i)]]; };
const onPlane = (p1, p2, u) => { const c = Math.cos(u * D2R), s = Math.sin(u * D2R); return { p1, p2, v: [p1[0] * c + p2[0] * s, p1[1] * c + p2[1] * s, p1[2] * c + p2[2] * s] }; };
function fitMoon(el, jd, tau) {
  const t = jd - J2000;
  let u = el.u0 + el.nd * (t - (tau || 0));
  if (el.e2 !== undefined) u += el.e2 * Math.sin((u - el.w0 - (el.wd || 0) * t) * D2R);
  if (el.la !== undefined) u += el.la * Math.sin((el.lw * t + el.lf) * D2R);
  const [p1, p2] = planeBasis(el.O, el.i);
  return onPlane(p1, p2, u);
}
function triton(jd, tau) {
  const t = jd - (tau || 0) - TRITON.epoch;
  const Om = (TRITON.Om0 + TRITON.Omdot * t) * D2R, u = TRITON.u0 + TRITON.udot * t;
  const ci = Math.cos(TRITON.i), si = Math.sin(TRITON.i);
  const q1 = [Math.cos(Om), Math.sin(Om), 0], q2 = [-Math.sin(Om) * ci, Math.cos(Om) * ci, si], R = TRITON.R;
  const rot = w => [R[0][0] * w[0] + R[0][1] * w[1] + R[0][2] * w[2], R[1][0] * w[0] + R[1][1] * w[1] + R[1][2] * w[2], R[2][0] * w[0] + R[2][1] * w[1] + R[2][2] * w[2]];
  return onPlane(rot(q1), rot(q2), u);
}
function luna(jd) {
  const L = lunaAt(jd), lam = L.lon * D2R, bet = L.lat * D2R;
  const [p1, p2] = planeBasis(normDeg(125.04452 - 0.0529538 * (jd - J2000)), 5.145);
  return { p1, p2, v: [Math.cos(bet) * Math.cos(lam), Math.cos(bet) * Math.sin(lam), Math.sin(bet)] };
}

export const MOON_NAMES = { EAR: ['Moon'], MAR: ['Phobos', 'Deimos'], JUP: ['Io', 'Europa', 'Ganymede', 'Callisto'],
  SAT: MOONS_FIT.SAT.map(m => m.n), URA: MOONS_FIT.URA.map(m => m.n), NEP: ['Triton'] };
/** Drawing radii for each moon, in units of the host's drawn size (so the order and spacing read true). */
export const MOON_ORBITS = { EAR: [2.6], MAR: [1.9, 2.5], JUP: [1.9, 2.45, 3.15, 4.1], SAT: [2.5, 2.75, 3.0, 3.3, 3.7, 4.4, 5.6], URA: [1.8, 2.15, 2.5, 2.9, 3.3], NEP: [2.4] };
export const MOON_NOTES = {
  EAR: 'the Moon: bearing and tilt true, orbit magnified',
  MAR: 'Phobos and Deimos, at their true bearings',
  JUP: 'Io, Europa, Ganymede and Callisto, bearings true',
  SAT: 'seven moons, Mimas to Iapetus, bearings and planes true',
  URA: 'five moons riding the sideways equator',
  NEP: 'Triton, going round backward (retrograde)',
};

/** Real figures for each moon: mean distance from its planet (km), orbital period (days), diameter (km), and what it is known for. */
export const MOON_INFO = {
  Moon: { km: 384400, days: 27.322, dia: 3474, note: 'Ours. It sets the tides, and it is slowly drifting away, about 3.8 cm a year.' },
  Phobos: { km: 9376, days: 0.319, dia: 22.5, note: 'Rises in the west and crosses the Martian sky twice a day. It is spiralling inward.' },
  Deimos: { km: 23463, days: 1.263, dia: 12.4, note: 'The smaller, outer moon of Mars: from the surface it looks like a bright star.' },
  Io: { km: 421700, days: 1.769, dia: 3643, note: 'The most volcanic place known, kneaded by Jupiter’s tides.' },
  Europa: { km: 671034, days: 3.551, dia: 3122, note: 'An ocean of liquid water under a shell of ice.' },
  Ganymede: { km: 1070412, days: 7.155, dia: 5268, note: 'The largest moon in the solar system, bigger than Mercury, with its own magnetic field.' },
  Callisto: { km: 1882709, days: 16.689, dia: 4821, note: 'One of the most heavily cratered surfaces anywhere: almost untouched for four billion years.' },
  Mimas: { km: 185539, days: 0.942, dia: 396, note: 'One crater, Herschel, is a third as wide as the whole moon.' },
  Enceladus: { km: 237948, days: 1.370, dia: 504, note: 'Geysers at its south pole spray ocean water into space.' },
  Tethys: { km: 294619, days: 1.888, dia: 1062, note: 'Almost pure water ice, split by a canyon most of the way around it.' },
  Dione: { km: 377396, days: 2.737, dia: 1123, note: 'Bright ice cliffs hundreds of kilometres long.' },
  Rhea: { km: 527108, days: 4.518, dia: 1527, note: 'Saturn’s second-largest moon, an icy, cratered ball.' },
  Titan: { km: 1221870, days: 15.945, dia: 5149, note: 'A thick hazy atmosphere, and lakes and rivers of liquid methane.' },
  Iapetus: { km: 3560820, days: 79.32, dia: 1469, note: 'Two-toned: one side as dark as coal, the other as bright as snow.' },
  Miranda: { km: 129390, days: 1.413, dia: 472, note: 'A patchwork surface with the tallest known cliff in the solar system.' },
  Ariel: { km: 191020, days: 2.520, dia: 1158, note: 'The brightest of Uranus’s moons, with long rift valleys.' },
  Umbriel: { km: 266000, days: 4.144, dia: 1169, note: 'The darkest of Uranus’s large moons.' },
  Titania: { km: 435910, days: 8.706, dia: 1577, note: 'The largest moon of Uranus.' },
  Oberon: { km: 583520, days: 13.463, dia: 1523, note: 'The outermost of Uranus’s five large moons.' },
  Triton: { km: 354759, days: 5.877, dia: 2707, retro: true, note: 'Goes round Neptune backward, so it was probably captured. Nitrogen geysers erupt from its frozen surface.' },
};
/** A moon's key in hover and pin codes: M:<host>:<index>. */
export const moonKey = (host, i) => `M:${host}:${i}`;
export function moonFromKey(key) {
  const [, host, i] = key.split(':'), name = MOON_NAMES[host]?.[+i];
  return name ? { host, i: +i, name, ...MOON_INFO[name] } : null;
}

/** Each host's moons as unit vectors (v) on their orbit planes (p1, p2), at the moment of `chart`. */
export function moonSystems(chart) {
  const e = chart.earth;
  const tau = code => { const p = chart.bodies.find(b => b.code === code); return Math.hypot(p.x - e.x, p.y - e.y, p.z - e.z) / 173.144; };
  const [jp1, jp2] = planeBasis(JUP_PLANE.O, JUP_PLANE.i);
  return {
    EAR: [luna(chart.jd)],
    MAR: MOONS_FIT.MAR.map(m => fitMoon(m, chart.jd, tau('MAR'))),
    JUP: galileanAngles(chart).map(lon => onPlane(jp1, jp2, lon - JUP_PLANE.O)),
    SAT: MOONS_FIT.SAT.map(m => fitMoon(m, chart.jd, tau('SAT'))),
    URA: MOONS_FIT.URA.map(m => fitMoon(m, chart.jd, tau('URA'))),
    NEP: [triton(chart.jd, tau('NEP'))],
  };
}

/** Is a world climbing above, or diving below, the plane of Earth's orbit? */
export const climbing = (b, jd) => bodyState(b.p, jd + 2).z > b.z;
