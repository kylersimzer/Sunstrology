// Builds every Sunstrology brand file into design/final and copies what the site uses into web/assets.
// SVGs are written directly. PNGs and loop frames are drawn by headless Chrome (driven over the DevTools protocol,
// so one browser renders everything quickly), and ffmpeg turns the frames into MP4 and GIF.
// Usage: node design/build-brand.mjs [--no-loops | --loop=orbit|eight-years|stations]      Needs Chrome or Edge, ffmpeg on PATH, and internet (Geist from Google Fonts).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { INKS, markSVG, markLoopSVG, tileSVG, lockupSVG, bannerSVG, loopMark, loopVenus, loopStations } from './brand.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const FINAL = path.join(HERE, 'final');
const ASSETS = path.join(ROOT, 'web', 'assets');
const LOOPS = !process.argv.includes('--no-loops');
const ONLY = (process.argv.find(a => a.startsWith('--loop=')) || '').slice(7);   // e.g. --loop=eight-years renders just that loop
const out = rel => { const f = path.join(FINAL, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };
const write = (rel, text) => { fs.writeFileSync(out(rel), text); console.log('  wrote', rel); };

const BROWSER = [process.env.SUN_BROWSER, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].find(b => b && fs.existsSync(b));
if (!BROWSER) { console.error('No Chrome or Edge found; set SUN_BROWSER.'); process.exit(1); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sun-brand-'));
const PORT = 9300 + Math.floor(Math.random() * 500);

/* ---------- a tiny DevTools client ---------- */
const chrome = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(TMP, 'profile')}`, '--no-first-run', '--hide-scrollbars', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0;
const pending = new Map();
async function connect() {
  for (let i = 0; i < 60; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch { }
    await sleep(250);
  }
  if (!ws) throw new Error('Could not reach the browser');
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const { res, rej } = pending.get(d.id); pending.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } };
}
const send = (method, params = {}) => new Promise((res, rej) => { const id = ++seq; pending.set(id, { res, rej }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

const PAGE = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&display=block" rel="stylesheet">
<style>html,body{margin:0;overflow:hidden;background:transparent}#s>svg{display:block}</style><div id="s"></div>`;

let size = [0, 0];
async function setSize(w, h) { if (size[0] === w && size[1] === h) return; size = [w, h]; await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); }
async function shot(svg, w, h, file, { bg = null } = {}) {
  await setSize(w, h);
  await send('Emulation.setDefaultBackgroundColorOverride', { color: bg ? { r: 0, g: 0, b: 0, a: 1 } : { r: 0, g: 0, b: 0, a: 0 } });
  await evaluate(`(document.getElementById('s').innerHTML = ${JSON.stringify(svg.replace(/width="[^"]+" height="[^"]+"/, `width="${w}" height="${h}"`))}, new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  const { data } = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
}
const png = async (rel, svg, w, h, o) => { await shot(svg, w, h, out(rel), o); console.log(`  rendered ${rel} (${w}×${h})`); };

/* ---------- build ---------- */
await connect();
await send('Page.enable');
fs.writeFileSync(path.join(TMP, 'page.html'), PAGE);
await send('Page.navigate', { url: pathToFileURL(path.join(TMP, 'page.html')).href });
await sleep(400);
await evaluate(`Promise.all([document.fonts.load("600 100px Geist"), document.fonts.load("500 40px Geist"), document.fonts.load("500 40px 'Geist Mono'"), document.fonts.load("400 40px 'Geist Mono'")]).then(() => document.fonts.ready).then(() => 1)`);
// the word's width at 100 px with the lockup's tracking (8%), minus the tracking after the last letter
const textW = await evaluate(`(() => { const s = document.createElement('span'); s.style.cssText = "font:600 100px Geist;letter-spacing:8px;white-space:nowrap;position:absolute"; s.textContent = 'SUNSTROLOGY'; document.body.appendChild(s); const w = s.getBoundingClientRect().width - 8; s.remove(); return w; })()`);
console.log(`Sunstrology brand → design/final   (wordmark ${textW.toFixed(1)} px at 100 px)`);

// the mark
for (const [name, ink] of Object.entries(INKS)) write(`logo/sunstrology-mark-${name}.svg`, markSVG(ink));
write('logo/sunstrology-mark-current.svg', markSVG('currentColor'));
write('loops/sunstrology-mark-orbit.svg', markLoopSVG('#ffffff', { size: 240, dur: 4 }));
write('loops/sunstrology-mark-orbit-current.svg', markLoopSVG('currentColor', { size: 24, dur: 4 }));
await png('logo/sunstrology-mark-white-1024.png', markSVG(INKS.white, { size: 1024 }), 1024, 1024);
await png('logo/sunstrology-mark-black-1024.png', markSVG(INKS.black, { size: 1024 }), 1024, 1024);
await png('logo/sunstrology-mark-white-on-black-1024.png', markSVG(INKS.white, { size: 1024 }), 1024, 1024, { bg: '#000' });

// the lockup
for (const [name, ink] of [['white', '#ffffff'], ['ink', INKS.ink], ['black', '#000000']]) {
  const svg = lockupSVG(ink, { height: 64, text: ink, textW });
  write(`logo/sunstrology-lockup-${name}.svg`, svg);
  const w = Math.ceil(+/viewBox="0 0 ([\d.]+)/.exec(svg)[1]);
  await png(`logo/sunstrology-lockup-${name}-2x.png`, lockupSVG(ink, { height: 128, text: ink, textW }), w * 2, 128);
}

// icons
write('icons/favicon.svg', tileSVG(32));
await png('icons/favicon-16.png', tileSVG(16, { pad: 0.08 }), 16, 16);
await png('icons/favicon-32.png', tileSVG(32, { pad: 0.1 }), 32, 32);
await png('icons/apple-touch-icon.png', tileSVG(180, { radius: 0, pad: 0.16 }), 180, 180);
await png('icons/icon-192.png', tileSVG(192), 192, 192);
await png('icons/icon-512.png', tileSVG(512), 512, 512);
await png('icons/icon-512-maskable.png', tileSVG(512, { radius: 0, pad: 0.26 }), 512, 512);
await png('icons/x-profile-400x400.png', tileSVG(400, { radius: 0, pad: 0.2 }), 400, 400);

// banners
for (const [rel, w, h, align] of [['banners/sunstrology-banner-readme-1600x480', 1600, 480, 'left'], ['banners/sunstrology-banner-x-1500x500', 1500, 500, 'left'],
  ['banners/sunstrology-banner-github-1280x640', 1280, 640, 'center'], ['banners/sunstrology-link-preview-1200x630', 1200, 630, 'center']]) {
  const svg = bannerSVG(w, h, { align, textW });
  write(rel + '.svg', svg);
  await png(rel + '.png', svg, w, h, { bg: '#000' });
}

// loops
async function loop(name, frameFn, seconds, fps = 30, px = 1080, gifPx = 540) {
  if (ONLY && !name.endsWith(ONLY)) return;
  const dir = path.join(TMP, name); fs.mkdirSync(dir);
  const n = Math.round(seconds * fps);
  for (let i = 0; i < n; i++) await shot(frameFn(i / n, px, px), px, px, path.join(dir, `f${String(i).padStart(4, '0')}.png`), { bg: '#000' });
  const mp4 = out(`loops/${name}.mp4`), gif = out(`loops/${name}.gif`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', mp4]);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'),
    '-vf', `fps=${gifPx < 500 ? 20 : Math.min(fps, 25)},scale=${gifPx}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none`, '-loop', '0', gif]);
  const kb = f => (fs.statSync(f).size / 1024).toFixed(0) + ' KB';
  console.log(`  looped ${name}: ${n} frames → mp4 ${kb(mp4)}, gif ${kb(gif)}`);
}
if (LOOPS) {
  await loop('sunstrology-loop-orbit', (t, w) => loopMark(t, w), 4);
  await loop('sunstrology-loop-eight-years', loopVenus, 16, 30, 1080, 420);   // 720 lines a frame: a smaller GIF keeps it under 5 MB
  await loop('sunstrology-loop-stations', loopStations, 12);
}

// what the site serves
fs.mkdirSync(ASSETS, { recursive: true });
for (const [from, to] of [['icons/favicon.svg', 'favicon.svg'], ['icons/favicon-32.png', 'favicon-32.png'], ['icons/apple-touch-icon.png', 'apple-touch-icon.png'],
  ['icons/icon-192.png', 'icon-192.png'], ['icons/icon-512.png', 'icon-512.png'], ['icons/icon-512-maskable.png', 'icon-512-maskable.png'],
  ['loops/sunstrology-mark-orbit.svg', 'mark-orbit.svg'], ['banners/sunstrology-link-preview-1200x630.png', 'link-preview.png']]) {
  fs.copyFileSync(path.join(FINAL, from), path.join(ASSETS, to));
}
console.log('  copied icons, the orbit loop and the link preview to web/assets');

ws.close(); chrome.kill();
await sleep(300);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { }
