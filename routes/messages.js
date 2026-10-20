const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const Message = require('../models/message');
const { pickString } = require('../lib/validation');
const { setFlash } = require('../lib/flash');
const { tripNotFound } = require('../lib/http');

const router = express.Router();

async function loadConversation(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    tripNotFound(res);
    return null;
  }

  const messagesUrl = `/trajets/${req.params.id}/messages`;
  if (!req.session.userId) {
    res.redirect(`/login?next=${encodeURIComponent(messagesUrl)}`);
    return null;
  }

  const foundTrip = await trip.findById(req.params.id).populate('driver', 'name').lean();
  if (!foundTrip || foundTrip.status === 'draft') {
    tripNotFound(res);
    return null;
  }

  const userId = String(req.session.userId);
  const driverId = foundTrip.driver
    ? String(foundTrip.driver._id || foundTrip.driver)
    : null;
  const passengerIds = (foundTrip.passengers || []).map(String);
  const isDriver = driverId === userId;
  const isPassenger = passengerIds.includes(userId);

  if (!isDriver && !isPassenger) {
    tripNotFound(res);
    return null;
  }

  return {
    trip: foundTrip,
    isDriver,
    driverName: foundTrip.driver && foundTrip.driver.name
      ? foundTrip.driver.name
      : 'Conducteur',
  };
}

async function loadMessages(tripId) {
  const messages = await Message.find({ trip: tripId })
    .populate('sender', 'name')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return messages.reverse();
}

async function renderConversation(req, res, conversation, options = {}) {
  const messages = await loadMessages(conversation.trip._id);
  return res.status(options.status || 200).render('messages', {
    title: 'Messages du trajet',
    trip: conversation.trip,
    isDriver: conversation.isDriver,
    driverName: conversation.driverName,
    messages,
    error: options.error || '',
    draft: options.draft || '',
  });
}

router.get('/trajets/:id/messages', async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) {
      return;
    }
    return await renderConversation(req, res, conversation);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load messages' });
  }
});

router.post('/trajets/:id/messages', async (req, res) => {
  try {
    const conversation = await loadConversation(req, res);
    if (!conversation) {
      return;
    }

    const draft = pickString(req.body.message);
    if (!draft) {
      return await renderConversation(req, res, conversation, {
        error: 'Écrivez un message avant de l’envoyer.',
        status: 400,
      });
    }
    if (draft.length > 1000) {
      return await renderConversation(req, res, conversation, {
        error: 'Le message est trop long.',
        draft,
        status: 400,
      });
    }

    await Message.create({
      trip: conversation.trip._id,
      sender: req.session.userId,
      body: draft,
    });
    setFlash(req, 'success', 'Message envoyé.');
    return res.redirect(`/trajets/${conversation.trip._id}/messages`);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to send message' });
  }
});

module.exports = router;
