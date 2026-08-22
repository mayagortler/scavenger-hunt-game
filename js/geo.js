export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function radiusToMinZoom(radiusMeters) {
  if (radiusMeters <= 150) return 17;
  if (radiusMeters <= 400) return 16;
  return 13;
}

export function isStationVisible(mapView, station) {
  const distance = distanceMeters(
    mapView.center.lat,
    mapView.center.lng,
    station.lat,
    station.lng
  );
  return distance <= station.radiusMeters && mapView.zoom >= radiusToMinZoom(station.radiusMeters);
}
