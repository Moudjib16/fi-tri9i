const mongoose = require('mongoose');
const { normalizePlace } = require('../lib/wilayas');

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
    // Estimated road distance between the two wilayas, in kilometres.
    distanceKm: {
        type: Number,
        default: 0,
        min: 0
    },
    passengers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
}, { timestamps: true });

// Keep the denormalised fields consistent even when a document is updated
// outside of the publishing wizard.
Schema.pre('validate', function syncDerivedFields() {
  if (this.isModified('depart') || !this.departKey) {
    this.departKey = normalizePlace(this.depart);
  }
  if (this.isModified('arrivee') || !this.arriveeKey) {
    this.arriveeKey = normalizePlace(this.arrivee);
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

Schema.index({ depart: 1, arrivee: 1 });
Schema.index({ departKey: 1, arriveeKey: 1 });
Schema.index({ driver: 1 });
Schema.index({ passengers: 1 });
Schema.index({ status: 1, departureAt: 1 });
Schema.index({ status: 1, departKey: 1, arriveeKey: 1, departureAt: 1 });
Schema.index({ driver: 1, status: 1, departureAt: 1 });
Schema.index({ status: 1, driverRating: -1, departureAt: 1 });
Schema.index({ status: 1, distanceKm: 1, departureAt: 1 });

const trip = mongoose.models.trip || mongoose.model('trip', Schema);

module.exports = trip;