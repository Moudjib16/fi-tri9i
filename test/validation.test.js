const test = require('node:test');
const assert = require('node:assert/strict');
const {
  pickString,
  safeRedirect,
  escapeRegex,
  dateToDisplay,
} = require('../lib/validation');

test('pickString trims strings and rejects other types', () => {
  assert.equal(pickString('  Alger  '), 'Alger');
  assert.equal(pickString(''), '');
  assert.equal(pickString(undefined), '');
  assert.equal(pickString(null), '');
  assert.equal(pickString(42), '');
});

test('safeRedirect only accepts local paths', () => {
  assert.equal(safeRedirect('/trajets'), '/trajets');
  assert.equal(safeRedirect('/trajets/123?x=1'), '/trajets/123?x=1');
  assert.equal(safeRedirect('//evil.example'), '');
  assert.equal(safeRedirect('https://evil.example'), '');
  assert.equal(safeRedirect(undefined), '');
});

test('escapeRegex escapes regular expression characters', () => {
  assert.equal(escapeRegex('Alger (centre)'), 'Alger \\(centre\\)');
  assert.equal(escapeRegex('a+b*c?'), 'a\\+b\\*c\\?');
  assert.equal(escapeRegex('plain'), 'plain');
});

test('dateToDisplay converts ISO dates to wizard display format', () => {
  assert.equal(dateToDisplay('2024-12-12'), '12 December 2024');
  assert.equal(dateToDisplay('2026-01-05'), '5 January 2026');
  assert.equal(dateToDisplay('12/12/2024'), '');
  assert.equal(dateToDisplay('not-a-date'), '');
});
