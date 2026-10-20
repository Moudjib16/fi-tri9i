const test = require('node:test');
const assert = require('node:assert/strict');
const {
  pickString,
  safeRedirect,
  escapeRegex,
  dateToDisplay,
  parseDateInput,
  parseTimeInput,
  parsePriceInput,
  combineDepartureAt,
  isPastDate,
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

test('parseDateInput accepts ISO and calendar display formats', () => {
  assert.equal(parseDateInput('2030-12-12').display, '12 December 2030');
  assert.equal(parseDateInput('5 january 2030').display, '5 January 2030');
  assert.equal(parseDateInput('31 February 2030'), null);
  assert.equal(parseDateInput('12/12/2030'), null);
  assert.equal(parseDateInput(''), null);
});

test('parseTimeInput normalizes HH:MM values', () => {
  assert.equal(parseTimeInput('8:05').display, '08 : 05');
  assert.equal(parseTimeInput('23 : 59').display, '23 : 59');
  assert.equal(parseTimeInput('24:00'), null);
  assert.equal(parseTimeInput('08:60'), null);
  assert.equal(parseTimeInput('soon'), null);
});

test('parsePriceInput only accepts whole DA amounts in range', () => {
  assert.deepEqual(parsePriceInput('1200da'), { amount: 1200, display: '1200da' });
  assert.deepEqual(parsePriceInput('1 500 DA'), { amount: 1500, display: '1500da' });
  assert.equal(parsePriceInput('0'), null);
  assert.equal(parsePriceInput('12.5'), null);
  assert.equal(parsePriceInput('100001'), null);
  assert.equal(parsePriceInput('free'), null);
});

test('combineDepartureAt merges date and time and detects past dates', () => {
  const future = combineDepartureAt('12 December 2030', '08 : 30');
  assert.equal(future.toISOString(), '2030-12-12T08:30:00.000Z');
  assert.equal(combineDepartureAt('12 December 2030', ''), null);
  assert.equal(isPastDate(new Date('2000-01-01T00:00:00Z')), true);
  assert.equal(isPastDate(future), false);
});
