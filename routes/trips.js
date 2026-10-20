const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const {
  pickString,
  escapeRegex,
  parseDateInput,
  isPastDate,
} = require('../lib/validation');
const { tripNotFound } = require('../lib/http');
const { setFlash } = require('../lib/flash');

const router = express.Router();

// Trip search / listing
router.get('/trajets', async (req, res) => {
  try {
    const depart = pickString(req.query.depart);
    const arrivee = pickString(req.query.arrivee);
    const date = pickString(req.query.date);
    const requestedPlaces = Number(req.query.places);
    const wantedPlaces = Number.isInteger(requestedPlaces) && requestedPlaces > 0 && requestedPlaces <= 5
      ? requestedPlaces
      : 1;
    const places = req.query.places ? wantedPlaces : '';
    const sortKey = ['soonest', 'price', 'recent'].includes(req.query.sort)
      ? req.query.sort
      : 'soonest';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = 10;

    const filter = { status: { $nin: ['draft', 'cancelled'] } };
    const conditions = [];

    if (depart) filter.depart = new RegExp(escapeRegex(depart), 'i');
    if (arrivee) filter.arrivee = new RegExp(escapeRegex(arrivee), 'i');
    filter.$expr = {
      $gte: [
        { $subtract: ['$places', { $ifNull: ['$places_taken', 0] }] },
        wantedPlaces,
      ],
    };

    const parsedDate = date ? parseDateInput(date) : null;
    if (parsedDate) {
      const start = parsedDate.date;
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      conditions.push({
        $or: [
          { departureAt: { $gte: start, $lt: end } },
          { departureAt: null, dateData: parsedDate.display },
        ],
      });
    } else {
      // Hide trips that already left; drafts without typed dates stay visible.
      conditions.push({
        $or: [
          { departureAt: { $gte: new Date() } },
          { departureAt: null },
        ],
      });
    }
    if (conditions.length) {
      filter.$and = conditions;
    }

    const total = await trip.countDocuments(filter);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const sortOptions = {
      soonest: { departureAt: 1, createdAt: -1 },
      price: { priceDZD: 1, departureAt: 1 },
      recent: { createdAt: -1 },
    };

    const trips = await trip
      .find(filter)
      .populate('driver', 'name')
      .sort(sortOptions[sortKey])
      .skip((currentPage - 1) * pageSize)
      .limit(pageSize)
      .lean();

    const queryParams = new URLSearchParams();
    if (depart) queryParams.set('depart', depart);
    if (arrivee) queryParams.set('arrivee', arrivee);
    if (date) queryParams.set('date', date);
    if (places) queryParams.set('places', String(places));
    if (sortKey !== 'soonest') queryParams.set('sort', sortKey);
    const baseQuery = queryParams.toString();

    return res.render('trajets', {
      stylesheet: 'trajets/',
      title: 'Trajets',
      trips,
      filters: { depart, arrivee, date, places, sort: sortKey },
      pagination: { total, page: currentPage, pages, baseQuery, pageSize },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load trips' });
  }
});

// Trip details
router.get('/trajets/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return tripNotFound(res);
  }

  try {
    const foundTrip = await trip.findById(req.params.id).populate('driver', 'name').lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }

    const userId = req.session.userId ? String(req.session.userId) : null;
    const passengerIds = (foundTrip.passengers || []).map(String);
    const driverId = foundTrip.driver
      ? String(foundTrip.driver._id || foundTrip.driver)
      : null;
    const isDriver = Boolean(userId && driverId === userId);
    const isBooked = Boolean(userId && passengerIds.includes(userId));
    const remaining = Math.max((foundTrip.places || 0) - (foundTrip.places_taken || 0), 0);
    const isDraft = foundTrip.status === 'draft';
    const hasDeparted = Boolean(foundTrip.departureAt && isPastDate(new Date(foundTrip.departureAt)));

    if (isDraft && !isDriver) {
      return tripNotFound(res);
    }

    const notice = req.query.published
      ? 'Votre trajet est publié.'
      : req.query.booked
        ? 'Votre place est réservée.'
        : '';

    return res.render('trajet', {
      stylesheet: 'trajet/',
      title: 'Détail du trajet',
      trip: foundTrip,
      isDriver,
      isBooked,
      isDraft,
      hasDeparted,
      remaining,
      notice,
      cancelled: req.query.cancelled ? 'Votre réservation a été annulée.' : '',
      error: req.query.error || '',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load trip' });
  }
});

// Reserve a seat
router.post('/trajets/:id/reserver', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const updatedTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $nin: ['draft', 'cancelled'] },
        driver: { $ne: req.session.userId },
        passengers: { $ne: req.session.userId },
        $expr: { $lt: [{ $ifNull: ['$places_taken', 0] }, '$places'] },
        $or: [
          { departureAt: { $gt: new Date() } },
          { departureAt: null },
        ],
      },
      {
        $push: { passengers: req.session.userId },
        $inc: { places_taken: 1 },
      },
      { new: true }
    );

    if (updatedTrip) {
      return res.redirect(`${tripUrl}?booked=1`);
    }

    const foundTrip = await trip.findById(req.params.id).lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }
    if (foundTrip.status === 'draft' || foundTrip.status === 'cancelled') {
      return res.redirect(`${tripUrl}?error=unavailable`);
    }
    if (foundTrip.departureAt && isPastDate(new Date(foundTrip.departureAt))) {
      return res.redirect(`${tripUrl}?error=past`);
    }
    if (foundTrip.driver && String(foundTrip.driver._id || foundTrip.driver) === String(req.session.userId)) {
      return res.redirect(`${tripUrl}?error=driver`);
    }
    if ((foundTrip.passengers || []).map(String).includes(String(req.session.userId))) {
      return res.redirect(`${tripUrl}?error=already`);
    }
    if ((foundTrip.places_taken || 0) >= (foundTrip.places || 0)) {
      return res.redirect(`${tripUrl}?error=full`);
    }
    return res.redirect(`${tripUrl}?error=unavailable`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${tripUrl}?error=unavailable`);
  }
});

// Cancel a reservation
router.post('/trajets/:id/annuler', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const updatedTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        passengers: req.session.userId,
        places_taken: { $gt: 0 },
      },
      {
        $pull: { passengers: req.session.userId },
        $inc: { places_taken: -1 },
      },
      { new: true }
    );

    return res.redirect(updatedTrip ? `${tripUrl}?cancelled=1` : `${tripUrl}?error=unavailable`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${tripUrl}?error=unavailable`);
  }
});

