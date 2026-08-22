# Map Scavenger-Hunt Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-screen, browser-based scavenger-hunt game where a group solves 6 puzzles (introduced by animated character speech bubbles) and navigates between them using a real interactive map, where "arrival" is simulated by panning/zooming close enough to target coordinates.

**Architecture:** Plain HTML/CSS/JavaScript (ES modules), no framework, no build step. Game logic (state, geo/visibility math, puzzle-solved checks) lives in pure, dependency-free modules that are unit-tested with Node's built-in test runner. DOM wiring (rendering, drag/drop, Leaflet map, event listeners) is a thin layer on top of those modules, verified by manual browser testing. All state persists to `localStorage` so a page refresh mid-event doesn't lose progress.

**Tech Stack:** Vanilla JS (ES modules), Leaflet.js + OpenStreetMap tiles (via CDN, no API key), Node 18+ built-in test runner (`node --test`), no npm dependencies.

**Spec:** [docs/superpowers/specs/2026-08-22-scavenger-hunt-game-design.md](../specs/2026-08-22-scavenger-hunt-game-design.md) — read this first; it has the full game flow, station table, and per-puzzle mechanics. Verbatim source dialogue/clue text is in [docs/superpowers/specs/source/game-description.txt](../specs/source/game-description.txt).

## Global Constraints

