const test = require('node:test');
const assert = require('node:assert/strict');
const { tripNotFound, serverError } = require('../lib/http');

function fakeResponse() {
  const calls = [];
  return {
    calls,
    status(code) {
      calls.push({ type: 'status', code });
      return this;
    },
    render(view, data) {
      calls.push({ type: 'render', view, data });
      return this;
    },
  };
}

test('serverError renders the shared error page', () => {
  const res = fakeResponse();
  serverError(res);

  assert.equal(res.calls[0].type, 'status');
  assert.equal(res.calls[0].code, 500);
  assert.equal(res.calls[1].type, 'render');
  assert.equal(res.calls[1].view, 'error');
  assert.equal(res.calls[1].data.status, 500);
  assert.equal(res.calls[1].data.heading, 'Une erreur est survenue');
  assert.match(res.calls[1].data.message, /Réessayez/);
});

test('serverError accepts a custom message', () => {
  const res = fakeResponse();
  serverError(res, 'Impossible de charger les trajets.');
  assert.equal(res.calls[1].data.message, 'Impossible de charger les trajets.');
});

test('tripNotFound renders the dedicated 404 page', () => {
  const res = fakeResponse();
  tripNotFound(res);

  assert.equal(res.calls[0].code, 404);
  assert.equal(res.calls[1].view, '404');
});
