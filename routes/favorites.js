const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const Favorite = require('../models/favorite');
const { safeRedirect } = require('../lib/validation');
const { setFlash } = require('../lib/flash');
const { tripNotFound, serverError } = require('../lib/http');

const router = express.Router();

// Add or remove a trip from the favourites of the current user
router.post('/trajets/:id/favori', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return tripNotFound(res);
  }

  const tripUrl = `/trajets/${req.params.id}`;
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(tripUrl)}`);
  }

  try {
    const foundTrip = await trip.findById(req.params.id).lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }

    if (foundTrip.status !== 'published') {
      setFlash(req, 'error', 'Seuls les trajets publiés peuvent être mis en favori.');
      return res.redirect(tripUrl);
    }

    if (foundTrip.departureAt && new Date(foundTrip.departureAt) < new Date()) {
      setFlash(req, 'error', 'Ce trajet est déjà parti, il ne peut plus être mis en favori.');
      return res.redirect(tripUrl);
    }

    const driverId = foundTrip.driver
      ? String(foundTrip.driver._id || foundTrip.driver)
      : null;
    if (driverId === String(req.session.userId)) {
      setFlash(req, 'error', 'Vous ne pouvez pas mettre votre propre trajet en favori.');
      return res.redirect(tripUrl);
    }

    const existing = await Favorite.findOne({
      user: req.session.userId,
      trip: foundTrip._id,
    }).lean();

    if (existing) {
      await Favorite.deleteOne({
        user: req.session.userId,
        trip: foundTrip._id,
      });
      setFlash(req, 'success', 'Le trajet a été retiré de vos favoris.');
    } else {
      await Favorite.create({
        user: req.session.userId,
        trip: foundTrip._id,
      });
      setFlash(req, 'success', 'Le trajet a été ajouté à vos favoris.');
    }

    return res.redirect(safeRedirect(req.body.next) || tripUrl);
  } catch (err) {
    if (err && err.code === 11000) {
      setFlash(req, 'error', 'Ce trajet est déjà dans vos favoris.');
      return res.redirect(tripUrl);
    }
    console.error(err);
    return serverError(res);
  }
});

// Favourites of the current user
router.get('/mes-favoris', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/mes-favoris')}`);
  }

  try {
    const favorites = await Favorite.find({ user: req.session.userId })
      .populate({
        path: 'trip',
        select: 'depart depart0 arrivee arrivee0 dateData time price places places_taken status departureAt driverRating driverRatingCount',
        populate: { path: 'driver', select: 'name' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const trips = favorites
      .map((favorite) => favorite.trip)
      .filter((savedTrip) => savedTrip && savedTrip._id);

    return res.render('mes-favoris', {
      title: 'Mes favoris',
      trips,
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

module.exports = router;
