// js/map.js
import { STATIONS, INITIAL_MAP_VIEW } from './stations.js';
import { isStationVisible } from './geo.js';

// A handful of Hebrew place names that come up in this game's clues but that
// Nominatim's free-text matching gets wrong: it has no Hebrew name tag for
// these places, so it fuzzy-matches the Hebrew spelling to an unrelated place
// with a similar-sounding transliterated name instead (e.g. "מטאורה" — the
// Greek rock monasteries — resolves to Mathura, India). Each entry maps the
// Hebrew query players are likely to type to a query string confirmed to find
// the right place.
export const SEARCH_ALIASES = {
  'מטאורה': 'Meteora, Greece',
  'מטאורה יוון': 'Meteora, Greece',
  'מטאורה, יוון': 'Meteora, Greece',
};

export function resolveSearchQuery(query) {
  return SEARCH_ALIASES[query.trim()] || query;
}

// Known "כתיב מלא"/"כתיב חסר" (full vs. defective spelling) ambiguities for
// place names that come up in this game — e.g. "פתח תקווה" vs "פתח תקוה".
// Whichever spelling isn't the one OSM happens to have tagged can silently
// return zero results, especially once combined with more words in the same
// query (a venue name in front of the city, say). Toggling it keeps the
// query exactly as specific as typed, so a match is still the exact place
// meant — not a fuzzy stand-in the way dropping words out of the query could be.
const SPELLING_VARIANT_PAIRS = [['תקווה', 'תקוה']];

export function spellingVariants(query) {
  const variants = new Set([query]);
  for (const [full, defective] of SPELLING_VARIANT_PAIRS) {
    if (query.includes(full)) variants.add(query.replaceAll(full, defective));
    if (query.includes(defective)) variants.add(query.replaceAll(defective, full));
  }
  return [...variants];
}

async function fetchNominatim(query) {
  // accept-language biases Nominatim's own multilingual name matching toward
  // Hebrew queries; limit=5 (not 1) so an ambiguous query can be resolved by
  // the group picking the right one, rather than silently taking whichever
  // result happened to rank first internally.
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=he&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  return response.json();
}

// Merges two result lists, keeping `primary`'s order first and dropping any
// `extra` entry that's already present (by Nominatim's own place_id, falling
// back to the display name if that's ever missing).
export function mergeSearchResults(primary, extra) {
  const seen = new Set(primary.map((r) => r.place_id ?? r.display_name));
  return [...primary, ...extra.filter((r) => !seen.has(r.place_id ?? r.display_name))];
}

// Free, no-API-key place search via OpenStreetMap's Nominatim — consistent with
// the map tiles themselves. Exported (pure fetch wrapper) so it's easy to test
// in isolation from the DOM control that calls it.
export async function searchPlace(query) {
  const resolvedQuery = resolveSearchQuery(query);
  if (resolvedQuery !== query) {
    // A known-tricky query (e.g. "מטאורה") gets both the corrected search
    // AND the group's literal query, so the place they actually need shows up
    // without hiding whatever else Nominatim would have returned on its own.
    const [aliasResults, rawResults] = await Promise.all([
      fetchNominatim(resolvedQuery),
      fetchNominatim(query),
    ]);
    return mergeSearchResults(aliasResults, rawResults);
  }

  // Only kicks in once the literal query truly finds nothing, so an
  // already-working search is never affected.
  for (const variant of spellingVariants(query)) {
    const results = await fetchNominatim(variant);
    if (results.length) return results;
  }

  // Last resort: a multi-word query ("קפה גן סיפור פתח תקווה") can still fail
  // as a whole even once spelling is fixed, so fall back to just the last
  // word (usually the city/place name) — the broadest, most-likely-tagged
  // part of the query, and specific enough on its own to rarely misfire the
  // way dropping words one at a time from the front risked doing (a wrong
  // but plausible-looking partial match on an unrelated business).
  const words = query.trim().split(/\s+/);
  if (words.length > 1) {
    for (const variant of spellingVariants(words[words.length - 1])) {
      const results = await fetchNominatim(variant);
      if (results.length) return results;
    }
  }

  return [];
}

