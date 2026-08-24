// js/map.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSearchQuery, searchPlace, mergeSearchResults, googleMapsSearchUrl, spellingVariants } from './map.js';

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

test('spellingVariants toggles known כתיב מלא/כתיב חסר ambiguities, keeping the rest of the query intact', () => {
  assert.deepEqual(spellingVariants('קפה גן סיפור פתח תקוה'), [
    'קפה גן סיפור פתח תקוה',
    'קפה גן סיפור פתח תקווה',
  ]);
  assert.deepEqual(spellingVariants('פתח תקווה'), ['פתח תקווה', 'פתח תקוה']);
});

test('spellingVariants returns just the query unchanged when no known ambiguity applies', () => {
  assert.deepEqual(spellingVariants('בן גוריון'), ['בן גוריון']);
});

test('searchPlace retries with the alternate spelling when the literal query finds nothing, keeping full specificity', async () => {
  // The exact real-world case this fixes: "תקוה" (defective) finds nothing on
  // its own combined with a venue name, but "תקווה" (full) finds the exact
  // place — a precise fix, unlike dropping words out of the query, which
  // risks a wrong-but-plausible partial match on an unrelated business.
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    const q = new URL(url).searchParams.get('q');
    calls.push(q);
    if (q === 'קפה גן סיפור פתח תקווה') {
      return { json: async () => [{ place_id: 1, display_name: 'קפה גן סיפור' }] };
    }
    return { json: async () => [] };
  };
  let results;
  try {
    results = await searchPlace('קפה גן סיפור פתח תקוה');
  } finally {
    global.fetch = originalFetch;
  }
  assert.deepEqual(calls, ['קפה גן סיפור פתח תקוה', 'קפה גן סיפור פתח תקווה']);
  assert.deepEqual(results, [{ place_id: 1, display_name: 'קפה גן סיפור' }]);
});

test('searchPlace falls back to just the last word when the full query and its spelling variants all fail', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    const q = new URL(url).searchParams.get('q');
    calls.push(q);
    // Only the bare last word (in its full-spelling form) ever matches — both
    // full-query attempts (with either spelling) must fail first.
    if (q === 'תקווה') {
      return { json: async () => [{ place_id: 1, display_name: 'פתח תקווה' }] };
    }
    return { json: async () => [] };
  };
  let results;
  try {
    results = await searchPlace('איזה מקום לא ידוע תקוה');
  } finally {
    global.fetch = originalFetch;
  }
  assert.deepEqual(calls, [
    'איזה מקום לא ידוע תקוה', // full query, as typed
    'איזה מקום לא ידוע תקווה', // full query, spelling variant
    'תקוה', // last word alone
    'תקווה', // last word, spelling variant — this one matches
  ]);
  assert.deepEqual(results, [{ place_id: 1, display_name: 'פתח תקווה' }]);
});

test('searchPlace returns an empty array when every fallback attempt finds nothing', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ json: async () => [] });
  let results;
  try {
    results = await searchPlace('לא קיים בשום מקום');
  } finally {
    global.fetch = originalFetch;
  }
  assert.deepEqual(results, []);
});

test('googleMapsSearchUrl builds a query-prefilled Google Maps search link', () => {
  assert.equal(
    googleMapsSearchUrl('קפה גן סיפור פתח תקווה'),
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('קפה גן סיפור פתח תקווה')}`,
  );
});

test('googleMapsSearchUrl falls back to plain Google Maps for an empty query', () => {
  assert.equal(googleMapsSearchUrl(''), 'https://www.google.com/maps');
  assert.equal(googleMapsSearchUrl('   '), 'https://www.google.com/maps');
});
