// js/puzzles/puzzle2-crossword.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CROSSWORD_GRID,
  createEmptyUserGrid,
  setCellLetter,
  isCrosswordSolved,
  normalizeHebrewLetter,
  getClueNumberForRow,
  getClueStartCell,
  isFinalColumnSolved,
  FINAL_COLUMN,
} from './puzzle2-crossword.js';

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

test('normalizeHebrewLetter maps every final form to its base form and leaves others alone', () => {
  assert.equal(normalizeHebrewLetter('ם'), 'מ');
  assert.equal(normalizeHebrewLetter('ן'), 'נ');
  assert.equal(normalizeHebrewLetter('ך'), 'כ');
  assert.equal(normalizeHebrewLetter('ף'), 'פ');
  assert.equal(normalizeHebrewLetter('ץ'), 'צ');
  assert.equal(normalizeHebrewLetter('א'), 'א');
  assert.equal(normalizeHebrewLetter(''), '');
});

test('setCellLetter stores the base form so what is displayed matches what is compared', () => {
  const userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  assert.equal(setCellLetter(userGrid, 0, 5, 'ם')[0][5], 'מ');
  assert.equal(setCellLetter(userGrid, 1, 8, 'ן')[1][8], 'נ');
});

test('a grid filled using Hebrew final forms still solves', () => {
  // The 6 cells where the doc stores a non-final letter at a word ending; a
  // player will very likely type the final form in each of them.
  const finalFormCells = [
    [0, 5, 'ם'],
    [0, 11, 'ם'],
    [1, 8, 'ן'],
    [4, 10, 'ם'],
    [6, 9, 'ן'],
    [7, 8, 'ן'],
  ];
  const typedAt = new Map(finalFormCells.map(([r, c, ch]) => [`${r},${c}`, ch]));

  // Sanity-check the fixture still lines up with the transcribed grid.
  for (const [r, c, finalForm] of finalFormCells) {
    assert.equal(
      normalizeHebrewLetter(finalForm),
      CROSSWORD_GRID[r][c].letter,
      `cell (${r},${c}) should hold the base form of ${finalForm}`,
    );
  }

  let userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  for (let r = 0; r < CROSSWORD_GRID.length; r++) {
    for (let c = 0; c < CROSSWORD_GRID[r].length; c++) {
      if (!CROSSWORD_GRID[r][c]) continue;
      const typed = typedAt.get(`${r},${c}`) ?? CROSSWORD_GRID[r][c].letter;
      userGrid = setCellLetter(userGrid, r, c, typed);
    }
  }
  assert.equal(isCrosswordSolved(userGrid, CROSSWORD_GRID), true);
});

test('getClueNumberForRow returns the single clue number owning every cell in that row', () => {
  assert.equal(getClueNumberForRow(CROSSWORD_GRID[0]), 1);
  assert.equal(getClueNumberForRow(CROSSWORD_GRID[1]), 2);
  assert.equal(getClueNumberForRow(CROSSWORD_GRID[7]), 8);
});

test('FINAL_COLUMN reads "בן גוריון" top-to-bottom in the solution grid', () => {
  const letters = CROSSWORD_GRID.map((row) => row[FINAL_COLUMN].letter).join('');
  assert.equal(letters, 'בנגוריונ');
});

test('getClueStartCell finds where each clue begins, for jumping to the next clue', () => {
  assert.deepEqual(getClueStartCell(CROSSWORD_GRID, 1), { row: 0, col: 0 });
  assert.deepEqual(getClueStartCell(CROSSWORD_GRID, 2), { row: 1, col: 5 });
  assert.deepEqual(getClueStartCell(CROSSWORD_GRID, 8), { row: 7, col: 1 });
});

test('getClueStartCell returns null past the last clue', () => {
  assert.equal(getClueStartCell(CROSSWORD_GRID, 9), null);
});

test('isFinalColumnSolved only checks column 8, independent of the rest of the grid', () => {
  let userGrid = createEmptyUserGrid(CROSSWORD_GRID);
  assert.equal(isFinalColumnSolved(userGrid, CROSSWORD_GRID), false);

  for (let r = 0; r < CROSSWORD_GRID.length; r++) {
    userGrid = setCellLetter(userGrid, r, FINAL_COLUMN, CROSSWORD_GRID[r][FINAL_COLUMN].letter);
  }
  // Every other cell is still blank, yet the final column alone reports solved.
  assert.equal(isFinalColumnSolved(userGrid, CROSSWORD_GRID), true);
  assert.equal(isCrosswordSolved(userGrid, CROSSWORD_GRID), false);
});
