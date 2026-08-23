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
  start: document.getElementById('screen-start'),
  map: document.getElementById('screen-map'),
  puzzle1: document.getElementById('screen-puzzle1'),
  puzzle2: document.getElementById('screen-puzzle2'),
  puzzle3: document.getElementById('screen-puzzle3'),
  puzzle4: document.getElementById('screen-puzzle4'),
  puzzle5: document.getElementById('screen-puzzle5'),
  final: document.getElementById('screen-final'),
};

// Fixed order for the dev toolbar's back/forward arrows — not the actual
// game flow (puzzle 6's four letter-stations aren't single screens), just a
// convenient linear tour of every screen for manual testing during dev.
const SCREEN_ORDER = ['start', 'map', 'puzzle1', 'puzzle2', 'puzzle3', 'puzzle4', 'puzzle5', 'final'];

let currentScreenId = null;

function persist() {
  saveState(state, storage);
}

// Puzzles are initialised lazily, the first time their screen is actually
// shown. Initialising them all up front ran every speech bubble's typewriter
// animation to completion while its screen was still hidden, so the group never
// saw a single character type out — and one throwing init aborted the whole
// module, which took the map down with it and left a blank page.
const initializedPuzzles = new Set();
// Handles returned by each puzzle's init function (currently just an optional
// `devSolve()`), keyed by screen id — lets the dev toolbar actually solve
// the puzzle currently on screen instead of only skipping past it.
const puzzleHandles = {};

function ensureInitialized(screenId) {
  const init = puzzleInitializers[screenId];
  if (!init || initializedPuzzles.has(screenId)) return;
  // Marked before running so a throwing init is not retried on every visit.
  initializedPuzzles.add(screenId);
  try {
    puzzleHandles[screenId] = init(screens[screenId]);
  } catch (error) {
    // A broken puzzle must not take out the map or the other puzzles.
    console.error(`Failed to initialise ${screenId}`, error);
  }
  // Appended even if init threw, so the group can always get back to the map.
  addMapOpenButton(screens[screenId]);
}

function showScreen(screenId) {
  ensureInitialized(screenId);
  for (const [id, el] of Object.entries(screens)) {
    el.hidden = id !== screenId;
  }
  currentScreenId = screenId;
  if (screenId === 'map') {
    // Re-apply the current view (a no-op pan/zoom-wise) so refreshMarkers()
    // runs and picks up any puzzle solved/letter discovered while this
    // screen was hidden — invalidateSize() alone only fixes tile sizing,
    // it doesn't recolor markers (see map.js: only setView()/moveend/
    // zoomend trigger refreshMarkers()).
    mapHandle.setView(state.lastMapView || INITIAL_MAP_VIEW);
    mapHandle.invalidateSize();
  } else if (screenId !== 'start') {
    // 'start' is a transient title screen, never a place to resume into —
    // it's shown once on every load, not persisted as lastOpenScreen.
    state = setLastOpenScreen(state, screenId);
    persist();
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

// The single "this puzzle is done" path, shared by every puzzle's solved
// callback and by the facilitator's skip shortcut.
function completePuzzle(puzzleId) {
  onPuzzleSolved(puzzleId);
  showScreen('map');
}

function showThanks() {
  // window.close() is blocked for tabs the script didn't open, so the finale
  // button used to do nothing at all. Give the group a real closing beat.
  screens.final.innerHTML = '';
  const thanks = document.createElement('div');
  thanks.className = 'final-thanks';
  thanks.textContent = 'תודה ששיחקתם!';
  screens.final.appendChild(thanks);
}

function renderFinalScreenIfReady() {
  if (allFinalStationsDiscovered(state.letterDiscoveries)) {
    renderFinalScreen(screens.final, { finalLetters: getFinalLetters(state), onFinish: showThanks });
    return true;
  }
  return false;
}

// --- Puzzle screens (definitions only — invoked by ensureInitialized) ---
const puzzleInitializers = {
  puzzle1: (el) => initPuzzle1(el, { onSolved: () => completePuzzle('puzzle1') }),
  // Crossword: solving marks progress (map pin turns green) but stays on this
  // screen instead of jumping to the map — the group returns via the
  // persistent map button whenever they're ready, not the instant they finish.
  puzzle2: (el) => initPuzzle2(el, { onSolved: () => onPuzzleSolved('puzzle2') }),
  puzzle3: (el) => initPuzzle3(el, { onSolved: () => completePuzzle('puzzle3') }),
  puzzle4: (el) => initPuzzle4(el, { onSolved: () => completePuzzle('puzzle4') }),
  // Riddle: reaching the last image marks progress silently; the forward
  // arrow itself no longer navigates (see puzzle5-riddle.js) — same
  // "stay on screen, leave via the map button" pattern as the crossword.
  puzzle5: (el) => initPuzzle5(el, { onContinue: () => onPuzzleSolved('puzzle5') }),
};

// --- Map screen (created first, so no puzzle failure can prevent it) ---
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
      // Letter stations are discovered without ever leaving the map screen,
      // so (unlike puzzle stations) there's no showScreen('map') call to
      // trigger a marker refresh — force one here so this station's marker
      // turns green immediately instead of waiting for the next pan/zoom.
      mapHandle.setView(state.lastMapView || INITIAL_MAP_VIEW);
    }
    if (renderFinalScreenIfReady()) {
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
  // Falls back to 'map' (same pattern as the initial-load call below) for
  // the case where the map is closed before any puzzle screen was ever
  // opened, i.e. state.lastOpenScreen is still falsy — otherwise
  // showScreen(undefined) hides every screen and blanks the page.
  showScreen(state.lastOpenScreen || 'map');
});
screens.map.appendChild(mapCloseButton);

