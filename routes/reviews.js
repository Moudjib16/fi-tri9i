const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const Review = require('../models/review');
const { pickString } = require('../lib/validation');
const { setFlash } = require('../lib/flash');
const { tripNotFound, serverError } = require('../lib/http');
const { refreshDriverRating } = require('../lib/ratings');

const router = express.Router();

async function loadReviewableTrip(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    tripNotFound(res);
    return null;
  }

  const reviewUrl = `/trajets/${req.params.id}/avis`;
  if (!req.session.userId) {
    res.redirect(`/login?next=${encodeURIComponent(reviewUrl)}`);
    return null;
  }

  const foundTrip = await trip.findById(req.params.id).populate('driver', 'name').lean();
  if (!foundTrip) {
    tripNotFound(res);
    return null;
  }

  const userId = String(req.session.userId);
  const passengerIds = (foundTrip.passengers || []).map(String);
  const driverId = foundTrip.driver
    ? String(foundTrip.driver._id || foundTrip.driver)
    : null;
  const hasDeparted = Boolean(
    foundTrip.departureAt && new Date(foundTrip.departureAt) < new Date()
  );

  if (!passengerIds.includes(userId)) {
    setFlash(req, 'error', 'Seuls les passagers de ce trajet peuvent laisser un avis.');
    res.redirect(`/trajets/${req.params.id}`);
    return null;
  }

  if (foundTrip.status === 'cancelled' || !hasDeparted) {
    setFlash(req, 'error', 'Vous pourrez laisser un avis après la fin du trajet.');
    res.redirect(`/trajets/${req.params.id}`);
    return null;
  }

  return {
    trip: foundTrip,
    driverId,
    driverName: foundTrip.driver && foundTrip.driver.name
      ? foundTrip.driver.name
      : 'Conducteur',
  };
}

router.get('/trajets/:id/avis', async (req, res) => {
  try {
    const context = await loadReviewableTrip(req, res);
    if (!context) {
      return;
    }

    const existing = await Review.findOne({
      trip: context.trip._id,
      author: req.session.userId,
    }).lean();
    if (existing) {
      setFlash(req, 'error', 'Vous avez déjà laissé un avis pour ce trajet.');
      return res.redirect(`/conducteurs/${context.driverId}`);
    }

    return res.render('avis', {
      title: 'Laisser un avis',
      trip: context.trip,
      driverName: context.driverName,
      values: { rating: '', comment: '' },
      error: '',
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

router.post('/trajets/:id/avis', async (req, res) => {
  try {
    const context = await loadReviewableTrip(req, res);
    if (!context) {
      return;
    }

    const values = {
      rating: pickString(req.body.rating),
      comment: pickString(req.body.comment),
    };
    const rating = Number(values.rating);

    let error = '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      error = 'Choisissez une note entre 1 et 5.';
    } else if (values.comment.length > 500) {
      error = 'Le commentaire est trop long.';
    }

    if (error) {
      return res.status(400).render('avis', {
        title: 'Laisser un avis',
        trip: context.trip,
        driverName: context.driverName,
        values,
        error,
      });
    }

    const existing = await Review.findOne({
      trip: context.trip._id,
      author: req.session.userId,
    }).lean();
    if (existing) {
      setFlash(req, 'error', 'Vous avez déjà laissé un avis pour ce trajet.');
      return res.redirect(`/conducteurs/${context.driverId}`);
    }

    await Review.create({
      trip: context.trip._id,
      driver: context.driverId,
      author: req.session.userId,
      rating,
      comment: values.comment,
    });

    // Keep the rating stored on the driver trips up to date.
    await refreshDriverRating(context.driverId);

    setFlash(req, 'success', 'Merci, votre avis a été publié.');
    return res.redirect(`/conducteurs/${context.driverId}`);
  } catch (err) {
    if (err && err.code === 11000) {
      setFlash(req, 'error', 'Vous avez déjà laissé un avis pour ce trajet.');
      return res.redirect(`/trajets/${req.params.id}`);
    }
    console.error(err);
    return serverError(res);
  }
});

module.exports = router;