- No framework, no bundler, no build step — the shipped app is static files opened via a local static server.
- No npm dependencies — Leaflet is loaded via CDN `<script>`/`<link>` tags in `index.html`, not npm-installed.
- All pure game logic must be framework-free JS (no DOM globals) so it can run under `node --test` without a browser.
- All Hebrew UI text must render right-to-left (`dir="rtl"`).
- Progress must survive a page refresh (persisted via `localStorage`, wrapped so it's testable with a fake storage object).
- Existing image assets are already in place at `assets/images/` (see spec §7) — reference them by those exact filenames, do not re-derive or rename them.
- Run `node --test` after every task that adds a `.test.js` file, and it must pass before committing.

---

## File Structure

```
index.html                        — screen shell (map + 5 puzzle screens + final screen), Leaflet CDN tags
css/style.css                     — global styles: RTL, screen show/hide, speech bubble, shared puzzle styles
package.json                      — {"type": "module"} only, no dependencies

js/state.js                       — pure: game state shape, localStorage read/write, puzzle-solved + letter-discovery tracking
js/state.test.js

js/geo.js                         — pure: haversine distance, radius→min-zoom, station visibility check
js/stations.js                    — pure data: the 9 stations (5 puzzle stations + 4 letter stations) + initial map view
js/geo.test.js

js/map.js                         — Leaflet map wiring: renders markers per geo.js visibility rules, station click → callback, letter-station popup

js/typewriter.js                  — pure: character-by-character reveal timing math
js/typewriter.test.js
js/speechBubble.js                — DOM: renders a character + animated speech bubble using typewriter.js

js/puzzles/puzzle1-jigsaw.js      — pure logic (jigsaw completeness, answer checking) + DOM rendering/drag-drop
js/puzzles/puzzle1-jigsaw.test.js
js/puzzles/puzzle2-crossword.js   — pure logic (grid data, solved check) + DOM rendering
js/puzzles/puzzle2-crossword.test.js
js/puzzles/puzzle3-bins.js        — pure logic (bin→letter mapping, accumulation) + DOM rendering
js/puzzles/puzzle3-bins.test.js
js/puzzles/puzzle4-videos.js      — pure logic (order check, YouTube id/thumbnail extraction) + DOM drag-drop
js/puzzles/puzzle4-videos.test.js
js/puzzles/puzzle5-riddle.js      — DOM: renders 3 riddle images, no solved-check (verbal answer)
js/puzzles/puzzle6-letters.js     — pure logic (final-station completeness) + DOM final screen rendering
js/puzzles/puzzle6-letters.test.js

js/main.js                        — orchestrates screens: wires state + map + all puzzle modules together
```

Each pure module (`state.js`, `geo.js`, `stations.js`, `typewriter.js`, and the logic half of each `puzzle*.js`) has zero references to `window`/`document` so it is directly testable under Node. DOM-touching code in the same puzzle files is exported as a separate `initX(container, callbacks)` function that the pure functions don't depend on.

---

### Task 1: Project scaffold + state module

**Files:**
- Create: `package.json`
- Create: `index.html` (skeleton only: `<head>` with Leaflet CDN tags, empty screen containers, `<script type="module" src="js/main.js">`)
- Create: `css/style.css` (base RTL + screen show/hide rules only)
- Create: `js/state.js`
- Create: `js/state.test.js`

**Interfaces:**
- Produces: `createInitialState()`, `loadState(storage)`, `saveState(state, storage)`, `markPuzzleSolved(state, puzzleId)`, `isPuzzleSolved(state, puzzleId)`, `setLastOpenScreen(state, screenId)`, `recordLetterDiscovery(state, stationId, letter)`, `getFinalLetters(state)`, `setLastMapView(state, view)` — all pure, all return new state objects (never mutate the input).

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "scavenger-hunt-game",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 2: Write the failing test for state.js**

```js
// js/state.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  loadState,
  saveState,
  markPuzzleSolved,
  isPuzzleSolved,
  setLastOpenScreen,
  recordLetterDiscovery,
  getFinalLetters,
  setLastMapView,
} from './state.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = value; },
  };
}

test('createInitialState has the expected shape', () => {
  const state = createInitialState();
  assert.deepEqual(state.solvedPuzzles, {});
  assert.equal(state.lastOpenScreen, 'map');
  assert.deepEqual(state.letterDiscoveries, []);
  assert.equal(state.lastMapView, null);
});

test('markPuzzleSolved / isPuzzleSolved round-trip without mutating input', () => {
  const state = createInitialState();
  const next = markPuzzleSolved(state, 'puzzle1');
  assert.equal(isPuzzleSolved(state, 'puzzle1'), false);
  assert.equal(isPuzzleSolved(next, 'puzzle1'), true);
});

test('setLastOpenScreen updates the screen id', () => {
  const state = createInitialState();
  const next = setLastOpenScreen(state, 'puzzle2');
  assert.equal(next.lastOpenScreen, 'puzzle2');
});

test('recordLetterDiscovery appends in order and is idempotent per station', () => {
  let state = createInitialState();
  state = recordLetterDiscovery(state, 'station6c', 'ע');
  state = recordLetterDiscovery(state, 'station6a', 'נ');
  state = recordLetterDiscovery(state, 'station6c', 'ע'); // duplicate, ignored
  assert.deepEqual(state.letterDiscoveries, [
    { stationId: 'station6c', letter: 'ע' },
    { stationId: 'station6a', letter: 'נ' },
  ]);
  assert.equal(getFinalLetters(state), 'ענ');
});

test('setLastMapView stores the view', () => {
  const state = createInitialState();
  const view = { center: { lat: 1, lng: 2 }, zoom: 15 };
  const next = setLastMapView(state, view);
  assert.deepEqual(next.lastMapView, view);
});

test('saveState / loadState round-trip through a storage object', () => {
  const storage = fakeStorage();
  let state = createInitialState();
  state = markPuzzleSolved(state, 'puzzle1');
  saveState(state, storage);
  const loaded = loadState(storage);
  assert.equal(isPuzzleSolved(loaded, 'puzzle1'), true);
});

test('loadState returns a fresh initial state when storage is empty', () => {
  const storage = fakeStorage();
  const loaded = loadState(storage);
  assert.deepEqual(loaded, createInitialState());
});

test('loadState falls back to initial state on corrupt JSON', () => {
  const storage = fakeStorage({ 'scavenger-hunt-state-v1': 'not json' });
  const loaded = loadState(storage);
  assert.deepEqual(loaded, createInitialState());
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node --test js/state.test.js`
Expected: FAIL — `state.js` does not exist yet.

- [ ] **Step 4: Implement `js/state.js`**

```js
// js/state.js
const STORAGE_KEY = 'scavenger-hunt-state-v1';

export function createInitialState() {
  return {
    solvedPuzzles: {},
    lastOpenScreen: 'map',
    letterDiscoveries: [],
    lastMapView: null,
  };
}

export function loadState(storage) {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createInitialState();
  try {
    const parsed = JSON.parse(raw);
    return { ...createInitialState(), ...parsed };
  } catch {
    return createInitialState();
  }
}

export function saveState(state, storage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function markPuzzleSolved(state, puzzleId) {
  return { ...state, solvedPuzzles: { ...state.solvedPuzzles, [puzzleId]: true } };
}

export function isPuzzleSolved(state, puzzleId) {
  return Boolean(state.solvedPuzzles[puzzleId]);
}

export function setLastOpenScreen(state, screenId) {
  return { ...state, lastOpenScreen: screenId };
}

export function recordLetterDiscovery(state, stationId, letter) {
  if (state.letterDiscoveries.some((d) => d.stationId === stationId)) return state;
  return { ...state, letterDiscoveries: [...state.letterDiscoveries, { stationId, letter }] };
}

export function getFinalLetters(state) {
  return state.letterDiscoveries.map((d) => d.letter).join('');
}

export function setLastMapView(state, view) {
  return { ...state, lastMapView: view };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test js/state.test.js`
Expected: PASS, all 8 tests green.

- [ ] **Step 6: Write the HTML/CSS skeleton**

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>המשחק</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="css/style.css" />
</head>
<body>
  <div id="screen-map" class="screen"></div>
  <div id="screen-puzzle1" class="screen" hidden></div>
  <div id="screen-puzzle2" class="screen" hidden></div>
  <div id="screen-puzzle3" class="screen" hidden></div>
  <div id="screen-puzzle4" class="screen" hidden></div>
  <div id="screen-puzzle5" class="screen" hidden></div>
  <div id="screen-final" class="screen" hidden></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

```css
/* css/style.css */
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; direction: rtl; }

.screen {
  width: 100vw;
  height: 100vh;
  position: relative;
}
.screen[hidden] { display: none; }

.map-open-button, .map-close-button {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 1000;
  padding: 10px 18px;
  font-size: 16px;
  border-radius: 8px;
  border: none;
  background: #222;
  color: #fff;
  cursor: pointer;
}

.speech-bubble {
  max-width: 600px;
  margin: 24px auto;
  padding: 20px;
  border-radius: 16px;
  background: #fff8e1;
  border: 2px solid #d8b34a;
  font-size: 20px;
  white-space: pre-line;
}
.speech-character {
  display: block;
  width: 140px;
  height: 140px;
  object-fit: cover;
  border-radius: 50%;
  margin: 12px auto;
}
.speech-advance-button {
  display: block;
  margin: 16px auto 0;
  padding: 10px 24px;
  font-size: 18px;
  border-radius: 8px;
  border: none;
  background: #d8b34a;
  color: #222;
  cursor: pointer;
}
```

- [ ] **Step 7: Commit**

```bash
git add package.json index.html css/style.css js/state.js js/state.test.js
git commit -m "Add project scaffold and pure game-state module"
```

---

### Task 2: Geo module + stations data

**Files:**
- Create: `js/geo.js`
- Create: `js/geo.test.js`
- Create: `js/stations.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `distanceMeters(lat1, lng1, lat2, lng2)`, `radiusToMinZoom(radiusMeters)`, `isStationVisible(mapView, station)` where `mapView = { center: { lat, lng }, zoom }` and `station` has `{ lat, lng, radiusMeters }`. `STATIONS` array (each item: `{ id, characterId?, lat, lng, radiusMeters, puzzleId?, letter? }` — puzzle stations have `characterId` + `puzzleId`, letter stations have `letter`, no `characterId`/`puzzleId`). `INITIAL_MAP_VIEW`.

- [ ] **Step 1: Write the failing test**

```js
// js/geo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, radiusToMinZoom, isStationVisible } from './geo.js';

test('distanceMeters is 0 for identical points', () => {
  assert.equal(distanceMeters(32.1, 34.9, 32.1, 34.9), 0);
});

test('distanceMeters is roughly correct for a known offset', () => {
  // ~0.001 degrees latitude is ~111 meters
  const d = distanceMeters(32.0, 34.0, 32.001, 34.0);
  assert.ok(d > 100 && d < 120, `expected ~111m, got ${d}`);
});

test('radiusToMinZoom tiers match the spec table', () => {
  assert.equal(radiusToMinZoom(100), 17);
  assert.equal(radiusToMinZoom(150), 17);
  assert.equal(radiusToMinZoom(200), 16);
  assert.equal(radiusToMinZoom(350), 16);
  assert.equal(radiusToMinZoom(400), 16);
  assert.equal(radiusToMinZoom(2500), 13);
});

test('isStationVisible requires both proximity and zoom', () => {
  const station = { lat: 32.0, lng: 34.0, radiusMeters: 100 };
  assert.equal(
    isStationVisible({ center: { lat: 32.0, lng: 34.0 }, zoom: 17 }, station),
    true
  );
  assert.equal(
    isStationVisible({ center: { lat: 32.0, lng: 34.0 }, zoom: 15 }, station),
    false,
    'close enough but not zoomed in enough'
  );
  assert.equal(
    isStationVisible({ center: { lat: 33.0, lng: 34.0 }, zoom: 17 }, station),
    false,
    'zoomed in enough but too far away'
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/geo.test.js`
Expected: FAIL — `geo.js` does not exist.

- [ ] **Step 3: Implement `js/geo.js`**

```js
// js/geo.js
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function radiusToMinZoom(radiusMeters) {
  if (radiusMeters <= 150) return 17;
  if (radiusMeters <= 400) return 16;
  return 13;
}

export function isStationVisible(mapView, station) {
  const distance = distanceMeters(
    mapView.center.lat,
    mapView.center.lng,
    station.lat,
    station.lng
  );
  return distance <= station.radiusMeters && mapView.zoom >= radiusToMinZoom(station.radiusMeters);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/geo.test.js`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Write `js/stations.js`** (pure data, transcribed verbatim from the spec's station table — no test needed, it's static data)

```js
// js/stations.js
export const STATIONS = [
  { id: 'station1', characterId: 'jorge', lat: 32.14974712062328, lng: 34.89164933523124, radiusMeters: 100, puzzleId: 'puzzle1' },
  { id: 'station2', characterId: 'avi-boaz', lat: 31.926061323592833, lng: 35.22289356997514, radiusMeters: 350, puzzleId: 'puzzle2' },
  { id: 'station3', characterId: 'uzi-hadrozi', lat: 32.00031663361575, lng: 34.87093250502946, radiusMeters: 2500, puzzleId: 'puzzle3' },
  { id: 'station4', characterId: 'uri-tabibi', lat: 31.813041345952158, lng: 34.66766424552365, radiusMeters: 200, puzzleId: 'puzzle4' },
  { id: 'station5', characterId: 'kartoniv', lat: 39.72142461289615, lng: 21.63073125802075, radiusMeters: 2500, puzzleId: 'puzzle5' },
  { id: 'station6a', lat: 32.146385520181546, lng: 34.885977985309474, radiusMeters: 250, letter: 'נ' },
  { id: 'station6b', lat: 32.0561318365665, lng: 34.85744273105274, radiusMeters: 250, letter: 'ו' },
  { id: 'station6c', lat: 31.93541015911403, lng: 34.800815178235894, radiusMeters: 250, letter: 'ע' },
  { id: 'station6d', lat: 32.095418630314704, lng: 34.868441921167744, radiusMeters: 250, letter: 'מ' },
];

export const FINAL_STATION_IDS = ['station6a', 'station6b', 'station6c', 'station6d'];

export const INITIAL_MAP_VIEW = {
  center: { lat: 32.14974712062328, lng: 34.89164933523124 },
  zoom: 17,
};
```

- [ ] **Step 6: Commit**

```bash
git add js/geo.js js/geo.test.js js/stations.js
git commit -m "Add geo distance/visibility math and station data"
```

---

### Task 3: Map screen (Leaflet)

**Files:**
- Create: `js/map.js`
- Modify: `css/style.css` (append map-specific styles)

**Interfaces:**
- Consumes: `STATIONS`, `FINAL_STATION_IDS`, `INITIAL_MAP_VIEW` from `js/stations.js`; `isStationVisible` from `js/geo.js`.
- Produces: `initMap(container, { initialView, onPuzzleStationClick, onLetterStationClick, onViewChange, getSolvedPuzzleIds, getDiscoveredStationIds })` — mounts a Leaflet map into `container` (a DOM element), returns `{ setView(view), invalidateSize(), destroy() }`. Calls `onPuzzleStationClick(station)` when a visible puzzle-station marker is clicked, `onLetterStationClick(station)` when a visible letter-station marker is clicked, and `onViewChange({ center, zoom })` on every `moveend`/`zoomend` (so the caller can persist `lastMapView`). `getSolvedPuzzleIds()`/`getDiscoveredStationIds()` are called fresh on every marker refresh (not just once at init) so a marker recolors to "solved" style the next time the map is shown after that puzzle/station is completed elsewhere in the app — passing static arrays instead of live getters would freeze markers at their init-time color. `invalidateSize()` must be called by the caller after un-hiding the map's container (Leaflet caches size and renders blank/offset tiles otherwise).

- [ ] **Step 1: Implement `js/map.js`**

No unit test for this task — it's pure Leaflet/DOM wiring (Leaflet itself has no meaningful headless test story here); verify manually per Step 2.

```js
// js/map.js
import { STATIONS, INITIAL_MAP_VIEW } from './stations.js';
import { isStationVisible } from './geo.js';

export function initMap(container, {
  initialView = INITIAL_MAP_VIEW,
  onPuzzleStationClick,
  onLetterStationClick,
  onViewChange,
  getSolvedPuzzleIds = () => [],
  getDiscoveredStationIds = () => [],
} = {}) {
  const map = L.map(container).setView([initialView.center.lat, initialView.center.lng], initialView.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const markers = new Map();

  function currentView() {
    const center = map.getCenter();
    return { center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() };
  }

  function isStationSolved(station) {
    return station.puzzleId
      ? getSolvedPuzzleIds().includes(station.puzzleId)
      : getDiscoveredStationIds().includes(station.id);
  }

  function refreshMarkers() {
    const view = currentView();
    for (const station of STATIONS) {
      const visible = isStationVisible(view, station);
      const existing = markers.get(station.id);

      if (!visible) {
        if (existing) {
          map.removeLayer(existing);
          markers.delete(station.id);
        }
        continue;
      }

      const fillColor = isStationSolved(station) ? '#4caf50' : '#d8b34a';

      if (existing) {
        // Re-color in case it was solved/discovered since it was first drawn.
        existing.setStyle({ fillColor });
        continue;
      }

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 12,
        color: '#222',
        fillColor,
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map);

      marker.on('click', () => {
        if (station.puzzleId) {
          onPuzzleStationClick?.(station);
        } else {
          onLetterStationClick?.(station);
        }
      });

      markers.set(station.id, marker);
    }
  }

  map.on('moveend zoomend', () => {
    refreshMarkers();
    onViewChange?.(currentView());
  });

  refreshMarkers();

  return {
    setView(view) {
      map.setView([view.center.lat, view.center.lng], view.zoom);
      refreshMarkers();
    },
    invalidateSize() {
      // Leaflet caches container size; call this after un-hiding the map's
      // screen div (display:none -> block) or tiles render blank/offset.
      map.invalidateSize();
    },
    destroy() {
      map.remove();
    },
  };
}
```

```css
/* append to css/style.css */
#screen-map { padding: 0; }
#screen-map .leaflet-container { width: 100%; height: 100%; }
```

- [ ] **Step 2: Manual verification**

Serve the site (`python3 -m http.server 8080` from the project root) and open `http://localhost:8080` in Chrome. Confirm: the map loads centered on station 1 at zoom 17, and station 1's marker is immediately visible. Temporarily call `initMap` from the browser console with a test container to confirm markers appear/disappear as you pan/zoom toward and away from a station's coordinates (full wiring into `main.js` happens in Task 11, so this is a standalone smoke check for now).

- [ ] **Step 3: Commit**

```bash
git add js/map.js css/style.css
git commit -m "Add Leaflet map with radius/zoom-gated station markers"
```

---

### Task 4: Typewriter timing + speech bubble component

**Files:**
- Create: `js/typewriter.js`
- Create: `js/typewriter.test.js`
- Create: `js/speechBubble.js`

**Interfaces:**
- Produces: `visibleText(fullText, elapsedMs, charsPerSecond = 30)`, `isTypingComplete(fullText, elapsedMs, charsPerSecond = 30)` (pure). `renderSpeechBubble(container, { characterImage, characterName, text, buttonLabel, onAdvance })` — DOM: renders character image + name + a `<p>` that fills in via `visibleText` on a `requestAnimationFrame` loop, plus a button; clicking the button (only enabled once typing is complete) calls `onAdvance()`. Returns `{ destroy() }` to clear the animation frame loop and remove the DOM.

- [ ] **Step 1: Write the failing test**

```js
// js/typewriter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleText, isTypingComplete } from './typewriter.js';

test('visibleText reveals characters proportional to elapsed time', () => {
  const text = 'הולה מוצאצוס';
  assert.equal(visibleText(text, 0, 30), '');
  assert.equal(visibleText(text, 100, 30), text.slice(0, 3)); // 30 chars/sec * 0.1s = 3
});

test('visibleText never exceeds the full text length', () => {
  const text = 'שלום';
  assert.equal(visibleText(text, 100000, 30), text);
});

test('isTypingComplete is false until enough time has passed, then true', () => {
  const text = 'אבגדה'; // 5 chars
  assert.equal(isTypingComplete(text, 50, 30), false); // 30*0.05=1.5 chars shown
  assert.equal(isTypingComplete(text, 1000, 30), true); // 30 chars shown >= 5
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/typewriter.test.js`
Expected: FAIL — `typewriter.js` does not exist.

- [ ] **Step 3: Implement `js/typewriter.js`**

```js
// js/typewriter.js
export function visibleCharCount(elapsedMs, charsPerSecond) {
  return Math.floor((elapsedMs / 1000) * charsPerSecond);
}

export function visibleText(fullText, elapsedMs, charsPerSecond = 30) {
  const count = visibleCharCount(elapsedMs, charsPerSecond);
  return fullText.slice(0, Math.min(count, fullText.length));
}

export function isTypingComplete(fullText, elapsedMs, charsPerSecond = 30) {
  return visibleCharCount(elapsedMs, charsPerSecond) >= fullText.length;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/typewriter.test.js`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Implement `js/speechBubble.js`**

```js
// js/speechBubble.js
import { visibleText, isTypingComplete } from './typewriter.js';

export function renderSpeechBubble(container, { characterImage, characterName, text, buttonLabel, onAdvance }) {
  container.innerHTML = '';

  const img = document.createElement('img');
  img.src = characterImage;
  img.alt = characterName;
  img.className = 'speech-character';

  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  const paragraph = document.createElement('p');
  bubble.appendChild(paragraph);

  const button = document.createElement('button');
  button.className = 'speech-advance-button';
  button.textContent = buttonLabel;
  button.disabled = true;

  container.appendChild(img);
  container.appendChild(bubble);
  container.appendChild(button);

  const start = performance.now();
  let frameId;

  function tick(now) {
    const elapsed = now - start;
    paragraph.textContent = visibleText(text, elapsed);
    if (isTypingComplete(text, elapsed)) {
      button.disabled = false;
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }
  frameId = requestAnimationFrame(tick);

  button.addEventListener('click', () => {
    if (!button.disabled) onAdvance?.();
  });

  return {
    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      container.innerHTML = '';
    },
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add js/typewriter.js js/typewriter.test.js js/speechBubble.js
git commit -m "Add typewriter timing logic and reusable speech bubble component"
```

---

### Task 5: Puzzle 1 — Jorge (jigsaw + answers)

**Files:**
- Create: `js/puzzles/puzzle1-jigsaw.js`
- Create: `js/puzzles/puzzle1-jigsaw.test.js`

**Interfaces:**
- Consumes: `renderSpeechBubble` from `../speechBubble.js`.
- Produces: `checkTextAnswers({ first, second, third })` → boolean (case-insensitive, trimmed). `createJigsawPieces(size = 25)` → `[{ id, correctSlot, currentSlot }]`. `placePiece(pieces, pieceId, slot)` → new pieces array. `isJigsawComplete(pieces)` → boolean. `initPuzzle1(container, { onSolved })` — DOM: renders Jorge's two-step intro dialogue then the jigsaw + 3 text inputs; calls `onSolved()` once `checkTextAnswers` passes (jigsaw completion is not required to solve, per spec §5.1).

- [ ] **Step 1: Write the failing test**

```js
// js/puzzles/puzzle1-jigsaw.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTextAnswers, createJigsawPieces, placePiece, isJigsawComplete } from './puzzle1-jigsaw.js';

test('checkTextAnswers accepts correct answers case-insensitively with whitespace trimmed', () => {
  assert.equal(checkTextAnswers({ first: ' Berlin ', second: 'GERMANY', third: 'beer' }), true);
});

test('checkTextAnswers rejects wrong or missing answers', () => {
  assert.equal(checkTextAnswers({ first: 'Berlin', second: 'Germany', third: 'Wine' }), false);
  assert.equal(checkTextAnswers({ first: 'Berlin', second: '', third: 'Beer' }), false);
});

test('createJigsawPieces makes N unplaced pieces', () => {
  const pieces = createJigsawPieces(25);
  assert.equal(pieces.length, 25);
  assert.ok(pieces.every((p) => p.currentSlot === null));
});

test('placePiece updates only the targeted piece, immutably', () => {
  const pieces = createJigsawPieces(4);
  const next = placePiece(pieces, 2, 2);
  assert.equal(pieces[2].currentSlot, null, 'original unchanged');
  assert.equal(next[2].currentSlot, 2);
  assert.equal(next[0].currentSlot, null);
});

test('isJigsawComplete is true only when every piece is in its correct slot', () => {
  let pieces = createJigsawPieces(3);
  assert.equal(isJigsawComplete(pieces), false);
  pieces = placePiece(pieces, 0, 0);
  pieces = placePiece(pieces, 1, 1);
  pieces = placePiece(pieces, 2, 2);
  assert.equal(isJigsawComplete(pieces), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/puzzles/puzzle1-jigsaw.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the pure logic + DOM in `js/puzzles/puzzle1-jigsaw.js`**

```js
// js/puzzles/puzzle1-jigsaw.js
import { renderSpeechBubble } from '../speechBubble.js';

export function checkTextAnswers({ first, second, third }) {
  const normalize = (s) => (s || '').trim().toLowerCase();
  return normalize(first) === 'berlin' && normalize(second) === 'germany' && normalize(third) === 'beer';
}

export function createJigsawPieces(size = 25) {
  return Array.from({ length: size }, (_, id) => ({ id, correctSlot: id, currentSlot: null }));
}

export function placePiece(pieces, pieceId, slot) {
  return pieces.map((p) => (p.id === pieceId ? { ...p, currentSlot: slot } : p));
}

export function isJigsawComplete(pieces) {
  return pieces.every((p) => p.currentSlot === p.correctSlot);
}

const INTRO_TEXT =
  "הולה מוצ'אצ'וס! אני חורחה, וברוכין הבאין לתחנה הראשונה של המשחק – העמק 26! אוֹלֶה! " +
  'במהלך המשחק תפתרו חידות ותעברו בין תחנות כדי לגלות את הקוד שיפתח את התיק שלפניכם. קלארו?';

const RULES_TEXT =
  'שני דברים לפני שמתחילים:\n' +
  'אונו! את המעבר בין התחנות תעשו באמצעות המפה שנמצאת בכפתור למטה.\n' +
  'דוס! בשביל לפתור חלק מהחידות תצטרכו להיעזר בטלפונים שלכם. איי קראמבה!\n' +
  'אמיגוס, מוכנין לחידה הראשונה?';

const OUTRO_TEXT =
  "מוי ביין מוצ'אצ'וס! מכאן אתם ממשיכים לתחנה הבאה שלכם: המקום שבו כולכם נפגשתם לראשונה. אדיוס!";

const PIECE_COUNT = 25;
const GRID_SIZE = 5; // 5x5

export function initPuzzle1(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-jorge.png',
    characterName: 'חורחה',
    text: INTRO_TEXT,
    buttonLabel: 'ואמוס',
    onAdvance: () => {
      renderSpeechBubble(dialogueEl, {
        characterImage: 'assets/images/char-jorge.png',
        characterName: 'חורחה',
        text: RULES_TEXT,
        buttonLabel: 'סי סניור',
        onAdvance: () => {
          dialogueEl.remove();
          renderPuzzle();
        },
      });
    },
  });

  function renderPuzzle() {
    let pieces = createJigsawPieces(PIECE_COUNT);

    const puzzleEl = document.createElement('div');
    puzzleEl.className = 'jigsaw-puzzle';
    container.appendChild(puzzleEl);

    const frame = document.createElement('div');
    frame.className = 'jigsaw-frame';
    frame.style.display = 'grid';
    frame.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 60px)`;
    for (let slot = 0; slot < PIECE_COUNT; slot++) {
      const cell = document.createElement('div');
      cell.className = 'jigsaw-slot';
      cell.dataset.slot = String(slot);
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const pieceId = Number(e.dataTransfer.getData('text/plain'));
        pieces = placePiece(pieces, pieceId, slot);
      });
      frame.appendChild(cell);
    }

    const tray = document.createElement('div');
    tray.className = 'jigsaw-tray';
    for (const piece of pieces) {
      const pieceEl = document.createElement('div');
      pieceEl.className = 'jigsaw-piece';
      pieceEl.draggable = true;
      pieceEl.style.backgroundImage = "url('assets/images/puzzle1-jigsaw-target.jpeg')";
      const row = Math.floor(piece.correctSlot / GRID_SIZE);
      const col = piece.correctSlot % GRID_SIZE;
      pieceEl.style.backgroundPosition = `-${col * 60}px -${row * 60}px`;
      pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(piece.id));
      });
      tray.appendChild(pieceEl);
    }

    puzzleEl.appendChild(frame);
    puzzleEl.appendChild(tray);

    const answersEl = document.createElement('div');
    answersEl.className = 'jigsaw-answers';
    const labels = ['#', '#', '#'];
    const inputs = labels.map(() => {
      const input = document.createElement('input');
      input.type = 'text';
      answersEl.appendChild(document.createTextNode('# '));
      answersEl.appendChild(input);
      return input;
    });
    const checkButton = document.createElement('button');
    checkButton.textContent = 'בדוק';
    checkButton.addEventListener('click', () => {
      const answers = { first: inputs[0].value, second: inputs[1].value, third: inputs[2].value };
      if (checkTextAnswers(answers)) {
        answersEl.classList.add('solved');
        puzzleEl.remove();
        answersEl.remove();
        renderSpeechBubble(dialogueEl, {
          characterImage: 'assets/images/char-jorge.png',
          characterName: 'חורחה',
          text: OUTRO_TEXT,
          buttonLabel: 'המשך',
          onAdvance: () => onSolved?.(),
        });
        container.appendChild(dialogueEl);
      }
    });
    answersEl.appendChild(checkButton);
    container.appendChild(answersEl);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/puzzles/puzzle1-jigsaw.test.js`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/puzzles/puzzle1-jigsaw.js js/puzzles/puzzle1-jigsaw.test.js
git commit -m "Add puzzle 1 (Jorge jigsaw + answers)"
```

---

### Task 6: Puzzle 2 — Avi Boaz (crossword)

**Files:**
- Create: `js/puzzles/puzzle2-crossword.js`
- Create: `js/puzzles/puzzle2-crossword.test.js`

**Interfaces:**
- Consumes: `renderSpeechBubble` from `../speechBubble.js`.
- Produces: `CROSSWORD_GRID` (8×12 array; each cell is `null` or `{ letter, clueNumber? }`), `CLUES` (`[{ number, text, image }]`), `createEmptyUserGrid(grid)`, `setCellLetter(userGrid, row, col, letter)`, `isCrosswordSolved(userGrid, solutionGrid)`, `initPuzzle2(container, { onSolved })`.

- [ ] **Step 1: Write the failing test**

```js
// js/puzzles/puzzle2-crossword.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CROSSWORD_GRID, createEmptyUserGrid, setCellLetter, isCrosswordSolved } from './puzzle2-crossword.js';

test('createEmptyUserGrid mirrors solution shape with blanks for playable cells', () => {
  const userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  assert.equal(userGrid.length, CROSSWORD_GRID.length);
  assert.equal(userGrid[0][0], ''); // row0 col0 is playable ('פ')
  assert.equal(userGrid[1][0], null); // row1 col0 is blocked
});

test('setCellLetter updates a single cell and keeps only the last character', () => {
  const userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  const next = setCellLetter(userGrid, 0, 0, 'פ');
  assert.equal(next[0][0], 'פ');
  assert.equal(userGrid[0][0], '', 'original untouched');
  const overwritten = setCellLetter(next, 0, 0, 'xפ'); // simulate fast typing, keep last char
  assert.equal(overwritten[0][0], 'פ');
});

test('isCrosswordSolved is false until every playable cell matches, then true', () => {
  let userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  assert.equal(isCrosswordSolved(userGrid, CROSSWORD_GRID), false);

  // Fill the full solution in.
  for (let r = 0; r < CROSSWORD_GRID.length; r++) {
    for (let c = 0; c < CROSSWORD_GRID[r].length; c++) {
      if (CROSSWORD_GRID[r][c]) {
        userGrid = setCellLetter(userGrid, r, c, CROSSWORD_GRID[r][c].letter);
      }
    }
  }
  assert.equal(isCrosswordSolved(userGrid, CROSSWORD_GRID), true);

  const withOneWrong = setCellLetter(userGrid, 0, 0, 'ז');
  assert.equal(isCrosswordSolved(withOneWrong, CROSSWORD_GRID), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/puzzles/puzzle2-crossword.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `js/puzzles/puzzle2-crossword.js`**

```js
// js/puzzles/puzzle2-crossword.js
import { renderSpeechBubble } from '../speechBubble.js';

// Transcribed verbatim from the source doc's crossword table (see
// docs/superpowers/specs/source/game-description.txt). null = blocked cell.
export const CROSSWORD_GRID = [
  [{ letter: 'פ', clueNumber: 1 }, { letter: 'ל' }, { letter: 'י' }, { letter: 'ק' }, { letter: 'י' }, { letter: 'מ' }, { letter: 'ש' }, { letter: 'ו' }, { letter: 'ב' }, { letter: 'ב' }, { letter: 'י' }, { letter: 'מ' }],
  [null, null, null, null, null, { letter: 'א', clueNumber: 2 }, { letter: 'י' }, { letter: 'ת' }, { letter: 'נ' }, null, null, null],
  [null, null, null, null, null, { letter: 'ק', clueNumber: 3 }, { letter: 'ו' }, { letter: 'ט' }, { letter: 'ג' }, null, null, null],
  [null, null, null, null, { letter: 'ר', clueNumber: 4 }, { letter: 'ו' }, { letter: 'ק' }, { letter: 'ח' }, { letter: 'ו' }, { letter: 'ת' }, null, null],
  [null, null, null, { letter: 'כ', clueNumber: 5 }, { letter: 'מ' }, { letter: 'ה' }, { letter: 'ח' }, { letter: 'ב' }, { letter: 'ר' }, { letter: 'י' }, { letter: 'מ' }, null],
  [null, null, null, null, null, null, { letter: 'ש', clueNumber: 6 }, { letter: 'נ' }, { letter: 'י' }, { letter: 'צ' }, { letter: 'ל' }, null],
  [null, null, null, null, null, { letter: 'ע', clueNumber: 7 }, { letter: 'ד' }, { letter: 'כ' }, { letter: 'ו' }, { letter: 'נ' }, null, null],
  [null, { letter: 'נ', clueNumber: 8 }, { letter: 'ד' }, { letter: 'ב' }, { letter: 'ז' }, { letter: 'ל' }, { letter: 'צ' }, { letter: 'מ' }, { letter: 'נ' }, null, null, null],
];

export const CLUES = [
  { number: 1, text: 'איך קראו לקבוצת הווטסאפ של החיילים?', image: null },
  { number: 2, text: 'מי שלח את הודעת השחרור הבאה?', image: 'assets/images/puzzle2-clue-2.jpeg' },
  { number: 3, text: 'על מי מדובר בהודעות הבאות?', image: 'assets/images/puzzle2-clue-3.jpeg' },
  { number: 4, text: 'מה למד ובמה עובד אליהו קוסמן?', image: null },
  { number: 5, text: 'איך קראו ללהקה של יונתן נבו?', image: null },
  { number: 6, text: 'מה המילה המוסתרת בהודעה הבאה?', image: 'assets/images/puzzle2-clue-6.jpeg' },
  { number: 7, text: 'מה המילה המוסתרת בהודעות הבאות?', image: 'assets/images/puzzle2-clue-7.jpeg' },
  { number: 8, text: 'מי עזב את הקבוצה בעקבות ההודעות האלה?', image: 'assets/images/puzzle2-clue-8.jpeg' },
];

export function createEmptyUserGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell ? '' : null)));
}

export function setCellLetter(userGrid, row, col, letter) {
  const next = userGrid.map((r) => [...r]);
  next[row][col] = (letter || '').slice(-1);
  return next;
}

export function isCrosswordSolved(userGrid, solutionGrid) {
  for (let r = 0; r < solutionGrid.length; r++) {
    for (let c = 0; c < solutionGrid[r].length; c++) {
      const solutionCell = solutionGrid[r][c];
      if (solutionCell === null) continue;
      if ((userGrid[r][c] || '').trim() !== solutionCell.letter) return false;
    }
  }
  return true;
}

const INTRO_TEXT =
  'היי; התגעגעתם אליי? כן. החידה הבאה. שאלות; השלמת מילים מהווצאפ. למלא בתשבץ. לפתור נכון – ג ר מ נ י ה. בהצלחה.';

export function initPuzzle2(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-avi-boaz.png',
    characterName: 'אבי בועז',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let userGrid = createEmptyUserGrid(CROSSWORD_GRID);

    const wrapper = document.createElement('div');
    wrapper.className = 'crossword-wrapper';

    const clueText = document.createElement('div');
    clueText.className = 'crossword-clue-text';

    const grid = document.createElement('div');
    grid.className = 'crossword-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${CROSSWORD_GRID[0].length}, 36px)`;

    CROSSWORD_GRID.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'crossword-cell';
        if (!cell) {
          cellEl.classList.add('blocked');
          grid.appendChild(cellEl);
          return;
        }
        if (cell.clueNumber) {
          const numberEl = document.createElement('span');
          numberEl.className = 'crossword-clue-number';
          numberEl.textContent = String(cell.clueNumber);
          numberEl.addEventListener('click', () => {
            const clue = CLUES.find((cl) => cl.number === cell.clueNumber);
            clueText.innerHTML = '';
            const p = document.createElement('p');
            p.textContent = clue.text;
            clueText.appendChild(p);
            if (clue.image) {
              const img = document.createElement('img');
              img.src = clue.image;
              img.className = 'crossword-clue-image';
              clueText.appendChild(img);
            }
          });
          cellEl.appendChild(numberEl);
        }
        const input = document.createElement('input');
        input.maxLength = 2; // allow the numberEl + a following keystroke; letter logic below extracts last char
        input.className = 'crossword-input';
        input.addEventListener('input', () => {
          userGrid = setCellLetter(userGrid, r, c, input.value);
          input.value = userGrid[r][c];
          if (isCrosswordSolved(userGrid, CROSSWORD_GRID)) {
            grid.classList.add('solved');
          }
        });
        cellEl.appendChild(input);
        grid.appendChild(cellEl);
      });
    });

    wrapper.appendChild(clueText);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    // Solved-state watcher so onSolved fires once, from outside the per-cell handler above.
    const observer = new MutationObserver(() => {
      if (grid.classList.contains('solved')) {
        observer.disconnect();
        onSolved?.();
      }
    });
    observer.observe(grid, { attributes: true, attributeFilter: ['class'] });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/puzzles/puzzle2-crossword.test.js`
Expected: PASS, all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/puzzles/puzzle2-crossword.js js/puzzles/puzzle2-crossword.test.js
git commit -m "Add puzzle 2 (Avi Boaz crossword)"
```

---

### Task 7: Puzzle 3 — Uzi Hadrozi (bins)

**Files:**
- Create: `js/puzzles/puzzle3-bins.js`
- Create: `js/puzzles/puzzle3-bins.test.js`

**Interfaces:**
- Consumes: `renderSpeechBubble` from `../speechBubble.js`.
- Produces: `BIN_LETTER_MAP` (`{0..9: letter}`), `SLASH_ID` (`'slash'`), `TARGET_TEXT` (`'אורי טביבי'`), `createBinState()` → `{ text, slashClickCount }`, `clickBin(state, binId)` → new state, `resetBins()` → fresh state, `isBinsSolved(state)` → boolean, `initPuzzle3(container, { onSolved })`.

- [ ] **Step 1: Write the failing test**

```js
// js/puzzles/puzzle3-bins.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBinState, clickBin, resetBins, isBinsSolved, TARGET_TEXT } from './puzzle3-bins.js';

test('clickBin appends the mapped letter for numeric bins', () => {
  let state = createBinState();
  state = clickBin(state, 0); // 'י'
  state = clickBin(state, 1); // 'א'
  assert.equal(state.text, 'יא');
});

test('bin 6 appends a space', () => {
  let state = clickBin(createBinState(), 6);
  assert.equal(state.text, ' ');
});

test('the slash bin alternates ר then ט on successive clicks', () => {
  let state = createBinState();
  state = clickBin(state, 'slash');
  assert.equal(state.text, 'ר');
  state = clickBin(state, 'slash');
  assert.equal(state.text, 'רט');
  state = clickBin(state, 'slash');
  assert.equal(state.text, 'רטר');
});

test('resetBins clears text and the slash click counter', () => {
  let state = createBinState();
  state = clickBin(state, 'slash'); // -> 'ר', count 1
  state = clickBin(state, 'slash'); // -> 'רט', count 2
  state = resetBins();
  assert.equal(state.text, '');
  state = clickBin(state, 'slash');
  assert.equal(state.text, 'ר', 'counter reset, first click is ר again');
});

test('isBinsSolved is true only for the exact target text', () => {
  assert.equal(isBinsSolved({ text: 'אורי טביבי', slashClickCount: 0 }), true);
  assert.equal(isBinsSolved({ text: TARGET_TEXT, slashClickCount: 0 }), true);
  assert.equal(isBinsSolved({ text: 'אורי', slashClickCount: 0 }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/puzzles/puzzle3-bins.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `js/puzzles/puzzle3-bins.js`**

```js
// js/puzzles/puzzle3-bins.js
import { renderSpeechBubble } from '../speechBubble.js';

export const BIN_LETTER_MAP = { 0: 'י', 1: 'א', 2: 'ב', 3: 'ק', 4: 'מ', 5: 'ח', 6: ' ', 7: 'ז', 8: 'ו', 9: 'ש' };
export const SLASH_ID = 'slash';
export const TARGET_TEXT = 'אורי טביבי';
const BIN_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, SLASH_ID];

export function createBinState() {
  return { text: '', slashClickCount: 0 };
}

export function clickBin(state, binId) {
  if (binId === SLASH_ID) {
    const nextCount = state.slashClickCount + 1;
    const letter = nextCount % 2 === 1 ? 'ר' : 'ט';
    return { text: state.text + letter, slashClickCount: nextCount };
  }
  return { text: state.text + BIN_LETTER_MAP[binId], slashClickCount: state.slashClickCount };
}

export function resetBins() {
  return createBinState();
}

export function isBinsSolved(state) {
  return state.text === TARGET_TEXT;
}

const INTRO_TEXT =
  "אהלן וסהלן יא שבאב. איסמי עוזי הדרוזי וואלה באתי פה במיוחד לכבוד החידה השלישית. " +
  'יא אח\'וואן, לפניכם 11 פחים – וואלה כל פח שווה 3000 דולר! וכל פח מחביא אות או סימן. ' +
  'מה אתם צריכים לעשות? על ראסי ועל עיני: ללחוץ על הפחים בדיוק לפי התאריך שבו התקיים חידון מארוול האולטימטיבי הראשון. ' +
  'ואל תשכחו לכתוב תאריך מלא ולהשתמש בסלאש כשצריך. פאהם? יאללה, שוואיה שוואיה, בלי לחץ. בהצלחה!';

export function initPuzzle3(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uzi-hadrozi.png',
    characterName: 'עוזי הדרוזי',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let state = createBinState();

    const wrapper = document.createElement('div');
    wrapper.className = 'bins-wrapper';
    wrapper.style.position = 'relative';

    const bg = document.createElement('img');
    bg.src = 'assets/images/puzzle3-terminal3-bg.jpeg';
    bg.className = 'bins-background';
    wrapper.appendChild(bg);

    // Free layout: spread 11 bins evenly along the bottom of the background image.
    BIN_IDS.forEach((binId, index) => {
      const bin = document.createElement('button');
      bin.className = 'bin';
      bin.style.position = 'absolute';
      bin.style.bottom = '8%';
      bin.style.left = `${5 + index * 8}%`;
      bin.style.backgroundImage = "url('assets/images/puzzle3-bin-icon.png')";
      bin.textContent = binId === SLASH_ID ? '/' : String(binId);
      bin.addEventListener('click', () => {
        state = clickBin(state, binId);
        textBox.value = state.text;
        if (isBinsSolved(state)) {
          textBox.classList.add('solved');
          onSolved?.();
        }
      });
      wrapper.appendChild(bin);
    });

    const textBox = document.createElement('input');
    textBox.type = 'text';
    textBox.readOnly = true;
    textBox.dir = 'rtl';
    textBox.className = 'bins-text';

    const resetButton = document.createElement('button');
    resetButton.textContent = 'איפוס';
    resetButton.addEventListener('click', () => {
      state = resetBins();
      textBox.value = '';
      textBox.classList.remove('solved');
    });

    container.appendChild(wrapper);
    container.appendChild(textBox);
    container.appendChild(resetButton);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/puzzles/puzzle3-bins.test.js`
Expected: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/puzzles/puzzle3-bins.js js/puzzles/puzzle3-bins.test.js
git commit -m "Add puzzle 3 (Uzi Hadrozi bins)"
```

---

### Task 8: Puzzle 4 — Uri Tabibi (video ordering + QR reveal)

**Files:**
- Create: `js/puzzles/puzzle4-videos.js`
- Create: `js/puzzles/puzzle4-videos.test.js`

**Interfaces:**
- Consumes: `renderSpeechBubble` from `../speechBubble.js`.
- Produces: `VIDEO_ORDER` (array of 6 URLs, in correct order), `extractYouTubeId(url)` → string or `null`, `youtubeThumbnailUrl(videoId)` → string, `cardFrontImage(url)` → string or `null` (`null` means "render generic placeholder"), `createVideoCards()` → `[{ id, url, correctSlot, currentSlot, flipped }]`, `isVideoOrderSolved(cards)` → boolean, `initPuzzle4(container, { onSolved })`.

- [ ] **Step 1: Write the failing test**

```js
// js/puzzles/puzzle4-videos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_ORDER,
  extractYouTubeId,
  youtubeThumbnailUrl,
  cardFrontImage,
  createVideoCards,
  isVideoOrderSolved,
} from './puzzle4-videos.js';

test('VIDEO_ORDER has the 6 links from the spec in order', () => {
  assert.equal(VIDEO_ORDER.length, 6);
  assert.equal(VIDEO_ORDER[0], 'https://share.google/nGTqH8IsAVXb0NTNg');
  assert.equal(VIDEO_ORDER[5], 'https://vt.tiktok.com/ZSVUp7Gb8/');
});

test('extractYouTubeId handles shorts and youtu.be formats', () => {
  assert.equal(extractYouTubeId('https://youtube.com/shorts/qpmFnUTkpL0?si=abc'), 'qpmFnUTkpL0');
  assert.equal(extractYouTubeId('https://youtu.be/fWKB8zdVM-U?si=xyz'), 'fWKB8zdVM-U');
});

test('extractYouTubeId returns null for non-YouTube links', () => {
  assert.equal(extractYouTubeId('https://vt.tiktok.com/ZSVfQhqqe/'), null);
  assert.equal(extractYouTubeId('https://share.google/nGTqH8IsAVXb0NTNg'), null);
});

test('youtubeThumbnailUrl builds the hqdefault thumbnail URL', () => {
  assert.equal(youtubeThumbnailUrl('abc123'), 'https://img.youtube.com/vi/abc123/hqdefault.jpg');
});

test('cardFrontImage returns a thumbnail for YouTube links and null otherwise', () => {
  assert.equal(cardFrontImage('https://youtu.be/fWKB8zdVM-U'), 'https://img.youtube.com/vi/fWKB8zdVM-U/hqdefault.jpg');
  assert.equal(cardFrontImage('https://vt.tiktok.com/ZSVfQhqqe/'), null);
});

test('createVideoCards builds 6 unplaced cards matching VIDEO_ORDER', () => {
  const cards = createVideoCards();
  assert.equal(cards.length, 6);
  assert.equal(cards[0].url, VIDEO_ORDER[0]);
  assert.equal(cards[0].correctSlot, 0);
  assert.equal(cards[0].currentSlot, null);
  assert.equal(cards[0].flipped, false);
});

test('isVideoOrderSolved requires every card correctly placed AND flipped', () => {
  let cards = createVideoCards().map((c) => ({ ...c, currentSlot: c.correctSlot }));
  assert.equal(isVideoOrderSolved(cards), false, 'not flipped yet');
  cards = cards.map((c) => ({ ...c, flipped: true }));
  assert.equal(isVideoOrderSolved(cards), true);
  cards[0].currentSlot = 5;
  assert.equal(isVideoOrderSolved(cards), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/puzzles/puzzle4-videos.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `js/puzzles/puzzle4-videos.js`**

```js
// js/puzzles/puzzle4-videos.js
import { renderSpeechBubble } from '../speechBubble.js';

export const VIDEO_ORDER = [
  'https://share.google/nGTqH8IsAVXb0NTNg',
  'https://youtube.com/shorts/qpmFnUTkpL0?si=f15IZDMVppvTMd3j',
  'https://youtu.be/fWKB8zdVM-U?si=0T-qg7zOKwTDMK7H',
  'https://youtu.be/9sh2SwfuO44?si=l0Dx3XoRrD5fVpBt',
  'https://vt.tiktok.com/ZSVfQhqqe/',
  'https://vt.tiktok.com/ZSVUp7Gb8/',
];

export function extractYouTubeId(url) {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) return shortsMatch[1];
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = url.match(/[?&]v=([\w-]+)/);
  if (watchMatch) return watchMatch[1];
  return null;
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function cardFrontImage(url) {
  const id = extractYouTubeId(url);
  return id ? youtubeThumbnailUrl(id) : null;
}

export function createVideoCards() {
  return VIDEO_ORDER.map((url, index) => ({ id: index, url, correctSlot: index, currentSlot: null, flipped: false }));
}

export function isVideoOrderSolved(cards) {
  return cards.every((c) => c.currentSlot === c.correctSlot && c.flipped);
}

const INTRO_TEXT =
  'בנות, חיכיתם כל השנה לחידה מספר ארבע. בחידה הזו אתם צריכות לסדר את הסרטונים בסדר כרונולוגי. כרונולוגי! ' +
  'תעשו את זה לאט, בסדר, תעשו את זה מהר, גם בסדר, עד 12, תעשו את זה אחרי 12 אני לא פה. ' +
  'אם תעשו את זה נכון, תגלו את הרמז לתחנה הבאה שלכם, באספקה מיידית. לא מחר, לא עוד שבוע, אספקה מיידית. בהצלחה!';

const GRID_COLS = 3;
const GRID_ROWS = 2;

export function initPuzzle4(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uri-tabibi.jpeg',
    characterName: 'אורי טביבי',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let cards = createVideoCards();

    const grid = document.createElement('div');
    grid.className = 'video-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, 160px)`;

    const slots = [];
    for (let slot = 0; slot < 6; slot++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'video-slot';
      slotEl.dataset.slot = String(slot);
      slotEl.addEventListener('dragover', (e) => e.preventDefault());
      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const cardId = Number(e.dataTransfer.getData('text/plain'));
        cards = cards.map((c) => (c.id === cardId ? { ...c, currentSlot: slot } : c));
        renderCardInSlot(cardId, slotEl);
      });
      slots.push(slotEl);
      grid.appendChild(slotEl);
    }

    const tray = document.createElement('div');
    tray.className = 'video-tray';

    function cardFace(card) {
      const face = document.createElement('div');
      face.className = 'video-card-face';
      if (card.flipped) {
        // 3x2 sprite crop of the assembled QR code via background-position (no build-time image cropping needed).
        const col = card.correctSlot % GRID_COLS;
        const row = Math.floor(card.correctSlot / GRID_COLS);
        face.style.backgroundImage = "url('assets/images/puzzle4-qr-code.png')";
        face.style.backgroundSize = `${GRID_COLS * 100}% ${GRID_ROWS * 100}%`;
        face.style.backgroundPosition = `${(col / (GRID_COLS - 1)) * 100}% ${(row / (GRID_ROWS - 1)) * 100}%`;
      } else {
        const front = cardFrontImage(card.url);
        if (front) {
          face.style.backgroundImage = `url('${front}')`;
        } else {
          face.textContent = String(card.id + 1);
          face.classList.add('video-card-placeholder');
        }
      }
      return face;
    }

    function renderCardInSlot(cardId, slotEl) {
      const card = cards.find((c) => c.id === cardId);
      slotEl.innerHTML = '';
      slotEl.appendChild(buildCardEl(card));
      if (isVideoOrderSolved(cards)) {
        grid.classList.add('solved');
        onSolved?.();
      }
    }

    function buildCardEl(card) {
      const cardEl = document.createElement('div');
      cardEl.className = 'video-card';
      cardEl.draggable = true;
      cardEl.appendChild(cardFace(card));
      cardEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(card.id));
      });
      cardEl.addEventListener('click', (e) => {
        if (e.detail === 0) return; // ignore synthetic clicks from drag
        window.open(card.url, '_blank', 'noopener');
      });
      return cardEl;
    }

    for (const card of cards) {
      tray.appendChild(buildCardEl(card));
    }

    const flipButton = document.createElement('button');
    flipButton.textContent = 'הפוך';
    flipButton.addEventListener('click', () => {
      cards = cards.map((c) => ({ ...c, flipped: !c.flipped }));
      slots.forEach((slotEl) => {
        const slot = Number(slotEl.dataset.slot);
        const card = cards.find((c) => c.currentSlot === slot);
        if (card) {
          slotEl.innerHTML = '';
          slotEl.appendChild(buildCardEl(card));
        }
      });
      if (isVideoOrderSolved(cards)) {
        grid.classList.add('solved');
        onSolved?.();
      }
    });

    container.appendChild(grid);
    container.appendChild(tray);
    container.appendChild(flipButton);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/puzzles/puzzle4-videos.test.js`
Expected: PASS, all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add js/puzzles/puzzle4-videos.js js/puzzles/puzzle4-videos.test.js
git commit -m "Add puzzle 4 (Uri Tabibi video ordering + QR reveal)"
```

