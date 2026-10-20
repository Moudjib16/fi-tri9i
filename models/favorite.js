const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'trip',
        required: true,
        index: true
    },
}, { timestamps: true });

// A trip can only be saved once per user.
Schema.index({ user: 1, trip: 1 }, { unique: true });

const favorite = mongoose.models.Favorite || mongoose.model('Favorite', Schema);

module.exports = favorite;
