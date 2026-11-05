import { computeChart, jdFromDate, dateFromJd, JD_MIN, JD_MAX, PLANETS, pulls, synodics, solarCycle, moonAt, nextReturn,
  stationRanges, orbitKm, V_GAL, AUm, C_LIGHT, normDeg } from './astro.js';
import { STATIONS, ROMAN, WORLDS, PATTERNS, ASPECT_MEANING, patternText, natalReading, solarWeather, resonance, stationOf,
  PROMPTS, dataBlock, pairBlock, badgeDetail } from './meaning.js';
import { drawWheel, sealSVG, stationSVG, drawPoster } from './wheel.js';
import { createTelescope } from './telescope.js';

const $ = id => document.getElementById(id);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- icons (16 px, 1.5 stroke, Linear-style) ---------- */
const ICONS = {
  sky: '<circle cx="8" cy="8" r="2.6"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1"/>',
  chart: '<circle cx="8" cy="8" r="6.2"/><circle cx="8" cy="8" r="3.4" opacity=".5"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="12.4" cy="5.6" r="1.1" fill="currentColor" stroke="none"/>',
  pair: '<circle cx="6" cy="8" r="4.2"/><circle cx="10" cy="8" r="4.2"/>',
  scope: '<path d="M2.6 10.6l8.2-5.2 1.6 2.6-8.2 5.2z"/><path d="M10.8 5.4l1.4-.9 1.6 2.6-1.4.9M6.4 11.2L5 14.2M7.6 10.4l2.2 3.8"/>',
  figures: '<path d="M2.5 13.5h11M4.5 11V7.5M8 11V4M11.5 11V6"/>',
  oracle: '<path d="M8 2.2l1.4 4.4L13.8 8l-4.4 1.4L8 13.8l-1.4-4.4L2.2 8l4.4-1.4z"/>',
  poster: '<rect x="3" y="1.8" width="10" height="12.4" rx="1.5"/><circle cx="8" cy="7" r="2.6"/><path d="M5.5 11.6h5"/>',
  plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  theme: '<circle cx="8" cy="8" r="5.6"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor"/>',
  info: '<circle cx="8" cy="8" r="6"/><path d="M8 7.2v3.6M8 5.2v.1"/>',
  chev: '<path d="M5 6.5l3 3 3-3"/>',
  play: '<path d="M5.5 3.8v8.4l6.6-4.2z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M5.5 4v8M10.5 4v8" stroke-width="2"/>',
  prev: '<path d="M10.5 4.5L7 8l3.5 3.5M5 4.5v7"/>',
  next: '<path d="M5.5 4.5L9 8l-3.5 3.5M11 4.5v7"/>',
  edit: '<path d="M10.8 2.9l2.3 2.3-7.4 7.4-2.9.6.6-2.9z"/>',
  link: '<path d="M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2.2-2.2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0L3.3 9a2.6 2.6 0 0 0 3.7 3.7l.8-.8"/>',
  download: '<path d="M8 2.5v8M4.8 7.5L8 10.7l3.2-3.2M3 13.5h10"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3.8A1.3 1.3 0 0 0 9.2 2.5H3.8a1.3 1.3 0 0 0-1.3 1.3v5.4a1.3 1.3 0 0 0 1.3 1.3h1.7"/>',
};
const ico = n => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;
function paintIcons(root = document) { $$('i[data-ico]', root).forEach(i => { if (!i.firstChild) i.innerHTML = ico(i.dataset.ico); }); }

/* The mark: 01 "Earth on the ring" (design/final). The Sun in the middle, you as the one dot going round it.
   The gap round Earth is a mask, so each copy gets its own id. */
