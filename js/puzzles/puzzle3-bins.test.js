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
