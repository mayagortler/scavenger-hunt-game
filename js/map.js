// js/map.js
import { STATIONS, INITIAL_MAP_VIEW } from './stations.js';
import { isStationVisible } from './geo.js';

// Free, no-API-key place search via OpenStreetMap's Nominatim — consistent with
// the map tiles themselves. Exported (pure fetch wrapper) so it's easy to test
// in isolation from the DOM control that calls it.
export async function searchPlace(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const results = await response.json();
  return results[0] || null;
}

function addSearchControl(map) {
  const control = L.control({ position: 'topright' });

  control.onAdd = () => {
    const container = L.DomUtil.create('div', 'map-search-control');
    container.innerHTML = `
      <input type="text" class="map-search-input" placeholder="חיפוש מקום..." />
      <button type="button" class="map-search-button">חפש</button>
      <span class="map-search-status"></span>
    `;

    // A player typing/clicking inside this control must not pan/zoom the map underneath it.
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    const input = container.querySelector('.map-search-input');
    const button = container.querySelector('.map-search-button');
    const status = container.querySelector('.map-search-status');

    async function runSearch() {
      const query = input.value.trim();
      if (!query) return;
      status.textContent = 'מחפש...';
      try {
        const result = await searchPlace(query);
        if (!result) {
          status.textContent = 'לא נמצא';
          return;
        }
        const [south, north, west, east] = result.boundingbox.map(Number);
        map.fitBounds([[south, west], [north, east]]);
        status.textContent = '';
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

      const fillColor = isStationSolved(station) ? '#4caf50' : '#d8b34a';

      if (existing) {
        // Re-color in case it was solved/discovered since it was first drawn.
        existing.setStyle({ fillColor });
        continue;
      }

      const marker = L.circleMarker([station.lat, station.lng], {
        radius: 12,
        color: '#222',
        fillColor,
        fillOpacity: 0.9,
        weight: 2,
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
