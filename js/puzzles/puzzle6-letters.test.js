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
