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
