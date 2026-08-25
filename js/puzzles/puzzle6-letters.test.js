import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allFinalStationsDiscovered,
  createLetterTiles,
  swapTiles,
  tilesSpell,
  FINAL_TARGET_WORD,
} from './puzzle6-letters.js';

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

test('FINAL_TARGET_WORD is the 4-letter word the tiles must spell', () => {
  assert.equal(FINAL_TARGET_WORD, 'נועם');
  assert.equal(FINAL_TARGET_WORD.length, 4);
});

test('createLetterTiles seeds each tile into its own slot, in discovery order', () => {
  const tiles = createLetterTiles('מען');
  assert.deepEqual(tiles, [
    { id: 0, letter: 'מ', slot: 0 },
    { id: 1, letter: 'ע', slot: 1 },
    { id: 2, letter: 'ן', slot: 2 },
  ]);
});

test('swapTiles exchanges two tiles\' slots, immutably', () => {
  const tiles = createLetterTiles('מען');
  const swapped = swapTiles(tiles, 0, 2);
  assert.deepEqual(swapped, [
    { id: 0, letter: 'מ', slot: 2 },
    { id: 1, letter: 'ע', slot: 1 },
    { id: 2, letter: 'ן', slot: 0 },
  ]);
  assert.deepEqual(tiles[0], { id: 0, letter: 'מ', slot: 0 }, 'original untouched');
});

test('swapTiles is a no-op for an unknown tile id', () => {
  const tiles = createLetterTiles('מען');
  assert.deepEqual(swapTiles(tiles, 0, 99), tiles);
});

test('tilesSpell reads tiles out in slot order, not tile-array order', () => {
  let tiles = createLetterTiles('ומנע'); // wrong order as discovered
  assert.equal(tilesSpell(tiles, FINAL_TARGET_WORD), false);

  // Rearrange until it spells the target word: ו-מ-נ-ע -> נ-ו-ע-מ.
  tiles = swapTiles(tiles, 0, 2); // נ-מ-ו-ע
  tiles = swapTiles(tiles, 0, 3); // נ-מ-ע-ו
  tiles = swapTiles(tiles, 0, 1); // נ-ו-ע-מ
  assert.equal(tilesSpell(tiles, FINAL_TARGET_WORD), true);
});

test('tilesSpell matches with the real station data\'s non-final "מ", not just the sofit form', () => {
  // stations.js stores station6d's letter as plain 'מ', while FINAL_TARGET_WORD
  // is written the normal way a name is spelled, ending in the sofit 'ם'.
  const tiles = createLetterTiles('נועמ'); // already in the right order, non-final מ
  assert.equal(tilesSpell(tiles, FINAL_TARGET_WORD), true);
});
