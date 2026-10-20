const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'trip',
    required: true,
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number.',
    },
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500,
    default: '',
  },
}, { timestamps: true });

Schema.index({ trip: 1, author: 1 }, { unique: true });
Schema.index({ driver: 1, createdAt: -1 });

const review = mongoose.models.Review || mongoose.model('Review', Schema);

module.exports = review;