let markN = 0;
const MARK = () => { const id = 'sm' + (++markN); return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><defs><mask id="${id}"><rect width="24" height="24" fill="#fff"/><circle cx="18.59" cy="6.47" r="3.4" fill="#000"/></mask></defs><circle cx="12" cy="12" r="3.4" fill="currentColor"/><circle cx="12" cy="12" r="8.6" stroke="currentColor" stroke-width="1.4" mask="url(#${id})"/><circle cx="18.59" cy="6.47" r="2.1" fill="currentColor"/></svg>`; };

/* ---------- time zones ---------- */
const HOME_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const TZS = (() => { try { return Intl.supportedValuesOf('timeZone'); } catch { return [HOME_TZ, 'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney']; } })();
if (!TZS.includes('UTC')) TZS.unshift('UTC');
function tzOffsetMin(utcMs, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(utcMs)).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - Math.floor(utcMs / 1000) * 1000) / 60000);
}
function localToUTC(date, time, tz) {
  const [y, m, d] = date.split('-').map(Number), [hh, mm] = (time || '12:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = 0;
  try { off = tzOffsetMin(guess, tz); const off2 = tzOffsetMin(guess - off * 60000, tz); if (off2 !== off) off = off2; } catch { off = 0; }
  return new Date(guess - off * 60000);
}

/* ---------- people (stored on this device only) ---------- */
const store = {
  get people() { try { return JSON.parse(localStorage.getItem('sun.people')) || []; } catch { return []; } },
  set people(v) { localStorage.setItem('sun.people', JSON.stringify(v)); },
  get active() { return localStorage.getItem('sun.active'); },
  set active(v) { localStorage.setItem('sun.active', v); },
  get theme() { return localStorage.getItem('sun.theme') || 'dark'; },
  set theme(v) { localStorage.setItem('sun.theme', v); },
};
const uid = () => Math.random().toString(36).slice(2, 9);
const personJd = p => jdFromDate(localToUTC(p.date, p.unknown ? '12:00' : p.time, p.tz));

const S = {
  view: 'sky', viewJd: jdFromDate(new Date()), nowJd: jdFromDate(new Date()),
  playing: false, speed: 30, scale: 'even', aspects: true, hover: null, focus: null,
  pairWith: null, guest: null, oracleMode: 'daily', posterTheme: 'dark',
  chartCache: new Map(), geom: null, t: 0, dirty: true, lastInspect: 0,
};
const chartAt = jd => { const k = Math.round(jd * 96) / 96; if (!S.chartCache.has(k)) { if (S.chartCache.size > 400) S.chartCache.clear(); S.chartCache.set(k, computeChart(k)); } return S.chartCache.get(k); };
function people() { return store.people; }
function active() {
  if (S.guest) return S.guest;
  const ps = people();
  return ps.find(p => p.id === store.active) || ps[0] || null;
}
const natalCache = new Map();
const natalOf = p => { if (!p) return null; const jd = personJd(p); if (!natalCache.has(jd)) natalCache.set(jd, computeChart(jd)); return natalCache.get(jd); };

/* ---------- formatting ---------- */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDay = d => `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const fmtMD = d => `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
const fmtJd = jd => fmtDay(dateFromJd(jd));
const fmtTime = d => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const n0 = x => Math.round(x).toLocaleString('en-US');
const daysBetween = (a, b) => Math.round(b - a);
const isToday = jd => Math.abs(jd - S.nowJd) < 0.6;

/* ---------- toast ---------- */
let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 1800); }
async function copy(text, msg = 'Copied') { try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast('Copy failed'); } }

/* ---------- routing ---------- */
const TIMED = ['sky', 'chart', 'telescope'];
const VIEWS = { sky: 'Today', chart: 'Birth chart', pair: 'Pair', telescope: 'Telescope', figures: 'Figures', oracle: 'Oracle', poster: 'Poster' };
function parseHash() {
  const [path, q] = location.hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(q || '');
  return { view: VIEWS[path] ? path : 'sky', params };
}
function route() {
  const { view, params } = parseHash();
  const s = params.get('s');
  if (s) { try { const g = JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))))); S.guest = { id: 'guest', name: g.n, date: g.d, time: g.t, tz: g.z, unknown: !!g.u }; } catch { S.guest = null; } }
  const prev = S.view;
  S.view = view;
  if (view === 'chart' && prev !== 'chart') { const p = active(); if (p) S.viewJd = personJd(p); }
  if (view === 'sky' && prev !== 'sky') S.viewJd = S.nowJd;
  $$('[data-view]').forEach(a => a.classList.toggle('on', a.dataset.view === view));
  const stage = ['sky', 'chart', 'pair', 'telescope'].includes(view);
  $('stageView').hidden = !stage; $('docView').hidden = stage;
  document.querySelector('.main').classList.toggle('no-time', !TIMED.includes(view));
  setScope(view === 'telescope');
  $('crumbView').textContent = VIEWS[view];
  if (S.playing && !stage) togglePlay(false);
  renderAll();
  if (stage) requestAnimationFrame(resize);
  window.scrollTo(0, 0);
}

/* ---------- sidebar: people ---------- */
function renderPeople() {
  const ps = people(), a = active();
  const html = ps.length ? ps.map(p => {
    const c = natalOf(p);
    return `<li data-id="${p.id}" class="${a && a.id === p.id ? 'on' : ''}"><span class="seal">${sealSVG(c, { size: 18 })}</span><span class="pname">${esc(p.name)}</span><span class="pst">${STATIONS[c.station].name}</span><button class="icon-btn edit" data-edit="${p.id}" title="Edit" aria-label="Edit ${esc(p.name)}"><i data-ico="edit"></i></button></li>`;
  }).join('') : '<li class="empty">No one yet. Add your birth moment.</li>';
  $('people').innerHTML = html; $('peopleM').innerHTML = html;
  paintIcons($('people')); paintIcons($('peopleM'));
  const c = natalOf(a);
  $('whoName').textContent = a ? a.name : 'Add you';
  $('whoSeal').innerHTML = c ? sealSVG(c, { size: 18 }) : '';
  $('crumbPerson').textContent = a ? a.name : 'The sky';
}
function onPeopleClick(e) {
  const ed = e.target.closest('[data-edit]');
  if (ed) { e.stopPropagation(); openPerson(people().find(p => p.id === ed.dataset.edit)); return; }
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  S.guest = null; store.active = li.dataset.id; S.pairWith = null;
  if (location.hash.includes('?s=')) location.hash = '#/' + S.view;
  if (S.view === 'chart') S.viewJd = personJd(active());
  $('peopleDlg').open && $('peopleDlg').close();
  renderAll();
}

/* ---------- the person dialog ---------- */
let editing = null;
function openPerson(p = null, defaults = {}) {
  editing = p;
  const f = $('personForm');
  $('personTitle').textContent = p ? `Edit ${p.name}` : people().length ? 'Add a person' : 'Your birth moment';
  f.name.value = p?.name ?? defaults.name ?? (people().length ? '' : 'Me');
  f.date.value = p?.date ?? defaults.date ?? '';
  f.time.value = p?.time ?? '12:00';
  f.unknown.checked = !!p?.unknown;
  f.tz.value = p?.tz ?? HOME_TZ;
  $('deletePerson').hidden = !p;
  $('cancelPerson').hidden = !people().length && !p;
  $('personDlg').showModal();
  setTimeout(() => (p ? f.date : f.name).focus(), 30);
}
function savePerson(e) {
  e.preventDefault();
  const f = $('personForm');
  if (!f.reportValidity()) return;
  const rec = { name: f.name.value.trim() || 'Me', date: f.date.value, time: f.time.value || '12:00', unknown: f.unknown.checked, tz: f.tz.value };
  const ps = people();
  if (editing && editing.id !== 'guest') Object.assign(ps.find(p => p.id === editing.id), rec);
  else { rec.id = uid(); ps.push(rec); store.active = rec.id; S.guest = null; }
  store.people = ps;
  $('personDlg').close();
  if (location.hash.includes('?s=')) location.hash = '#/' + S.view;
  if (S.view === 'chart') S.viewJd = personJd(active());
  renderAll();
  toast(editing ? 'Saved' : `${rec.name} added`);
}
function deletePerson() {
  if (!editing) return;
  if (!confirm(`Delete ${editing.name}? This only removes them from this device.`)) return;
  store.people = people().filter(p => p.id !== editing.id);
  if (store.active === editing.id) store.active = people()[0]?.id || '';
  $('personDlg').close(); renderAll();
}
function randomSky() {
  const t = Date.UTC(1950, 0, 1) + Math.random() * (Date.UTC(2012, 0, 1) - Date.UTC(1950, 0, 1));
  const d = new Date(t), f = $('personForm');
  f.date.value = d.toISOString().slice(0, 10);
  f.time.value = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  f.tz.value = 'UTC';
  if (!f.name.value) f.name.value = 'A stranger';
}
function shareLink(p) {
  const s = btoa(unescape(encodeURIComponent(JSON.stringify({ n: p.name, d: p.date, t: p.time, z: p.tz, u: p.unknown ? 1 : 0 })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${location.origin}${location.pathname}#/chart?s=${s}`;
}

