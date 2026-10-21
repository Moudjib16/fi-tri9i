const test = require('node:test');
const assert = require('node:assert/strict');
const {
  haversineKm,
  distanceBetweenWilayas,
  estimateMinutes,
  formatDuration,
  tripDistance,
  tripDistanceOf,
  nearestWilaya,
} = require('../lib/distance');

test('haversineKm measures a known distance', () => {
  // Alger to Bejaia, about 180 km as the crow flies.
  const km = haversineKm({ lat: 36.7538, lon: 3.0588 }, { lat: 36.7509, lon: 5.0567 });
  assert.ok(km > 170 && km < 190, `unexpected distance ${km}`);
  assert.equal(haversineKm({ lat: 36, lon: 3 }, { lat: 36, lon: 3 }), 0);
});

test('distanceBetweenWilayas returns the estimated road distance', () => {
  const km = distanceBetweenWilayas('Alger', 'Béjaïa');
  assert.ok(km > 190 && km < 240, `unexpected distance ${km}`);
  assert.equal(distanceBetweenWilayas('Alger', 'Atlantis'), null);
  assert.equal(distanceBetweenWilayas('', 'Alger'), null);
});

test('estimateMinutes and formatDuration build a readable duration', () => {
  assert.equal(estimateMinutes(0), null);
  assert.equal(estimateMinutes(70), 75);
  assert.equal(formatDuration(75), '1 h 15');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(formatDuration(0), '');
});

test('tripDistance returns the distance and the duration of a trip', () => {
  const distance = tripDistance('Alger', 'Oran');
  assert.ok(distance.km > 380 && distance.km < 450, `unexpected distance ${distance.km}`);
  assert.match(distance.duration, /h/);
  assert.equal(tripDistance('Alger', 'Atlantis'), null);
});

test('tripDistanceOf uses the stored value when the trip has one', () => {
  const stored = tripDistanceOf({ depart: 'Alger', arrivee: 'Oran', distanceKm: 400 });
  assert.equal(stored.km, 400);
  assert.equal(stored.minutes, estimateMinutes(400));

  const computed = tripDistanceOf({ depart: 'Alger', arrivee: 'Oran' });
  assert.ok(computed.km > 380);
  assert.equal(tripDistanceOf(null), null);
});

test('nearestWilaya finds the closest wilaya of a point', () => {
  assert.equal(nearestWilaya(36.75, 3.05).name, 'Alger');
  assert.equal(nearestWilaya(35.70, -0.62).name, 'Oran');
  assert.equal(nearestWilaya('x', 'y'), null);
  assert.equal(nearestWilaya(NaN, NaN), null);
});
