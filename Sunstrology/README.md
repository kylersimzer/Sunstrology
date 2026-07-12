# Sunstrology — The Heliocentric Almanac, by Kyler Simzer

A single-file, sun-centered birth chart you can run directly in your browser.
Copy the HTML into your own folder, open it, enter a birth moment, and generate a heliocentric chart — no installs, no accounts, no uploads.

Sunstrology computes the solar system at a chosen moment as seen **from the Sun**, then treats **Earth as the personal marker on the wheel** — your "sign" is Earth's solar station, one of twelve 30° sectors named for the Sun's own anatomy, from Core to Heliopause. No retrogrades, no houses, no borrowed zodiac. From the Sun's point of view, nothing ever moves backward.

The astronomy is real orbital math (JPL approximate Keplerian elements, J2000 + secular rates, Kepler-solved, valid 1800–2050); the stations, patterns, and meanings are an invented symbolic layer built on top of the real geometry. The app deliberately keeps those two things separate.

## Quick start
1. Download the `.html` file from this repo.
2. Open it in a modern browser (Chrome / Edge recommended).
3. Enter a birth date, time, and UTC offset — or press **Random**.
4. Press **Generate**.

## The sections
- **The Plate** — the chart itself, with a 2D almanac view ("The Chart") and a 3D fly-through view ("The Telescope"). Scale (compressed √ / logarithmic / true) and projection are adjustable. In the Telescope, drag to look, scroll to change speed, and steer with the arrow keys.
- **The Ephemeris** — your coming sky, computed forward from today and anchored to the birth moment. Click any event to travel the plate there.
- **The Figures** — every value computed from the birth moment: solar stations, orbit phase & speed, dominant gravitational pull, the Sun's wobble and 11-year cycle, aspect geometry, synodic cycles, and more. None invented.
- **The Coincidences** — true measurements ranked by computed frequency. None of it is invented; some of it is just unlikely.
- **The Generator** — turns the computed chart into clean data plus an editable prompt you can paste into your oracle of choice for a natal or daily reading.

## Privacy / Local-first
- Birth data is processed locally in your browser (this app does not upload your birth information anywhere).
- Note: the default HTML loads some dependencies from CDNs (Google Fonts, three.js) and can fetch live observed records (SILSO sunspot data, NASA DONKI, JPL Horizons) when online. Everything degrades gracefully offline — the core chart is computed entirely locally.

## Offline mode (optional)
To make this fully offline / no external requests:
- Bundle `three.js` (r128) locally and update the script tag to point to a local file.
- Remove/replace the Google Fonts import (use system fonts or local font files).
- Live observed records (SILSO / NASA / JPL) simply won't load; the computed chart is unaffected.

## Accuracy notes
- Planetary positions come from JPL's approximate Keplerian elements (J2000 epoch + rates per century), valid roughly 1800–2050.
- Lunations and eclipses follow Meeus.
- This is an almanac and a visual instrument, not an ephemeris of record — for mission-grade precision, use JPL Horizons directly.

## License
The software/code in this repo is licensed under the MIT License (see `LICENSE.txt`).

Live app source: https://github.com/kylersimzer/sunstrology

**Attribution request (not required by the MIT License):**
If you use this in a commercial product or paid project, please include a visible credit like:
**"Sunstrology by Kyler Simzer"**

Contact: weworkfortheo@gmail.com
Website: https://kylersimzer.com

## Credits
Built with:
- three.js (r128)
- JPL approximate Keplerian elements & JPL Horizons
- SILSO sunspot data (Royal Observatory of Belgium)
- NASA DONKI
- Meeus, *Astronomical Algorithms* (lunations & eclipses)
