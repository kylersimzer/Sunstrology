// Sunstrology brand, as code. The mark is 01 "Earth on the ring" (locked 2026-11-04).
// Everything here returns SVG text; build-brand.mjs renders it to PNG and video.
// The sky in the banners is real: the solar system on 4 November 2026, the day v2 was made.
import { PLANETS, computeChart, orbitPath, jdFromDate, D2R } from '../web/js/astro.js';
import { SCALES } from '../web/js/wheel.js';

export const INKS = { white: '#ffffff', ink: '#ECEBE6', black: '#000000' };
export const BG = '#000';
const f2 = n => +n.toFixed(2);
let uid = 0;

/* ---------- the mark ---------- */

/** Earth's centre on the 24 grid, at `deg` degrees clockwise from the top (the mark has it at 50°). */
export const earthAt = (deg = 50) => [f2(12 + 8.6 * Math.sin(deg * D2R)), f2(12 - 8.6 * Math.cos(deg * D2R))];

/** The mark's elements on the 24 × 24 grid. The gap round Earth is a mask, so it works on any background. */
export function markBody(ink, { earthDeg = 50, ringOpacity = 1 } = {}) {
  const id = 'm' + (++uid), [ex, ey] = earthAt(earthDeg);
  return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><circle cx="${ex}" cy="${ey}" r="3.4" fill="#000"/></mask></defs>`
    + `<circle cx="12" cy="12" r="3.4" fill="${ink}"/>`
    + `<circle cx="12" cy="12" r="8.6" fill="none" stroke="${ink}" stroke-width="1.4" stroke-opacity="${ringOpacity}" mask="url(#${id})"/>`
    + `<circle cx="${ex}" cy="${ey}" r="2.1" fill="${ink}"/>`;
}
export const markSVG = (ink, { size = 24, ...o } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">${markBody(ink, o)}</svg>`;

/** The mark with Earth going round once every `dur` seconds (SMIL, so it animates as a plain .svg file or <img>). */
export function markLoopSVG(ink, { size = 24, dur = 4 } = {}) {
  const id = 'm' + (++uid), [ex, ey] = earthAt(0);
  const spin = `<animateTransform attributeName="transform" type="rotate" from="50 12 12" to="410 12 12" dur="${dur}s" repeatCount="indefinite"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none">`
    + `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/><g>${spin}<circle cx="${ex}" cy="${ey}" r="3.4" fill="#000"/></g></mask></defs>`
    + `<circle cx="12" cy="12" r="3.4" fill="${ink}"/><circle cx="12" cy="12" r="8.6" stroke="${ink}" stroke-width="1.4" mask="url(#${id})"/>`
    + `<g>${spin}<circle cx="${ex}" cy="${ey}" r="2.1" fill="${ink}"/></g></svg>`;
}

/** App and browser icons: the white mark on a black tile. */
export function tileSVG(size, { radius = 0.22, pad = 0.14, bg = '#000', ink = '#fff' } = {}) {
  const s = 24 * (1 - 2 * pad) / 24, o = 24 * pad, r = 24 * radius;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><rect width="24" height="24" rx="${r}" fill="${bg}"/><g transform="translate(${o} ${o}) scale(${s})">${markBody(ink)}</g></svg>`;
}

/* ---------- the lockup ---------- */

/** Mark + SUNSTROLOGY in Geist SemiBold, tracked like the app. `textW` is the measured width of the word at 100 px. */
export function lockupSVG(ink, { height = 64, text = ink, textW = 760 } = {}) {
  const fs = height * 0.42, gap = height * 0.34, w = height + gap + textW * fs / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f2(w)} ${height}" width="${f2(w)}" height="${height}" fill="none">`
    + `<g transform="scale(${height / 24})">${markBody(ink)}</g>`
    + `<text x="${f2(height + gap)}" y="${f2(height / 2)}" dominant-baseline="central" fill="${text}" font-family="Geist, Inter, sans-serif" font-weight="600" font-size="${f2(fs)}" letter-spacing="${f2(fs * 0.08)}">SUNSTROLOGY</text></svg>`;
}

/* ---------- the sky, for banners ---------- */

export const BRAND_JD = jdFromDate(new Date(Date.UTC(2026, 10, 4, 12)));
const SKY = computeChart(BRAND_JD);
const even = SCALES.even, RMAX = 46;

/** The nine orbits, the worlds on them, the station ring and the aspect lines, centred at (cx, cy), radius R. */
export function skySVG(cx, cy, R, { ink = INKS.ink, stations = true, aspects = true, labels = false, glow = true, alpha = 1 } = {}) {
  const A = a => f2(a * alpha);
  const rIn = R * 0.83, k = r => even(r) / even(RMAX) * rIn;
  const P = (lon, rad) => [f2(cx + rad * Math.cos(lon * D2R)), f2(cy - rad * Math.sin(lon * D2R))];
  let s = '';
  if (glow) { const gid = 'g' + (++uid); s += `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity="${A(0.34)}"/><stop offset=".25" stop-color="#fff" stop-opacity="${A(0.07)}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${f2(R * 0.16)}" fill="url(#${gid})"/>`; }
  if (stations) {
    const r0 = R * 0.88, r1 = R;
    s += `<circle cx="${cx}" cy="${cy}" r="${f2(r0)}" stroke="${ink}" stroke-opacity="${A(0.16)}"/><circle cx="${cx}" cy="${cy}" r="${f2(r1)}" stroke="${ink}" stroke-opacity="${A(0.16)}"/>`;
    for (let i = 0; i < 12; i++) { const [a, b] = [P(i * 30, r0), P(i * 30, r1)]; s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ink}" stroke-opacity="${A(0.16)}"/>`; }
    for (let d = 0; d < 360; d += 5) { if (d % 30 === 0) continue; const [a, b] = [P(d, r0), P(d, r0 - (d % 10 === 0 ? R * 0.016 : R * 0.008))]; s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${ink}" stroke-opacity="${A(0.13)}"/>`; }
    const a0 = SKY.station * 30, a1 = a0 + 30, [p0, p1, p2, p3] = [P(a0, r1), P(a1, r1), P(a1, r0), P(a0, r0)];
    s += `<path d="M${p0}A${f2(r1)} ${f2(r1)} 0 0 0 ${p1}L${p2}A${f2(r0)} ${f2(r0)} 0 0 1 ${p3}Z" fill="${ink}" fill-opacity="${A(0.07)}"/>`;
  }
  PLANETS.forEach(p => {
    const d = orbitPath(p, BRAND_JD, 220).map((q, i) => { const [x, y] = P(Math.atan2(q.y, q.x) / D2R, k(Math.hypot(q.x, q.y))); return `${i ? 'L' : 'M'}${x} ${y}`; }).join('') + 'Z';
    s += `<path d="${d}" stroke="${ink}" stroke-opacity="${A(p.code === 'EAR' ? 0.34 : 0.12)}" stroke-width="${p.code === 'EAR' ? 1.2 : 1}"/>`;
  });
  const pos = Object.fromEntries(SKY.bodies.map(b => [b.code, P(b.lon, k(b.r))]));
  if (aspects) SKY.aspects.forEach(a => {
    const st = { Merge: [1.5, 0.7, ''], Signal: [1, 0.5, '1 4'], Friction: [1.3, 0.6, ''], Flow: [0.9, 0.42, ''], Mirror: [1, 0.5, '6 5'] }[a.type];
    const [x1, y1] = pos[a.a.code], [x2, y2] = pos[a.b.code];
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ink}" stroke-opacity="${A(st[1] * (1 - a.orb / 9))}" stroke-width="${st[0]}"${st[2] ? ` stroke-dasharray="${st[2]}" stroke-linecap="round"` : ''}/>`;
  });
  const sunR = Math.max(4, R * 0.022);
  s += `<circle cx="${cx}" cy="${cy}" r="${f2(sunR)}" fill="#fff" fill-opacity="${A(1)}"/>`;
  SKY.bodies.forEach(b => {
    const [x, y] = pos[b.code], isE = b.code === 'EAR', r = Math.max(2.4, b.size * R / 360 * 1.5);
    s += `<circle cx="${x}" cy="${y}" r="${f2(r + 3)}" fill="${BG}"/><circle cx="${x}" cy="${y}" r="${f2(r)}" fill="${isE ? '#fff' : ink}" fill-opacity="${A(isE ? 1 : 0.82)}"/>`;
    if (isE) s += `<circle cx="${x}" cy="${y}" r="${f2(r + 6)}" stroke="${ink}" stroke-opacity="${A(0.55)}"/>`;
    if (b.code === 'SAT') s += `<ellipse cx="${x}" cy="${y}" rx="${f2(r + 4.5)}" ry="${f2((r + 4.5) * 0.36)}" transform="rotate(-20 ${x} ${y})" stroke="${ink}" stroke-opacity="${A(0.7)}"/>`;
    if (labels) s += `<text x="${f2(x + r + 7)}" y="${f2(y - r - 4)}" fill="${isE ? '#fff' : ink}" fill-opacity="${A(isE ? 1 : 0.55)}" font-family="'Geist Mono', monospace" font-size="${f2(Math.max(10, R * 0.026))}" font-weight="${isE ? 600 : 500}">${isE ? 'EARTH' : b.code}</text>`;
  });
  return s;
}

/* ---------- banners ---------- */

/**
 * left: lockup on the left, the real sky rising off the right edge (README, X header).
 * center: lockup in the middle over a faint full sky (GitHub social preview, link preview).
 */
export function bannerSVG(w, h, { align = 'left', textW } = {}) {
  let body = `<rect width="${w}" height="${h}" fill="${BG}"/>`;
  if (align === 'left') {
    const R = h * 1.05, cx = w - h * 0.62, cy = h * 0.5;
    body += `<g>${skySVG(cx, cy, R, { labels: true })}</g>`;
    const fade = 'f' + (++uid);
    body += `<defs><linearGradient id="${fade}" x1="0" x2="1"><stop offset="0" stop-color="#000"/><stop offset=".34" stop-color="#000"/><stop offset=".6" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${fade})"/>`;
    const lh = h * 0.15, lx = h * 0.2, ly = h * 0.5 - lh * 0.95;
    body += `<g transform="translate(${f2(lx)} ${f2(ly)})">${inner(lockupSVG(INKS.white, { height: lh, text: '#fff', textW }))}</g>`;
    body += `<text x="${f2(lx)}" y="${f2(h * 0.5 + lh * 0.62)}" fill="${INKS.ink}" fill-opacity=".62" font-family="Geist, sans-serif" font-weight="500" font-size="${f2(h * 0.062)}" letter-spacing="${f2(-h * 0.0006)}">The sky from the Sun.</text>`;
    body += `<text x="${f2(lx)}" y="${f2(h * 0.5 + lh * 1.2)}" fill="${INKS.ink}" fill-opacity=".36" font-family="'Geist Mono', monospace" font-weight="400" font-size="${f2(h * 0.03)}" letter-spacing="${f2(h * 0.002)}">A HELIOCENTRIC BIRTH CHART · EARTH IS YOU · 1800–2050</text>`;
  } else {
    const R = Math.min(w, h) * 0.62;
    body += `<g>${skySVG(w / 2, h / 2, R, { alpha: 0.42, labels: false })}</g>`;
    const vg = 'v' + (++uid);
    body += `<defs><radialGradient id="${vg}"><stop offset="0" stop-color="#000" stop-opacity=".88"/><stop offset=".42" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.42}" ry="${h * 0.3}" fill="url(#${vg})"/>`;
    const lh = h * 0.13, lw = lockW(lh, textW);
    body += `<g transform="translate(${f2((w - lw) / 2)} ${f2(h / 2 - lh * 0.8)})">${inner(lockupSVG(INKS.white, { height: lh, text: '#fff', textW }))}</g>`;
    body += `<text x="${w / 2}" y="${f2(h / 2 + lh * 0.75)}" text-anchor="middle" fill="${INKS.ink}" fill-opacity=".62" font-family="Geist, sans-serif" font-weight="500" font-size="${f2(h * 0.05)}">The sky from the Sun.</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">${body}</svg>`;
}
const lockW = (height, textW = 760) => height + height * 0.34 + textW * height * 0.42 / 100;
const inner = svg => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

/* ---------- loops: one frame at t in [0, 1) ---------- */

/** Loop 1, "Orbit": the mark, Earth going round once. */
export const loopMark = (t, size = 1080) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><rect width="24" height="24" fill="${BG}"/><g transform="translate(5 5) scale(${14 / 24})">${markBody('#fff', { earthDeg: 50 + 360 * t })}</g></svg>`;

/**
 * Loop 2, "Eight years": Mercury, Venus, Earth and Mars from the Sun's chair. Every few days a line joins Venus and Earth;
 * over eight Earth years Venus goes round 13 times and the lines draw the five-petalled figure the two make together.
 * Venus and Earth keep their true 13 : 8 rhythm; Mercury and Mars are rounded to 33 and 4 turns so the loop closes.
 */
export function loopVenus(t, w = 1080, h = 1080) {
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.44;
  const start = Object.fromEntries(SKY.bodies.map(b => [b.code, b.lon]));
  const TURNS = { MER: 33, VEN: 13, EAR: 8, MAR: 4 };
  const RAD = { MER: 0.3, VEN: 0.56, EAR: 0.78, MAR: 1 };
  const P = (code, tt) => { const a = (start[code] + 360 * TURNS[code] * tt) * D2R, r = RAD[code] * R; return [f2(cx + r * Math.cos(a)), f2(cy - r * Math.sin(a))]; };
  let s = `<rect width="${w}" height="${h}" fill="${BG}"/>`;
  const gid = 'g' + (++uid);
  s += `<defs><radialGradient id="${gid}"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".3" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${cx}" cy="${cy}" r="${f2(R * 0.3)}" fill="url(#${gid})"/>`;
  Object.keys(RAD).forEach(c => { s += `<circle cx="${cx}" cy="${cy}" r="${f2(RAD[c] * R)}" stroke="#ECEBE6" stroke-opacity="${c === 'EAR' ? 0.32 : 0.12}" stroke-width="${c === 'EAR' ? 1.6 : 1.2}" fill="none"/>`; });
  // the chords: one every 1/240 of the cycle (about 12 days), fading with age; the window is the whole cycle, so it loops
  // every line of the eight years stays faintly, so the whole figure is always there; the newest are brighter, so it keeps drawing
  const N = 720;
  for (let i = 0; i < N; i++) {
    const tt = (Math.floor(t * N) - i) / N, age = (i + (t * N % 1)) / N;
    const [x1, y1] = P('VEN', tt), [x2, y2] = P('EAR', tt);
    const a = 0.07 + 0.5 * Math.pow(1 - age, 6);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ECEBE6" stroke-opacity="${a.toFixed(3)}" stroke-width="1"/>`;
  }
  const [vx, vy] = P('VEN', t), [ex, ey] = P('EAR', t);
  s += `<line x1="${vx}" y1="${vy}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-opacity=".9" stroke-width="1.6"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${f2(R * 0.045)}" fill="#fff"/>`;
  [['MER', 0.016], ['VEN', 0.024], ['MAR', 0.02]].forEach(([c, r]) => { const [x, y] = P(c, t); s += `<circle cx="${x}" cy="${y}" r="${f2(R * r + 5)}" fill="${BG}"/><circle cx="${x}" cy="${y}" r="${f2(R * r)}" fill="#ECEBE6" fill-opacity=".85"/>`; });
  s += `<circle cx="${ex}" cy="${ey}" r="${f2(R * 0.026 + 5)}" fill="${BG}"/><circle cx="${ex}" cy="${ey}" r="${f2(R * 0.026)}" fill="#fff"/><circle cx="${ex}" cy="${ey}" r="${f2(R * 0.026 + 11)}" stroke="#ECEBE6" stroke-opacity=".55" stroke-width="1.4" fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">${s}</svg>`;
}

/** Loop 3, "Twelve stations": one year. Earth crosses the twelve stations and each one lights as Earth passes through it. */
export function loopStations(t, w = 1080, h = 1080) {
  const STN = ['Core', 'Radiative', 'Granule', 'Facula', 'Sunspot', 'Umbra', 'Flare', 'Prominence', 'Chromosphere', 'Corona', 'Wind', 'Heliopause'];
  const ROM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.42, r0 = R * 0.86, rE = R * 0.6;
  const P = (deg, r) => [f2(cx + r * Math.cos(deg * D2R)), f2(cy - r * Math.sin(deg * D2R))];
  const lon = 360 * t, st = Math.floor(lon / 30) % 12, into = (lon % 30) / 30;
  let s = `<rect width="${w}" height="${h}" fill="${BG}"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${f2(R)}" stroke="#ECEBE6" stroke-opacity=".18" stroke-width="1.4"/><circle cx="${cx}" cy="${cy}" r="${f2(r0)}" stroke="#ECEBE6" stroke-opacity=".18" stroke-width="1.4"/>`;
  for (let i = 0; i < 12; i++) {
    const a0 = i * 30, a1 = a0 + 30;
    // the lit sector brightens as Earth enters and fades as it leaves
    const lit = i === st ? Math.sin(Math.PI * Math.min(1, into * 1.15 + 0.08)) * 0.12 + 0.04 : 0;
    if (lit) { const [p0, p1, p2, p3] = [P(a0, R), P(a1, R), P(a1, r0), P(a0, r0)]; s += `<path d="M${p0}A${f2(R)} ${f2(R)} 0 0 0 ${p1}L${p2}A${f2(r0)} ${f2(r0)} 0 0 1 ${p3}Z" fill="#ECEBE6" fill-opacity="${f2(lit)}"/>`; }
    const [a, b] = [P(a0, r0), P(a0, R)];
    s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ECEBE6" stroke-opacity=".22" stroke-width="1.4"/>`;
    const [lx, ly] = P(a0 + 15, (R + r0) / 2);
    s += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="#ECEBE6" fill-opacity="${i === st ? 1 : 0.35}" font-family="'Geist Mono', monospace" font-weight="500" font-size="${f2(R * 0.042)}">${ROM[i]}</text>`;
  }
  for (let d = 0; d < 360; d += 2) { if (d % 30 === 0) continue; const [a, b] = [P(d, r0), P(d, r0 - (d % 10 === 0 ? R * 0.03 : R * 0.015))]; s += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#ECEBE6" stroke-opacity=".14"/>`; }
  s += `<circle cx="${cx}" cy="${cy}" r="${f2(rE)}" stroke="#ECEBE6" stroke-opacity=".3" stroke-width="1.4" fill="none"/>`;
  // Earth's trail: a fixed 120° tail that fades, so the loop has no seam
  for (let k = 0; k < 24; k++) {
    const a0 = lon - (k + 1) * 5, a1 = lon - k * 5, [a, b] = [P(a0, rE), P(a1, rE)];
    s += `<path d="M${a}A${f2(rE)} ${f2(rE)} 0 0 0 ${b}" stroke="#fff" stroke-opacity="${f2(0.6 * Math.pow(1 - k / 24, 1.5))}" stroke-width="2.4" fill="none"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${f2(R * 0.05)}" fill="#fff"/>`;
  const [ex, ey] = P(lon, rE);
  s += `<circle cx="${ex}" cy="${ey}" r="${f2(R * 0.035 + 8)}" fill="${BG}"/><circle cx="${ex}" cy="${ey}" r="${f2(R * 0.035)}" fill="#fff"/>`;
  s += `<text x="${cx}" y="${f2(cy + R * 0.2)}" text-anchor="middle" fill="#fff" font-family="Geist, sans-serif" font-weight="600" font-size="${f2(R * 0.11)}" letter-spacing="${f2(-R * 0.003)}">${STN[st]}</text>`;
  s += `<text x="${cx}" y="${f2(cy + R * 0.3)}" text-anchor="middle" fill="#ECEBE6" fill-opacity=".45" font-family="'Geist Mono', monospace" font-weight="500" font-size="${f2(R * 0.036)}" letter-spacing="${f2(R * 0.004)}">STATION ${ROM[st]}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" fill="none">${s}</svg>`;
}
