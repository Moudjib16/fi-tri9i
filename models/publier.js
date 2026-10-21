const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['draft', 'published', 'cancelled', 'completed'],
        default: 'draft',
        index: true
    },
    publishedAt: {
        type: Date,
        default: null
    },
    depart: {
        type : String,
        required: true,
        trim: true
    },
    // Lowercase, accent free copy of the wilaya, used by the search filters.
    departKey: {
        type: String,
        trim: true,
        default: ''
    },
    depart0: {
        type : String,
        trim: true,
        default: ''
    },
    arrivee: {
        type : String,
        trim: true,
        default: ''
    },
    arriveeKey: {
        type: String,
        trim: true,
        default: ''
    },
    arrivee0: {
        type : String,
        trim: true,
        default: ''
    },
    dateData: {
        type : String,
        trim: true,
        default: ''
    },
    departureAt: {
        type: Date,
        default: null,
        index: true
    },
    time: {
        type : String,
        trim: true,
        default: ''
    },
    price: {
        type : String,
        trim: true,
        default: ''
    },
    priceDZD: {
        type: Number,
        default: null,
        min: 1,
        max: 100000
    },
        places: {
        type : Number,
        default: 1,
        min: 1,
        max: 5
    },
    places_taken: {
        type : Number,
        default: 0,
        min: 0
    },
    description:{
        type: String,
        trim: true,
        maxlength: 1000,
        default: ''
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    driverRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    driverRatingCount: {
        type: Number,
        default: 0,
        min: 0
    },
    passengers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
}, { timestamps: true });

Schema.index({ depart: 1, arrivee: 1 });
Schema.index({ departKey: 1, arriveeKey: 1 });
Schema.index({ driver: 1 });
Schema.index({ passengers: 1 });
Schema.index({ driverRating: -1, departureAt: 1 });

const trip = mongoose.models.trip || mongoose.model('trip', Schema);

module.exports = trip;