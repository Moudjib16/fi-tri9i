const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trip',
    required: true,
  },
  type: {
    type: String,
    enum: ['booking', 'reservation_cancelled', 'trip_updated', 'trip_cancelled', 'message'],
    required: true,
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  readAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

Schema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const notification = mongoose.models.Notification
  || mongoose.model('Notification', Schema);

module.exports = notification;