// --- Start (title) screen ---
function initStartScreen() {
  const title = document.createElement('h1');
  title.className = 'start-title';
  title.textContent = 'ציד האוצר';

  const subtitle = document.createElement('p');
  subtitle.className = 'start-subtitle';
  subtitle.textContent = 'פתרו חידות, עקבו אחר המפה, וגלו את הקוד הסודי';

  const startButton = document.createElement('button');
  startButton.className = 'start-button';
  startButton.textContent = 'התחל';
  startButton.addEventListener('click', () => showScreen(state.lastOpenScreen || 'map'));

  screens.start.append(title, subtitle, startButton);
}
initStartScreen();

// --- Dev-only screen navigator (hidden by default; Ctrl+Shift+D toggles it) ---
// Lets whoever is building/testing the game jump directly to any screen and
// solve the current puzzle with a click, instead of navigating the map and
// solving each puzzle for real on every test run. Never meant to be seen
// during the live event — stays hidden unless explicitly toggled.
function devGoToScreen(screenId) {
  if (screenId === 'final') {
    // 'final' has no puzzleInitializer and is normally only ever populated by
    // the real onLetterStationClick flow — render it directly here so it can
    // be previewed on demand regardless of actual progress.
    renderFinalScreen(screens.final, {
      finalLetters: getFinalLetters(state) || '(אין אותיות עדיין)',
      onFinish: showThanks,
    });
  }
  showScreen(screenId);
}

function devStep(delta) {
  const index = SCREEN_ORDER.indexOf(currentScreenId);
  const nextIndex = Math.min(Math.max(index + delta, 0), SCREEN_ORDER.length - 1);
  devGoToScreen(SCREEN_ORDER[nextIndex]);
}

const devToolbar = document.createElement('div');
devToolbar.className = 'dev-toolbar';
devToolbar.hidden = true;
devToolbar.innerHTML = `
  <button type="button" data-dev="prev" title="מסך קודם">◀</button>
  <button type="button" data-dev="solve" title="פתור את החידה הנוכחית">פתור</button>
  <button type="button" data-dev="next" title="מסך הבא">▶</button>
`;
devToolbar.querySelector('[data-dev="prev"]').addEventListener('click', () => devStep(-1));
devToolbar.querySelector('[data-dev="next"]').addEventListener('click', () => devStep(1));
devToolbar.querySelector('[data-dev="solve"]').addEventListener('click', () => {
  // Prefer actually solving the puzzle on screen (arranging jigsaw pieces,
  // filling the crossword, etc.) so its own reveal/solved logic gets
  // exercised for real; falls back to the old instant-skip when the puzzle
  // hasn't rendered its interactive body yet (still on its intro speech) or
  // doesn't have a dev solve implemented.
  const handle = puzzleHandles[currentScreenId];
  if (handle?.devSolve) {
    handle.devSolve();
  } else if (puzzleInitializers[currentScreenId]) {
    completePuzzle(currentScreenId);
  }
});
document.body.appendChild(devToolbar);

// --- Hidden facilitator shortcuts (documented in README.md) ---

// event.code is the layout-independent physical key, which is what makes these
// shortcuts still work with the keyboard on a Hebrew layout (where event.key
// would be 'ר'/'ש'). event.key is kept as a fallback for the environments that
// don't populate event.code at all.
function isShortcutKey(event, code, letter) {
  return event.code === code || (event.key || '').toLowerCase() === letter;
}

window.addEventListener('keydown', (event) => {
  if (!event.ctrlKey || !event.shiftKey) return;
  if (isShortcutKey(event, 'KeyR', 'r')) {
    event.preventDefault();
    if (window.confirm('לאפס את המשחק? כל ההתקדמות תימחק.')) {
      storage.clear();
      window.location.reload();
    }
  } else if (isShortcutKey(event, 'KeyS', 's')) {
    event.preventDefault();
    // Escape hatch: mark the puzzle currently on screen as solved. Does
    // nothing on the map or the final screen.
    if (puzzleInitializers[currentScreenId]) {
      completePuzzle(currentScreenId);
    }
  } else if (isShortcutKey(event, 'KeyD', 'd')) {
    event.preventDefault();
    devToolbar.hidden = !devToolbar.hidden;
  }
});

// --- Initial screen on load ---
if (state.lastOpenScreen === 'final') {
  // A refresh while the final screen was open restores it via lastOpenScreen,
  // but that screen starts as an empty <div> in index.html and is otherwise
  // only ever populated by the live onLetterStationClick flow above — without
  // this, reloading here would show a blank screen despite the completed
  // state (letters, solved puzzles) being intact in localStorage.
  renderFinalScreenIfReady();
}
showScreen('start');
if (state.lastMapView) {
  mapHandle.setView(state.lastMapView);
}
