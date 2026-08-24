// Every station now uses the same 2.5km reveal radius, so a station appears
// on the map as soon as you're within that distance without needing to zoom
// in further first (radiusToMinZoom(2500) only requires zoom>=13).
const STATION_RADIUS_METERS = 2500;

export const STATIONS = [
  { id: 'station1', characterId: 'jorge', lat: 32.14974712062328, lng: 34.89164933523124, radiusMeters: STATION_RADIUS_METERS, puzzleId: 'puzzle1' },
  { id: 'station2', characterId: 'avi-boaz', lat: 31.926061323592833, lng: 35.22289356997514, radiusMeters: STATION_RADIUS_METERS, puzzleId: 'puzzle2' },
  { id: 'station3', characterId: 'uzi-hadrozi', lat: 32.00031663361575, lng: 34.87093250502946, radiusMeters: STATION_RADIUS_METERS, puzzleId: 'puzzle3' },
  { id: 'station4', characterId: 'uri-tabibi', lat: 31.813041345952158, lng: 34.66766424552365, radiusMeters: STATION_RADIUS_METERS, puzzleId: 'puzzle4' },
  { id: 'station5', characterId: 'kartoniv', lat: 39.72142461289615, lng: 21.63073125802075, radiusMeters: STATION_RADIUS_METERS, puzzleId: 'puzzle5' },
  { id: 'station6a', lat: 32.146385520181546, lng: 34.885977985309474, radiusMeters: STATION_RADIUS_METERS, letter: 'נ' },
  { id: 'station6b', lat: 32.0561318365665, lng: 34.85744273105274, radiusMeters: STATION_RADIUS_METERS, letter: 'ו' },
  { id: 'station6c', lat: 31.93541015911403, lng: 34.800815178235894, radiusMeters: STATION_RADIUS_METERS, letter: 'ע' },
  { id: 'station6d', lat: 32.095418630314704, lng: 34.868441921167744, radiusMeters: STATION_RADIUS_METERS, letter: 'מ' },
];

export const FINAL_STATION_IDS = ['station6a', 'station6b', 'station6c', 'station6d'];

export const INITIAL_MAP_VIEW = {
  center: { lat: 32.14974712062328, lng: 34.89164933523124 },
  zoom: 17,
};
