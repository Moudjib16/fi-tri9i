const express = require('express');
const Notification = require('../models/notification');

const router = express.Router();

router.get('/notifications', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/notifications')}`);
  }

  try {
    const notifications = await Notification.find({ recipient: req.session.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    try {
      await Notification.updateMany(
        { recipient: req.session.userId, readAt: null },
        { $set: { readAt: new Date() } }
      );
    } catch (err) {
      console.error('Unable to mark notifications as read:', err.message);
    }

    res.locals.unreadNotifications = 0;
    return res.render('notifications', {
      title: 'Notifications',
      notifications,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load notifications' });
  }
});

module.exports = router;