/* ---------- stage: canvas ---------- */
const cv = $('wheel'), g = cv.getContext('2d');
function resize() {
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  if (!r.width) return;
  cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  S.dirty = true;
}
function stageCharts() {
  const p = active();
  if (S.view === 'pair') {
    const b = pairPartner();
    return { chart: natalOf(p) || chartAt(S.viewJd), other: b ? natalOf(b) : null, natal: null, sub: p ? p.name : null, otherSub: b ? b.name : null };
  }
  const chart = chartAt(S.viewJd);
  const natal = p && (S.view === 'sky' || S.view === 'telescope') ? natalOf(p) : null;
  return { chart, natal, other: null, sub: p ? (S.view === 'sky' ? `${p.name} · now` : p.name) : null, otherSub: null };
}
function draw() {
  const r = cv.getBoundingClientRect();
  if (!r.width) return;
  const W = r.width, H = r.height;
  g.clearRect(0, 0, W, H);
  const { chart, natal, other, sub, otherSub } = stageCharts();
  const narrow = W < 520, top = narrow ? 46 : 0;
  const R = Math.min(W, H - top) / 2 - (narrow ? 10 : 36);
  S.geom = drawWheel(g, { chart, natal, other, scale: S.scale, cx: W / 2, cy: top + (H - top) / 2 + (narrow ? 0 : 4), R, hover: S.hover, focus: S.focus, showAspects: S.aspects, t: S.t, earthSub: sub, otherSub });
  S.geom.chart = chart; S.geom.other = other;
}
/* ---------- the Telescope (three.js, loaded on first open) ---------- */
let scope = null, scopeLoading = null;
function setScope(on) {
  $('scope').hidden = !on; cv.hidden = on;
  $('stageView').classList.toggle('scope-on', on);
  showTip(null);
  if (scope) scope.setActive(on);
  if (on && !scope && !scopeLoading) {
    $('scopeMsg').innerHTML = '<span class="scope-load"><img src="assets/mark-orbit.svg" width="28" height="28" alt="">Loading the telescope</span>'; $('scopeMsg').hidden = false;
    scopeLoading = createTelescope($('scope'), { onHover: onScopeHover }).then(t => {
      scope = t; scope.bindPad($('scopePad')); $('scopeMsg').hidden = true;
      scope.setActive(S.view === 'telescope'); syncScope(); scope.started(); renderInspector();
    }).catch(err => {
      console.warn(err); scopeLoading = null;
      $('scopeMsg').textContent = 'The telescope needs an internet connection the first time (it loads three.js).';
    });
  }
}
function syncScope() {
  if (!scope) return;
  const { chart, natal, other, sub, otherSub } = stageCharts();
  scope.sync(chart, { natal, other, scale: S.scale, showAspects: S.aspects, focus: S.focus, earthSub: sub, otherSub });
}
function onScopeHover(code, x, y, speed, tap) {
  if (tap) { S.focus = code && code !== S.focus ? code : null; S.dirty = true; renderHud(); }
  if (x == null) return;
  S.hover = code;
  showTip(code, x, y, scope?.chart);
}
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  S.t += dt;
  const stage = !$('stageView').hidden;
  if (S.playing) {
    S.viewJd += S.speed * dt;
    if (S.viewJd >= JD_MAX) { S.viewJd = JD_MAX; togglePlay(false); }
    S.dirty = true;
    syncTime();
    if (now - S.lastInspect > 220) { S.lastInspect = now; renderInspector(); }
  }
  if (stage && S.view === 'telescope') { if (S.dirty) { syncScope(); S.dirty = false; } scope?.frame(dt, S.t); }
  else if (stage && (S.dirty || !matchMedia('(prefers-reduced-motion: reduce)').matches)) { draw(); S.dirty = false; }
  if (S.view === 'figures') tickOdo();
  requestAnimationFrame(loop);
}
function hit(x, y) {
  if (!S.geom) return null;
  let best = null, bd = 18;
  for (const [code, [px, py]] of Object.entries(S.geom.pos)) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = code; } }
  return best;
}
function showTip(code, x, y, chart = S.geom?.chart) {
  const tip = $('tip');
  if (!code || !chart) { tip.hidden = true; cv.classList.remove('hovering'); return; }
  const b = chart.bodies.find(q => q.code === code), W = WORLDS[code];
  const ret = chart.retro.has(code);
  tip.innerHTML = `<b>${W.glyph} ${b.name}${code === 'EAR' ? ' · you' : ''}</b>
    <div class="kv"><span>Station</span><span>${STATIONS[stationOf(b.lon)].name}</span></div>
    <div class="kv"><span>Longitude</span><span>${b.lon.toFixed(1)}°</span></div>
    <div class="kv"><span>From the Sun</span><span>${b.r.toFixed(2)} AU</span></div>
    <div class="kv"><span>Speed</span><span>${b.speed.toFixed(1)} km/s</span></div>
    <div class="kv"><span>Orbit</span><span>${Math.round(b.frac * 100)}% past perihelion</span></div>
    ${ret ? '<div class="kv"><span>From Earth</span><span>looks retrograde</span></div>' : ''}
    <div class="kv"><span>Speaks for</span><span>${W.voice}</span></div>`;
  const rect = $('stage').getBoundingClientRect();
  tip.hidden = false;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  tip.style.left = Math.min(x, rect.width - tw - 24) + 'px';
  tip.style.top = Math.min(y, rect.height - th - 24) + 'px';
  cv.classList.add('hovering');
}
cv.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const h = hit(x, y);
  if (h !== S.hover) { S.hover = h; S.dirty = true; }
  showTip(h, x, y);
});
cv.addEventListener('pointerleave', () => { S.hover = null; S.dirty = true; showTip(null); });
cv.addEventListener('click', e => {
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const h = hit(x, y);
  S.focus = h && h !== S.focus ? h : null;
  S.hover = h; S.dirty = true;
  if (e.pointerType === 'touch' || !matchMedia('(hover: hover)').matches) showTip(h, x, y);
  renderHud();
});
new ResizeObserver(resize).observe($('stage'));

function renderHud() {
  const { chart } = stageCharts();
  const d = dateFromJd(S.view === 'pair' ? chart.jd : S.viewJd);
  const lines = [
    `<b>${S.view === 'sky' ? (isToday(S.viewJd) ? 'THE SKY NOW' : 'THE SKY ON') : S.view === 'chart' ? 'BIRTH SKY' : S.view === 'telescope' ? 'TELESCOPE' : 'TWO SKIES'}</b>`,
    `${fmtDay(d).toUpperCase()}`,
    `PATTERN · ${chart.pattern.toUpperCase()}`,
  ];
  if (S.focus) lines.push(`FOCUS · ${WORLDS[S.focus] ? S.geom?.chart.bodies.find(b => b.code === S.focus)?.name.toUpperCase() : ''} · TAP AGAIN TO CLEAR`);
  $('hudTL').innerHTML = lines.map(l => `<span>${l}</span>`).join('');
}

