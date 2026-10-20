const Notification = require('../models/notification');

function uniqueIds(values) {
  return [...new Set(
    (values || [])
      .filter(Boolean)
      .map((value) => String(value._id || value))
  )];
}

function participantIds(tripDoc) {
  const driverId = tripDoc.driver ? tripDoc.driver._id || tripDoc.driver : null;
  return [driverId, ...(tripDoc.passengers || [])];
}

async function notifyUsers(recipientIds, options) {
  const actor = options.actor ? String(options.actor) : null;
  const recipients = uniqueIds(recipientIds).filter((id) => id !== actor);
  if (!recipients.length) {
    return;
  }

  const body = String(options.body || '').trim().slice(0, 300);
  if (!body) {
    return;
  }

  try {
    await Notification.insertMany(recipients.map((recipient) => ({
      recipient,
      actor: options.actor || null,
      trip: options.tripId,
      type: options.type,
      body,
    })));
  } catch (err) {
    console.error('Unable to create notifications:', err.message);
  }
}

module.exports = { notifyUsers, participantIds };