---

### Task 9: Puzzle 5 — Kartoniv (riddle images)

**Files:**
- Create: `js/puzzles/puzzle5-riddle.js`

**Interfaces:**
- Consumes: `renderSpeechBubble` from `../speechBubble.js`.
- Produces: `initPuzzle5(container, { onContinue })` — DOM only, no solved-check (spec §5.5: solved verbally by the group). `onContinue()` is called when the group clicks a "פתרנו, למפה!" button, signaling readiness to open the map toward the four final stations.

No unit test — this module is pure DOM rendering with no branching logic to verify.

- [ ] **Step 1: Implement `js/puzzles/puzzle5-riddle.js`**

```js
// js/puzzles/puzzle5-riddle.js
import { renderSpeechBubble } from '../speechBubble.js';

const INTRO_TEXT =
  'היי חברים שלי. אני קרטוניב, שהגיע איתכם ליוון כי ניב האמיתי היה אפס מדי בשביל לבוא. ' +
  'עכשיו אני כאן כדי להציג לכם את החידה החמישית. מממהמ בהצלחה.';

export function initPuzzle5(container, { onContinue }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-kartoniv.jpeg',
    characterName: 'קרטוניב',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderRiddle();
    },
  });

  function renderRiddle() {
    const wrapper = document.createElement('div');
    wrapper.className = 'riddle-images';
    for (const src of ['assets/images/puzzle5-riddle-1.png', 'assets/images/puzzle5-riddle-2.png', 'assets/images/puzzle5-riddle-3.png']) {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'riddle-image';
      wrapper.appendChild(img);
    }
    container.appendChild(wrapper);

    const continueButton = document.createElement('button');
    continueButton.textContent = 'פתרנו, למפה!';
    continueButton.addEventListener('click', () => onContinue?.());
    container.appendChild(continueButton);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add js/puzzles/puzzle5-riddle.js
git commit -m "Add puzzle 5 (Kartoniv riddle images)"
```

