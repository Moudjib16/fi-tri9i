const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const sessionSecret = process.env.SESSION_SECRET || 'fi-tri9i-dev-secret';
if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

const port = Number.parseInt(process.env.PORT, 10) || 3000;

module.exports = {
  env: NODE_ENV,
  isProduction,
  isTest,
  port,
  appUrl: process.env.APP_URL || `http://localhost:${port}`,
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/MyApp',
  sessionSecret,
  sessionTtlSeconds: 7 * 24 * 60 * 60,
  sessionMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  logLevel: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),
  rateLimitStore: process.env.RATE_LIMIT_STORE || (isTest ? 'memory' : 'mongo'),
  smtpUrl: process.env.SMTP_URL || '',
  emailFrom: process.env.EMAIL_FROM || 'Fi Tri9i <no-reply@fi-tri9i.dz>',
  emailVerificationTtlHours: 24,
  passwordResetTtlHours: 1,
};