// Delete a published trip (driver only)
router.post('/trajets/:id/supprimer', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return tripNotFound(res);
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  try {
    const deletedTrip = await trip.findOneAndDelete({
      _id: req.params.id,
      driver: req.session.userId,
    });

    if (!deletedTrip) {
      return res.redirect(`/trajets/${req.params.id}?error=forbidden`);
    }

    if (String(req.session.tripId || '') === String(req.params.id)) {
      delete req.session.tripId;
    }
    setFlash(req, 'success', 'Le trajet a été supprimé.');
    return res.redirect('/mes-trajets');
  } catch (err) {
    console.error(err);
    return res.redirect(`/trajets/${req.params.id}?error=unavailable`);
  }
});

// Trips published and booked by the current user
router.get('/mes-trajets', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/mes-trajets')}`);
  }

  try {
    const [published, booked, drafts] = await Promise.all([
      trip.find({ driver: req.session.userId, status: { $nin: ['draft', 'cancelled'] } })
        .populate('passengers', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      trip.find({ passengers: req.session.userId })
        .populate('driver', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      trip.find({ driver: req.session.userId, status: 'draft' })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return res.render('mes-trajets', {
      stylesheet: 'mes-trajets/',
      title: 'Mes trajets',
      published,
      booked,
      drafts,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load your trips' });
  }
});

module.exports = router;