---

### Task 10: Puzzle 6 — final letters screen

**Files:**
- Create: `js/puzzles/puzzle6-letters.js`
- Create: `js/puzzles/puzzle6-letters.test.js`

**Interfaces:**
- Consumes: `FINAL_STATION_IDS` from `../stations.js`.
- Produces: `allFinalStationsDiscovered(letterDiscoveries)` → boolean, `renderFinalScreen(container, { finalLetters, onFinish })` — DOM: shows the letters and a "סיום" button that calls `onFinish()`.

- [ ] **Step 1: Write the failing test**

```js
// js/puzzles/puzzle6-letters.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allFinalStationsDiscovered } from './puzzle6-letters.js';

test('allFinalStationsDiscovered is false until all 4 are present', () => {
  assert.equal(allFinalStationsDiscovered([]), false);
  assert.equal(
    allFinalStationsDiscovered([
      { stationId: 'station6a', letter: 'נ' },
      { stationId: 'station6b', letter: 'ו' },
    ]),
    false
  );
});

test('allFinalStationsDiscovered is true once all 4 are present, regardless of order', () => {
  assert.equal(
    allFinalStationsDiscovered([
      { stationId: 'station6c', letter: 'ע' },
      { stationId: 'station6a', letter: 'נ' },
      { stationId: 'station6b', letter: 'ו' },
      { stationId: 'station6d', letter: 'מ' },
    ]),
    true
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test js/puzzles/puzzle6-letters.test.js`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `js/puzzles/puzzle6-letters.js`**

