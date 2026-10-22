const test = require('node:test');
const assert = require('node:assert/strict');
const { backfillTrip } = require('../lib/tripMigration');
const { distanceBetweenWilayas } = require('../lib/distance');

test('backfillTrip fills the wilaya keys of a legacy trip', () => {
  const changes = backfillTrip({
    _id: '64f000000000000000000001',
    status: 'published',
    depart: 'Béjaïa',
    depart0: 'Akbou',
    arrivee: 'Alger',
    arrivee0: 'Bab Ezzouar',
    dateData: '12 December 2030',
    time: '08 : 00',
    price: '1200da',
  });

  assert.equal(changes.departKey, 'bejaia');
  assert.equal(changes.arriveeKey, 'alger');
  assert.equal(changes.dateData, '12 décembre 2030');
  assert.equal(changes.departureAt.toISOString(), '2030-12-12T07:00:00.000Z');
  assert.equal(changes.priceDZD, 1200);
  assert.equal(changes.price, '1200da');
});

test('backfillTrip leaves an up to date trip untouched', () => {
  const changes = backfillTrip({
    depart: 'Alger',
    departKey: 'alger',
    arrivee: 'Béjaïa',
    arriveeKey: 'bejaia',
    dateData: '12 décembre 2030',
    departureAt: new Date('2030-12-12T07:00:00.000Z'),
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    distanceKm: distanceBetweenWilayas('Alger', 'Béjaïa'),
  });

  assert.deepEqual(changes, {});
});

test('backfillTrip rebuilds a missing departure date', () => {
  const changes = backfillTrip({
    depart: 'Oran',
    arrivee: 'Tlemcen',
    dateData: '5 mars 2031',
    departureAt: null,
    time: '09 : 30',
    price: '900da',
    priceDZD: 900,
    distanceKm: distanceBetweenWilayas('Oran', 'Tlemcen'),
  });

  assert.equal(changes.departureAt.toISOString(), '2031-03-05T08:30:00.000Z');
});

test('backfillTrip keeps a trip without date or time as it is', () => {
  const changes = backfillTrip({
    depart: 'Oran',
    departKey: 'oran',
    arrivee: 'Tlemcen',
    arriveeKey: 'tlemcen',
    dateData: '',
    time: '',
    price: '',
    distanceKm: distanceBetweenWilayas('Oran', 'Tlemcen'),
  });

  assert.deepEqual(changes, {});
});

test('backfillTrip repairs a departure date that drifted from its label', () => {
  const changes = backfillTrip({
    depart: 'Alger',
    departKey: 'alger',
    arrivee: 'Oran',
    arriveeKey: 'oran',
    dateData: '20 mai 2031',
    departureAt: new Date('2031-05-15T08:00:00.000Z'),
    time: '07 : 15',
    price: '1500da',
    priceDZD: 1500,
  });

  assert.equal(changes.departureAt.toISOString(), '2031-05-20T06:15:00.000Z');
});

test('backfillTrip fills the typed price of an old trip', () => {
  const changes = backfillTrip({
    depart: 'Alger',
    departKey: 'alger',
    arrivee: 'Oran',
    arriveeKey: 'oran',
    dateData: '20 mai 2031',
    departureAt: new Date('2031-05-20T06:15:00.000Z'),
    time: '07 : 15',
    price: '1 500 da',
    priceDZD: null,
  });

  assert.equal(changes.priceDZD, 1500);
  assert.equal(changes.price, '1500da');
});
