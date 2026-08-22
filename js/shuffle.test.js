// js/shuffle.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffle } from './shuffle.js';

test('shuffle returns a new array holding exactly the same members', () => {
  const input = [1, 2, 3, 4, 5, 6];
  const out = shuffle(input, () => 0.99);
  assert.notEqual(out, input);
  assert.deepEqual([...out].sort((a, b) => a - b), input);
});

test('shuffle leaves its input untouched', () => {
  const input = [1, 2, 3, 4, 5, 6];
  shuffle(input, () => 0);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6]);
});

test('shuffle actually reorders (deterministic random)', () => {
  const out = shuffle([1, 2, 3, 4, 5, 6], () => 0);
  assert.notDeepEqual(out, [1, 2, 3, 4, 5, 6]);
});

test('shuffle handles empty and single-element arrays', () => {
  assert.deepEqual(shuffle([]), []);
  assert.deepEqual(shuffle(['only']), ['only']);
});