```js
// js/puzzles/puzzle6-letters.js
import { FINAL_STATION_IDS } from '../stations.js';

export function allFinalStationsDiscovered(letterDiscoveries) {
  const discovered = new Set(letterDiscoveries.map((d) => d.stationId));
  return FINAL_STATION_IDS.every((id) => discovered.has(id));
}

export function renderFinalScreen(container, { finalLetters, onFinish }) {
  container.innerHTML = '';

  const lettersEl = document.createElement('div');
  lettersEl.className = 'final-letters';
  lettersEl.textContent = finalLetters.split('').join(' ');
  container.appendChild(lettersEl);

  const finishButton = document.createElement('button');
  finishButton.textContent = 'סיום';
  finishButton.className = 'final-finish-button';
  finishButton.addEventListener('click', () => onFinish?.());
  container.appendChild(finishButton);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test js/puzzles/puzzle6-letters.test.js`
Expected: PASS, both tests green.

- [ ] **Step 5: Commit**

```bash
git add js/puzzles/puzzle6-letters.js js/puzzles/puzzle6-letters.test.js
git commit -m "Add puzzle 6 (final letters screen)"
```

---

### Task 11: Main orchestration + full playthrough verification

**Files:**
- Create: `js/main.js`
- Modify: `css/style.css` (append the puzzle-specific structural CSS in Step 2 — map-open/close button styles already exist from Task 1)
- Create: `README.md` (how to run locally for the event)

