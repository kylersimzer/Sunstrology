# Sunstrology v2: concept

v1 (`Sunstrology/index.html`) is a 3,800-line almanac: a real Kepler engine with a deep stack of tables under it. v2 keeps the engine and the idea (the sky seen from the Sun, Earth as you) and turns it into an app you come back to.

Open it with `python tools/serve.py`, then go to http://localhost:5173/web/.

## What changed

| v1 | v2 |
|---|---|
| One long page you read once | Seven views with their own addresses: Today, Birth chart, Pair, Telescope, Figures, Oracle, Poster (`#/sky`, `#/chart`…) |
| The Telescope (three.js) inside the Plate | **Telescope** is its own view, driven by the same time bar and people. One ink; three.js loads only when the view opens. Presets: Overview, Stand on the Sun, Ride Earth (follows Earth while time plays), Edge-on. Fly buttons on phones. |
| One birth moment at a time | **People**: you plus anyone else, stored on the device only. Each person's avatar is their seal (their sky as one figure). |
| UTC offset dropdown | A real **time zone** per person (IANA, daylight saving handled for the birth date). "I don't know the time" uses noon. |
| Natal chart plus a transit table | **Today** is the home screen: a solar weather word (Clear, Bright, Mixed, Gusty, Charged), one theme sentence, today's lines to your birth sky, Earth's current station, the Moon, coming meetings and returns. |
| Timeline slider | A **time bar** in place of GODMIX's player: play, step, day/month/year per second, Birth and Now marks. Scrub to any day 1800–2050 and the weather is re-read for that day. |
| Geometry twin | **Pair**: two skies overlaid, a 0–100 resonance, Earth-to-Earth angle and every cross-line, plus a pair reading prompt. |
| Prompt generator | **Oracle**: Daily, Natal and Pair prompts, editable and remembered, with the data rebuilt every time. |
| Solar seal box | **Poster**: a 1080 × 1350 black or paper print of the sky, downloadable as a PNG. No two birth moments draw the same figure. |
| None | **Share links**: `#/chart?s=…` carries a birth moment in the link's hash (never sent to a server). The person opening it can save it to their people. |
| Colours per planet | One ink, as on stems.fm and GODMIX. The only full-white things are the Sun and you. Aspect types are told apart by line style. |

## Design rules

- **Light comes from the Sun.** Black, one off-white ink (`#ECEBE6`) at different strengths. Full white is kept for the Sun, Earth (you), the play button and primary actions. Light mode is stems.fm's paper.
- **Lines, not colours:** Flow is thin and solid, Friction heavier, Mirror dashed, Signal dotted, Merge heavy.
- **Type:** Geist for words, Geist Mono for numbers, dates and labels. Interface text is 13 px.
- **Layout:** GODMIX's frame. Sidebar (views, people), the wheel as the stage, an inspector on the right, the time bar along the bottom. On phones: a top bar with a person switcher, the wheel, the inspector as a sheet, the time bar docked above five tabs.
- **Two layers, kept apart:** `astro.js` is only maths. `meaning.js` is only language. The stations, patterns and readings are invented, and the app says so.
- **Keys:** 1–7 views, space play, ← → step, B birth, N now, L lines, Esc clear focus. In the Telescope: drag to look, W A S D or arrows to fly, Q / E down and up, shift to boost, scroll for speed.

## Files

```
web/
  index.html            shell, dialogs
  css/tokens.css        design tokens (from GODMIX)
  css/app.css           layout and components, desktop → tablet → phone
  js/astro.js           the engine: Kepler, aspects, patterns, figures, Moon, returns, station calendar
  js/meaning.js         stations, worlds, aspect language, weather, resonance, prompts
  js/wheel.js           canvas wheel, seal and station glyphs, poster
  js/telescope.js       the 3D view (three.js from a CDN, loaded on first open)
  js/app.js             state, people, routing, views, time bar
design/
  final/                the brand: mark 01 "Earth on the ring", lockup, icons, banners, loops (see final/README.md)
  brand.mjs             the brand as code; build-brand.mjs renders it (node design/build-brand.mjs)
  brand.html            every brand file on one page
  marks.js, logos.html  the 50 candidate marks (logos.html is built by build-logos.mjs)
tools/serve.py          local server with caching off
```

## Not ported from v1 yet

- **The Coincidences**, the rarity engine that compares the birth sky with thousands of sampled skies.
- In the Telescope: moons, wanderers (comets, asteroids) and the Voyagers. Elsewhere: eclipses, tides, seasons, the great year, sky recurrence.
- Observed records (SILSO sunspots, NASA DONKI flares, JPL Horizons checks).

## Ideas for after that

- **Moments:** save more than birthdays (a wedding, a first day, a move), each with its own chart, and read them against you.
- **Calendar export (.ics):** Earth entering your station, your returns, meetings, and full and new Moons.
- **Groups:** three or more people as one combined figure.
- **Installable app (PWA):** a home-screen app with a daily weather card. The manifest is in place.
- **Link previews:** a share image generated per person, like stems.fm's link previews.
- **Motion:** the mark's orbit loop is the Telescope's loading indicator; next, a slow idle drift on the wheel.
