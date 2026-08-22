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
    // Re-apply the current view (a no-op pan/zoom-wise) so refreshMarkers()
    // runs and picks up any puzzle solved/letter discovered while this
    // screen was hidden — invalidateSize() alone only fixes tile sizing,
    // it doesn't recolor markers (see map.js: only setView()/moveend/
    // zoomend trigger refreshMarkers()).
    mapHandle.setView(state.lastMapView || INITIAL_MAP_VIEW);
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

function renderFinalScreenIfReady() {
  if (allFinalStationsDiscovered(state.letterDiscoveries)) {
    renderFinalScreen(screens.final, { finalLetters: getFinalLetters(state), onFinish: () => window.close() });
    return true;
  }
  return false;
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
  showScreen(state.lastOpenScreen);
});
screens.map.appendChild(mapCloseButton);

// --- Initial screen on load ---
if (state.lastOpenScreen === 'final') {
  // A refresh while the final screen was open restores it via lastOpenScreen,
  // but that screen starts as an empty <div> in index.html and is otherwise
  // only ever populated by the live onLetterStationClick flow above — without
  // this, reloading here would show a blank screen despite the completed
  // state (letters, solved puzzles) being intact in localStorage.
  renderFinalScreenIfReady();
}
showScreen(state.lastOpenScreen || 'map');
if (state.lastMapView) {
  mapHandle.setView(state.lastMapView);
}
