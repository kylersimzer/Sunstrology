// The symbolic layer. Everything here is invented language laid over the real geometry in astro.js.
// Keep the two apart: no maths that changes a position lives here, and no meaning lives there.
import { normDeg, angleDiff, findAspects, synodics, pulls, solarCycle, moonAt, dateFromJd, AUm, C_LIGHT } from './astro.js';

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** The twelve solar stations: 30° sectors of Earth's orbit, named for the Sun's anatomy, inside out. */
export const STATIONS = [
  { name: 'Core', gloss: 'origin · pressure', sketch: 'Born where the fire is made. Core people hold enormous pressure without showing it, and everything they build starts from a single, stubborn centre.', gift: 'Steadiness under weight', shadow: 'Holding it all in' },
  { name: 'Radiative', gloss: 'patience · conviction', sketch: 'Light takes a hundred thousand years to cross the radiative zone. You are the long game: slow to move, impossible to stop once you do.', gift: 'Patience that pays out', shadow: 'Waiting past the moment' },
  { name: 'Granule', gloss: 'churn · renewal', sketch: 'The Sun’s surface boils in cells that live for minutes. You renew by churning: new rooms, new friends, new versions of the plan.', gift: 'Endless renewal', shadow: 'Never letting it settle' },
  { name: 'Facula', gloss: 'brightness · visibility', sketch: 'Faculae are the bright veins that make the Sun shine harder. You are seen easily, and you raise the light of whatever room you enter.', gift: 'Natural visibility', shadow: 'Needing to be seen' },
  { name: 'Sunspot', gloss: 'magnetism · intensity', sketch: 'A sunspot is a knot of magnetism strong enough to dim the fire around it. You pull things toward you, and you feel everything at full strength.', gift: 'Magnetic focus', shadow: 'Tangled intensity' },
  { name: 'Umbra', gloss: 'depth · privacy', sketch: 'The dark heart of the spot. You live in depth, keep a private room that few enter, and see clearly in the places others avoid.', gift: 'Depth of sight', shadow: 'Retreating too far' },
  { name: 'Flare', gloss: 'release · suddenness', sketch: 'Stored energy, released all at once. You act in bursts, change course in an afternoon, and clear the air for everyone around you.', gift: 'Decisive release', shadow: 'Burning out fast' },
  { name: 'Prominence', gloss: 'ambition · arc', sketch: 'A loop of plasma thrown higher than a dozen Earths and held there. You reach far, carry big arcs of intention, and build things that hold their shape.', gift: 'Ambition with form', shadow: 'Overreaching' },
  { name: 'Chromosphere', gloss: 'sensitivity · veil', sketch: 'The thin red layer only visible in eclipse. You are finely tuned, read the room before it speaks, and show your colour only in the right light.', gift: 'Fine perception', shadow: 'Hiding behind the veil' },
  { name: 'Corona', gloss: 'reach · halo', sketch: 'The Sun’s crown is hotter than its surface and stretches millions of kilometres. Your influence reaches far past where you stand.', gift: 'Wide influence', shadow: 'Spreading thin' },
  { name: 'Wind', gloss: 'momentum · departure', sketch: 'The solar wind never stops leaving. You are momentum: travel, change, the next thing, carrying a little of home wherever you go.', gift: 'Unstoppable momentum', shadow: 'Always leaving' },
  { name: 'Heliopause', gloss: 'horizon · threshold', sketch: 'Where the Sun’s wind finally meets interstellar space. You live on edges, translate between worlds, and are drawn to whatever is beyond.', gift: 'Crossing thresholds', shadow: 'Never quite arriving' },
];
export const stationOf = lon => Math.floor(normDeg(lon) / 30);

/** What each world speaks for, seen from the Sun. Earth is always you. */
export const WORLDS = {
  MER: { glyph: '☿', voice: 'thought and messages', verb: 'speaks', short: 'mind' },
  VEN: { glyph: '♀', voice: 'attraction and value', verb: 'draws', short: 'heart' },
  EAR: { glyph: '♁', voice: 'you: body, home and now', verb: 'stands', short: 'you' },
  MAR: { glyph: '♂', voice: 'drive and nerve', verb: 'pushes', short: 'drive' },
  JUP: { glyph: '♃', voice: 'growth and luck', verb: 'expands', short: 'growth' },
  SAT: { glyph: '♄', voice: 'structure and time', verb: 'tests', short: 'structure' },
  URA: { glyph: '♅', voice: 'surprise and change', verb: 'jolts', short: 'change' },
  NEP: { glyph: '♆', voice: 'dreams and the unseen', verb: 'dissolves', short: 'dream' },
  PLU: { glyph: '♇', voice: 'depth and rebirth', verb: 'transforms', short: 'depth' },
};

