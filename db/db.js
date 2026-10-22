const mongoose = require('mongoose');
const config = require('../lib/config');
const { createLogger } = require('../lib/logger');

const logger = createLogger({ level: config.logLevel });

async function connectDB() {
  await mongoose.connect(config.mongoUri);
  logger.info('database_connected');
}

module.exports = connectDB;
