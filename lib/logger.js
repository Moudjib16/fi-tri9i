const crypto = require('crypto');

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

function serializeError(error) {
  if (!(error instanceof Error)) {
    return error;
  }
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
}

function createLogger({ level = 'info', stream = process.stdout } = {}) {
  const threshold = LEVELS[level] === undefined ? LEVELS.info : LEVELS[level];

  function write(entryLevel, message, fields = {}) {
    if (LEVELS[entryLevel] < threshold) {
      return;
    }
    const entry = {
      time: new Date().toISOString(),
      level: entryLevel,
      msg: message,
      ...fields,
    };
    if (entry.err) {
      entry.err = serializeError(entry.err);
    }
    stream.write(`${JSON.stringify(entry)}\n`);
  }

  return {
    debug: (message, fields) => write('debug', message, fields),
    info: (message, fields) => write('info', message, fields),
    warn: (message, fields) => write('warn', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}

function validRequestId(value) {
  return typeof value === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(value);
}

function requestLogger(logger) {
  return function logRequest(req, res, next) {
    const supplied = req.get('x-request-id');
    const requestId = validRequestId(supplied) ? supplied : crypto.randomUUID();
    const startedAt = process.hrtime.bigint();

    req.id = requestId;
    res.locals = res.locals || {};
    res.locals.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
      logger[level]('request', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        ip: req.ip,
        userAgent: req.get('user-agent') || '',
      });
    });

    next();
  };
}

const logger = createLogger();

module.exports = {
  createLogger,
  requestLogger,
  logger,
};