// A plain Google Maps search link needs no API key (unlike the Places/
// Geocoding APIs, which require a billed Google Cloud project) — offered as
// a one-click fallback for whatever the embedded OSM-based search can't find.
export function googleMapsSearchUrl(query) {
  return query.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim())}` : 'https://www.google.com/maps';
}

function addSearchControl(map) {
  const control = L.control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-search-control');
    container.innerHTML = `
      <div class="map-search-row">
        <input type="text" class="map-search-input" placeholder="חיפוש מקום..." />
        <button type="button" class="map-search-button">חפש</button>
      </div>
      <span class="map-search-status"></span>
      <ul class="map-search-results" hidden></ul>
      <a class="map-search-google-link" target="_blank" rel="noopener">חפשו בגוגל מפות ↗</a>
    `;

    // A player typing/clicking inside this control must not pan/zoom the map underneath it.
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const input = container.querySelector('.map-search-input');
    const button = container.querySelector('.map-search-button');
    const status = container.querySelector('.map-search-status');
    const resultsEl = container.querySelector('.map-search-results');
    const googleLink = container.querySelector('.map-search-google-link');

    // Kept in sync with whatever's typed, so this always opens Google's own
    // search for the same query — no API key needed for a plain link like
    // this (unlike embedding Google's Places/Geocoding APIs, which do).
    googleLink.href = googleMapsSearchUrl('');
    input.addEventListener('input', () => {
      googleLink.href = googleMapsSearchUrl(input.value);
    });

    function goTo(result) {
      const [south, north, west, east] = result.boundingbox.map(Number);
      map.fitBounds([[south, west], [north, east]]);
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      status.textContent = '';
    }

    async function runSearch() {
      const query = input.value.trim();
      if (!query) return;
      status.textContent = 'מחפש...';
      resultsEl.hidden = true;
      resultsEl.innerHTML = '';
      try {
        const results = await searchPlace(query);
        if (!results.length) {
          status.textContent = 'לא נמצא';
          return;
        }
        // A free-text place name is often ambiguous ("מטאורה" matches more
        // than one place) — let the group pick the right result instead of
        // silently guessing which one Nominatim ranked first.
        if (results.length === 1) {
          goTo(results[0]);
          return;
        }
        status.textContent = '';
        results.forEach((result) => {
          const li = document.createElement('li');
          li.textContent = result.display_name;
          li.addEventListener('click', () => goTo(result));
          resultsEl.appendChild(li);
        });
        resultsEl.hidden = false;
      } catch {
        status.textContent = 'שגיאת חיפוש';
      }
    }

    button.addEventListener('click', runSearch);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') runSearch();
    });

    return container;
  };

  control.addTo(map);
}

// A map-pin/pushpin icon (not a plain dot) so a station reads clearly as a
// findable location on the map, in the same ink+stamp-red visual language as
// the rest of the game.
function createPinIcon(fillColor) {
  const svg = `
    <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0C7.6 0 0 7.6 0 17c0 12.7 17 27 17 27s17-14.3 17-27C34 7.6 26.4 0 17 0z"
            fill="${fillColor}" stroke="#241d13" stroke-width="2"/>
      <circle cx="17" cy="16" r="6" fill="#241d13" />
    </svg>
  `;
  return L.divIcon({
    className: 'station-pin',
    html: svg,
    iconSize: [34, 44],
    iconAnchor: [17, 42],
    popupAnchor: [0, -40],
  });
}

export function initMap(container, {
  initialView = INITIAL_MAP_VIEW,
  onPuzzleStationClick,
  onLetterStationClick,
  onViewChange,
  getSolvedPuzzleIds = () => [],
  getDiscoveredStationIds = () => [],
} = {}) {
  const map = L.map(container).setView([initialView.center.lat, initialView.center.lng], initialView.zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  addSearchControl(map);

  const markers = new Map();

  function currentView() {
    const center = map.getCenter();
    return { center: { lat: center.lat, lng: center.lng }, zoom: map.getZoom() };
  }

  function isStationSolved(station) {
    return station.puzzleId
      ? getSolvedPuzzleIds().includes(station.puzzleId)
      : getDiscoveredStationIds().includes(station.id);
  }

  function refreshMarkers() {
    const view = currentView();
    for (const station of STATIONS) {
      const visible = isStationVisible(view, station);
      const existing = markers.get(station.id);

      if (!visible) {
        if (existing) {
          map.removeLayer(existing);
          markers.delete(station.id);
        }
        continue;
      }

      const fillColor = isStationSolved(station) ? '#3f6b3a' : '#963c2f';

      if (existing) {
        // Re-color in case it was solved/discovered since it was first drawn.
        existing.setIcon(createPinIcon(fillColor));
        continue;
      }

      const marker = L.marker([station.lat, station.lng], {
        icon: createPinIcon(fillColor),
      }).addTo(map);

      marker.on('click', () => {
        if (station.puzzleId) {
          onPuzzleStationClick?.(station);
        } else {
          // Source doc: "בלחיצה על הסימון, תיפתח תיבה שתכיל אות אחת" — clicking a
          // letter station must show the player its letter. Bound on every click
          // (not only the first discovery) so re-clicking a green, already-found
          // station shows the letter again. Opened before the callback so the
          // popup is up regardless of what the callback does to the map/screen.
          marker
            .bindPopup(`<div class="letter-box">${station.letter}</div>`, {
              className: 'letter-popup',
              closeButton: true,
            })
            .openPopup();
          onLetterStationClick?.(station);
        }
      });

      markers.set(station.id, marker);
    }
  }

  map.on('moveend zoomend', () => {
    refreshMarkers();
    onViewChange?.(currentView());
  });

  refreshMarkers();

  return {
    setView(view) {
      map.setView([view.center.lat, view.center.lng], view.zoom);
      refreshMarkers();
    },
    invalidateSize() {
      // Leaflet caches container size; call this after un-hiding the map's
      // screen div (display:none -> block) or tiles render blank/offset.
      map.invalidateSize();
    },
    destroy() {
      map.remove();
    },
  };
}
