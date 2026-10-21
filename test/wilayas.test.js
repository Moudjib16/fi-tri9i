const test = require('node:test');
const assert = require('node:assert/strict');
const {
  WILAYAS,
  normalizePlace,
  findWilaya,
  isKnownWilaya,
  canonicalWilaya,
  communesFor,
  wilayaOptions,
} = require('../lib/wilayas');

test('the reference data lists the 58 wilayas with unique codes', () => {
  assert.equal(WILAYAS.length, 58);
  assert.equal(new Set(WILAYAS.map((wilaya) => wilaya.code)).size, 58);
  assert.equal(wilayaOptions().length, 58);
  assert.deepEqual(wilayaOptions()[0], { code: '01', name: 'Adrar', ar: 'أدرار' });
});

test('normalizePlace drops the accents and the case', () => {
  assert.equal(normalizePlace('Béjaïa'), 'bejaia');
  assert.equal(normalizePlace('  ALGER  '), 'alger');
  assert.equal(normalizePlace('El  Bayadh'), 'el bayadh');
  assert.equal(normalizePlace(''), '');
});

test('findWilaya matches a wilaya whatever the spelling', () => {
  assert.equal(findWilaya('Alger').name, 'Alger');
  assert.equal(findWilaya('alger').name, 'Alger');
  assert.equal(findWilaya('bejaia').name, 'Béjaïa');
  assert.equal(findWilaya('Béjaïa').name, 'Béjaïa');
  assert.equal(findWilaya('الجزائر').name, 'Alger');
  assert.equal(findWilaya('Atlantis'), null);
  assert.equal(findWilaya(''), null);
});

test('isKnownWilaya and canonicalWilaya guard the wilaya values', () => {
  assert.equal(isKnownWilaya('Oran'), true);
  assert.equal(isKnownWilaya('Narnia'), false);
  assert.equal(canonicalWilaya('oran'), 'Oran');
  assert.equal(canonicalWilaya('bejaia'), 'Béjaïa');
  assert.equal(canonicalWilaya('Narnia'), null);
});

test('communesFor suggests the communes of a wilaya', () => {
  assert.ok(communesFor('Alger').includes('Bab Ezzouar'));
  assert.ok(communesFor('bejaia').includes('Akbou'));
  assert.deepEqual(communesFor('Nowhere'), []);
  assert.deepEqual(communesFor(''), []);
});
