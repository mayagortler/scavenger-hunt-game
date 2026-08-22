// js/map.js
import { STATIONS, INITIAL_MAP_VIEW } from './stations.js';
import { isStationVisible } from './geo.js';

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
