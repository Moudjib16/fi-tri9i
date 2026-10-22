const Notification = require('../models/notification');
const User = require('../models/signup');
const { logger } = require('./logger');
const { sendNotificationEmail } = require('./email');

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
    logger.error('notification_insert_failed', { err });
  }

  try {
    const accounts = await User.find({ _id: { $in: recipients } })
      .select('name email emailNotifications')
      .lean();
    await Promise.all((accounts || [])
      .filter((account) => account.email && account.emailNotifications !== false)
      .map(async (account) => {
        try {
          await sendNotificationEmail(account, {
            type: options.type,
            body,
            tripId: options.tripId,
          });
        } catch (err) {
          logger.warn('notification_email_failed', {
            userId: String(account._id),
            err,
          });
        }
      }));
  } catch (err) {
    logger.error('notification_email_lookup_failed', { err });
  }
}

module.exports = { notifyUsers, participantIds };
