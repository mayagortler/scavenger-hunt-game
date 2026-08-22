import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceMeters, radiusToMinZoom, isStationVisible } from './geo.js';

test('distanceMeters is 0 for identical points', () => {
  assert.equal(distanceMeters(32.1, 34.9, 32.1, 34.9), 0);
});

test('distanceMeters is roughly correct for a known offset', () => {
  // ~0.001 degrees latitude is ~111 meters
  const d = distanceMeters(32.0, 34.0, 32.001, 34.0);
  assert.ok(d > 100 && d < 120, `expected ~111m, got ${d}`);
});

test('radiusToMinZoom tiers match the spec table', () => {
  assert.equal(radiusToMinZoom(100), 17);
  assert.equal(radiusToMinZoom(150), 17);
  assert.equal(radiusToMinZoom(200), 16);
  assert.equal(radiusToMinZoom(350), 16);
  assert.equal(radiusToMinZoom(400), 16);
  assert.equal(radiusToMinZoom(2500), 13);
});

test('isStationVisible requires both proximity and zoom', () => {
  const station = { lat: 32.0, lng: 34.0, radiusMeters: 100 };
  assert.equal(
    isStationVisible({ center: { lat: 32.0, lng: 34.0 }, zoom: 17 }, station),
    true
  );
  assert.equal(
    isStationVisible({ center: { lat: 32.0, lng: 34.0 }, zoom: 15 }, station),
    false,
    'close enough but not zoomed in enough'
  );
  assert.equal(
    isStationVisible({ center: { lat: 33.0, lng: 34.0 }, zoom: 17 }, station),
    false,
    'zoomed in enough but too far away'
  );
});
