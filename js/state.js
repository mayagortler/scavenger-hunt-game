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
