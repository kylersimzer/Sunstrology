// 50 candidate marks for Sunstrology (round 1: 01-25, round 2: 26-50), each drawn on a 24 × 24 grid in one ink, the way stems.fm and GODMIX draw theirs.
// A mark is code: draw(ink, bg) returns the SVG body. `bg` is only used to cut a halo round a dot that sits on a line.
// Groups with class "spin s1|s2|s3" are the orbiting parts; logos.html turns them slowly in the preview.

const f = n => +n.toFixed(2);
// A point at `deg` degrees (0 = top, clockwise) on a circle of radius `rad`.
const pt = (cx, cy, rad, deg) => { const a = ((deg - 90) * Math.PI) / 180; return [f(cx + rad * Math.cos(a)), f(cy + rad * Math.sin(a))]; };

const dot = (cx, cy, rad, fill) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad}" fill="${fill}"/>`;
const ring = (cx, cy, rad, w, stroke) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${rad}" fill="none" stroke="${stroke}" stroke-width="${w}"/>`;
const line = (x1, y1, x2, y2, w, stroke) => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round"/>`;
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const S = (d, w, stroke) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const g = (cls, body) => `<g class="${cls}">${body}</g>`;

// An arc clockwise from `from` degrees through `sweep` degrees.
const arc = (cx, cy, rad, from, sweep, w, stroke, cap = 'round') => {
  const [x0, y0] = pt(cx, cy, rad, from), [x1, y1] = pt(cx, cy, rad, from + sweep);
  return `<path d="M${x0} ${y0}A${rad} ${rad} 0 ${sweep > 180 ? 1 : 0} 1 ${x1} ${y1}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
};
// A ray out from the centre, from radius r0 to r1.
const ray = (cx, cy, r0, r1, deg, w, stroke) => { const [x0, y0] = pt(cx, cy, r0, deg), [x1, y1] = pt(cx, cy, r1, deg); return line(x0, y0, x1, y1, w, stroke); };
// A filled ring segment between radii r0 and r1, from angle a to angle b.
const sector = (cx, cy, r0, r1, a, b, fill) => {
  const [x0, y0] = pt(cx, cy, r1, a), [x1, y1] = pt(cx, cy, r1, b), [x2, y2] = pt(cx, cy, r0, b), [x3, y3] = pt(cx, cy, r0, a);
  return `<path d="M${x0} ${y0}A${r1} ${r1} 0 0 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 0 ${x3} ${y3}Z" fill="${fill}"/>`;
};
// A dot with a ring of background cut round it, so it reads where it crosses a line.
const halo = (cx, cy, rad, h, ink, bg) => dot(cx, cy, f(rad + h), bg) + dot(cx, cy, rad, ink);
const haloAt = (rad, deg, size, h, ink, bg) => { const [x, y] = pt(12, 12, rad, deg); return halo(x, y, size, h, ink, bg); };
const dotAt = (rad, deg, size, ink) => { const [x, y] = pt(12, 12, rad, deg); return dot(x, y, size, ink); };

const MARKS = [
  { n: 1, name: 'Earth on the ring', idea: 'The whole idea at its plainest: the Sun in the middle, and you as the one dot going round it.',
    draw: (k, bg) => dot(12, 12, 3.4, k) + ring(12, 12, 8.6, 1.4, k) + g('spin s1', haloAt(8.6, 50, 2.1, 1.3, k, bg)) },

  { n: 2, name: 'Twelve stations', idea: 'The twelve 30° stations, Core to Heliopause, as a broken ring round the Sun.',
    draw: k => dot(12, 12, 3, k) + Array.from({ length: 12 }, (_, i) => arc(12, 12, 9.8, i * 30 + 5, 20, 1.8, k, 'butt')).join('') },

  { n: 3, name: 'Nine worlds', idea: 'The nine worlds unwound from the Sun on a golden-angle spiral, each at its own size.',
    draw: k => dot(12, 12, 2.6, k) + [0.9, 1.1, 1.15, 0.95, 1.85, 1.6, 1.3, 1.25, 0.8].map((s, i) => dotAt(4.6 + i * 0.82, i * 137.5 + 24, s, k)).join('') },

  { n: 4, name: 'Solar seal', idea: 'The seal the app draws for every chart: lines joining where the worlds stood, inside the wheel.',
    draw: k => {
      const v = [[18, 7.2], [96, 8.6], [152, 5.2], [236, 8.4], [300, 6.2]].map(([d, r]) => pt(12, 12, r, d));
      const order = [0, 2, 4, 1, 3, 0];
      return ring(12, 12, 10.4, 1.2, k) + S('M' + order.map(i => v[i].join(' ')).join('L'), 1.1, k) + v.map(([x, y]) => dot(x, y, 1.15, k)).join('');
    } },

  { n: 5, name: "Sun's eye", idea: 'The chart is the view from the Sun: an eye whose pupil is the Sun.',
    draw: k => S('M2.5 12C6.2 6 17.8 6 21.5 12C17.8 18 6.2 18 2.5 12Z', 1.5, k) + dot(12, 12, 3.6, k) },

  { n: 6, name: 'Nothing backward', idea: 'From the Sun nothing is ever retrograde: one orbit, one direction, an arrow that only goes forward.',
    draw: k => {
      const end = 330, [ex, ey] = pt(12, 12, 9, end);
      const t = (end * Math.PI) / 180, dx = Math.cos(t), dy = Math.sin(t);       // clockwise tangent at the end
      const head = s => { const a = Math.atan2(dy, dx) + Math.PI + s * 0.72; return line(ex, ey, ex + 3.1 * Math.cos(a), ey + 3.1 * Math.sin(a), 1.6, k); };
      return dot(12, 12, 3, k) + g('spin s1', arc(12, 12, 9, 40, 290, 1.6, k) + head(1) + head(-1));
    } },

  { n: 7, name: 'Orbit S', idea: 'An S drawn as two half-orbits, with the Sun at the hinge where they meet.',
    draw: (k, bg) => arc(12, 7.6, 4.4, 180, 240, 1.8, k) + arc(12, 16.4, 4.4, 0, 240, 1.8, k) + dot(12, 12, 2, k) },

  { n: 8, name: 'Perihelion', idea: 'A true ellipse with the Sun at its focus, not its centre: the orbit as it really is.',
    draw: (k, bg) => `<g transform="rotate(-24 12 12)">` + `<ellipse cx="13.2" cy="12" rx="9" ry="7" fill="none" stroke="${k}" stroke-width="1.4"/>` + dot(7.54, 12, 2.2, k) + halo(13.2, 5, 1.6, 1.1, k, bg) + `</g>` },

  { n: 9, name: 'Eclipse', idea: 'The Sun with a darker body sliding across it, and the corona showing round the edge.',
    draw: (k, bg) => dot(12, 12, 7.2, k) + dot(14.5, 10.1, 6.3, bg) + Array.from({ length: 8 }, (_, i) => ray(12, 12, 9.6, 11.3, i * 45 + 22.5, 1.3, k)).join('') },

  { n: 10, name: 'Sundial', idea: 'The oldest solar instrument: a horizon, a half Sun and the hour lines fanning out from it.',
    draw: k => line(3, 17.5, 21, 17.5, 1.5, k) + P('M8.8 17.5A3.2 3.2 0 0 1 15.2 17.5Z', k) + [-70, -35, 0, 35, 70].map(d => ray(12, 17.5, 5.2, 9.8, d, 1.4, k)).join('') },

  { n: 11, name: 'Heliopause', idea: "The edge of the Sun's reach, left open on one side, with one traveller already outside it.",
    draw: k => dot(12, 12, 2.6, k) + ring(12, 12, 5.6, 1.3, k) + arc(12, 12, 9.8, 140, 260, 1.6, k) + g('spin s2', dotAt(11.2, 90, 1.05, k)) },

  { n: 12, name: 'The plate', idea: 'The almanac wheel itself: inner and outer rings cut into twelve stations by spokes.',
    draw: k => ring(12, 12, 10.4, 1.3, k) + ring(12, 12, 4.6, 1.3, k) + Array.from({ length: 12 }, (_, i) => ray(12, 12, 4.6, 10.4, i * 30, 1, k)).join('') + dot(12, 12, 1.8, k) },

  { n: 13, name: "Earth's trail", idea: 'Earth leaving a trail as it goes round: a chart is one moment in that motion.',
    draw: (k, bg) => dot(12, 12, 4, k) + g('spin s1', arc(12, 12, 9, 190, 130, 1.5, k) + haloAt(9, 320, 2.2, 1.1, k, bg)) },

  { n: 14, name: 'Orrery', idea: 'Three orbits, three worlds, each at its own setting, like a brass orrery seen from above.',
    draw: (k, bg) => dot(12, 12, 1.9, k) + [[4.6, 1.1], [7.8, 1.1], [11, 1.1]].map(([r, w]) => ring(12, 12, r, w, k)).join('')
      + g('spin s1', haloAt(4.6, 60, 1.3, 0.9, k, bg)) + g('spin s2', haloAt(7.8, 210, 1.6, 0.9, k, bg)) + g('spin s3', haloAt(11, 320, 1.4, 0.9, k, bg)) },

  { n: 15, name: 'Twelve rays', idea: "The astronomer's Sun symbol, ☉, with a ray for each station; the four seasons' rays run longer.",
    draw: k => ring(12, 12, 6.2, 1.8, k) + dot(12, 12, 2.2, k) + Array.from({ length: 12 }, (_, i) => i % 3 ? ray(12, 12, 8.8, 10.4, i * 30, 1.4, k) : ray(12, 12, 8.4, 11.4, i * 30, 1.4, k)).join('') },

  { n: 16, name: 'Earth symbol', idea: 'The old Earth glyph, ⊕, set on its orbit as one planet among the rest.',
    draw: (k, bg) => {
      const [x, y] = pt(12, 12, 9, 315);
      return ring(12, 12, 9, 1.3, k) + dot(12, 12, 3, k) + g('spin s1', dot(x, y, 3.9, bg) + ring(x, y, 2.7, 1.2, k) + line(x - 2.7, y, x + 2.7, y, 1.1, k) + line(x, y - 2.7, x, y + 2.7, 1.1, k));
    } },

  { n: 17, name: 'Syzygy', idea: 'Worlds falling into one straight line through the Sun, the rarest geometry the app looks for.',
    draw: (k, bg) => dot(12, 12, 3, k) + ray(12, 12, 5, 11.2, 45, 1.3, k) + ray(12, 12, 5, 11.2, 225, 1.3, k)
      + haloAt(8.2, 45, 1.7, 1, k, bg) + haloAt(7, 225, 1.25, 1, k, bg) + haloAt(10.4, 225, 0.95, 0.9, k, bg) },

  { n: 18, name: 'Trine', idea: 'Three worlds 120° apart round the Sun: the Flow aspect, the easiest shape in the sky.',
    draw: (k, bg) => {
      const v = [20, 140, 260].map(d => pt(12, 12, 9.4, d));
      return ring(12, 12, 9.4, 1.1, k) + S(`M${v[0].join(' ')}L${v[1].join(' ')}L${v[2].join(' ')}Z`, 1.1, k) + dot(12, 12, 2.4, k) + v.map(([x, y]) => halo(x, y, 1.6, 1, k, bg)).join('');
    } },

  { n: 19, name: 'Spiral of years', idea: 'Every year another turn: a life drawn as one orbit that keeps opening outward.',
    draw: k => {
      const n = 140, turns = 2.25, r0 = 2.6, r1 = 10.4, pts = [];
      for (let i = 0; i <= n; i++) { const t = i / n; pts.push(pt(12, 12, r0 + (r1 - r0) * t, t * turns * 360)); }
      const [ex, ey] = pts[pts.length - 1];
      return dot(12, 12, 1.6, k) + S('M' + pts.map(p => p.join(' ')).join('L'), 1.3, k) + dot(ex, ey, 1.6, k);
    } },

  { n: 20, name: 'Sun S', idea: 'A solid Sun with an S cut through it: the strongest at favicon size.',
    draw: (k, bg) => dot(12, 12, 10, k) + arc(12, 8.6, 3.4, 180, 240, 2, bg) + arc(12, 15.4, 3.4, 0, 240, 2, bg) },

  { n: 21, name: 'The Chalice', idea: 'One of the chart patterns: every world on one half of the sky, held like a bowl.',
    draw: (k, bg) => arc(12, 12, 10, 90, 180, 1.6, k) + line(2, 12, 22, 12, 1, k) + [118, 148, 182, 212, 242].map((d, i) => dotAt([6.6, 7.8, 5.6, 7.6, 6.4][i], d, [1, 1.3, 1.1, 1.5, 0.9][i], k)).join('') + halo(12, 12, 2.4, 1, k, bg) },

  { n: 22, name: 'The Lantern', idea: 'Another pattern: eight worlds gathered on one side and one hanging alone across the Sun.',
    draw: (k, bg) => ring(12, 12, 9.4, 1.1, k) + dot(12, 12, 2.4, k) + Array.from({ length: 8 }, (_, i) => haloAt(9.4, 105 + i * 21.4, 1.2, 0.9, k, bg)).join('') + haloAt(9.4, 0, 1.8, 1, k, bg) },

  { n: 23, name: 'Your station', idea: 'One 30° station filled in on the wheel: your sign as a place, not a constellation.',
    draw: k => ring(12, 12, 10.6, 1.1, k) + sector(12, 12, 6.4, 10.6, 15, 45, k) + dot(12, 12, 3, k) },

  { n: 24, name: 'Line-up', idea: 'The school diagram of the solar system: the Sun cut off at the edge, worlds in a row beside it.',
    draw: k => P('M2 4.5A7.5 7.5 0 0 1 2 19.5Z', k) + dot(12.2, 12, 1, k) + dot(15, 12, 1.4, k) + dot(18.6, 12, 2.2, k) + dot(22, 12, 1.1, k) },

  { n: 25, name: 'Three seasons', idea: "Kin to GODMIX's three dials: three small orbits with Earth at three points of the year.",
    draw: (k, bg) => [[5, 0], [12, 120], [19, 240]].map(([x, d]) => { const [ex, ey] = pt(x, 12, 2.6, d); return ring(x, 12, 2.6, 1.2, k) + dot(x, 12, 0.9, k) + halo(ex, ey, 0.95, 0.6, k, bg); }).join('') },

  // ---------- Round 2 ----------

  { n: 26, name: 'Granules', idea: "The Sun's surface boils in cells: a solid disc cut into the honeycomb of granulation.",
    draw: (k, bg) => {
      const hex = (cx, cy) => S('M' + Array.from({ length: 6 }, (_, j) => pt(cx, cy, 3.5, j * 60).join(' ')).join('L') + 'Z', 1.1, bg);
      return dot(12, 12, 10.4, k) + hex(12, 12) + Array.from({ length: 6 }, (_, i) => { const [x, y] = pt(12, 12, 6.06, 30 + i * 60); return hex(x, y); }).join('');
    } },

  { n: 27, name: 'Sunspot', idea: 'The Sun as an outline with one dark spot on it: the umbra, its penumbra round it, and a small companion.',
    draw: k => ring(12, 12, 10, 1.5, k) + ring(14, 10.4, 3.4, 1.3, k) + dot(14, 10.4, 1.8, k) + dot(8, 15.2, 1.1, k) + dot(9.9, 16.9, 0.7, k) },

  { n: 28, name: 'Prominence', idea: 'A loop of fire held above the limb of the Sun, with a fragment thrown clear.',
    draw: k => P('M2 21A13.45 13.45 0 0 1 22 21Z', k) + S('M7.2 17.2C5.2 5.6 17.8 5.6 16.4 16.9', 1.8, k) + dot(19.6, 8.2, 1.05, k) },

  { n: 29, name: 'Corona', idea: 'The crown only seen in totality: a dark disc with streamers, longest along the equator.',
    draw: k => {
      const petal = (d, tip, half) => { const a = pt(12, 12, 5.8, d - half), b = pt(12, 12, 5.8, d + half), t = pt(12, 12, tip, d); return P(`M${a.join(' ')}L${t.join(' ')}L${b.join(' ')}Z`, k); };
      return ring(12, 12, 4.4, 1.5, k) + [[90, 11.6, 16], [270, 11.6, 16], [60, 9.6, 12], [120, 9.6, 12], [240, 9.6, 12], [300, 9.6, 12], [0, 8, 10], [180, 8, 10]].map(([d, t, h]) => petal(d, t, h)).join('');
    } },

  { n: 30, name: 'Solar wind', idea: 'The wind that never stops leaving: streamlines pouring off the Sun toward everything else.',
    draw: k => dot(4.8, 12, 3.4, k) + S('M10 12H21.2', 1.4, k) + S('M9.4 8.4C13 6.4 16.4 8.8 21.2 6.6', 1.4, k) + S('M9.4 15.6C13 17.6 16.4 15.2 21.2 17.4', 1.4, k) },

  { n: 31, name: 'Heliosphere', idea: "The Sun's bubble as it really flies: a blunt nose into interstellar space and a long open tail.",
    draw: k => S('M16.5 4.2C8.6 3.6 3 7 3 12C3 17 8.6 20.4 16.5 19.8', 1.5, k) + line(16.5, 4.2, 21.4, 6.4, 1.5, k) + line(16.5, 19.8, 21.4, 17.6, 1.5, k) + ring(10.2, 12, 4.4, 1.2, k) + dot(10.2, 12, 1.9, k) },

  { n: 32, name: 'Equal areas', idea: "Kepler's second law: in equal times an orbit sweeps equal areas, short and wide near the Sun, long and thin far away.",
    draw: (k, bg) => `<ellipse cx="12" cy="12" rx="10" ry="6.5" fill="none" stroke="${k}" stroke-width="1.3"/>`
      + P('M4.4 12L3.34 8.75A10 6.5 0 0 0 3.34 15.25Z', k) + P('M4.4 12L21.78 10.65A10 6.5 0 0 1 21.78 13.35Z', k) + halo(4.4, 12, 1.9, 1, k, bg) },

  { n: 33, name: 'Analemma', idea: "Where the Sun stands at noon over one year: the figure of eight that Earth's tilt and ellipse draw together.",
    draw: (k, bg) => {
      const at = t => [f(12 + 3.4 * Math.sin(2 * t) * (1 - 0.28 * Math.sin(t))), f(12 - 9.4 * Math.sin(t))];
      const pts = Array.from({ length: 121 }, (_, i) => at(i / 120 * 2 * Math.PI));
      const [sx, sy] = at(0.8);
      return S('M' + pts.map(p => p.join(' ')).join('L') + 'Z', 1.5, k) + dot(sx, sy, 2.1, k);
    } },

  { n: 34, name: 'Sun over s', idea: 'A lowercase s drawn as two half-orbits, with the Sun sitting over it like the dot of an i.',
    draw: k => dot(12, 4.2, 2.3, k) + arc(12, 12.5, 3.3, 180, 240, 2.4, k) + arc(12, 19.1, 3.3, 0, 240, 2.4, k) },

  { n: 35, name: 'Almanac stamp', idea: 'A franked seal for the almanac: a perforated edge round a small rayed Sun.',
    draw: k => Array.from({ length: 28 }, (_, i) => dotAt(10.8, i * (360 / 28), 0.7, k)).join('') + ring(12, 12, 8.9, 1.1, k) + dot(12, 12, 3, k) + Array.from({ length: 8 }, (_, i) => ray(12, 12, 4.4, 6.6, i * 45, 1.2, k)).join('') },

  { n: 36, name: 'Station compass', idea: 'A compass rose made of the stations: four long points for the seasons, eight dots for the rest.',
    draw: (k, bg) => [0, 90, 180, 270].map(d => `<path d="M12 1.2L14.1 9.9L12 12L9.9 9.9Z" fill="${k}" transform="rotate(${d} 12 12)"/>`).join('')
      + [30, 60, 120, 150, 210, 240, 300, 330].map(d => dotAt(8.4, d, 0.95, k)).join('') + dot(12, 12, 1.5, bg) },

  { n: 37, name: 'Aperture', idea: 'A lens opening onto the Sun: the app as an instrument you look through.',
    draw: k => ring(12, 12, 10, 1.4, k) + Array.from({ length: 6 }, (_, i) => { const [x0, y0] = pt(12, 12, 10, i * 60), [x1, y1] = pt(12, 12, 4.4, i * 60 + 100); return line(x0, y0, x1, y1, 1.3, k); }).join('') + dot(12, 12, 2.4, k) },

  { n: 38, name: 'Two Earths', idea: 'The Pair view: two people as two Earths on one orbit, and the angle between them measured at the Sun.',
    draw: (k, bg) => ring(12, 12, 9, 1.1, k) + dot(12, 12, 2.8, k) + ray(12, 12, 2, 7, 0, 1.5, k) + ray(12, 12, 2, 7, 120, 1.5, k) + haloAt(9, 0, 2.1, 1.2, k, bg) + haloAt(9, 120, 2.1, 1.2, k, bg) },

  { n: 39, name: 'Sun scrubber', idea: 'The time bar: the Sun is the thumb you drag through two and a half centuries.',
    draw: k => line(2.5, 9.8, 2.5, 14.2, 1.4, k) + line(21.5, 9.8, 21.5, 14.2, 1.4, k) + line(2.5, 12, 8.6, 12, 1.6, k) + dot(15, 12, 2.8, k) + Array.from({ length: 8 }, (_, i) => ray(15, 12, 4.1, 5.4, i * 45, 1.2, k)).join('') },

  { n: 40, name: 'Diamond ring', idea: 'The last bead of sunlight at the edge of an eclipse, flaring like a stone on a ring.',
    draw: k => {
      const [bx, by] = pt(10.6, 13.4, 6.8, 45);
      return ring(10.6, 13.4, 6.8, 1.3, k) + dot(bx, by, 2.4, k) + [0, 90, 180, 270].map(d => ray(bx, by, 2, 4.6, d, 1.2, k)).join('') + [45, 135, 225, 315].map(d => ray(bx, by, 2, 3.1, d, 1, k)).join('');
    } },

  { n: 41, name: 'Flare', idea: 'Stored energy released all at once: a burst thrown off one edge of the Sun.',
    draw: k => dot(10.4, 13.6, 7.2, k) + [[22, 11.4], [45, 13.4], [68, 11.4]].map(([d, r]) => ray(10.4, 13.6, 9, r, d, 1.6, k)).join('')  },

  { n: 42, name: 'Tile orbit', idea: "A solid app tile with a tilted orbit cut out of it, the Sun at its focus: built for an app icon.",
    draw: (k, bg) => `<rect x="2" y="2" width="20" height="20" rx="5.5" fill="${k}"/>` + `<g transform="rotate(-28 12 12)"><ellipse cx="12.8" cy="12" rx="7.2" ry="4.6" fill="none" stroke="${bg}" stroke-width="1.4"/>` + dot(7.25, 12, 2.4, bg) + halo(17.6, 15.4, 1.5, 1.1, bg, k) + `</g>` },

  { n: 43, name: 'Day side', idea: "From the Sun you only ever see Earth's day side: the half of you that faces the light.",
    draw: k => dot(3.2, 12, 2.2, k) + ring(14.4, 12, 7.4, 1.3, k) + P('M14.4 4.6A7.4 7.4 0 0 0 14.4 19.4Z', k) },

  { n: 44, name: 'Twelve petals', idea: 'The twelve stations as petals round the Sun: a flower that is also a calendar.',
    draw: k => Array.from({ length: 12 }, (_, i) => `<ellipse cx="12" cy="4.6" rx="1.45" ry="3" fill="${k}" transform="rotate(${i * 30} 12 12)"/>`).join('') + dot(12, 12, 3.4, k) },

  { n: 45, name: 'Nine-point seal', idea: 'The seal made regular: one unbroken line through nine points, one for each world, round the Sun.',
    draw: k => { const v = Array.from({ length: 9 }, (_, i) => pt(12, 12, 10, i * 40)); const order = [0, 2, 4, 6, 8, 1, 3, 5, 7]; return S('M' + order.map(i => v[i].join(' ')).join('L') + 'Z', 1.3, k) + dot(12, 12, 2.4, k); } },

  { n: 46, name: 'Sundogs', idea: 'Solar weather you can see: the halo round the Sun and the two bright sundogs sitting on it.',
    draw: (k, bg) => line(1.8, 12, 22.2, 12, 0.9, k) + ring(12, 12, 7.6, 1.1, k) + halo(12, 12, 2.8, 1.1, k, bg) + halo(4.4, 12, 1.6, 1, k, bg) + halo(19.6, 12, 1.6, 1, k, bg) },

  { n: 47, name: 'The print', idea: 'The Poster view as a mark: a portrait print with a wheel at the top and its caption below.',
    draw: k => `<rect x="5" y="2" width="14" height="20" rx="2" fill="none" stroke="${k}" stroke-width="1.4"/>` + ring(12, 9.4, 3.8, 1.1, k) + dot(12, 9.4, 1.3, k) + dot(...pt(12, 9.4, 3.8, 45), 0.95, k) + line(8.4, 16.4, 15.6, 16.4, 1.4, k) + line(9.8, 19, 14.2, 19, 1.1, k) },

  { n: 48, name: 'The wobble', idea: 'The Sun is not quite the centre: it circles the balance point of the system, marked with a cross.',
    draw: (k, bg) => arc(10, 14, 7.07, 75, 300, 1.2, k).replace('/>', ' stroke-dasharray="0.1 2.4"/>') + line(10, 12.2, 10, 15.8, 1.2, k) + line(8.2, 14, 11.8, 14, 1.2, k) + halo(15, 9, 3.6, 1, k, bg) },

  { n: 49, name: 'Visitor', idea: 'A comet on its long ellipse, grazing the Sun, its tail always pointing away from it.',
    draw: (k, bg) => `<g transform="rotate(-35 12 12)"><ellipse cx="12" cy="12" rx="10" ry="4.2" fill="none" stroke="${k}" stroke-width="1.2"/>` + dot(2.93, 12, 1.9, k)
      + line(17, 15.64, 19.71, 16.34, 1.4, k) + line(17, 15.64, 19.3, 17.4, 0.9, k) + halo(17, 15.64, 1.5, 1, k, bg) + `</g>` },

  { n: 50, name: 'Cutaway', idea: "The Sun's anatomy as a diagram: a quarter cut away to show the layers from the Core outward.",
    draw: k => { const [rx, ry] = pt(12, 12, 10.4, 90); return P(`M12 12L${rx} ${ry}A10.4 10.4 0 1 1 12 1.6Z`, k) + arc(12, 12, 7.6, 0, 90, 1.3, k, 'butt') + arc(12, 12, 5, 0, 90, 1.3, k, 'butt') + dot(12, 12, 2.6, k); } },
];

// The whole SVG for one mark.
function markSVG(m, { ink = '#ffffff', bg = '#000000', size = 24, cls = '' } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none"${cls ? ` class="${cls}"` : ''}>${m.draw(ink, bg)}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { MARKS, markSVG };
