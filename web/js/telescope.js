// The Telescope: the same sky as the wheel, in 3D, that you can fly through.
// Ported from v1's three.js view and redrawn in one ink: the Sun and Earth are the only full-white things,
// aspects are told apart by line style. three.js is loaded only when the view first opens.
import { PLANETS, orbitPath, D2R } from './astro.js';
import { STATIONS } from './meaning.js';
import { SCALES } from './wheel.js';
import { WANDERERS, wandererAt, PROBES, probeAt, moonSystems, MOON_NAMES, MOON_ORBITS } from './objects.js';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let THREE = null;

const INK = '236, 235, 230';
const ink = a => `rgba(${INK}, ${a})`;
const RMAX = 46;
const LBL_W = 0.2, LBL_H = 0.05;   // labels keep one size on screen (fraction of the view's height)
const easeIO = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const wrapPI = a => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- canvas textures ---------- */
function canvasTex(w, h, paint) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  paint(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const radialTex = stops => canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); stops.forEach(s => gr.addColorStop(s[0], s[1])); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
const ringTex = (a, w = 6) => canvasTex(128, 128, g => { g.strokeStyle = ink(a); g.lineWidth = w; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke(); });
function textTex(lines, w = 320, h = 80) {
  return canvasTex(w, h, g => {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    lines.forEach(l => { g.font = `${l.weight || 500} ${l.size}px 'Geist Mono', ui-monospace, monospace`; g.fillStyle = l.color; g.fillText(l.text, w / 2, l.y); });
  });
}
// Greyscale surfaces: rock is speckled, giants are banded, Earth is bright.
function surfaceTex(code) {
  const gas = ['JUP', 'SAT', 'URA', 'NEP'].includes(code);
  const base = { MER: 150, VEN: 205, EAR: 235, MAR: 140, JUP: 190, SAT: 200, URA: 175, NEP: 160, PLU: 130 }[code];
  return canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = `rgb(${base},${base},${base - 4})`; g.fillRect(0, 0, w, h);
    if (gas) {
      for (let y = 0; y < h; y++) { const b = base + Math.sin(y * 0.21 + Math.sin(y * 0.07) * 2) * 26 + (Math.random() - 0.5) * 8; g.fillStyle = `rgb(${b | 0},${b | 0},${(b - 4) | 0})`; g.fillRect(0, y, w, 1); }
      if (code === 'JUP') { g.fillStyle = `rgb(${base - 50},${base - 50},${base - 52})`; g.beginPath(); g.ellipse(172, 80, 15, 8, 0, 0, Math.PI * 2); g.fill(); }
    } else if (code === 'EAR') {
      g.fillStyle = 'rgb(190,190,186)';
      for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(Math.random() * w, 18 + Math.random() * 92, 8 + Math.random() * 22, 5 + Math.random() * 12, Math.random() * 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(0, 0, w, 7); g.fillRect(0, h - 7, w, 7);
    } else {
      for (let i = 0; i < 900; i++) { const b = base + (Math.random() - 0.5) * 70; g.fillStyle = `rgb(${b | 0},${b | 0},${b | 0})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 0.4 + Math.random() * 2.2, 0, Math.PI * 2); g.fill(); }
    }
  });
}
function sprite(tex, sx, sy, additive = false, opacity = 1, fixed = false) {
  const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity, sizeAttenuation: !fixed, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const s = new THREE.Sprite(m); s.scale.set(sx, sy, 1); return s;
}
function circlePts(R, n = 128, y = 0) { const pts = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * R, y, Math.sin(a) * R)); } return pts; }
function dispose(grp) { grp.traverse(o => { o.geometry?.dispose(); if (o.material) { o.material.map?.dispose(); o.material.dispose(); } }); grp.clear(); }

const ASPECT_STYLE = {
  Flow: { op: 0.32 }, Friction: { op: 0.6 }, Merge: { op: 0.7 },
  Mirror: { op: 0.55, dash: 3, gap: 2.4 }, Signal: { op: 0.55, dash: 0.6, gap: 1.6 },
};

/** Build the telescope inside `wrap`. Resolves once three.js has loaded; rejects if it can't (offline). */
export async function createTelescope(wrap, { onHover } = {}) {
  if (!THREE) THREE = await import(/* @vite-ignore */ THREE_URL);
  await document.fonts?.ready;

  const T = { scale: 'even', unit: 1, orbitKey: null, tween: null, follow: null, hover: null, active: false, keys: new Set() };
  const f = () => SCALES[T.scale] || SCALES.even;
  const P3 = (x, y, z = 0) => { const rr = Math.hypot(x, y) || 1e-9, k = f()(rr) / rr * T.unit; return new THREE.Vector3(x * k, z * k, -y * k); };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 1);
  renderer.domElement.className = 'scope-canvas';
  wrap.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 12000);
  const cam = { yaw: 0, pitch: -0.5, pos: new THREE.Vector3(0, 460, 760), speed: 2 };
  const ray = new THREE.Raycaster();

  scene.add(new THREE.AmbientLight(0xffffff, 0.16));
  scene.add(new THREE.PointLight(0xffffff, 2.6, 0, 0));

  /* stars: one ink, twinkling */
  {
    const N = 3000, pos = new Float32Array(N * 3), size = new Float32Array(N), phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = 2600 + Math.random() * 900, s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th); pos[i * 3 + 1] = r * u; pos[i * 3 + 2] = r * s * Math.sin(th);
      size[i] = i < 40 ? 20 + Math.random() * 10 : 5 + Math.random() * 11; phase[i] = Math.random() * 6.28;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    T.starMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `attribute float aSize; attribute float aPhase; varying float vP;
        void main(){ vP = aPhase; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * (420.0 / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime; varying float vP;
        void main(){ float d = length(gl_PointCoord - vec2(.5)); if (d > .5) discard; float a = smoothstep(.5, .04, d) * (.62 + .38 * sin(uTime * 1.6 + vP));
          gl_FragColor = vec4(0.925, 0.92, 0.9, a * .85); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo, T.starMat));
    // a faint band of galaxy, in the same ink
    const band = canvasTex(1024, 256, g => {
      for (let i = 0; i < 480; i++) { const x = Math.random() * 1024, y = 128 + (Math.random() + Math.random() + Math.random() - 1.5) * 46, r = 6 + Math.random() * 26; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, ink(0.025 + Math.random() * 0.04)); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    });
    const mw = new THREE.Mesh(new THREE.CylinderGeometry(3100, 3100, 1500, 72, 1, true), new THREE.MeshBasicMaterial({ map: band, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    mw.rotation.z = 0.55; mw.rotation.x = 0.15; scene.add(mw);
  }

  /* the Sun */
  T.sun = new THREE.Mesh(new THREE.SphereGeometry(4.6, 32, 24), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  T.halo = sprite(radialTex([[0, 'rgba(255,255,255,.95)'], [0.22, 'rgba(255,255,255,.28)'], [1, 'rgba(255,255,255,0)']]), 64, 64, true);
  T.corona = sprite(radialTex([[0, 'rgba(255,255,255,.13)'], [1, 'rgba(255,255,255,0)']]), 190, 190, true);
  scene.add(T.sun, T.halo, T.corona);

  /* groups rebuilt when the scale or the epoch changes */
  const grid = new THREE.Group(), stations = new THREE.Group(), orbits = new THREE.Group(), aspects = new THREE.Group(), ghosts = new THREE.Group();
  scene.add(grid, stations, orbits, aspects, ghosts);

  /* worlds */
  const bodies = {}, hits = [];
  const earthRingTex = ringTex(0.85, 5);
  const PIP = radialTex([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,.9)"], [0.6, "rgba(255,255,255,.15)"], [1, "rgba(255,255,255,0)"]]);
  PLANETS.forEach(p => {
    const size = p.size * 0.95 + 1.3, isE = p.code === 'EAR';
    const mat = isE ? new THREE.MeshBasicMaterial({ map: surfaceTex('EAR') }) : new THREE.MeshLambertMaterial({ map: surfaceTex(p.code) });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 32, 20), mat);
    const hit = new THREE.Mesh(new THREE.SphereGeometry(size * 3, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.code = p.code; mesh.add(hit); hits.push(hit);
    if (p.code === 'SAT') {
      const rt = canvasTex(128, 128, g => { const rg = g.createRadialGradient(64, 64, 26, 64, 64, 62); rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(0.3, ink(0.8)); rg.addColorStop(0.5, ink(0.22)); rg.addColorStop(0.72, ink(0.65)); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); });
      const ring = new THREE.Mesh(new THREE.RingGeometry(size * 1.35, size * 2.35, 48), new THREE.MeshBasicMaterial({ map: rt, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = Math.PI / 2 - 0.42; mesh.add(ring);
    }
    const label = sprite(textTex([{ text: isE ? 'EARTH' : p.code, size: 30, y: 26, color: isE ? '#fff' : ink(0.7), weight: isE ? 600 : 500 }]), LBL_W, LBL_H, false, 1, true);
    label.center.set(0.5, -0.25);
    const ring = isE ? sprite(earthRingTex, 0.05, 0.05, false, 0.8, true) : null;
    const ghost = sprite(ringTex(0.4, 5), 0.026, 0.026, false, 1, true); ghost.visible = false;
    const pip = sprite(PIP, isE ? 0.016 : 0.011, isE ? 0.016 : 0.011, true, isE ? 1 : 0.8, true);
    scene.add(mesh, label, ghost, pip); if (ring) scene.add(ring);
    bodies[p.code] = { mesh, label, ring, ghost, pip, size };
  });
  T.otherEarth = sprite(ringTex(0.9, 5), 0.05, 0.05, false, 1, true); T.otherEarth.visible = false; scene.add(T.otherEarth);

  /* comets and asteroids: small lit markers with name tags; comets trail a tail away from the Sun */
  const wandGroup = new THREE.Group(); scene.add(wandGroup);
  const wands = WANDERERS.map(w => {
    const com = w.t === 'com';
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(com ? 0.7 : 0.6, 10, 8), new THREE.MeshBasicMaterial({ color: com ? 0xdedcd6 : 0xaeaca6 }));
    const hit = new THREE.Mesh(new THREE.SphereGeometry(4, 6, 4), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.code = 'W:' + w.n; mesh.add(hit); hits.push(hit);
    const pip = sprite(PIP, 0.007, 0.007, true, 0.7, true);
    const label = sprite(textTex([{ text: w.n.toUpperCase(), size: 22, y: 26, color: ink(0.6) }]), 0.16, 0.04, false, 0.5, true); label.center.set(0.5, -0.3);
    let tail = null;
    if (com) { tail = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, depthWrite: false })); tail.frustumCulled = false; wandGroup.add(tail); }
    wandGroup.add(mesh, pip, label);
    return { w, mesh, pip, label, tail };
  });

  /* the three spacecraft leaving: distances true, escape directions approximate */
  const probeGroup = new THREE.Group(); scene.add(probeGroup);
  const probes = PROBES.map(p => {
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    const hit = new THREE.Mesh(new THREE.SphereGeometry(5, 6, 4), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.code = 'P:' + p.n; mesh.add(hit); hits.push(hit);
    const pip = sprite(PIP, 0.008, 0.008, true, 0.9, true);
    const label = sprite(textTex([{ text: p.n.toUpperCase(), size: 22, y: 26, color: ink(0.75) }]), 0.16, 0.04, false, 0.7, true); label.center.set(0.5, -0.3);
    probeGroup.add(mesh, pip, label);
    return { p, mesh, pip, label };
  });

  /* moons: true bearings and orbit planes, radii magnified (each moon a few host-radii out) */
  const moonGroups = {};
  Object.keys(MOON_NAMES).forEach(code => {
    const host = bodies[code], grp = new THREE.Group(); grp.userData.subs = [];
    MOON_NAMES[code].forEach((n, i) => {
      const R = host.size * MOON_ORBITS[code][i], sub = new THREE.Group();
      sub.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(R, 64)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 })));
      const mm = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.22, host.size * 0.09), 14, 10), new THREE.MeshLambertMaterial({ color: 0xcfcdc6 }));
      const lbl = sprite(textTex([{ text: n.toUpperCase(), size: 22, y: 26, color: ink(0.6) }]), 0.13, 0.0325, false, 0.75, true); lbl.center.set(0.5, -0.4); lbl.visible = false;
      const orbitLine = sub.children[0];
      const hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.9, host.size * 0.35), 6, 4), new THREE.MeshBasicMaterial({ visible: false }));
      hit.userData.code = `M:${code}:${i}`; mm.add(hit); hits.push(hit);
      sub.add(mm, lbl); sub.userData = { mesh: mm, R, label: lbl, orbit: orbitLine, key: `M:${code}:${i}` };
      grp.add(sub); grp.userData.subs.push(sub);
    });
    grp.userData.near = host.size * 26;
    scene.add(grp); moonGroups[code] = grp;
  });

  /* the retrograde illusion: rings on worlds that would seem to go backward from Earth, and Earth's sightlines to them */
  const retroRings = {};
  PLANETS.forEach(p => { if (p.code === 'EAR') return; const r = sprite(ringTex(0.55, 4), 0.034, 0.034, false, 1, true); r.visible = false; scene.add(r); retroRings[p.code] = r; });
  const sight = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, dashSize: 2, gapSize: 3, depthWrite: false }));
  sight.frustumCulled = false; scene.add(sight);

  function buildStatic() {
    T.unit = 400 / f()(RMAX);
    dispose(grid);
    [0.5, 1, 2, 5, 10, 20, 30, 40].forEach(r => grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(f()(r) * T.unit)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.035 }))));
    dispose(stations);
    const R = f()(RMAX) * T.unit + 24;
    [R, R + 16].forEach(RR => stations.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts(RR, 180)), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }))));
    for (let s = 0; s < 12; s++) {
      const a = s * 30 * D2R;
      stations.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(Math.cos(a) * R, 0, -Math.sin(a) * R), new THREE.Vector3(Math.cos(a) * (R + 16), 0, -Math.sin(a) * (R + 16))]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })));
      const mid = (s * 30 + 15) * D2R;
      const lbl = sprite(textTex([{ text: STATIONS[s].name.toUpperCase(), size: 24, y: 40, color: ink(0.5) }]), 0.16, 0.04, false, 1, true);
      lbl.position.set(Math.cos(mid) * (R + 8), 4, -Math.sin(mid) * (R + 8)); lbl.userData.station = s;
      stations.add(lbl);
    }
    T.orbitKey = null;
  }
  function buildOrbits(jd) {
    dispose(orbits);
    PLANETS.forEach(p => {
      const pts = orbitPath(p, jd, p.code === 'PLU' ? 260 : 180).map(q => P3(q.x, q.y, 0));
      orbits.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: p.code === 'EAR' ? 0.4 : 0.13 })));
    });
    T.orbitKey = T.scale + ':' + Math.round(jd / 3650);
  }

  function sync(chart, { natal = null, other = null, scale = 'even', showAspects = true, focus = null, earthSub = null, otherSub = null, moons = true, wanderers = true, probes: showProbes = true, retro = false } = {}) {
    if (scale !== T.scale) { T.scale = scale; buildStatic(); }
    if (T.orbitKey !== T.scale + ':' + Math.round(chart.jd / 3650)) buildOrbits(chart.jd);
    T.chart = chart;
    chart.bodies.forEach(b => {
      const o = bodies[b.code], v = P3(b.x, b.y, b.z);
      o.mesh.position.copy(v);
      o.label.position.set(v.x, v.y + o.size * 1.1, v.z);
      o.pip.position.copy(v); if (o.ring) o.ring.position.copy(v);
    });
    // Earth's label: EARTH, with the person's name toned underneath
    const key = earthSub || '';
    if (T.earthSub !== key) {
      T.earthSub = key;
      const e = bodies.EAR; e.label.material.map.dispose();
      e.label.material.map = textTex([{ text: 'EARTH', size: 30, y: 24, color: '#fff', weight: 600 }].concat(key ? [{ text: key.toUpperCase().slice(0, 16), size: 22, y: 58, color: ink(0.45) }] : []));
      e.label.material.needsUpdate = true;
    }
    // the birth wheel, ghosted
    PLANETS.forEach(p => {
      const g = bodies[p.code].ghost, b = natal?.bodies.find(q => q.code === p.code);
      g.visible = !!b && Math.abs(natal.jd - chart.jd) > 0.5;
      if (g.visible) g.position.copy(P3(b.x, b.y, b.z));
    });
    // a second person's Earth (Pair)
    const oe = other?.bodies.find(b => b.code === 'EAR');
    T.otherEarth.visible = !!oe;
    if (oe) T.otherEarth.position.copy(P3(oe.x, oe.y, oe.z));
    // aspects as lines through the real positions
    dispose(aspects);
    if (showAspects) {
      const byType = {};
      chart.aspects.forEach(a => (byType[a.type] = byType[a.type] || []).push(a));
      Object.entries(byType).forEach(([type, list]) => {
        const st = ASPECT_STYLE[type], pts = [];
        list.forEach(a => { if (focus && a.a.code !== focus && a.b.code !== focus) return; pts.push(P3(a.a.x, a.a.y, a.a.z), P3(a.b.x, a.b.y, a.b.z)); });
        if (!pts.length) return;
        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = st.dash ? new THREE.LineDashedMaterial({ color: 0xffffff, transparent: true, opacity: st.op, dashSize: st.dash, gapSize: st.gap, depthWrite: false })
          : new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: st.op, depthWrite: false });
        const seg = new THREE.LineSegments(geo, mat);
        if (st.dash) seg.computeLineDistances();
        aspects.add(seg);
      });
    }
    // comets and asteroids
    wandGroup.visible = wanderers;
    if (wanderers) wands.forEach(it => {
      const s = wandererAt(it.w, chart.jd), v = P3(s.x, s.y, s.z);
      const show = s.r <= RMAX * 1.3;
      it.mesh.visible = it.pip.visible = it.label.visible = show; if (it.tail) it.tail.visible = show;
      if (!show) return;
      it.mesh.position.copy(v); it.pip.position.copy(v); it.label.position.copy(v);
      if (it.tail) { const dir = v.clone().normalize().multiplyScalar(Math.min(30, Math.max(4, 22 / (s.r * s.r)))); const a = it.tail.geometry.attributes.position; a.setXYZ(0, v.x, v.y, v.z); a.setXYZ(1, v.x + dir.x, v.y + dir.y, v.z + dir.z); a.needsUpdate = true; }
    });
    // spacecraft
    probeGroup.visible = showProbes;
    if (showProbes) probes.forEach(it => {
      const s = probeAt(it.p, chart.jd); it.mesh.visible = it.pip.visible = it.label.visible = !!s;
      if (!s) return;
      const v = P3(s.x, s.y, s.z); it.mesh.position.copy(v); it.pip.position.copy(v); it.label.position.copy(v);
    });
    // moons
    const SYS = moons ? moonSystems(chart) : null;
    Object.entries(moonGroups).forEach(([code, grp]) => {
      grp.visible = moons; if (!moons) return;
      grp.position.copy(bodies[code].mesh.position);
      grp.userData.subs.forEach((sub, i) => {
        const st = SYS[code][i];
        const X = new THREE.Vector3(st.p1[0], st.p1[2], -st.p1[1]), Z = new THREE.Vector3(st.p2[0], st.p2[2], -st.p2[1]);
        const Y = new THREE.Vector3().crossVectors(Z, X);
        sub.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
        const cu = st.v[0] * st.p1[0] + st.v[1] * st.p1[1] + st.v[2] * st.p1[2], su = st.v[0] * st.p2[0] + st.v[1] * st.p2[1] + st.v[2] * st.p2[2];
        sub.userData.mesh.position.set(cu * sub.userData.R, 0, su * sub.userData.R);
        sub.userData.label.position.copy(sub.userData.mesh.position);
      });
    });
    // the retrograde illusion
    const e = bodies.EAR.mesh.position, segs = [];
    Object.entries(retroRings).forEach(([code, r]) => {
      r.visible = retro && chart.retro.has(code);
      if (r.visible) { r.position.copy(bodies[code].mesh.position); segs.push(e.clone(), bodies[code].mesh.position.clone()); }
    });
    sight.geometry.dispose(); sight.geometry = new THREE.BufferGeometry().setFromPoints(segs); if (segs.length) sight.computeLineDistances();
    // the lit station is Earth's
    stations.children.forEach(o => { if (o.userData.station != null) o.material.opacity = o.userData.station === chart.station ? 1 : 0.55; });
    T.focus = focus;
  }

  /* camera */
  const lookAngles = (from, to) => { const d = to.clone().sub(from).normalize(); return { pitch: Math.asin(Math.max(-1, Math.min(1, d.y))), yaw: Math.atan2(-d.x, -d.z) }; };
  function earthView() {
    const ep = bodies.EAR.mesh.position.clone();
    const out = ep.clone().setY(0).normalize().multiplyScalar(42);
    const pos = ep.clone().add(out).add(new THREE.Vector3(0, 13, 0));
    return { pos, ...lookAngles(pos, new THREE.Vector3()), speed: 0.4 };
  }
  function preset(name, instant = false) {
    let to;
    T.follow = null;
    if (name === 'overview') { const pos = new THREE.Vector3(0, 460, 760); to = { pos, ...lookAngles(pos, new THREE.Vector3()), speed: 1.5 }; }
    else if (name === 'sun') { const pos = new THREE.Vector3(0, 11, 0); to = { pos, ...lookAngles(pos, bodies.EAR.mesh.position), speed: 0.5 }; }
    else if (name === 'earth') { to = earthView(); T.follow = 'earth'; }
    else if (name === 'edge') { const pos = new THREE.Vector3(0, 8, 900); to = { pos, ...lookAngles(pos, new THREE.Vector3()), speed: 1.5 }; }
    if (!to) return;
    if (instant) { cam.pos.copy(to.pos); cam.yaw = to.yaw; cam.pitch = to.pitch; cam.speed = to.speed; }
    else T.tween = { t0: performance.now(), dur: 1500, from: { pos: cam.pos.clone(), yaw: cam.yaw, pitch: cam.pitch }, to };
    T.preset = name;
  }

  /* input */
  const el = renderer.domElement;
  const pts = new Map();
  let dragging = false, lx = 0, ly = 0, moved = 0;
  const stopAuto = () => { T.tween = null; T.follow = null; T.preset = null; };
  el.addEventListener('pointerdown', e => { pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragging = true; moved = 0; lx = e.clientX; ly = e.clientY; el.setPointerCapture(e.pointerId); el.classList.add('grabbing'); });
  el.addEventListener('pointermove', e => {
    if (pts.size >= 2 && pts.has(e.pointerId)) {
      const ids = [...pts.keys()], a0 = pts.get(ids[0]), b0 = pts.get(ids[1]), d0 = Math.hypot(a0.x - b0.x, a0.y - b0.y);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const a1 = pts.get(ids[0]), b1 = pts.get(ids[1]), d1 = Math.hypot(a1.x - b1.x, a1.y - b1.y);
      // pinch: move forward or back along the view
      if (d0 > 4) { stopAuto(); const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(cam.pitch, cam.yaw, 0, 'YXZ')); cam.pos.addScaledVector(fwd, (d1 - d0) * cam.speed * 0.9); }
      return;
    }
    if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (dragging) {
      const dx = e.clientX - lx, dy = e.clientY - ly; moved += Math.abs(dx) + Math.abs(dy);
      if (moved > 3) { T.tween = null; if (T.follow) T.follow = 'earth-look'; }
      cam.yaw -= dx * 0.0034; cam.pitch = Math.max(-1.5, Math.min(1.5, cam.pitch - dy * 0.0034));
      lx = e.clientX; ly = e.clientY;
    } else if (e.pointerType !== 'touch') hover(e);
  });
  const release = e => {
    pts.delete(e.pointerId);
    if (pts.size === 1) { const r = [...pts.values()][0]; lx = r.x; ly = r.y; }
    if (!pts.size) { dragging = false; el.classList.remove('grabbing'); if (moved < 4) hover(e, true); }
  };
  el.addEventListener('pointerup', release); el.addEventListener('pointercancel', release);
  el.addEventListener('pointerleave', () => { if (!dragging) { T.hover = null; onHover?.(null); } });
  wrap.addEventListener('wheel', e => { if (!T.active) return; e.preventDefault(); cam.speed = Math.max(0.12, Math.min(28, cam.speed * (e.deltaY < 0 ? 1.15 : 0.87))); onHover?.(T.hover, null, null, cam.speed); }, { passive: false });
  const FLY = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'];
  window.addEventListener('keydown', e => {
    if (!T.active || e.target.closest?.('input, textarea, select, dialog[open]') || e.metaKey || e.ctrlKey) return;
    if (!FLY.includes(e.code)) return;
    if (e.code.startsWith('Arrow')) e.preventDefault();
    if (!e.code.startsWith('Shift')) stopAuto();
    T.keys.add(e.code);
  });
  window.addEventListener('keyup', e => T.keys.delete(e.code));
  window.addEventListener('blur', () => T.keys.clear());

  function hover(e, tap = false) {
    const r = el.getBoundingClientRect();
    ray.setFromCamera({ x: (e.clientX - r.left) / r.width * 2 - 1, y: -((e.clientY - r.top) / r.height * 2 - 1) }, camera);
    // only things that are showing can be hovered (hidden layers keep their hit spheres)
    const shown = o => { for (let q = o.parent; q; q = q.parent) if (!q.visible) return false; return true; };
    const h = ray.intersectObjects(hits, false).filter(x => shown(x.object));
    // small things win when the pointer is on them: a planet's hover area is large enough to swallow its own moons
    const rank = c => c.startsWith('M:') ? 0 : c.includes(':') ? 1 : 2;
    h.sort((a, b) => rank(a.object.userData.code) - rank(b.object.userData.code) || a.distance - b.distance);
    const code = h.length ? h[0].object.userData.code : null;
    T.hover = code;
    el.classList.toggle('hovering', !!code);
    onHover?.(code, e.clientX - r.left, e.clientY - r.top, cam.speed, tap);
  }

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
  }
  new ResizeObserver(resize).observe(wrap);

  function frame(dt, t) {
    if (!T.active) return;
    if (T.tween) {
      const k = easeIO(Math.min(1, (performance.now() - T.tween.t0) / T.tween.dur));
      const to = T.follow === 'earth' ? earthView() : T.tween.to;
      cam.pos.lerpVectors(T.tween.from.pos, to.pos, k);
      cam.yaw = T.tween.from.yaw + wrapPI(to.yaw - T.tween.from.yaw) * k;
      cam.pitch = T.tween.from.pitch + (to.pitch - T.tween.from.pitch) * k;
      if (k >= 1) { cam.speed = to.speed; T.tween = null; }
    } else if (T.follow === 'earth') {
      const to = earthView(); cam.pos.copy(to.pos); cam.yaw = to.yaw; cam.pitch = to.pitch;
    } else if (T.follow === 'earth-look') {
      // keep riding Earth but let the user look around
      cam.pos.copy(earthView().pos);
    }
    const eul = new THREE.Euler(cam.pitch, cam.yaw, 0, 'YXZ');
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(eul), right = new THREE.Vector3(1, 0, 0).applyEuler(eul);
    const k = T.keys, boost = k.has('ShiftLeft') || k.has('ShiftRight');
    const sp = cam.speed * (boost ? 4 : 1) * Math.min(3, dt * 60);
    if (k.has('KeyW') || k.has('ArrowUp')) cam.pos.addScaledVector(fwd, sp);
    if (k.has('KeyS') || k.has('ArrowDown')) cam.pos.addScaledVector(fwd, -sp);
    if (k.has('KeyA') || k.has('ArrowLeft')) cam.pos.addScaledVector(right, -sp);
    if (k.has('KeyD') || k.has('ArrowRight')) cam.pos.addScaledVector(right, sp);
    if (k.has('KeyQ')) cam.pos.y -= sp;
    if (k.has('KeyE')) cam.pos.y += sp;
    camera.position.copy(cam.pos);
    camera.rotation.set(cam.pitch, cam.yaw, 0, 'YXZ');
    const fov = boost && (k.has('KeyW') || k.has('ArrowUp')) ? 70 : 60;
    camera.fov += (fov - camera.fov) * 0.08; camera.updateProjectionMatrix();

    const still = reduceMotion();
    T.starMat.uniforms.uTime.value = t;
    const pulse = still ? 1 : 1 + Math.sin(t * 3) * 0.04;
    T.halo.scale.set(64 * pulse, 64 * pulse, 1);
    const sd = cam.pos.length();   // the glow fades as you near the Sun, so standing on it you can still see
    T.halo.material.opacity = Math.max(0, Math.min(1, (sd - 14) / 90));
    T.corona.material.opacity = Math.max(0, Math.min(1, (sd - 30) / 200));
    if (!still) T.corona.material.rotation += 0.0008;
    wands.forEach(it => { if (!it.label.visible) return; const d = cam.pos.distanceTo(it.mesh.position); it.label.material.opacity = (T.hover === 'W:' + it.w.n ? 1 : Math.max(0, Math.min(0.55, 1.1 - d / 500))) * (T.hover && T.hover !== 'W:' + it.w.n ? 0.4 : 1); it.pip.material.opacity = Math.max(0, Math.min(0.7, d / 200 - 0.15)); });
    probes.forEach(it => { if (!it.label.visible) return; it.label.material.opacity = T.hover === 'P:' + it.p.n ? 1 : 0.6; });
    for (const code in moonGroups) {
      const grp = moonGroups[code]; if (!grp.visible) continue;
      const near = cam.pos.distanceTo(grp.position) < grp.userData.near;
      grp.userData.subs.forEach(sub => {
        const me = T.hover === sub.userData.key;
        sub.userData.label.visible = near || me;
        sub.userData.label.material.opacity = me ? 1 : 0.75;
        sub.userData.orbit.material.opacity = me ? 0.45 : 0.1;
        sub.userData.mesh.scale.setScalar(me ? 1.6 : 1);
      });
    }
    for (const code in bodies) {
      const o = bodies[code];
      if (!still) o.mesh.rotation.y += 0.0016;
      const d = cam.pos.distanceTo(o.mesh.position);
      const dim = (T.hover && T.hover !== code) || (T.focus && T.focus !== code && code !== 'EAR') ? 0.3 : 1;
      o.label.material.opacity = Math.max(0.35, Math.min(1, 1.9 - d / 1400)) * dim;
      o.pip.material.opacity = Math.max(0, Math.min(1, d / 260 - 0.2)) * (code === "EAR" ? 1 : 0.8 * dim);
      if (o.ring) o.ring.material.opacity = 0.55 + Math.sin(t * 2) * 0.15;
    }
    renderer.render(scene, camera);
  }

  // a pad for phones: hold to fly forward or back
  function bindPad(pad) {
    pad.querySelectorAll('[data-key]').forEach(b => {
      const code = b.dataset.key;
      const press = e => { e.preventDefault(); stopAuto(); T.keys.add(code); try { b.setPointerCapture(e.pointerId); } catch { } };
      const up = () => T.keys.delete(code);
      b.addEventListener('pointerdown', press); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', e => e.preventDefault());
    });
  }

  buildStatic();
  resize();
  return {
    sync, frame, preset, resize, bindPad,
    setActive(on) { T.active = on; if (!on) { T.keys.clear(); T.hover = null; } else resize(); },
    get preset_() { return T.preset; },
    get speed() { return cam.speed; },
    get chart() { return T.chart; },
    started: () => preset('overview', true),
  };
}
