const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PASSWORD,
  EMAIL_DOMAIN,
  PEOPLE,
  TRIPS,
  tripSchedule,
  tripFields,
} = require('../lib/seedData');
const { parseDateInput, combineDepartureAt } = require('../lib/validation');

test('the demo data is complete and consistent', () => {
  assert.equal(PEOPLE.length, 6);
  assert.equal(TRIPS.length, 6);
  assert.ok(PEOPLE.some((person) => person.userType === 2));
  assert.ok(PEOPLE.some((person) => person.userType === 1));

  const emails = PEOPLE.map((person) => person.email);
  assert.equal(new Set(emails).size, PEOPLE.length);

  const drivers = PEOPLE.filter((person) => person.userType === 2).map((person) => person.email);
  TRIPS.forEach((trip) => {
    assert.ok(drivers.includes(trip.driver), `${trip.driver} is not a driver`);
  });

  // At least one trip already left, so the reviews have something to rate.
  assert.ok(TRIPS.some((trip) => trip.inDays < 0));
  assert.ok(TRIPS.some((trip) => trip.inDays > 0));
});

test('tripSchedule builds a matching date, label and time', () => {
  const schedule = tripSchedule(3, 7);

  assert.equal(schedule.departureAt.getUTCHours(), 7);
  assert.equal(schedule.departureAt.getUTCMinutes(), 0);
  assert.equal(schedule.time, '07 : 00');

  const parsed = parseDateInput(schedule.dateData);
  assert.ok(parsed);
  assert.match(schedule.dateData, /^\d{1,2} \S+ \d{4}$/);

  // The stored label and time rebuild the exact departure date.
  const combined = combineDepartureAt(schedule.dateData, schedule.time);
  assert.equal(combined.toISOString(), schedule.departureAt.toISOString());
});

test('tripFields stores the wilaya keys used by the search', () => {
  const item = TRIPS[0];
  const fields = tripFields(item, '64f000000000000000000001');

  assert.equal(fields.status, 'published');
  assert.equal(fields.depart, item.depart);
  assert.equal(fields.departKey, 'alger');
  assert.equal(fields.arriveeKey, 'bejaia');
  assert.equal(fields.price, `${item.price}da`);
  assert.equal(fields.priceDZD, item.price);
  assert.equal(fields.places, item.places);
  assert.equal(fields.places_taken, 0);
  assert.equal(fields.driver, '64f000000000000000000001');
});

test('the demo accounts share a known password', () => {
  assert.equal(PASSWORD, 'demo1234');
  assert.equal(EMAIL_DOMAIN, '@demo.dz');
  assert.ok(PASSWORD.length >= 6);
});
