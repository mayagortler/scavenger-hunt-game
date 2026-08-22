// js/puzzles/puzzle1-jigsaw.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkTextAnswers, createJigsawPieces, placePiece, isJigsawComplete } from './puzzle1-jigsaw.js';

test('checkTextAnswers accepts correct answers case-insensitively with whitespace trimmed', () => {
  assert.equal(checkTextAnswers({ first: ' Berlin ', second: 'GERMANY', third: 'beer' }), true);
});

test('checkTextAnswers rejects wrong or missing answers', () => {
  assert.equal(checkTextAnswers({ first: 'Berlin', second: 'Germany', third: 'Wine' }), false);
  assert.equal(checkTextAnswers({ first: 'Berlin', second: '', third: 'Beer' }), false);
});

test('createJigsawPieces makes N unplaced pieces', () => {
  const pieces = createJigsawPieces(25);
  assert.equal(pieces.length, 25);
  assert.ok(pieces.every((p) => p.currentSlot === null));
});

test('placePiece updates only the targeted piece, immutably', () => {
  const pieces = createJigsawPieces(4);
  const next = placePiece(pieces, 2, 2);
  assert.equal(pieces[2].currentSlot, null, 'original unchanged');
  assert.equal(next[2].currentSlot, 2);
  assert.equal(next[0].currentSlot, null);
});

test('isJigsawComplete is true only when every piece is in its correct slot', () => {
  let pieces = createJigsawPieces(3);
  assert.equal(isJigsawComplete(pieces), false);
  pieces = placePiece(pieces, 0, 0);
  pieces = placePiece(pieces, 1, 1);
  pieces = placePiece(pieces, 2, 2);
  assert.equal(isJigsawComplete(pieces), true);
});
