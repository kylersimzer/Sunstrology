# Sunstrology brand: final files

The mark is **01 "Earth on the ring"**, locked 2026-11-04: the Sun in the middle and you as the one dot going round it. It is drawn on a 24 × 24 grid. Everything in this folder is built from code: `design/brand.mjs` draws it and `design/build-brand.mjs` renders it.

```bash
node design/build-brand.mjs              # everything (needs Chrome or Edge, ffmpeg, and internet for Geist)
node design/build-brand.mjs --no-loops   # stills only, a few seconds
```

The banners show the real sky on 4 November 2026, the day v2 was made: the even-spaced orbits, that day's aspect lines, and Earth's station lit on the ring.

## logo/

| File | Use |
|---|---|
| `sunstrology-mark-{white,ink,black}.svg` | The mark, transparent. White is the default; ink is the interface's `#ECEBE6`. |
| `sunstrology-mark-current.svg` | Drawn in `currentColor`, follows light and dark mode. |
| `sunstrology-mark-white-1024.png`, `-black-1024.png` | Transparent PNGs for press, avatars, anywhere SVG isn't accepted. |
| `sunstrology-mark-white-on-black-1024.png` | Square on black. |
| `sunstrology-lockup-{white,ink,black}.svg` / `-2x.png` | Mark + SUNSTROLOGY (Geist SemiBold, 8% tracking). Prefer the PNGs: the SVG text needs Geist installed. |

## icons/

`favicon.svg`, `favicon-16/32.png`, `apple-touch-icon.png` (180), `icon-192/512.png`, `icon-512-maskable.png`, `x-profile-400x400.png`. The site's copies are in `web/assets`.

## banners/

| File | Use |
|---|---|
| `sunstrology-banner-readme-1600x480` | README header |
| `sunstrology-banner-x-1500x500` | X header |
| `sunstrology-banner-github-1280x640` | GitHub repo social preview (Settings → Social preview) |
| `sunstrology-link-preview-1200x630` | The image chats and X show for a sunstrology.com link (`og:image`, copied to `web/assets/link-preview.png`) |

Each comes as PNG and SVG.

## loops/

| File | What |
|---|---|
| `sunstrology-loop-orbit` (.mp4, .gif) | 4 s. The mark, with Earth going round once. Avatars, a splash, the end card of a video. |
| `sunstrology-loop-eight-years` (.mp4, .gif) | 16 s. Mercury, Venus, Earth and Mars from the Sun's chair. A line joins Venus and Earth every twelve days, and over eight years (13 Venus orbits to Earth's 8) the lines draw the five-petalled figure the two planets make together. Venus and Earth keep their true rhythm; Mercury and Mars are rounded to whole turns so the loop closes. |
| `sunstrology-loop-stations` (.mp4, .gif) | 12 s. One year: Earth crosses the twelve stations, each lighting as Earth passes through it, with its name in the middle. |
| `sunstrology-mark-orbit.svg`, `-current.svg` | The orbit as an animated SVG (no video needed). The site uses it as the Telescope's loading indicator. |

The MP4s are 1080 × 1080, 30 fps; the GIFs are 540 px for READMEs and chats.

## Rules

- Sun at the centre, Earth at 50° (upper right). Don't rotate, mirror or move Earth, except in the orbit loop.
- One ink. White on black is the default; black on paper (`#F2F1EC`) for light backgrounds.
- The gap round Earth is a mask, not a painted halo, so the mark works on any background.
- Clear space: at least Earth's diameter on every side. Smallest size: 16 px.
