const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createLogger, requestLogger } = require('../lib/logger');

function capture() {
  let output = '';
  return {
    stream: {
      write(chunk) {
        output += chunk;
      },
    },
    lines() {
      return output.trim().split('\n').filter(Boolean).map((line) => JSON.parse(line));
    },
  };
}

test('the logger writes structured JSON and serializes errors', () => {
  const sink = capture();
  const logger = createLogger({ level: 'info', stream: sink.stream });

  logger.info('server_started', { port: 3000 });
  logger.error('request_failed', { requestId: 'abc', err: new Error('boom') });

  const [started, failed] = sink.lines();
  assert.equal(started.level, 'info');
  assert.equal(started.msg, 'server_started');
  assert.equal(started.port, 3000);
  assert.match(started.time, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(failed.level, 'error');
  assert.equal(failed.requestId, 'abc');
  assert.equal(failed.err.name, 'Error');
  assert.equal(failed.err.message, 'boom');
  assert.match(failed.err.stack, /boom/);
});

test('the silent level disables output', () => {
  const sink = capture();
  const logger = createLogger({ level: 'silent', stream: sink.stream });
  logger.error('should_not_appear');
  assert.deepEqual(sink.lines(), []);
});

test('request logging reuses a safe request id and records the response', () => {
  const sink = capture();
  const logger = createLogger({ level: 'info', stream: sink.stream });
  const req = {
    method: 'GET',
    originalUrl: '/trajets?depart=Alger',
    ip: '127.0.0.1',
    get(name) {
      if (name === 'x-request-id') return 'request-123';
      if (name === 'user-agent') return 'test-agent';
      return '';
    },
  };
  const res = new EventEmitter();
  const headers = {};
  res.locals = {};
  res.statusCode = 404;
  res.setHeader = (name, value) => {
    headers[name] = value;
  };

  let called = false;
  requestLogger(logger)(req, res, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(req.id, 'request-123');
  assert.equal(res.locals.requestId, 'request-123');
  assert.equal(headers['X-Request-Id'], 'request-123');

  res.emit('finish');
  const [entry] = sink.lines();
  assert.equal(entry.msg, 'request');
  assert.equal(entry.level, 'warn');
  assert.equal(entry.status, 404);
  assert.equal(entry.path, '/trajets?depart=Alger');
});

test('request logging replaces an unsafe request id', () => {
  const sink = capture();
  const logger = createLogger({ level: 'info', stream: sink.stream });
  const req = {
    method: 'POST',
    originalUrl: '/login',
    ip: '127.0.0.1',
    get(name) {
      if (name === 'x-request-id') return 'invalid id!';
      return '';
    },
  };
  const res = new EventEmitter();
  res.locals = {};
  res.setHeader = () => {};

  requestLogger(logger)(req, res, () => {});
  assert.match(req.id, /^[0-9a-f-]{36}$/);
});
