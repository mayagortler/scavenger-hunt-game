// js/map.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSearchQuery, searchPlace, mergeSearchResults } from './map.js';

test('resolveSearchQuery passes most queries through unchanged', () => {
  assert.equal(resolveSearchQuery('קפה גן סיפור פתח תקווה'), 'קפה גן סיפור פתח תקווה');
});

test('resolveSearchQuery rewrites known-broken Hebrew place names to a query that finds the right place', () => {
  assert.equal(resolveSearchQuery('מטאורה'), 'Meteora, Greece');
  assert.equal(resolveSearchQuery('  מטאורה  '), 'Meteora, Greece'); // tolerant of stray whitespace
  assert.equal(resolveSearchQuery('מטאורה יוון'), 'Meteora, Greece');
});

test('mergeSearchResults keeps primary order and drops duplicates already present', () => {
  const primary = [{ place_id: 1, display_name: 'Meteora' }, { place_id: 2, display_name: 'Kalambaka' }];
  const extra = [{ place_id: 2, display_name: 'Kalambaka' }, { place_id: 3, display_name: 'Mathura' }];
  assert.deepEqual(mergeSearchResults(primary, extra), [
    { place_id: 1, display_name: 'Meteora' },
    { place_id: 2, display_name: 'Kalambaka' },
    { place_id: 3, display_name: 'Mathura' },
  ]);
});

test('mergeSearchResults falls back to display_name when place_id is missing', () => {
  const primary = [{ display_name: 'A' }];
  const extra = [{ display_name: 'A' }, { display_name: 'B' }];
  assert.deepEqual(mergeSearchResults(primary, extra), [{ display_name: 'A' }, { display_name: 'B' }]);
});

test('searchPlace sends only one request for a query with no alias', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    return { json: async () => [{ display_name: 'result' }] };
  };
  try {
    await searchPlace('קפה גן סיפור פתח תקווה');
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(calls.length, 1);
});

test('searchPlace queries both the corrected place and the literal query, merging results', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(url);
    if (url.includes(encodeURIComponent('Meteora, Greece'))) {
      return { json: async () => [{ place_id: 1, display_name: 'Meteora, Greece' }] };
    }
    return { json: async () => [{ place_id: 2, display_name: 'Mathura, India' }] };
  };
  let results;
  try {
    results = await searchPlace('מטאורה');
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal(calls.length, 2);
  assert.deepEqual(results, [
    { place_id: 1, display_name: 'Meteora, Greece' },
    { place_id: 2, display_name: 'Mathura, India' },
  ]);
});