export const ASPECT_MEANING = {
  Merge: { word: 'merges with', mood: 'fusion', line: 'two forces speak as one', score: 2 },
  Signal: { word: 'signals', mood: 'a nudge', line: 'a small opening, worth answering', score: 2 },
  Friction: { word: 'grinds against', mood: 'tension', line: 'pressure worth working with', score: -1 },
  Flow: { word: 'flows with', mood: 'ease', line: 'things move without effort', score: 3 },
  Mirror: { word: 'mirrors', mood: 'balance', line: 'a call to weigh one against the other', score: 1 },
};

export const PATTERNS = {
  'Solar Ring': { line: 'Balance and circulation', text: 'The worlds spread into a near-complete ring around the Sun. A geometry of balance and circulation: attention distributed, nothing hoarded.' },
  'The Ember': { line: 'One flame, total focus', text: 'All nine worlds burn inside a single narrow arc, one of the rarest geometries. Everything concentrated, nothing scattered: one flame, one obsession.' },
  'The Lantern': { line: 'One part carries the rest', text: 'Eight worlds gather on one side while {S} hangs alone in the dark, carrying the empty half. One part of life quietly holds the weight for all the rest.' },
  'The Chalice': { line: 'Full on one side', text: 'The worlds fill one half of the sky and leave the other in silence: a bowl held up to the dark. What is carried is carried openly.' },
  'The Scales': { line: 'Dialogue and counterweight', text: 'Two clusters face each other across the Sun with clear space between. Life keeps arriving as pairs of forces asking to be weighed.' },
  'The Trident': { line: 'Three camps in council', text: 'Three distinct groups divide the sky between them. Energy moves by council: three callings, in constant negotiation.' },
  'Inner Flame': { line: 'The near worlds as one voice', text: 'The four rocky worlds are gathered into one tight arc. The personal planets speak in a single voice: quick, close, concentrated.' },
  'Split Crown': { line: 'The shown side, the kept side', text: 'A wide silence tears through one side of the sky while a broad crescent of worlds holds the other. A geometry of contrast.' },
  'Open Spiral': { line: 'Unfinished on purpose', text: 'The system opens unevenly, like a spiral mid-turn. A directional geometry, always leaning somewhere.' },
};
export const patternText = c => (PATTERNS[c.pattern]?.text || '').replace('{S}', c.singleton || 'one world');

/** The natal reading, as short paragraphs. */
export function natalReading(c) {
  const e = c.earth, st = STATIONS[c.station];
  const hot = c.bodies.filter(b => b.frac <= 0.08 || b.frac >= 0.92);
  const far = c.bodies.filter(b => b.frac >= 0.42 && b.frac <= 0.58);
  const top = Object.entries(c.counts).filter(([k]) => k !== 'Merge').sort((a, b) => b[1] - a[1])[0];
  const out = [];
  out.push(`Earth stood in the ${st.name} at ${e.lon.toFixed(1)}°, moving ${e.speed.toFixed(1)} km/s around the fire. ${st.sketch}`);
  out.push(patternText(c));
  if (c.badges.length) out.push(c.badges.map(b => `${b.name}: ${badgeDetail(b)}.`).join(' '));
  if (hot.length) out.push(`${list(hot.map(b => b.name))} ${hot.length > 1 ? 'were' : 'was'} on the hot arc near perihelion: closest to the Sun, moving fastest. Those themes run urgent in you.`);
  else if (far.length) out.push(`${list(far.map(b => b.name))} held the far turn near aphelion: the slow, patient end of the ellipse.`);
  if (top && top[1] > 1) out.push(`${top[0]} lines dominate the wheel: ${ASPECT_MEANING[top[0]].line}.`);
  out.push(`From Earth, ${c.retro.size} world${c.retro.size === 1 ? '' : 's'} would have looked like ${c.retro.size === 1 ? 'it was' : 'they were'} moving backward that day. From the Sun, nothing ever does.`);
  return out;
}

/** Live transits: today's sky against a birth wheel. Same-world merges are returns. */
export function transits(natal, now) {
  return findAspects(now.bodies, natal.bodies).map(a => ({ ...a, now: a.a, natal: a.b, isReturn: a.type === 'Merge' && a.a.code === a.b.code }));
}