**Interfaces:**
- Consumes everything produced by Tasks 1–10: `state.js` (all exports), `STATIONS`/`FINAL_STATION_IDS`/`INITIAL_MAP_VIEW` from `stations.js`, `initMap` from `map.js`, `initPuzzle1..4` (each `(container, { onSolved }) `), `initPuzzle5` (`(container, { onContinue })`), `renderFinalScreen`, `allFinalStationsDiscovered` from `puzzle6-letters.js`.
- Produces: nothing consumed elsewhere — this is the top-level entry point wired into `index.html`.

- [ ] **Step 1: Implement `js/main.js`**

```js
// js/main.js
import {
  loadState,
  saveState,
  markPuzzleSolved,
  setLastOpenScreen,
  recordLetterDiscovery,
  getFinalLetters,
  setLastMapView,
} from './state.js';
import { INITIAL_MAP_VIEW } from './stations.js';
import { initMap } from './map.js';
import { initPuzzle1 } from './puzzles/puzzle1-jigsaw.js';
import { initPuzzle2 } from './puzzles/puzzle2-crossword.js';
import { initPuzzle3 } from './puzzles/puzzle3-bins.js';
import { initPuzzle4 } from './puzzles/puzzle4-videos.js';
import { initPuzzle5 } from './puzzles/puzzle5-riddle.js';
import { allFinalStationsDiscovered, renderFinalScreen } from './puzzles/puzzle6-letters.js';

const storage = window.localStorage;
let state = loadState(storage);

const screens = {
  map: document.getElementById('screen-map'),
  puzzle1: document.getElementById('screen-puzzle1'),
  puzzle2: document.getElementById('screen-puzzle2'),
  puzzle3: document.getElementById('screen-puzzle3'),
  puzzle4: document.getElementById('screen-puzzle4'),
  puzzle5: document.getElementById('screen-puzzle5'),
  final: document.getElementById('screen-final'),
};

function persist() {
  saveState(state, storage);
}

function showScreen(screenId) {
  for (const [id, el] of Object.entries(screens)) {
    el.hidden = id !== screenId;
  }
  if (screenId !== 'map') {
    state = setLastOpenScreen(state, screenId);
    persist();
  } else {
    mapHandle.invalidateSize();
  }
}

function addMapOpenButton(screenEl) {
  const button = document.createElement('button');
  button.className = 'map-open-button';
  button.textContent = 'מפה';
  button.addEventListener('click', () => showScreen('map'));
  screenEl.appendChild(button);
}

function onPuzzleSolved(puzzleId) {
  state = markPuzzleSolved(state, puzzleId);
  persist();
}

// --- Puzzle screens ---
initPuzzle1(screens.puzzle1, { onSolved: () => { onPuzzleSolved('puzzle1'); showScreen('map'); } });
addMapOpenButton(screens.puzzle1);

initPuzzle2(screens.puzzle2, { onSolved: () => { onPuzzleSolved('puzzle2'); showScreen('map'); } });
addMapOpenButton(screens.puzzle2);

initPuzzle3(screens.puzzle3, { onSolved: () => { onPuzzleSolved('puzzle3'); showScreen('map'); } });
addMapOpenButton(screens.puzzle3);

initPuzzle4(screens.puzzle4, { onSolved: () => { onPuzzleSolved('puzzle4'); showScreen('map'); } });
addMapOpenButton(screens.puzzle4);

initPuzzle5(screens.puzzle5, {
  onContinue: () => {
    onPuzzleSolved('puzzle5');
    showScreen('map');
  },
});
addMapOpenButton(screens.puzzle5);

// --- Map screen ---
const puzzleScreenByPuzzleId = {
  puzzle1: 'puzzle1',
  puzzle2: 'puzzle2',
  puzzle3: 'puzzle3',
  puzzle4: 'puzzle4',
  puzzle5: 'puzzle5',
};

function solvedPuzzleIds() {
  return Object.keys(state.solvedPuzzles).filter((id) => state.solvedPuzzles[id]);
}

function discoveredStationIds() {
  return state.letterDiscoveries.map((d) => d.stationId);
}

const mapHandle = initMap(screens.map, {
  initialView: state.lastMapView || INITIAL_MAP_VIEW,
  getSolvedPuzzleIds: solvedPuzzleIds,
  getDiscoveredStationIds: discoveredStationIds,
  onViewChange: (view) => {
    state = setLastMapView(state, view);
    persist();
  },
  onPuzzleStationClick: (station) => {
    showScreen(puzzleScreenByPuzzleId[station.puzzleId]);
  },
  onLetterStationClick: (station) => {
    if (!discoveredStationIds().includes(station.id)) {
      state = recordLetterDiscovery(state, station.id, station.letter);
      persist();
    }
    if (allFinalStationsDiscovered(state.letterDiscoveries)) {
      renderFinalScreen(screens.final, { finalLetters: getFinalLetters(state), onFinish: () => window.close() });
      showScreen('final');
    }
  },
});

const mapCloseButton = document.createElement('button');
mapCloseButton.className = 'map-close-button';
mapCloseButton.textContent = 'סגור מפה';
mapCloseButton.addEventListener('click', () => {
  // Returns to whichever puzzle screen was open before the map was opened
  // (showScreen only updates lastOpenScreen for non-map screens, so this
  // still holds the last puzzle screen even while the map is showing).
  showScreen(state.lastOpenScreen);
});
screens.map.appendChild(mapCloseButton);

// --- Initial screen on load ---
showScreen(state.lastOpenScreen || 'map');
if (state.lastMapView) {
  mapHandle.setView(state.lastMapView);
}
```

