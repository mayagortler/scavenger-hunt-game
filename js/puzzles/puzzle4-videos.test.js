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
  getEmbedInfo,
} from './puzzle4-videos.js';
import { shuffle } from '../shuffle.js';

test('VIDEO_ORDER has the 6 updated YouTube links in order', () => {
  assert.equal(VIDEO_ORDER.length, 6);
  assert.equal(VIDEO_ORDER[0], 'https://www.youtube.com/watch?v=ooOELrGMn14');
  assert.equal(VIDEO_ORDER[5], 'https://www.youtube.com/shorts/w03oC4C8IkY');
});

test('extractYouTubeId handles shorts, youtu.be, and watch?v= formats', () => {
  assert.equal(extractYouTubeId('https://youtube.com/shorts/qpmFnUTkpL0?si=abc'), 'qpmFnUTkpL0');
  assert.equal(extractYouTubeId('https://youtu.be/fWKB8zdVM-U?si=xyz'), 'fWKB8zdVM-U');
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=ooOELrGMn14'), 'ooOELrGMn14');
});

test('extractYouTubeId returns null for non-YouTube links', () => {
  assert.equal(extractYouTubeId('https://example.com/not-a-video'), null);
});

test('youtubeThumbnailUrl builds the hqdefault thumbnail URL', () => {
  assert.equal(youtubeThumbnailUrl('abc123'), 'https://img.youtube.com/vi/abc123/hqdefault.jpg');
});

test('cardFrontImage returns a thumbnail for YouTube links and null otherwise', () => {
  assert.equal(cardFrontImage('https://youtu.be/fWKB8zdVM-U'), 'https://img.youtube.com/vi/fWKB8zdVM-U/hqdefault.jpg');
  assert.equal(cardFrontImage('https://example.com/not-a-video'), null);
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

test('getEmbedInfo resolves every link in VIDEO_ORDER to a playable YouTube id', () => {
  for (const url of VIDEO_ORDER) {
    assert.deepEqual(getEmbedInfo(url), { type: 'youtube', id: extractYouTubeId(url) });
  }
});

test('getEmbedInfo returns null for a URL it has no way to embed', () => {
  assert.equal(getEmbedInfo('https://example.com/not-a-video'), null);
});

test('shuffling the cards scrambles tray order without touching correctSlot', () => {
  // Deterministic "random" that always picks index 0, which reverses-ish the
  // array — enough to prove the display order moves while the answer does not.
  const shuffled = shuffle(createVideoCards(), () => 0);
  assert.notDeepEqual(shuffled.map((c) => c.id), [0, 1, 2, 3, 4, 5]);
  for (const card of shuffled) {
    assert.equal(card.correctSlot, card.id, 'correctSlot still matches VIDEO_ORDER position');
    assert.equal(card.url, VIDEO_ORDER[card.correctSlot]);
  }
});
