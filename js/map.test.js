// js/map.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSearchQuery, searchPlace } from './map.js';

test('resolveSearchQuery passes most queries through unchanged', () => {
  assert.equal(resolveSearchQuery('קפה גן סיפור פתח תקווה'), 'קפה גן סיפור פתח תקווה');
});

test('resolveSearchQuery rewrites known-broken Hebrew place names to a query that finds the right place', () => {
  assert.equal(resolveSearchQuery('מטאורה'), 'Meteora, Greece');
  assert.equal(resolveSearchQuery('  מטאורה  '), 'Meteora, Greece'); // tolerant of stray whitespace
  assert.equal(resolveSearchQuery('מטאורה יוון'), 'Meteora, Greece');
});

test('searchPlace sends the resolved query to Nominatim, not the raw Hebrew one', async () => {
  const originalFetch = global.fetch;
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = url;
    return { json: async () => [] };
  };
  try {
    await searchPlace('מטאורה');
  } finally {
    global.fetch = originalFetch;
  }
  assert.ok(requestedUrl.includes(encodeURIComponent('Meteora, Greece')));
});
