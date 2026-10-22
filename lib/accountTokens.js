const crypto = require('crypto');

const TOKEN_BYTES = 32;

function createToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function expiresInHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

module.exports = { createToken, hashToken, expiresInHours };
