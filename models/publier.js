const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
    depart: {
        type : String,
        required: true,
        trim: true
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
    places: {
        type : Number,
        default: 1,
        min: 1,
        max: 8
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
        type : mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    passengers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
}, { timestamps: true });

Schema.index({ depart: 1, arrivee: 1 });
Schema.index({ driver: 1 });
Schema.index({ passengers: 1 });

const trip = mongoose.models.trip || mongoose.model('trip', Schema);

module.exports = trip;