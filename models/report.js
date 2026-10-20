const mongoose = require('mongoose');
const { REPORT_REASONS } = require('../lib/reports');

const Schema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    targetType: {
        type: String,
        enum: ['trip', 'user'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    reason: {
        type: String,
        enum: REPORT_REASONS.map((reason) => reason.value),
        required: true
    },
    message: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    status: {
        type: String,
        enum: ['open', 'resolved', 'dismissed'],
        default: 'open',
        index: true
    },
    adminNote: {
        type: String,
        trim: true,
        maxlength: 500,
        default: ''
    },
    resolvedAt: {
        type: Date,
        default: null
    },
}, { timestamps: true });

Schema.index({ reporter: 1, targetType: 1, targetId: 1 });
Schema.index({ status: 1, createdAt: -1 });

const report = mongoose.models.Report || mongoose.model('Report', Schema);

module.exports = report;