/* ---------- time bar ---------- */
const jdToRange = jd => (jd - JD_MIN) / (JD_MAX - JD_MIN) * 1000;
const rangeToJd = v => JD_MIN + v / 1000 * (JD_MAX - JD_MIN);
function syncTime() {
  $('tbRange').value = jdToRange(S.viewJd);
  const d = dateFromJd(S.viewJd);
  const dd = S.viewJd - S.nowJd, ad = Math.abs(dd);
  const rel = isToday(S.viewJd) ? 'today' : ad < 60 ? `${Math.round(ad)} days ${dd < 0 ? 'ago' : 'ahead'}` : ad < 730 ? `${Math.round(ad / 30.44)} months ${dd < 0 ? 'ago' : 'ahead'}` : `${Math.round(ad / 365.25)} years ${dd < 0 ? 'ago' : 'ahead'}`;
  $('tbDate').innerHTML = `${fmtDay(d)}<small>${rel}</small>`;
  renderHud();
}
function renderMarks() {
  const p = active();
  let h = '';
  for (let y = 1800; y <= 2050; y += 50) { const x = jdToRange(jdFromDate(new Date(Date.UTC(y, 0, 1)))) / 10; h += `<span style="left:${x}%"></span><em style="left:${x}%">${y}</em>`; }
  h += `<span class="n" style="left:${jdToRange(S.nowJd) / 10}%"></span>`;
  if (p) h += `<span class="b" style="left:${jdToRange(personJd(p)) / 10}%" title="Birth"></span>`;
  $('tbMarks').innerHTML = h;
}
function togglePlay(on = !S.playing) {
  S.playing = on;
  const b = $('playBtn'); b.innerHTML = `<i data-ico="${on ? 'pause' : 'play'}"></i>`; paintIcons(b);
  b.setAttribute('aria-label', on ? 'Pause' : 'Play');
  if (!on) renderInspector();
}
function step(dir) { S.viewJd = Math.max(JD_MIN, Math.min(JD_MAX, S.viewJd + dir * S.speed)); S.dirty = true; syncTime(); renderInspector(); }
$('tbRange').addEventListener('input', e => { S.viewJd = rangeToJd(+e.target.value); S.dirty = true; syncTime(); throttleInspector(); });
let inspT; function throttleInspector() { clearTimeout(inspT); inspT = setTimeout(renderInspector, 60); }
$('playBtn').onclick = () => togglePlay();
$('stepBack').onclick = () => step(-1);
$('stepFwd').onclick = () => step(1);
$('toNow').onclick = () => { S.viewJd = S.nowJd; if (S.view === 'chart') location.hash = '#/sky'; S.dirty = true; syncTime(); renderInspector(); };
$('toBirth').onclick = () => { const p = active(); if (!p) return openPerson(); S.viewJd = personJd(p); S.dirty = true; syncTime(); renderInspector(); };
$('speedSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.speed = +b.dataset.speed; $$('#speedSeg button').forEach(x => x.classList.toggle('on', x === b)); };
$('scaleSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.scale = b.dataset.scale; $$('#scaleSeg button').forEach(x => x.classList.toggle('on', x === b)); S.dirty = true; };
$('aspToggle').onclick = e => { S.aspects = !S.aspects; e.currentTarget.setAttribute('aria-pressed', S.aspects); $('legend').style.opacity = S.aspects ? 1 : 0; S.dirty = true; };

/* ---------- inspector: Today ---------- */
function emptyCTA(msg) {
  return `<div class="sec"><div class="label">Start here</div><p class="lede">${msg}</p><div class="row" style="margin-top:14px"><button class="btn primary" data-act="add">Add your birth moment</button></div></div>`;
}
function inspectSky() {
  const p = active(), now = chartAt(S.viewJd), natal = natalOf(p), today = isToday(S.viewJd);
  const m = moonAt(S.viewJd);
  const st = STATIONS[now.station];
  // when does Earth enter the next station?
  let k = 0; while (k < 40 && stationOf(chartAt(S.viewJd + k).earth.lon) === now.station) k++;
  const nextSt = STATIONS[(now.station + 1) % 12];
  let h = '';
  if (natal) {
    const w = solarWeather(natal, now);
    h += `<div class="sec">
      <div class="label">Solar weather <span class="r mono">${today ? 'today' : fmtJd(S.viewJd)}</span></div>
      <div class="big">${w.weather.name}</div>
      <p class="lede">${esc(w.theme)}</p>
      <p class="small">${w.weather.line}</p>
      <div class="meter"><span style="width:${Math.max(4, Math.min(100, 50 + w.score * 8))}%"></span></div>
    </div>`;
    h += `<div class="sec"><div class="label">Lines to your birth sky <span class="r">${w.transits.length} within 3.5°</span></div>`;
    h += w.transits.length ? `<ul class="lines">${w.transits.slice(0, 9).map(t => `<li class="${t.isReturn ? 'ret' : ''}"><span class="g">${t.isReturn ? '↺' : t.glyph}</span><span class="w">${t.isReturn ? `<b>${t.now.name} return</b>` : `${t.now.code === 'EAR' ? '<b>Earth</b> now' : `${t.now.name} now`} <b>${ASPECT_MEANING[t.type].word}</b> your ${t.natal.code === 'EAR' ? '<b>Earth</b>' : t.natal.name}`}</span><span class="o">${t.orb.toFixed(1)}°</span></li>`).join('')}</ul>`
      : '<p class="small">No tight lines today. The sky is leaving you alone.</p>';
    h += '</div>';
  } else {
    h += emptyCTA('This is the sky right now, seen from the Sun. Add your birth moment to see how today’s sky lines up with yours, and get a daily solar weather report.');
  }
  h += `<div class="sec"><div class="label">Earth ${today ? 'now' : 'then'}</div>
    <div class="hero"><div class="hero-glyph">${stationSVG(now.station, 32)}</div><div><h1>${st.name}</h1><div class="sub">STATION ${ROMAN[now.station]} · ${st.gloss.toUpperCase()}</div></div></div>
    <div class="pair2">
      <div class="tile"><div class="t">Next station</div><div class="v">${nextSt.name}</div><div class="muted mono" style="font-size:11px">in ${k} day${k === 1 ? '' : 's'}</div></div>
      <div class="tile"><div class="t">Moon</div><div class="v">${m.name}</div><div class="muted mono" style="font-size:11px">${Math.round(m.ill * 100)}% lit</div></div>
    </div></div>`;
  h += `<div class="sec"><div class="label">The sky itself</div>
    <div class="kv"><span>Pattern</span><span>${now.pattern}</span></div>
    <div class="kv"><span>Symmetry</span><span>${now.symmetry}%</span></div>
    <div class="kv"><span>Looks retrograde from Earth</span><span>${now.retro.size ? [...now.retro].map(c => WORLDS[c].glyph).join(' ') : 'none'}</span></div>
    <p class="small">${esc(PATTERNS[now.pattern].line)}. ${now.retro.size ? 'From the Sun, none of them is going backward.' : ''}</p></div>`;
  const syn = synodics(now).sort((a, b) => a.nextConjJd - b.nextConjJd).slice(0, 4);
  h += `<div class="sec"><div class="label">Coming up</div><ul class="lines">${syn.map(s => `<li><span class="g">☌</span><span class="w">${s.fast.name} meets ${s.slow.name}</span><span class="o">${fmtJd(s.nextConjJd)}</span></li>`).join('')}`;
  if (natal) {
    ['MAR', 'JUP', 'SAT'].forEach(c => { const b = natal.bodies.find(x => x.code === c); const jd = nextReturn(b.p, b.lon, S.viewJd); if (jd && jd < JD_MAX) h += `<li class="ret"><span class="g">↺</span><span class="w"><b>${b.name}</b> returns to your birth place</span><span class="o">${fmtJd(jd)}</span></li>`; });
  }
  h += '</ul></div>';
  return h;
}

/* ---------- inspector: Birth chart ---------- */
function inspectChart() {
  const p = active();
  if (!p) return emptyCTA('Your birth chart from the Sun’s point of view: where Earth (you) stood, the shape the nine worlds made, and what it says.');
  const c = natalOf(p), st = STATIONS[c.station];
  const rng = stationRanges()[c.station];
  let h = '';
  if (S.guest) h += `<div class="sec"><div class="label">Shared sky</div><p class="small" style="margin-top:0">Someone shared ${esc(p.name)}’s sky with you. It isn’t saved yet.</p><div class="row" style="margin-top:10px"><button class="btn primary btn-sm" data-act="saveGuest">Save to people</button></div></div>`;
  h += `<div class="sec">
    <div class="hero"><div class="hero-glyph">${sealSVG(c, { size: 32, weight: 1.3 })}</div><div><h1>${st.name}</h1><div class="sub">STATION ${ROMAN[c.station]} · ${rng ? `${fmtMD(rng.start).toUpperCase()} – ${fmtMD(rng.end).toUpperCase()}` : ''}</div></div></div>
    <p class="lede">${esc(st.sketch)}</p>
    <div class="pair2"><div class="tile"><div class="t">Gift</div><div class="v">${st.gift}</div></div><div class="tile"><div class="t">Shadow</div><div class="v">${st.shadow}</div></div></div>
  </div>`;
  h += `<div class="sec"><div class="label">Your shape <span class="r">symmetry ${c.symmetry}%</span></div>
    <div style="font-size:18px;font-weight:600;letter-spacing:-.02em">${c.pattern}</div>
    <p class="lede" style="font-size:13px">${esc(patternText(c))}</p>
    ${c.badges.length ? `<div class="row" style="margin-top:10px">${c.badges.map(b => `<span class="badge" title="${esc(badgeDetail(b))}">${b.name}</span>`).join('')}</div>` : ''}
  </div>`;
  h += `<div class="sec reading"><div class="label">Reading</div>${natalReading(c).slice(2).map(x => `<p>${esc(x)}</p>`).join('')}</div>`;
  h += `<div class="sec"><div class="label">Worlds at birth</div><ul class="lines">${c.bodies.map(b => `<li class="${b.code === 'EAR' ? 'ret' : ''}"><span class="g">${WORLDS[b.code].glyph}</span><span class="w">${b.code === 'EAR' ? '<b>Earth · you</b>' : b.name} <span class="muted">in ${STATIONS[stationOf(b.lon)].name}</span></span><span class="o">${b.lon.toFixed(1)}°</span></li>`).join('')}</ul></div>`;
  h += `<div class="sec"><div class="label">Tightest lines</div><ul class="lines">${c.aspects.slice(0, 6).map(a => `<li><span class="g">${a.glyph}</span><span class="w">${a.a.name} <b>${ASPECT_MEANING[a.type].word}</b> ${a.b.name}</span><span class="o">${a.orb.toFixed(1)}°</span></li>`).join('')}</ul></div>`;
  h += `<div class="sec row"><button class="btn btn-sm" data-act="poster"><i data-ico="poster"></i>Make poster</button><button class="btn btn-sm" data-act="share"><i data-ico="link"></i>Share link</button>${S.guest ? '' : '<button class="btn btn-sm ghost" data-act="edit"><i data-ico="edit"></i>Edit</button>'}</div>`;
  return h;
}

/* ---------- inspector: Pair ---------- */
function pairPartner() {
  const a = active(), ps = people().filter(p => !a || p.id !== a.id);
  return ps.find(p => p.id === S.pairWith) || ps[0] || null;
}
function inspectPair() {
  const a = active();
  if (!a) return emptyCTA('Compare two skies. Add yourself first, then the people you want to read against you.');
  const others = people().filter(p => p.id !== a.id);
  if (!others.length) return `<div class="sec"><div class="label">Pair</div><p class="lede">Lay someone else’s sky over yours: where your worlds flow, where they grind, and how far apart your Earths stood.</p><div class="row" style="margin-top:14px"><button class="btn primary" data-act="add">Add someone</button></div></div>`;
  const b = pairPartner(), A = natalOf(a), B = natalOf(b), r = resonance(A, B);
  let h = `<div class="sec"><div class="label">With</div><select class="select" id="pairSel" style="width:100%">${others.map(p => `<option value="${p.id}" ${p.id === b.id ? 'selected' : ''}>${esc(p.name)} · ${STATIONS[natalOf(p).station].name}</option>`).join('')}</select></div>`;
  h += `<div class="sec"><div class="label">Resonance</div><div class="row" style="align-items:baseline;gap:10px"><div class="big">${r.score}</div><div class="muted mono">/ 100</div></div>
    <div style="font-size:16px;font-weight:600;margin-top:8px;letter-spacing:-.01em">${r.label}</div>
    <div class="meter"><span style="width:${r.score}%"></span></div>
    <p class="small">Every line between your worlds and theirs, weighted by how tight it is and whether it touches the near, personal worlds.</p></div>`;
  const ea = r.earthLink;
  h += `<div class="sec"><div class="label">Earth to Earth</div>
    <div class="pair2"><div class="tile"><div class="t">${esc(a.name)}</div><div class="v">${STATIONS[A.station].name}</div></div><div class="tile"><div class="t">${esc(b.name)}</div><div class="v">${STATIONS[B.station].name}</div></div></div>
    <p class="lede" style="font-size:13px">Your Earths stood <b>${r.earthGap.toFixed(0)}°</b> apart${ea ? `, a <b>${ea.type}</b>: ${ASPECT_MEANING[ea.type].line}` : ''}. ${r.earthGap < 20 ? 'Near-twins in season.' : r.earthGap > 160 ? 'Opposite sides of the Sun: you were born facing each other.' : ''}</p></div>`;
  h += `<div class="sec"><div class="label">Lines between you <span class="r">${r.cross.length}</span></div><ul class="lines">${r.cross.slice(0, 12).map(x => `<li><span class="g">${x.glyph}</span><span class="w">${x.a.code === 'EAR' ? '<b>You</b>' : `Your ${x.a.name}`} <b>${ASPECT_MEANING[x.type].word}</b> ${x.b.code === 'EAR' ? `<b>${esc(b.name)}</b>` : `their ${x.b.name}`}</span><span class="o">${x.orb.toFixed(1)}°</span></li>`).join('')}</ul>
    <p class="small">On the wheel: your worlds are solid, ${esc(b.name)}’s are rings.</p></div>`;
  h += `<div class="sec row"><button class="btn btn-sm" data-act="pairPrompt"><i data-ico="copy"></i>Copy pair reading prompt</button></div>`;
  return h;
}

function inspectScope() {
  const p = active(), c = chartAt(S.viewJd), st = STATIONS[c.station], cur = scope?.preset_;
  const pb = (id, label) => `<button class="btn btn-sm ${cur === id ? 'on' : ''}" data-preset="${id}">${label}</button>`;
  return `<div class="sec"><div class="label">Telescope <span class="r mono">${isToday(S.viewJd) ? 'now' : fmtJd(S.viewJd)}</span></div>
    <p class="lede" style="margin-top:0">The same sky in three dimensions, with each world’s true height above or below the plane of Earth’s orbit. Fly anywhere; the time bar still drives it.</p></div>
    <div class="sec"><div class="label">Go to</div><div class="presets">${pb('overview', 'Overview')}${pb('sun', 'Stand on the Sun')}${pb('earth', 'Ride Earth')}${pb('edge', 'Edge-on')}</div>
    <p class="small">Ride Earth stays with Earth while time plays, so you can watch the sky turn from where you live.</p></div>
    <div class="sec"><div class="label">Earth ${isToday(S.viewJd) ? 'now' : 'then'}</div>
      <div class="hero"><div class="hero-glyph">${stationSVG(c.station, 32)}</div><div><h1>${st.name}</h1><div class="sub">STATION ${ROMAN[c.station]} · ${st.gloss.toUpperCase()}</div></div></div>
      <div class="kv" style="margin-top:12px"><span>Pattern</span><span>${c.pattern}</span></div>
      <div class="kv"><span>Above / below the plane</span><span>${c.above} / ${c.below}</span></div>
      ${p ? `<p class="small">The faint rings mark where each world stood when ${esc(p.name)} was born.</p>` : ''}</div>
    <div class="sec"><div class="label">Controls</div><div class="keys">
      <kbd>drag</kbd><span>look around</span>
      <kbd>W A S D</kbd><span>fly (or the arrow keys)</span>
      <kbd>Q / E</kbd><span>down / up</span>
      <kbd>shift</kbd><span>boost</span>
      <kbd>scroll</kbd><span>flying speed</span>
      <kbd>pinch</kbd><span>fly in and out (phone)</span>
      <kbd>click</kbd><span>focus a world’s lines</span>
      <kbd>space</kbd><span>play time</span>
    </div></div>`;
}
function renderInspector() {
  if ($('stageView').hidden) return;
  const el = $('inspector');
  el.innerHTML = S.view === 'chart' ? inspectChart() : S.view === 'pair' ? inspectPair() : S.view === 'telescope' ? inspectScope() : inspectSky();
  paintIcons(el);
  $$('[data-preset]', el).forEach(b => b.onclick = () => { scope?.preset(b.dataset.preset); $$('[data-preset]', el).forEach(x => x.classList.toggle('on', x === b)); });
  const sel = $('pairSel'); if (sel) sel.onchange = () => { S.pairWith = sel.value; S.dirty = true; renderInspector(); renderHud(); };
  renderHud();
}

/* ---------- Figures ---------- */
let odoEl = null, odoBirth = 0;
function tickOdo() {
  if (!odoEl || !odoEl.sun.isConnected) return;
  const nowJd = jdFromDate(new Date());
  const secs = (nowJd - odoBirth) * 86400;
  odoEl.sun.textContent = n0(orbitKm(odoBirth, nowJd));
  odoEl.gal.textContent = n0(secs * V_GAL);
}
function renderFigures() {
  const p = active();
  const doc = $('doc');
  if (!p) { doc.innerHTML = `<div class="doc-head"><div><h1>Figures</h1><p>Every value computed from a birth moment. None invented.</p></div></div>${emptyCTA('Add a birth moment to fill the tables.')}`; return; }
  const c = natalOf(p), now = chartAt(S.nowJd), birthJd = c.jd;
  const pu = pulls(c), cyc = solarCycle(c.jd), w = c.wobble, years = (S.nowJd - birthJd) / 365.25;
  const lightMin = c.earth.r * AUm / C_LIGHT / 60;
  const ranges = stationRanges();
  let h = `<div class="doc-head"><div><h1>Figures</h1><p>${esc(p.name)}, born ${fmtDay(localToUTC(p.date, p.unknown ? '12:00' : p.time, p.tz))}. Every value is computed from the birth moment. None invented.</p></div></div><div class="grid">`;
  h += `<div class="card span2"><h3>Distance travelled <span class="tab">LIVE</span></h3><p class="desc">How far you have gone without moving, since the moment you were born.</p>
    <div class="odo">
      <div><div class="big" id="odoSun">0</div><div class="cap">km around the Sun</div></div>
      <div><div class="big" id="odoGal">0</div><div class="cap">km around the galaxy, at ${V_GAL} km/s</div></div>
      <div><div class="big">${years.toFixed(3)}</div><div class="cap">orbits completed</div></div>
      <div><div class="big">${years.toFixed(1)}</div><div class="cap">light-years: how far your birth-day sunlight has travelled</div></div>
    </div></div>`;
  h += `<div class="card span2"><h3>Worlds at birth <span class="tab">TAB. I</span></h3><p class="desc">Where each world stood, how far, how fast, and how far through its orbit (the tick marks perihelion).</p><div class="scroll-x"><table class="t">
    <tr><th>World</th><th>Station</th><th class="n">Long.</th><th class="n">AU</th><th class="n">km/s</th><th>Orbit</th></tr>
    ${c.bodies.map(b => `<tr class="${b.code === 'EAR' ? 'me' : ''}"><td>${WORLDS[b.code].glyph}&nbsp; ${b.name}${b.code === 'EAR' ? ' · you' : ''}</td><td>${STATIONS[stationOf(b.lon)].name}</td><td class="n">${b.lon.toFixed(1)}°</td><td class="n">${b.r.toFixed(3)}</td><td class="n">${b.speed.toFixed(2)}</td><td style="width:30%"><div class="bar"><span style="width:${(b.frac * 100).toFixed(1)}%"></span><i style="left:0"></i></div></td></tr>`).join('')}
    </table></div></div>`;
  const maxA = pu.arr[0].acc;
  h += `<div class="card"><h3>Dominant pull <span class="tab">FIG. 1</span></h3><p class="desc">The real gravitational tug of each world on Earth at birth, in nm/s².</p><table class="t">${pu.arr.map(x => `<tr><td>${x.name}</td><td style="width:50%"><div class="bar"><span style="width:${(x.acc / maxA * 100).toFixed(1)}%"></span></div></td><td class="n">${(x.acc * 1e9).toPrecision(3)}</td></tr>`).join('')}</table></div>`;
  h += `<div class="card"><h3>The Sun itself <span class="tab">TAB. II</span></h3><p class="desc">Its wobble around the system’s balance point, and its 11-year breath.</p><div class="kvs">
    <div class="kv"><span>Off-centre by</span><span>${w.rsun.toFixed(2)} solar radii</span></div>
    <div class="kv"><span>That is</span><span>${n0(w.km)} km</span></div>
    <div class="kv"><span>Leaning toward</span><span>${w.lon.toFixed(0)}° · ${STATIONS[stationOf(w.lon)].name}</span></div>
    ${cyc ? `<div class="kv"><span>Solar cycle</span><span>${cyc.n}, ${cyc.mood}${cyc.predicted ? ' (predicted)' : ''}</span></div><div class="kv"><span>Through the cycle</span><span>${Math.round(cyc.phase * 100)}%</span></div>` : ''}
    <div class="kv"><span>Birth light was</span><span>${lightMin.toFixed(2)} min old</span></div>
    <div class="kv"><span>Pull of the Sun on Earth</span><span>${(pu.sun * 1000).toFixed(3)} mm/s²</span></div></div></div>`;
  const rets = c.bodies.filter(b => b.code !== 'EAR').map(b => {
    const jd = nextReturn(b.p, b.lon, S.nowJd);
    return { b, jd: jd && jd <= JD_MAX ? jd : null, done: Math.floor((S.nowJd - birthJd) / b.period) };
  });
  h += `<div class="card"><h3>Returns <span class="tab">TAB. III</span></h3><p class="desc">Each world coming back to where it stood when you were born. The heliocentric Saturn return included.</p><table class="t"><tr><th>World</th><th class="n">Done</th><th class="n">Next</th><th class="n">Age</th></tr>
    ${rets.map(r => `<tr><td>${r.b.name}</td><td class="n">${r.done}</td><td class="n">${r.jd ? fmtJd(r.jd) : 'after 2050'}</td><td class="n">${r.jd ? ((r.jd - birthJd) / 365.25).toFixed(1) : '—'}</td></tr>`).join('')}</table></div>`;
  const syn = synodics(now);
  h += `<div class="card"><h3>Meeting cycles <span class="tab">TAB. IV</span></h3><p class="desc">Where today falls in each pair’s mutual cycle. The tick is when they last met.</p><table class="t">${syn.map(s => `<tr><td>${s.fast.code}–${s.slow.code}</td><td style="width:42%"><div class="bar"><span style="width:${(s.phase * 100).toFixed(1)}%"></span><i style="left:0"></i></div></td><td class="n">${fmtJd(s.nextConjJd)}</td></tr>`).join('')}</table></div>`;
  h += `<div class="card"><h3>The twelve stations <span class="tab">TAB. V</span></h3><p class="desc">When Earth passes through each station this year. Yours is lit.</p><table class="t">${STATIONS.map((s, i) => `<tr class="${i === c.station ? 'me' : ''}"><td style="width:22px">${stationSVG(i, 14)}</td><td>${ROMAN[i]}</td><td>${s.name}</td><td class="n">${ranges[i] ? `${fmtMD(ranges[i].start)}–${fmtMD(ranges[i].end)}` : ''}</td></tr>`).join('')}</table></div>`;
  h += `<div class="card"><h3>Lines at birth <span class="tab">TAB. VI</span></h3><p class="desc">Angles between worlds, measured from the Sun. Merge 0°, Signal 60°, Friction 90°, Flow 120°, Mirror 180°.</p><table class="t">${c.aspects.map(a => `<tr><td>${a.glyph}</td><td>${a.a.name} ${a.type.toLowerCase()} ${a.b.name}</td><td class="n">${a.orb.toFixed(1)}°</td></tr>`).join('') || '<tr><td>None</td></tr>'}</table></div>`;
  h += `</div>`;
  doc.innerHTML = h;
  odoEl = { sun: $('odoSun'), gal: $('odoGal') }; odoBirth = birthJd;
}

/* ---------- Oracle ---------- */
const promptKey = m => `sun.prompt.${m}`;
function renderOracle() {
  const p = active(), doc = $('doc'), mode = S.oracleMode;
  let data = '';
  if (p) {
    if (mode === 'pair') { const b = pairPartner(); data = b ? pairBlock(p, natalOf(p), b, natalOf(b)) : 'Add a second person to build pair data.'; }
    else data = dataBlock(p, natalOf(p), mode === 'daily' ? chartAt(S.nowJd) : null);
  } else data = 'Add a birth moment to build the data.';
  const prompt = localStorage.getItem(promptKey(mode)) || PROMPTS[mode];
  doc.innerHTML = `<div class="doc-head"><div><h1>Oracle</h1><p>Turns the computed sky into clean data and a prompt you can paste into any AI for a written reading. Nothing is sent anywhere from here.</p></div>
    <div class="seg" id="oracleSeg"><button data-m="daily" class="${mode === 'daily' ? 'on' : ''}">Daily</button><button data-m="natal" class="${mode === 'natal' ? 'on' : ''}">Natal</button><button data-m="pair" class="${mode === 'pair' ? 'on' : ''}">Pair</button></div></div>
    <div class="oracle">
      <div><div class="label">Prompt · yours to edit</div><textarea id="promptBox" spellcheck="false">${esc(prompt)}</textarea></div>
      <div><div class="label">Sky data · rebuilt every time</div><pre id="dataBox">${esc(data)}</pre></div>
    </div>
    <div class="row" style="margin-top:12px"><button class="btn primary" id="copyAll"><i data-ico="copy"></i>Copy prompt + data</button><button class="btn" id="copyData">Copy data only</button><button class="btn ghost" id="resetPrompt">Reset prompt</button></div>`;
  paintIcons(doc);
  $('oracleSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.oracleMode = b.dataset.m; renderOracle(); };
  $('promptBox').oninput = e => localStorage.setItem(promptKey(mode), e.target.value);
  $('copyAll').onclick = () => copy($('promptBox').value + '\n\n' + data, 'Prompt and data copied');
  $('copyData').onclick = () => copy(data, 'Data copied');
  $('resetPrompt').onclick = () => { localStorage.removeItem(promptKey(mode)); renderOracle(); };
}

/* ---------- Poster ---------- */
async function renderPoster() {
  const p = active(), doc = $('doc');
  if (!p) { doc.innerHTML = `<div class="doc-head"><div><h1>Poster</h1><p>Your sky as a print.</p></div></div>${emptyCTA('Add a birth moment to draw your poster.')}`; return; }
  const c = natalOf(p);
  doc.innerHTML = `<div class="doc-head"><div><h1>Poster</h1><p>Your sky as a print: the nine worlds on their rings, joined in order from the Sun outward. No two birth moments draw the same figure.</p></div></div>
    <div class="poster-wrap"><canvas id="posterCv" width="1080" height="1350"></canvas>
      <div>
        <div class="label">Ink</div>
        <div class="seg" id="posterSeg"><button data-t="dark" class="${S.posterTheme === 'dark' ? 'on' : ''}">Black</button><button data-t="light" class="${S.posterTheme === 'light' ? 'on' : ''}">Paper</button></div>
        <div class="row" style="margin-top:16px"><button class="btn primary" id="dlPoster"><i data-ico="download"></i>Download PNG</button><button class="btn" id="sharePoster"><i data-ico="link"></i>Copy share link</button></div>
        <div class="sec" style="margin-top:20px"><div class="label">How to read it</div>
          <p class="small" style="margin-top:0">Rings, inside out: Mercury to Pluto. The heavy line visits each world in that order: that is the seal, your signature. Hairlines are the aspects. The ringed dot is Earth: you. The lit numeral on the outer ring is your station.</p></div>
      </div></div>`;
  paintIcons(doc);
  await document.fonts.ready;
  const cvp = $('posterCv');
  drawPoster(cvp.getContext('2d'), 1080, 1350, { person: p, chart: c, theme: S.posterTheme });
  $('posterSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; S.posterTheme = b.dataset.t; renderPoster(); };
  $('dlPoster').onclick = () => { const a = document.createElement('a'); a.download = `sunstrology-${p.name.toLowerCase().replace(/\W+/g, '-')}.png`; a.href = cvp.toDataURL('image/png'); a.click(); };
  $('sharePoster').onclick = () => copy(shareLink(p), 'Share link copied');
}

/* ---------- render everything ---------- */
function renderAll() {
  renderPeople(); renderMarks(); syncTime();
  if (S.view === 'figures') renderFigures();
  else if (S.view === 'oracle') renderOracle();
  else if (S.view === 'poster') renderPoster();
  else renderInspector();
  S.dirty = true;
}

/* ---------- actions ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const p = active();
  switch (b.dataset.act) {
    case 'add': openPerson(); break;
    case 'edit': openPerson(p); break;
    case 'poster': location.hash = '#/poster'; break;
    case 'share': copy(shareLink(p), 'Share link copied'); break;
    case 'saveGuest': { const g = { ...S.guest, id: uid() }; store.people = [...people(), g]; store.active = g.id; S.guest = null; location.hash = '#/chart'; toast(`${g.name} saved`); break; }
    case 'pairPrompt': { const q = pairPartner(); copy(PROMPTS.pair + '\n\n' + pairBlock(p, natalOf(p), q, natalOf(q)), 'Pair prompt copied'); break; }
  }
});
$('people').onclick = onPeopleClick; $('peopleM').onclick = onPeopleClick;
$('addPerson').onclick = () => openPerson();
$('addPersonM').onclick = () => { $('peopleDlg').close(); openPerson(); };
$('whoBtn').onclick = () => people().length ? $('peopleDlg').showModal() : openPerson();
$('closePeople').onclick = () => $('peopleDlg').close();
$('personForm').addEventListener('submit', savePerson);
$('cancelPerson').onclick = () => $('personDlg').close();
$('deletePerson').onclick = deletePerson;
$('randomBtn').onclick = randomSky;
$('aboutBtn').onclick = () => $('aboutDlg').showModal();
$('closeAbout').onclick = () => $('aboutDlg').close();
$('themeBtn').onclick = () => { store.theme = store.theme === 'dark' ? 'light' : 'dark'; applyTheme(); };
function applyTheme() {
  document.documentElement.dataset.theme = store.theme;
  document.querySelector('meta[name=theme-color]').content = store.theme === 'light' ? '#f2f1ec' : '#000000';
  S.dirty = true;
}
document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, dialog[open]')) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  const order = Object.keys(VIEWS);
  if (/^[1-7]$/.test(k)) { location.hash = '#/' + order[+k - 1]; return; }
  if (!TIMED.includes(S.view)) return;
  if (S.view === 'telescope' && /^Arrow/.test(k)) return;
  if (k === ' ') { e.preventDefault(); togglePlay(); }
  else if (k === 'ArrowLeft') step(-1);
  else if (k === 'ArrowRight') step(1);
  else if (k === 'n' || k === 'N') $('toNow').click();
  else if (k === 'b' || k === 'B') $('toBirth').click();
  else if (k === 'l' || k === 'L') $('aspToggle').click();
  else if (k === 'Escape') { S.focus = null; S.dirty = true; renderHud(); }
});

/* ---------- boot ---------- */
function boot() {
  applyTheme();
  $('brandMark').innerHTML = MARK(); $('brandMarkM').innerHTML = MARK(); $('dlgMark').innerHTML = MARK();
  $('tzSelect').innerHTML = TZS.map(z => `<option value="${z}" ${z === HOME_TZ ? 'selected' : ''}>${z.replace(/_/g, ' ')}</option>`).join('');
  paintIcons();
  window.addEventListener('hashchange', route);
  setInterval(() => { S.nowJd = jdFromDate(new Date()); }, 60000);
  route();
  requestAnimationFrame(loop);
  if (!people().length && !S.guest) setTimeout(() => openPerson(), 400);
}
boot();