- [ ] **Step 2: Append the structural CSS every puzzle screen needs**

Each puzzle module above sets its *layout* (grid columns, positions) inline via JS, but relies on these classes for element *sizing* — without them, drop targets and grid cells collapse to zero height and become invisible/undroppable. Append to `css/style.css`:

```css
/* Puzzle 1: jigsaw */
.jigsaw-puzzle { display: flex; gap: 24px; justify-content: center; margin-top: 16px; }
.jigsaw-frame { border: 2px solid #333; }
.jigsaw-slot { width: 60px; height: 60px; border: 1px solid #ccc; }
.jigsaw-tray { display: flex; flex-wrap: wrap; width: 320px; gap: 2px; }
.jigsaw-piece { width: 60px; height: 60px; background-size: 300px 300px; cursor: grab; border: 1px solid #999; }
.jigsaw-answers { text-align: center; margin-top: 16px; }
.jigsaw-answers input { width: 100px; margin: 0 6px; }
.jigsaw-answers.solved { outline: 3px solid #4caf50; }

/* Puzzle 2: crossword */
.crossword-wrapper { display: flex; gap: 24px; justify-content: center; margin-top: 16px; align-items: flex-start; }
.crossword-cell { width: 36px; height: 36px; border: 1px solid #333; position: relative; }
.crossword-cell.blocked { background: #222; border: none; }
.crossword-input { width: 100%; height: 100%; text-align: center; font-size: 18px; border: none; }
.crossword-clue-number { position: absolute; top: 0; right: 2px; font-size: 9px; cursor: pointer; }
.crossword-clue-text { max-width: 260px; }
.crossword-clue-image { max-width: 240px; display: block; margin-top: 8px; }
.crossword-grid.solved .crossword-input { background: #4caf50; }

/* Puzzle 3: bins */
.bins-wrapper { max-width: 800px; margin: 16px auto; }
.bins-background { width: 100%; display: block; }
.bin { width: 40px; height: 40px; background-size: cover; border: none; color: #fff; font-weight: bold; cursor: pointer; }
.bins-text { display: block; width: 300px; margin: 16px auto; text-align: center; font-size: 20px; }
.bins-text.solved { background: #4caf50; }

/* Puzzle 4: videos */
.video-grid { margin: 16px auto; width: fit-content; gap: 4px; }
.video-slot { width: 160px; height: 100px; border: 2px dashed #999; }
.video-tray { display: flex; flex-wrap: wrap; gap: 8px; width: 520px; margin: 16px auto; }
.video-card { width: 160px; height: 100px; cursor: grab; }
.video-card-face { width: 100%; height: 100%; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 24px; background-color: #333; color: #fff; }
.video-grid.solved .video-slot { outline: 3px solid #4caf50; }

/* Puzzle 5: riddle */
.riddle-images { display: flex; gap: 16px; justify-content: center; margin-top: 16px; }
.riddle-image { max-width: 30%; max-height: 60vh; object-fit: contain; }

/* Final screen */
.final-letters { font-size: 64px; text-align: center; margin-top: 20vh; letter-spacing: 12px; }
.final-finish-button { display: block; margin: 32px auto; padding: 16px 48px; font-size: 24px; border-radius: 8px; border: none; background: #d8b34a; cursor: pointer; }
```

