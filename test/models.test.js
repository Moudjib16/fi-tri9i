const test = require('node:test');
const assert = require('node:assert/strict');
const Trip = require('../models/publier');
const User = require('../models/signup');

test('the password is excluded from user queries by default', () => {
  assert.equal(User.schema.path('password').options.select, false);
});

test('account token hashes are hidden and new tokens are single-use fields', () => {
  assert.equal(User.schema.path('emailVerificationTokenHash').options.select, false);
  assert.equal(User.schema.path('emailVerificationExpires').options.select, false);
  assert.equal(User.schema.path('passwordResetTokenHash').options.select, false);
  assert.equal(User.schema.path('passwordResetExpires').options.select, false);

  const user = new User({ name: 'Sara', email: 'sara@test.dz', password: 'secret1', userType: 1 });
  assert.equal(user.emailVerified, true);
  assert.equal(user.emailNotifications, true);
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
