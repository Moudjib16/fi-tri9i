const mongoose = require('mongoose');
const config = require('../lib/config');

async function connectDB() {
  await mongoose.connect(config.mongoUri);
  console.log('DataBase Connected Successfully');
}

module.exports = connectDB;