- [ ] **Step 3: Write `README.md`**

```markdown
# הרצת המשחק

1. פתח טרמינל בתיקיית הפרויקט.
2. הרץ שרת מקומי: `python3 -m http.server 8080`
3. פתח כרום בכתובת `http://localhost:8080`
4. הרחב למסך מלא (F11).

להרצת הבדיקות: `node --test`
```

- [ ] **Step 4: Run the full test suite**

Run: `node --test`
Expected: PASS — every `.test.js` file created across Tasks 1–10 (state, geo, typewriter, puzzle1, puzzle2, puzzle3, puzzle4, puzzle6) passes.

- [ ] **Step 5: Manual full-playthrough verification**

Serve the site (`python3 -m http.server 8080`) and open `http://localhost:8080` in Chrome. Walk through the entire game once:
1. Map opens centered on station 1, marker visible immediately — click it, confirm Jorge's two-step intro plays with typing animation, then the jigsaw + 3 answer boxes appear.
2. Enter `Berlin` / `Germany` / `Beer` — confirm Jorge's outro appears, then the map reopens.
3. Pan/zoom away from station 1 then toward station 2's coordinates — confirm station 2's marker only appears once close and zoomed in enough; click it, solve the crossword by filling every cell with the solution letters, confirm it turns green and returns to map.
4. Repeat for station 3 (bins → "אורי טביבי"), station 4 (drag all 6 cards into correct slots, flip, confirm QR assembles and grid turns green), and station 5 (riddle images display, "פתרנו, למפה!" returns to map).
5. Confirm all 4 final-letter stations (6a–6d) become visible per their own radius/zoom thresholds; click each, confirm the final screen appears automatically after the 4th, showing the letters in discovery order and a working "סיום" button.
6. Refresh the browser mid-game at least once and confirm progress (solved puzzles, discovered letters, current screen) survives via `localStorage`.

- [ ] **Step 6: Commit**

```bash
git add js/main.js css/style.css index.html README.md
git commit -m "Wire map and all puzzles together via main.js orchestration"
```
