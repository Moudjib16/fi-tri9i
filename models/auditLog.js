const mongoose = require('mongoose');

const Schema = new mongoose.Schema({
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  actorName: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ''
  },
  action: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60
  },
  targetType: {
    type: String,
    enum: ['report', 'trip', 'user'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  targetLabel: {
    type: String,
    trim: true,
    maxlength: 240,
    default: ''
  },
  note: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

Schema.index({ createdAt: -1 });
Schema.index({ action: 1, createdAt: -1 });
Schema.index({ targetType: 1, targetId: 1, createdAt: -1 });

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', Schema);

module.exports = AuditLog;
