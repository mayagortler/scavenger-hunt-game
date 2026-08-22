# Design Spec: Map Scavenger-Hunt Game

Date: 2026-08-22
Source material: `תיאור המשחק.docx` (converted to `docs/superpowers/specs/source/game-description.txt`), 17 images.
Event: this week. Single shared screen (laptop + mouse), internet available at venue.

## 1. Overview

A single-screen, browser-based "virtual escape room" for one group playing together on one laptop (mouse-driven, no touch, no multiplayer sync needed). The group solves a sequence of puzzles, each introduced by a character via an animated speech bubble, and navigates between puzzles using a real interactive map (Leaflet + OpenStreetMap). "Arriving" at a station is simulated by panning/zooming the map close enough to the target coordinates — there is no real GPS; this is a screen-based stand-in for a physical location-based hunt.

Progress auto-saves to `localStorage` so an accidental page refresh mid-event doesn't lose progress.

## 2. Tech stack

- Plain HTML/CSS/JavaScript, no framework, no build step. Fast to build and debug under time pressure; runs by opening `index.html` via a simple local static server (e.g. `npx serve` or `python3 -m http.server`) in Chrome, full screen.
- Map: [Leaflet.js](https://leafletjs.com/) via CDN + OpenStreetMap tiles (free, no API key). Requires internet for tile loading — confirmed available.
- No backend, no database. All state lives in memory + `localStorage`.

### File structure

```
index.html
css/style.css
js/state.js          — game state, stage tracking, localStorage persistence
js/map.js            — Leaflet setup, station marker visibility logic, map open/close
js/speechBubble.js    — reusable character + typing-animation dialogue component
js/main.js            — screen orchestration (map ⟷ puzzle screens)
js/puzzles/puzzle1-jigsaw.js
js/puzzles/puzzle2-crossword.js
js/puzzles/puzzle3-bins.js
js/puzzles/puzzle4-videos.js
js/puzzles/puzzle5-riddle.js
js/puzzles/puzzle6-letters.js
assets/images/...      — already populated (see §7)
```

## 3. Screen flow

1. Game opens directly on the map, centered on station 1's coordinates at a moderate zoom (station 1's marker is visible immediately, no searching needed).
2. Clicking a visible station marker opens that puzzle's screen.
3. Every puzzle screen has a button (bottom-left) that reopens the map without losing puzzle progress.
4. The map has its own close/back button that returns to the last-opened puzzle screen (not always the map's "home" view), preserving whatever progress was made.
5. Solving a puzzle triggers the next character's speech bubble (map navigation is required in between, per §4).
6. After the 4 final letters are collected (puzzle 6), all UI disappears except the letters (in discovery order) and a "סיום" (Finish) button that ends the game.

## 4. Station data & the "arrival" mechanic

| # | Character | Coordinates | Radius | Notes |
|---|-----------|-------------|--------|-------|
| 1 | חורחה (Jorge) | 32.14974712062328, 34.89164933523124 | 100 m | visible on game start |
| 2 | אבי בועז (Avi Boaz) | 31.926061323592833, 35.22289356997514 | 350 m | |
| 3 | עוזי הדרוזי (Uzi Hadrozi) | 32.00031663361575, 34.87093250502946 | 2.5 km | |
| 4 | אורי טביבי (Uri Tabibi) | 31.813041345952158, 34.66766424552365 | 200 m | |
| 5 | קרטוניב (Kartoniv) | 39.72142461289615, 21.63073125802075 | 2.5 km | Greece — intentional, search-only, no puzzle answer required at this pin (see §5.5) |
| 6a | אות א (Letter 1) | 32.146385520181546, 34.885977985309474 | 250 m | reveals "נ" |
| 6b | אות ב (Letter 2) | 32.0561318365665, 34.85744273105274 | 250 m | reveals "ו" |
| 6c | אות ג (Letter 3) | 31.93541015911403, 34.800815178235894 | 250 m | reveals "ע" |
| 6d | אות ד (Letter 4) | 32.095418630314704, 34.868441921167744 | 250 m | reveals "מ" |

**Marker visibility rule:** a station's marker is drawn and clickable only when both hold:
- distance between the current map center and the station's coordinates ≤ its radius, **and**
- current zoom level ≥ a minimum zoom derived from that radius (so the group can't just zoom out to the whole country and trivially satisfy the radius check).

Zoom-floor mapping (radius → min zoom), tuned for Leaflet's standard zoom levels:

| Radius | Min zoom |
|---|---|
| ≤150 m | 17 |
| ≤400 m | 16 |
| ≤2.5 km | 13 |

This is computed by a small helper (`radiusToMinZoom(radiusMeters)`) rather than hardcoded per station.

Stations 6a–6d are all active simultaneously once puzzle 5 is solved (the group can reach them in any order); the discovery order is what's recorded for the final letter sequence.

## 5. Puzzle mechanics

All puzzle intros use the shared speech-bubble component: character image + name, text typed out character-by-character (same animation everywhere), with a button under the bubble to advance/dismiss dialogue. Exact dialogue text is preserved verbatim from the source doc (see `docs/superpowers/specs/source/game-description.txt`).

### 5.1 Puzzle 1 — Jorge (jigsaw)
- Speech bubble sequence: intro line → "ואמוס" button clears text, shows the "two things before we start" text → button becomes "סי סניור" → opens the puzzle.
- 25-piece jigsaw (client-side drag/drop) assembling `assets/images/puzzle1-jigsaw-target.jpeg`, inside a frame.
- Three labeled text inputs (not gated on finishing the jigsaw): correct answers `Berlin`, `Germany`, `Beer` (case-insensitive match). All three correct → Jorge's closing line appears, puzzle marked solved.

### 5.2 Puzzle 2 — Avi Boaz (crossword)
- Speech bubble → arrow button reveals the crossword grid (structure transcribed from the doc's table into a grid definition — see source file for the raw layout).
- One letter per cell. Clicking a clue number (1–8) shows that clue's question (with image, where the doc includes one) to the left of the grid.
- Grid cells turn green only once the entire crossword is filled correctly (final answer: גרמניה).
- Clue images: `puzzle2-clue-2.jpeg` (who sent the release message), `puzzle2-clue-3.jpeg` (who is this about), `puzzle2-clue-6.jpeg` (hidden word), `puzzle2-clue-7.jpeg` (hidden word), `puzzle2-clue-8.jpeg` (who left the group).

### 5.3 Puzzle 3 — Uzi Hadrozi (bins)
- Speech bubble → arrow button reveals 11 clickable "bins" (`puzzle3-bin-icon.png`) overlaid on `puzzle3-terminal3-bg.jpeg`, numbered 0–9 plus one marked "/". Exact on-screen bin positions are a free layout choice (not specified in source doc) — will lay them out clearly and clickably across the background image.
- Each bin click appends its mapped letter to a text box (right-to-left), per the doc's mapping table (0→י, 1→א, 2→ב, 3→ק, 4→מ, 5→ח, 6→space, 7→ז, 8→ו, 9→ש, "/"→ר on first click, ט on second click).
- A clear/reset button empties the text box and resets the "/" bin's click-count back to first-click state.
- Target text: `אורי טביבי`. Box turns green on exact match.

### 5.4 Puzzle 4 — Uri Tabibi (video ordering + QR reveal)
- Speech bubble → arrow button reveals 6 draggable cards and a 2×3 target grid (cells numbered 1–6). A "flip all" button flips every card between front and back.
- Card fronts: content decision (confirmed with user) — auto-fetch YouTube thumbnails (`img.youtube.com/vi/<id>/hqdefault.jpg`, no API key needed) for the 4 YouTube-hosted links; generic numbered placeholder cards for the 2 TikTok links.
- Card backs: `puzzle4-qr-code.png` cropped into a 6-piece (2×3) grid at build time, one piece per card, matching each card's correct grid position.
- Clicking a card outside of a drag opens its video in a new tab/lightbox.
- Correct chronological order (source order, top-to-bottom):
  1. https://share.google/nGTqH8IsAVXb0NTNg
  2. https://youtube.com/shorts/qpmFnUTkpL0?si=f15IZDMVppvTMd3j
  3. https://youtu.be/fWKB8zdVM-U?si=0T-qg7zOKwTDMK7H
  4. https://youtu.be/9sh2SwfuO44?si=l0Dx3XoRrD5fVpBt
  5. https://vt.tiktok.com/ZSVfQhqqe/
  6. https://vt.tiktok.com/ZSVUp7Gb8/
- Grid frame turns green once all 6 cards are correctly placed AND flipped to reveal the assembled QR code.

### 5.5 Puzzle 5 — Kartoniv (riddle, no digital input)
- Speech bubble → arrow button shows 3 images side by side, right-to-left: `puzzle5-riddle-1.png`, `puzzle5-riddle-2.png`, `puzzle5-riddle-3.png`.
- Solved verbally by the group — no answer is entered into the app. Solving it is the cue to open the map, where all 4 of stations 6a–6d become the next target (Greece pin from station 5 is search-only and requires no further action once found).

### 5.6 Puzzle 6 — Final letters
- Each of the 4 final stations, once reached, opens a small box showing a single letter (נ / ו / ע / מ per §4).
- Once all 4 are collected, all game UI is removed except the 4 letters shown in the order they were discovered, and a "סיום" button. Clicking it ends the game (no further logic required — the real-world payoff, e.g. a physical lock combination, happens outside the app).

## 6. Content decisions confirmed with user

- Deployment: runs locally on the event laptop via a simple static server; internet is available for map tiles and embedded videos, so no offline fallback is needed.
- Puzzle 4 card fronts: auto YouTube thumbnails + generic numbered cards for non-YouTube links (see §5.4).
- The Greece coordinate in puzzle 5's handoff is intentional — search-only, no physical/real arrival implied.

## 7. Assets

All 17 images extracted from the source docx and copied into `assets/images/` with descriptive names:

- Characters: `char-jorge.png`, `char-avi-boaz.png`, `char-uzi-hadrozi.png`, `char-uri-tabibi.jpeg`, `char-kartoniv.jpeg`
- Puzzle 1: `puzzle1-jigsaw-target.jpeg`
- Puzzle 2: `puzzle2-clue-2.jpeg`, `puzzle2-clue-3.jpeg`, `puzzle2-clue-6.jpeg`, `puzzle2-clue-7.jpeg`, `puzzle2-clue-8.jpeg`
- Puzzle 3: `puzzle3-bin-icon.png`, `puzzle3-terminal3-bg.jpeg`
- Puzzle 4: `puzzle4-qr-code.png` (to be cropped into 6 pieces during implementation)
- Puzzle 5: `puzzle5-riddle-1.png`, `puzzle5-riddle-2.png`, `puzzle5-riddle-3.png`

Full verbatim source text (dialogue, clue definitions, crossword layout) is preserved in `docs/superpowers/specs/source/game-description.txt` for implementation reference, since much of the copy is long-form Hebrew dialogue not worth duplicating here.

## 8. Testing approach

Since real GPS isn't involved, testing the "arrival" mechanic is just normal browser testing — pan/zoom the map in dev and confirm markers appear/disappear at the right thresholds. No physical travel or device-specific GPS simulation needed.