const WEATHER = [
  { min: 4, name: 'Clear', line: 'Open sky. Things you start today meet little resistance.' },
  { min: 1.5, name: 'Bright', line: 'Good light with a little wind. Lean in.' },
  { min: -0.5, name: 'Mixed', line: 'Sun and cloud. Pick the one thing that matters.' },
  { min: -3, name: 'Gusty', line: 'Crosswinds. Go slower than you want to.' },
  { min: -Infinity, name: 'Charged', line: 'Static in the air. Useful, if you aim it.' },
];

/** The day for one person: a weather word, a headline transit and a theme sentence. */
export function solarWeather(natal, now) {
  const tr = transits(natal, now).filter(t => t.orb <= 3.5);
  let score = 0;
  tr.forEach(t => { const w = (3.5 - t.orb) / 3.5; score += ASPECT_MEANING[t.type].score * w * (t.now.code === 'EAR' || t.natal.code === 'EAR' ? 1.6 : 1); });
  const weather = WEATHER.find(w => score >= w.min);
  const head = tr.find(t => t.now.code === 'EAR' || t.natal.code === 'EAR') || tr[0] || null;
  let theme = 'A quiet sky: no tight lines to your birth wheel today. A good day to just keep orbiting.';
  if (head) {
    const A = WORLDS[head.now.code], B = WORLDS[head.natal.code];
    theme = head.isReturn
      ? `${head.now.name} returns to where it stood when you were born: a homecoming for your ${B.short}.`
      : `Today’s ${head.now.name} ${ASPECT_MEANING[head.type].word} your birth ${head.natal.name}: ${A.short} meets ${B.short}, and ${ASPECT_MEANING[head.type].line}.`;
  }
  return { score, weather, head, theme, transits: tr };
}

/** Two charts against each other: resonance 0–100, the Earth-to-Earth angle, and the tightest links. */
export function resonance(A, B) {
  const cross = findAspects(A.bodies, B.bodies);
  let s = 0;
  cross.forEach(x => {
    const tight = (1 - x.orb / 7);
    const personal = ['MER', 'VEN', 'EAR', 'MAR'];
    const w = (personal.includes(x.a.code) ? 1 : 0.5) + (personal.includes(x.b.code) ? 1 : 0.5);
    s += ASPECT_MEANING[x.type].score * tight * w;
  });
  const score = Math.round(100 / (1 + Math.exp(-(s - 6) / 6)));
  const earthGap = angleDiff(A.earth.lon, B.earth.lon);
  const earthLink = cross.find(x => x.a.code === 'EAR' && x.b.code === 'EAR');
  const label = score >= 80 ? 'In orbit together' : score >= 62 ? 'Strong pull' : score >= 45 ? 'Steady signal' : score >= 30 ? 'Distant stations' : 'Opposite seasons';
  return { score, label, cross, earthGap, earthLink };
}

/* ---------- the oracle prompt ---------- */

export const PROMPTS = {
  natal: `You are a master astrologer writing a heliocentric reading. The data below is the solar system computed at the exact moment of my birth, seen from the Sun instead of from Earth. Earth is one of the planets on the wheel, and Earth is me. My sign is Earth's solar station.

Write my reading in the voice of the best horoscope columns: warm, vivid, a little mystical, and personal. Translate the geometry into meaning; quote a number only occasionally, like a talisman.

1. MY STATION: name it and sketch its character, coloured by my pattern and tightest aspects.
2. MY SHAPE: what the pattern of my sky says about how I spend my energy.
3. LOVE, WORK, SPIRIT: one short paragraph each, from my hot-arc worlds (urgent), far-turn worlds (patient teachers), and my dominant pull.
4. TALISMANS: a colour, a number from Earth's degree, a time of day.
5. THE BLESSING: one closing line built on this truth: seen from the Sun, nothing ever moves backward.

Frame everything as invitation, never fixed fate. Begin directly, no preamble.`,
  daily: `You are a master astrologer writing a DAILY heliocentric horoscope. The data below contains my birth sky (computed from the Sun's point of view; Earth is me) and a TODAY section: the sky right now, measured against my birth wheel. Anchor everything in today.

Write a short column for one morning. Use at most three numbers.

1. THE WEATHER: today's sky, the Moon, and the tightest live line to my birth wheel.
2. THE THEME: the transit that matters most today (Return = homecoming, Friction = tension worth working with, Flow = ease, Mirror = balance, Signal = a nudge).
3. ONE SMALL INSTRUCTION: one concrete thing to do or let go of before midnight.
4. THE BLESSING: one closing line: seen from the Sun, nothing ever moves backward.

Begin directly, no preamble.`,
  pair: `You are a master astrologer reading two heliocentric charts together. Each is the solar system at a birth moment, seen from the Sun; in each, Earth is the person. The cross-aspects link one person's worlds to the other's.

Write a warm, honest compatibility reading: what draws them together, where they grind, what each teaches the other, and one thing to try together this month. Use at most three numbers. Begin directly.`,
};

