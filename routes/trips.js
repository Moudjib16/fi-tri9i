const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const {
  pickString,
  escapeRegex,
  parseDateInput,
  parseTimeInput,
  parsePriceInput,
  combineDepartureAt,
  isPastDate,
} = require('../lib/validation');
const { tripNotFound } = require('../lib/http');
const { setFlash } = require('../lib/flash');
const { notifyUsers } = require('../lib/notifications');

const router = express.Router();

const TRIP_ERROR_MESSAGES = {
  full: 'Ce trajet est complet.',
  already: 'Vous avez déjà réservé ce trajet.',
  driver: 'Vous ne pouvez pas réserver votre propre trajet.',
  past: 'Ce trajet est déjà parti.',
  forbidden: 'Vous ne pouvez pas supprimer ce trajet.',
  unavailable: 'Opération impossible pour le moment.',
};

function redirectWithTripError(req, res, tripUrl, code = 'unavailable') {
  setFlash(req, 'error', TRIP_ERROR_MESSAGES[code] || TRIP_ERROR_MESSAGES.unavailable);
  return res.redirect(tripUrl);
}

function currentUserName(res, fallback) {
  return res.locals.currentUser && res.locals.currentUser.name
    ? res.locals.currentUser.name
    : fallback;
}

function tripLabel(foundTrip) {
  return `${foundTrip.depart} → ${foundTrip.arrivee || 'destination à préciser'}`;
}

function editValuesFromTrip(foundTrip) {
  const parsedDate = parseDateInput(foundTrip.dateData);
  const parsedTime = parseTimeInput(foundTrip.time);
  const parsedPrice = parsePriceInput(foundTrip.price);

  return {
    depart: foundTrip.depart || '',
    depart0: foundTrip.depart0 || '',
    arrivee: foundTrip.arrivee || '',
    arrivee0: foundTrip.arrivee0 || '',
    date: parsedDate ? parsedDate.date.toISOString().slice(0, 10) : '',
    time: parsedTime
      ? `${String(parsedTime.hours).padStart(2, '0')}:${String(parsedTime.minutes).padStart(2, '0')}`
      : '',
    places: String(foundTrip.places || 1),
    price: String(foundTrip.priceDZD || (parsedPrice ? parsedPrice.amount : '')),
    description: foundTrip.description || '',
  };
}

function editValuesFromBody(body) {
  return {
    depart: pickString(body.depart),
    depart0: pickString(body.depart0),
    arrivee: pickString(body.arrivee),
    arrivee0: pickString(body.arrivee0),
    date: pickString(body.date),
    time: pickString(body.time),
    places: pickString(body.places),
    price: pickString(body.price),
    description: pickString(body.description),
  };
}

async function loadEditableTrip(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    tripNotFound(res);
    return null;
  }

  const editUrl = `/trajets/${req.params.id}/modifier`;
  if (!req.session.userId) {
    res.redirect(`/login?next=${encodeURIComponent(editUrl)}`);
    return null;
  }

  const foundTrip = await trip.findById(req.params.id);
  if (!foundTrip) {
    tripNotFound(res);
    return null;
  }

  const tripDriverId = foundTrip.driver
    ? String(foundTrip.driver._id || foundTrip.driver)
    : null;
  if (tripDriverId !== String(req.session.userId)) {
    tripNotFound(res);
    return null;
  }

  if (
    foundTrip.status !== 'published'
    || (foundTrip.departureAt && isPastDate(new Date(foundTrip.departureAt)))
  ) {
    setFlash(req, 'error', 'Ce trajet ne peut plus être modifié.');
    res.redirect(`/trajets/${req.params.id}`);
    return null;
  }

  return foundTrip;
}

