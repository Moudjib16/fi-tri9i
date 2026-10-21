const { WILAYAS, findWilaya } = require('./wilayas');

const EARTH_RADIUS_KM = 6371;
// The roads are longer than the straight line between two wilayas.
const ROAD_FACTOR = 1.15;
const AVERAGE_SPEED_KMH = 70;
const DEPARTURE_BUFFER_MINUTES = 15;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

// Great circle distance between two points, in kilometres.
function haversineKm(from, to) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);

  const a = Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// The distance between two wilayas, in kilometres, or null when unknown.
function distanceBetweenWilayas(from, to) {
  const origin = findWilaya(from);
  const destination = findWilaya(to);
  if (!origin || !destination) {
    return null;
  }
  return Math.round(haversineKm(origin, destination) * ROAD_FACTOR);
}

// Rough driving time, in minutes.
function estimateMinutes(km) {
  if (!km || km <= 0) {
    return null;
  }
  return Math.round((km / AVERAGE_SPEED_KMH) * 60) + DEPARTURE_BUFFER_MINUTES;
}

// "3 h 40" for the users.
function formatDuration(minutes) {
  if (!minutes || minutes < 1) {
    return '';
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest} min`;
  }
  if (!rest) {
    return `${hours} h`;
  }
  return `${hours} h ${String(rest).padStart(2, '0')}`;
}

// The distance and the duration of a trip between two wilayas.
function tripDistance(depart, arrivee) {
  const km = distanceBetweenWilayas(depart, arrivee);
  if (km === null) {
    return null;
  }
  const minutes = estimateMinutes(km);
  return { km, minutes, duration: formatDuration(minutes) };
}

// The distance of a trip, using the value stored on the trip when it is
// known and computing it otherwise.
function tripDistanceOf(tripDoc) {
  if (!tripDoc) {
    return null;
  }
  if (typeof tripDoc.distanceKm === 'number' && tripDoc.distanceKm > 0) {
    const minutes = estimateMinutes(tripDoc.distanceKm);
    return { km: tripDoc.distanceKm, minutes, duration: formatDuration(minutes) };
  }
  return tripDistance(tripDoc.depart, tripDoc.arrivee);
}

// The closest wilaya of a point, used by the browser geolocation.
function nearestWilaya(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return null;
  }

  let closest = null;
  let closestDistance = Infinity;
  for (const wilaya of WILAYAS) {
    const distance = haversineKm({ lat, lon }, wilaya);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = wilaya;
    }
  }
  return closest;
}

module.exports = {
  haversineKm,
  distanceBetweenWilayas,
  estimateMinutes,
  formatDuration,
  tripDistance,
  tripDistanceOf,
  nearestWilaya,
};
