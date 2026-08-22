// js/puzzles/puzzle4-videos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIDEO_ORDER,
  extractYouTubeId,
  youtubeThumbnailUrl,
  cardFrontImage,
  createVideoCards,
  isVideoOrderSolved,
} from './puzzle4-videos.js';

test('VIDEO_ORDER has the 6 links from the spec in order', () => {
  assert.equal(VIDEO_ORDER.length, 6);
  assert.equal(VIDEO_ORDER[0], 'https://share.google/nGTqH8IsAVXb0NTNg');
  assert.equal(VIDEO_ORDER[5], 'https://vt.tiktok.com/ZSVUp7Gb8/');
});

test('extractYouTubeId handles shorts and youtu.be formats', () => {
  assert.equal(extractYouTubeId('https://youtube.com/shorts/qpmFnUTkpL0?si=abc'), 'qpmFnUTkpL0');
  assert.equal(extractYouTubeId('https://youtu.be/fWKB8zdVM-U?si=xyz'), 'fWKB8zdVM-U');
});

test('extractYouTubeId returns null for non-YouTube links', () => {
  assert.equal(extractYouTubeId('https://vt.tiktok.com/ZSVfQhqqe/'), null);
  assert.equal(extractYouTubeId('https://share.google/nGTqH8IsAVXb0NTNg'), null);
});

test('youtubeThumbnailUrl builds the hqdefault thumbnail URL', () => {
  assert.equal(youtubeThumbnailUrl('abc123'), 'https://img.youtube.com/vi/abc123/hqdefault.jpg');
});

test('cardFrontImage returns a thumbnail for YouTube links and null otherwise', () => {
  assert.equal(cardFrontImage('https://youtu.be/fWKB8zdVM-U'), 'https://img.youtube.com/vi/fWKB8zdVM-U/hqdefault.jpg');
  assert.equal(cardFrontImage('https://vt.tiktok.com/ZSVfQhqqe/'), null);
});

test('createVideoCards builds 6 unplaced cards matching VIDEO_ORDER', () => {
  const cards = createVideoCards();
  assert.equal(cards.length, 6);
  assert.equal(cards[0].url, VIDEO_ORDER[0]);
  assert.equal(cards[0].correctSlot, 0);
  assert.equal(cards[0].currentSlot, null);
  assert.equal(cards[0].flipped, false);
});

test('isVideoOrderSolved requires every card correctly placed AND flipped', () => {
  let cards = createVideoCards().map((c) => ({ ...c, currentSlot: c.correctSlot }));
  assert.equal(isVideoOrderSolved(cards), false, 'not flipped yet');
  cards = cards.map((c) => ({ ...c, flipped: true }));
  assert.equal(isVideoOrderSolved(cards), true);
  cards[0].currentSlot = 5;
  assert.equal(isVideoOrderSolved(cards), false);
});
