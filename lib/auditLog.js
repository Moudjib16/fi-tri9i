const AuditLog = require('../models/auditLog');

const ACTION_LABELS = {
  'report.resolve': 'Signalement traité',
  'report.dismiss': 'Signalement classé',
  'trip.cancel': 'Trajet annulé',
  'user.suspend': 'Compte suspendu',
  'user.restore': 'Compte réactivé',
  'user.grant_admin': 'Rôle administrateur accordé',
  'user.revoke_admin': 'Rôle administrateur retiré',
};

function auditActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function recordModeration({
  actor,
  actorName = '',
  action,
  targetType,
  targetId,
  targetLabel = '',
  note = '',
  metadata = {},
}) {
  return AuditLog.create({
    actor,
    actorName,
    action,
    targetType,
    targetId,
    targetLabel,
    note,
    metadata,
  });
}

module.exports = {
  auditActionLabel,
  recordModeration,
};