// Edit a published trip (driver only)
router.get('/trajets/:id/modifier', async (req, res) => {
  try {
    const foundTrip = await loadEditableTrip(req, res);
    if (!foundTrip) {
      return;
    }

    return res.render('trajet-modifier', {
      title: 'Modifier le trajet',
      trip: foundTrip,
      values: editValuesFromTrip(foundTrip),
      error: '',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load edit form' });
  }
});

router.post('/trajets/:id/modifier', async (req, res) => {
  try {
    const foundTrip = await loadEditableTrip(req, res);
    if (!foundTrip) {
      return;
    }

    const values = editValuesFromBody(req.body);
    const parsedDate = parseDateInput(values.date);
    const parsedTime = parseTimeInput(values.time);
    const parsedPrice = parsePriceInput(values.price);
    const places = Number(values.places);
    const placesTaken = foundTrip.places_taken || 0;

    let error = '';
    if (!values.depart || !values.depart0 || !values.arrivee || !values.arrivee0) {
      error = 'Renseignez la wilaya et la commune de départ et d’arrivée.';
    } else if (!parsedDate || isPastDate(parsedDate.date)) {
      error = 'Choisissez une date future.';
    } else if (!parsedTime) {
      error = 'Choisissez une heure valide.';
    } else if (!Number.isInteger(places) || places < 1 || places > 5) {
      error = 'Le nombre de places doit être compris entre 1 et 5.';
    } else if (places < placesTaken) {
      error = `Ce trajet a déjà ${placesTaken} réservation${placesTaken === 1 ? '' : 's'}.`;
    } else if (!parsedPrice) {
      error = 'Indiquez un prix valide entre 1 et 100 000 DA.';
    } else if (values.description.length > 1000) {
      error = 'La description est trop longue.';
    }

    if (error) {
      return res.status(400).render('trajet-modifier', {
        title: 'Modifier le trajet',
        trip: foundTrip,
        values,
        error,
      });
    }

    foundTrip.depart = values.depart;
    foundTrip.depart0 = values.depart0;
    foundTrip.arrivee = values.arrivee;
    foundTrip.arrivee0 = values.arrivee0;
    foundTrip.dateData = parsedDate.display;
    foundTrip.time = parsedTime.display;
    foundTrip.departureAt = combineDepartureAt(parsedDate.display, parsedTime.display);
    foundTrip.places = places;
    foundTrip.price = parsedPrice.display;
    foundTrip.priceDZD = parsedPrice.amount;
    foundTrip.description = values.description;

    await foundTrip.save();
    await notifyUsers(foundTrip.passengers, {
      actor: req.session.userId,
      tripId: foundTrip._id,
      type: 'trip_updated',
      body: `Le trajet ${tripLabel(foundTrip)} a été modifié par ${currentUserName(res, 'le conducteur')}.`,
    });
    setFlash(req, 'success', 'Le trajet a été mis à jour.');
    return res.redirect(`/trajets/${foundTrip._id}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to update trip' });
  }
});

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
    const isCancelled = foundTrip.status === 'cancelled';
    const hasDeparted = Boolean(foundTrip.departureAt && isPastDate(new Date(foundTrip.departureAt)));

    if (isDraft && !isDriver) {
      return tripNotFound(res);
    }

    return res.render('trajet', {
      stylesheet: 'trajet/',
      title: 'Détail du trajet',
      trip: foundTrip,
      isDriver,
      isBooked,
      isDraft,
      isCancelled,
      hasDeparted,
      remaining,
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
      await notifyUsers([updatedTrip.driver], {
        actor: req.session.userId,
        tripId: updatedTrip._id,
        type: 'booking',
        body: `${currentUserName(res, 'Un passager')} a réservé une place sur le trajet ${tripLabel(updatedTrip)}.`,
      });
      setFlash(req, 'success', 'Votre place est réservée.');
      return res.redirect(tripUrl);
    }

    const foundTrip = await trip.findById(req.params.id).lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }
    if (foundTrip.status === 'draft' || foundTrip.status === 'cancelled') {
      return redirectWithTripError(req, res, tripUrl);
    }
    if (foundTrip.departureAt && isPastDate(new Date(foundTrip.departureAt))) {
      return redirectWithTripError(req, res, tripUrl, 'past');
    }
    if (foundTrip.driver && String(foundTrip.driver._id || foundTrip.driver) === String(req.session.userId)) {
      return redirectWithTripError(req, res, tripUrl, 'driver');
    }
    if ((foundTrip.passengers || []).map(String).includes(String(req.session.userId))) {
      return redirectWithTripError(req, res, tripUrl, 'already');
    }
    if ((foundTrip.places_taken || 0) >= (foundTrip.places || 0)) {
      return redirectWithTripError(req, res, tripUrl, 'full');
    }
    return redirectWithTripError(req, res, tripUrl);
  } catch (err) {
    console.error(err);
    return redirectWithTripError(req, res, tripUrl);
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
        $or: [
          { departureAt: { $gt: new Date() } },
          { departureAt: null },
        ],
      },
      {
        $pull: { passengers: req.session.userId },
        $inc: { places_taken: -1 },
      },
      { new: true }
    );

    if (updatedTrip) {
      await notifyUsers([updatedTrip.driver], {
        actor: req.session.userId,
        tripId: updatedTrip._id,
        type: 'reservation_cancelled',
        body: `${currentUserName(res, 'Un passager')} a annulé sa réservation sur le trajet ${tripLabel(updatedTrip)}.`,
      });
      setFlash(req, 'success', 'Votre réservation a été annulée.');
      return res.redirect(tripUrl);
    }
    return redirectWithTripError(req, res, tripUrl);
  } catch (err) {
    console.error(err);
    return redirectWithTripError(req, res, tripUrl);
  }
});

// Cancel a published trip (driver only)
router.post('/trajets/:id/annuler-trajet', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const cancelledTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        driver: req.session.userId,
        status: 'published',
        $or: [
          { departureAt: { $gt: new Date() } },
          { departureAt: null },
        ],
      },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!cancelledTrip) {
      return redirectWithTripError(req, res, tripUrl);
    }

    await notifyUsers(cancelledTrip.passengers, {
      actor: req.session.userId,
      tripId: cancelledTrip._id,
      type: 'trip_cancelled',
      body: `Le trajet ${tripLabel(cancelledTrip)} a été annulé par ${currentUserName(res, 'le conducteur')}.`,
    });
    setFlash(req, 'success', 'Le trajet a été annulé.');
    return res.redirect('/mes-trajets');
  } catch (err) {
    console.error(err);
    return redirectWithTripError(req, res, tripUrl);
  }
});

// Delete a draft (driver only)
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
      status: 'draft',
    });

    if (!deletedTrip) {
      return redirectWithTripError(req, res, `/trajets/${req.params.id}`, 'forbidden');
    }

    if (String(req.session.tripId || '') === String(req.params.id)) {
      delete req.session.tripId;
    }
    setFlash(req, 'success', 'Le trajet a été supprimé.');
    return res.redirect('/mes-trajets');
  } catch (err) {
    console.error(err);
    return redirectWithTripError(req, res, `/trajets/${req.params.id}`);
  }
});

// Trips published and booked by the current user
router.get('/mes-trajets', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/mes-trajets')}`);
  }

  try {
    const [published, booked, drafts, cancelledTrips] = await Promise.all([
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
      trip.find({ driver: req.session.userId, status: 'cancelled' })
        .sort({ updatedAt: -1 })
        .lean(),
    ]);

    return res.render('mes-trajets', {
      stylesheet: 'mes-trajets/',
      title: 'Mes trajets',
      published,
      booked,
      drafts,
      cancelledTrips,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load your trips' });
  }
});

module.exports = router;
