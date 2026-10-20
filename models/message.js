const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trip',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  },
}, { timestamps: true });

Schema.index({ trip: 1, createdAt: 1 });

const message = mongoose.models.Message || mongoose.model('Message', Schema);

module.exports = message;
