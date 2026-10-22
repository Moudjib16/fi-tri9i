const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const sessionSecret = process.env.SESSION_SECRET || 'fi-tri9i-dev-secret';
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

module.exports = {
  env: NODE_ENV,
  isProduction,
  isTest,
  port: Number.parseInt(process.env.PORT, 10) || 3000,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/MyApp',
  sessionSecret,
  sessionTtlSeconds: 7 * 24 * 60 * 60,
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
};
