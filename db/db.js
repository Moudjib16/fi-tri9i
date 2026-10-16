const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/MyApp';

const connectDB = async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('DataBase Connected Successfully');
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
      process.exit(1); // Exit process with failure
    }
  };
  
module.exports = connectDB;