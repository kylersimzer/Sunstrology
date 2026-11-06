// The pixel field: the light and matter of the solar system drawn as a fine LED panel, after the dot-matrix
// footer on pulsor.studio. The structure (rings, orbits, lines, labels) is drawn crisp on top by the app;
// this file only does what glows or drifts:
//   - the scene's matter (the Sun, the worlds, trails, comets, moons), sampled once per cell
//   - the solar wind: faint pulses running outward from the Sun along slowly turning streamers
//   - the asteroid belt (2.1–3.3 AU) and the Kuiper belt (30 AU out): dust in its true zones, twinkling
//   - sparse stars beyond the edge of the system
// Bright things hold steady and only faint dust twinkles. Bright cells fade slowly (phosphor), so worlds
// leave trails while time plays, and the cursor gently warms what it passes over.

const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function createPixelField() {
  const off = document.createElement('canvas'), octx = off.getContext('2d');
  const down = document.createElement('canvas'), dctx = down.getContext('2d', { willReadFrequently: true });
  const small = document.createElement('canvas'), sctx = small.getContext('2d');
  const tile = document.createElement('canvas'), tctx = tile.getContext('2d');
  let cols = 0, rows = 0, P = 0, phase, speed, glow, img, tileKey = '', pattern = null;
  let au, ang, rad, spaceKey = '';

  function setup(W, H, pitch, dpr) {
    const p = Math.max(3, Math.round(pitch * dpr));
    const c = Math.ceil(W * dpr / p), r = Math.ceil(H * dpr / p);
    if (c === cols && r === rows && p === P) return;
    cols = c; rows = r; P = p;
    const n = cols * rows;
    phase = new Float32Array(n); speed = new Float32Array(n); glow = new Float32Array(n);
    au = new Float32Array(n); ang = new Float32Array(n); rad = new Float32Array(n);
    for (let i = 0; i < n; i++) { phase[i] = Math.random() * Math.PI * 2; speed[i] = 0.3 + Math.random() * 1.1; }
    off.width = cols * 2; off.height = rows * 2;
    down.width = cols; down.height = rows;
    small.width = cols; small.height = rows;
    img = sctx.createImageData(cols, rows);
    tileKey = ''; spaceKey = '';
  }

  // where each cell sits in the solar system: distance from the Sun on screen and in AU, and its angle
  function mapSpace(sp, cell) {
    const key = [cols, rows, sp.cx.toFixed(1), sp.cy.toFixed(1), sp.R.toFixed(1), sp.scale].join();
    if (key === spaceKey) return;
    spaceKey = key;
    const edge = sp.R * 0.83, N = 256, lut = new Float32Array(N + 1);   // screen radius → AU, sampled once
    for (let j = 0; j <= N; j++) lut[j] = sp.toAU(edge * j / N) ?? 46;
    for (let y = 0, i = 0; y < rows; y++) for (let x = 0; x < cols; x++, i++) {
      const dx = (x + 0.5) * cell - sp.cx, dy = (y + 0.5) * cell - sp.cy, d = Math.sqrt(dx * dx + dy * dy);
      rad[i] = d; ang[i] = Math.atan2(-dy, dx);
      if (d >= edge) au[i] = d >= sp.R ? -1 : 46;      // -1: outside the station ring, open sky
      else { const f = d / edge * N, j = Math.floor(f); au[i] = lut[j] + (lut[Math.min(N, j + 1)] - lut[j]) * (f - j); }
    }
  }

  // one tile of the panel: background everywhere except a square dot in the middle
  function gapPattern(g, bg) {
    const key = P + bg;
    if (key === tileKey && pattern) return pattern;
    tile.width = tile.height = P;
    const dot = Math.max(2, Math.round(P * 0.62)), o = Math.floor((P - dot) / 2);
    tctx.fillStyle = bg; tctx.fillRect(0, 0, P, P); tctx.clearRect(o, o, dot, dot);
    pattern = g.createPattern(tile, 'repeat'); tileKey = key;
    return pattern;
  }

  const rgb = s => { const m = s.match(/\d+(\.\d+)?/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; };
  const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };

  /**
   * opts: { pitch (CSS px), dpr, t (s), mouse {x, y} | null, paint(ctx) draws the matter in CSS px,
   *         space { cx, cy, R, scale, toAU(screenRadius) }, ink 'r, g, b', bg '#hex', persist 0..1, still, gain }
   */
  function render(g, W, H, o) {
    setup(W, H, o.pitch, o.dpr);
    const cell = P / o.dpr;
    mapSpace(o.space, cell);
    const bg = o.bg.startsWith('#') ? hexRgb(o.bg) : rgb(o.bg), ink = rgb(o.ink);
    const bgL = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2];
    const range = Math.max(40, Math.abs((0.2126 * ink[0] + 0.7152 * ink[1] + 0.0722 * ink[2]) - bgL));

    // 1. the matter, at two samples per cell, then averaged down to one
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.fillStyle = o.bg; octx.fillRect(0, 0, off.width, off.height);
    octx.setTransform(2 / cell, 0, 0, 2 / cell, 0, 0);
    o.paint(octx);
    dctx.imageSmoothingEnabled = true; dctx.imageSmoothingQuality = 'high';
    dctx.clearRect(0, 0, cols, rows); dctx.drawImage(off, 0, 0, cols, rows);
    const src = dctx.getImageData(0, 0, cols, rows).data, out = img.data;

    const t = o.t, still = o.still, persist = o.persist ?? 0.55, gain = o.gain ?? 4;
    const mx = o.mouse?.x, my = o.mouse?.y, near = 74;
    const zoom = o.space.R / 300;                                         // keeps the wind's spacing steady as you zoom
    const sx = Math.round(o.space.cx / cell), sy = Math.round(o.space.cy / cell);   // stars stay put in the sky as you pan
    for (let y = 0, i = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++, i++) {
        const k = i * 4, L = 0.2126 * src[k] + 0.7152 * src[k + 1] + 0.0722 * src[k + 2];
        let v = 1 - Math.exp(-gain * Math.abs(L - bgL) / range);
        v = Math.max(v, glow[i] * persist); glow[i] = v;
        // bright things hold steady; faint things twinkle
        const tw = still ? 0 : Math.sin(t * speed[i] * 1.6 + phase[i]);
        let a = v * (1 - (0.1 + 0.4 * (1 - v)) * (0.5 - 0.5 * tw));

        const A = au[i];
        if (A < 0) {
          // open sky beyond the station ring: a few stars
          if (hash(x - sx, y - sy) < 0.016) a += (0.1 + 0.32 * hash(y - sy, x - sx)) * (still ? 0.8 : 0.55 + 0.45 * Math.sin(t * speed[i] * 0.6 + phase[i]));
        } else {
          // dust in the true zones of the two belts, fixed in space (hashed by distance and angle, not by screen cell)
          const ab = Math.floor(A * 26), gb = Math.floor((ang[i] + Math.PI) * 60 * Math.min(4, Math.max(1, zoom)));
          if (A > 2.1 && A < 3.3 && hash(ab, gb) < 0.32) a += (0.08 + 0.22 * hash(gb, ab)) * (still ? 0.8 : 0.5 + 0.5 * Math.sin(t * speed[i] + phase[i]));
          else if (A > 30 && A < 46 && hash(ab + 999, gb) < 0.16) a += (0.05 + 0.14 * hash(gb, ab + 7)) * (still ? 0.8 : 0.5 + 0.5 * Math.sin(t * speed[i] * 0.8 + phase[i]));
          // the solar wind: pulses running outward along streamers that turn very slowly
          if (!still && A < 46) {
            const streak = Math.pow(0.5 + 0.5 * Math.sin(ang[i] * 7 + Math.sin(ang[i] * 2 + t * 0.04) * 2.2), 5);
            const pulse = Math.pow(0.5 + 0.5 * Math.sin(rad[i] / zoom * 0.11 - t * 1.5), 12);
            a += 0.13 * streak * pulse * (0.35 + 0.65 * Math.exp(-A / 9));
          }
          a += 0.012;                                    // the panel, just alive
        }
        if (mx != null) {
          const dx = (x + 0.5) * cell - mx, dy = (y + 0.5) * cell - my, d = dx * dx + dy * dy;
          if (d < near * near) { const e = 1 - Math.sqrt(d) / near; a += e * e * (still ? 0.1 : 0.07 + 0.06 * Math.sin(t * 5 + phase[i] * 5)); }
        }
        out[k] = ink[0]; out[k + 1] = ink[1]; out[k + 2] = ink[2]; out[k + 3] = a >= 1 ? 255 : a <= 0 ? 0 : a * 255;
      }
    }
    sctx.putImageData(img, 0, 0);

    // 2. up to full size, nearest-neighbour, then punch the gaps between dots
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = o.bg; g.fillRect(0, 0, cols * P, rows * P);
    g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, cols * P, rows * P);
    g.fillStyle = gapPattern(g, o.bg); g.fillRect(0, 0, cols * P, rows * P);
    g.restore();
  }

  return { render, reset: () => { glow?.fill(0); } };
}

/** A view of a 2D context that only draws text: everything else is a no-op. */
export function textOnly(ctx) {
  const pass = new Set(['fillText', 'measureText', 'save', 'restore', 'setTransform', 'translate', 'rotate', 'scale', 'createLinearGradient', 'createRadialGradient', 'setLineDash', 'getLineDash']);
  const noop = () => {};
  return new Proxy(ctx, {
    get(t, k) { const v = t[k]; return typeof v === 'function' ? (pass.has(k) ? v.bind(t) : noop) : v; },
    set(t, k, v) { t[k] = v; return true; },
  });
}
