const test = require('node:test');
const assert = require('node:assert/strict');
const Trip = require('../models/publier');
const User = require('../models/signup');

test('the password is excluded from user queries by default', () => {
  assert.equal(User.schema.path('password').options.select, false);
});

test('trip keys and publication date are kept in sync', async () => {
  const trip = new Trip({
    depart: 'Béjaïa',
    arrivee: 'Alger',
    status: 'published',
  });

  await trip.validate();

  assert.equal(trip.departKey, 'bejaia');
  assert.equal(trip.arriveeKey, 'alger');
  assert.ok(trip.publishedAt instanceof Date);

  trip.depart = 'Sétif';
  trip.arrivee = 'Oran';
  await trip.validate();

  assert.equal(trip.departKey, 'setif');
  assert.equal(trip.arriveeKey, 'oran');
});

test('a draft does not receive a publication date', async () => {
  const trip = new Trip({ depart: 'Alger', status: 'draft' });

  await trip.validate();

  assert.equal(trip.publishedAt, null);
});
