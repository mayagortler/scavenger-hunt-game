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