const fmtUTC = jd => dateFromJd(jd + 0.5 / 1440).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
const phaseTag = f => { const p = Math.round(f * 100); return p <= 8 || p >= 92 ? 'hot arc, near perihelion' : p >= 42 && p <= 58 ? 'far turn, near aphelion' : `${p}% past perihelion`; };

export function dataBlock(person, natal, now) {
  const d = [];
  const e = natal.earth, pu = pulls(natal), cyc = solarCycle(natal.jd);
  d.push(`GEOMETRY DATA (heliocentric, computed from orbital mechanics)`);
  d.push(`Name: ${person.name}`);
  d.push(`Birth moment: ${fmtUTC(natal.jd)}`);
  d.push(`My station (sign): ${STATIONS[natal.station].name} (${STATIONS[natal.station].gloss}), Earth at ${e.lon.toFixed(1)}°`);
  d.push(`Pattern: ${natal.pattern}${natal.singleton ? ` (lone world: ${natal.singleton})` : ''}. ${PATTERNS[natal.pattern].line}`);
  if (natal.badges.length) d.push(`Figures: ${natal.badges.map(b => b.name).join(', ')}`);
  d.push(`Symmetry ${natal.symmetry}%, cluster ${natal.cluster}%`);
  d.push('');
  d.push('WORLDS AT BIRTH');
  natal.bodies.forEach(b => d.push(`  ${b.name.padEnd(8)} ${b.lon.toFixed(1).padStart(6)}°  ${STATIONS[stationOf(b.lon)].name.padEnd(12)} ${b.r.toFixed(2)} AU  ${b.speed.toFixed(1)} km/s  ${phaseTag(b.frac)}`));
  d.push('');
  d.push('TIGHTEST ASPECTS');
  natal.aspects.slice(0, 8).forEach(a => d.push(`  ${a.a.name} ${a.type} ${a.b.name} (orb ${a.orb.toFixed(1)}°)`));
  d.push('');
  d.push(`Dominant pull on Earth: ${pu.arr[0].name}`);
  if (cyc) d.push(`Solar cycle ${cyc.n}, ${cyc.mood}`);
  d.push(`Birth light: ${(e.r * AUm / C_LIGHT / 60).toFixed(1)} minutes old when it reached Earth`);
  if (now) {
    const w = solarWeather(natal, now), m = moonAt(now.jd);
    d.push('');
    d.push(`TODAY (${fmtUTC(now.jd)})`);
    d.push(`Earth now in: ${STATIONS[now.station].name}. Today's sky pattern: ${now.pattern}`);
    d.push(`Moon: ${m.name}, ${Math.round(m.ill * 100)}% lit`);
    d.push(`Solar weather: ${w.weather.name}`);
    d.push('Live lines to my birth wheel:');
    (w.transits.length ? w.transits.slice(0, 8) : []).forEach(t => d.push(`  today's ${t.now.name} ${t.isReturn ? 'RETURN' : t.type} birth ${t.natal.name} (orb ${t.orb.toFixed(1)}°)`));
    if (!w.transits.length) d.push('  none tight today');
    d.push('Next meetings:');
    synodics(now).slice(0, 4).forEach(s => d.push(`  ${s.fast.name}–${s.slow.name} merge ${dateFromJd(s.nextConjJd).toISOString().slice(0, 10)}`));
  }
  return d.join('\n');
}

export function pairBlock(pa, A, pb, B) {
  const r = resonance(A, B);
  const d = [`PAIR DATA (heliocentric)`, `${pa.name}: ${STATIONS[A.station].name}, pattern ${A.pattern}`, `${pb.name}: ${STATIONS[B.station].name}, pattern ${B.pattern}`,
    `Earth to Earth: ${r.earthGap.toFixed(1)}° apart`, `Resonance: ${r.score}/100 (${r.label})`, '', 'CROSS-ASPECTS (tightest first)'];
  r.cross.slice(0, 12).forEach(x => d.push(`  ${pa.name}'s ${x.a.name} ${x.type} ${pb.name}'s ${x.b.name} (orb ${x.orb.toFixed(1)}°)`));
  return d.join('\n');
}

export const badgeDetail = b => b.station != null ? b.detail.replace('in one station', `in the ${STATIONS[b.station].name}`) : b.detail;
function list(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
