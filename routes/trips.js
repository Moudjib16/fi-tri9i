const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const Review = require('../models/review');
const Favorite = require('../models/favorite');
const {
  pickString,
  escapeRegex,
  parseDateInput,
  parseTimeInput,
  parsePriceInput,
  combineDepartureAt,
  isPastDate,
  formatDateIso,
} = require('../lib/validation');
const { tripNotFound, serverError } = require('../lib/http');
const { setFlash } = require('../lib/flash');
const { notifyUsers } = require('../lib/notifications');
const { canonicalWilaya, communesFor, normalizePlace } = require('../lib/wilayas');
const { distanceBetweenWilayas } = require('../lib/distance');
const { effectiveStatus, isPastDeparture } = require('../lib/tripStatus');

const router = express.Router();

const MAX_SEATS_PER_TRIP = 5;

const TRIP_ERROR_MESSAGES = {
  full: 'Ce trajet est complet.',
  already: 'Vous avez déjà réservé ce trajet.',
  driver: 'Vous ne pouvez pas réserver votre propre trajet.',
  past: 'Ce trajet est déjà parti.',
  forbidden: 'Vous ne pouvez pas supprimer ce trajet.',
  unavailable: 'Opération impossible pour le moment.',
};

// The number of seats a passenger asked for, capped to the maximum of a trip.
function requestedSeats(value) {
  const seats = Number.parseInt(value, 10);
  if (!Number.isInteger(seats) || seats < 1) {
    return 1;
  }
  return Math.min(seats, MAX_SEATS_PER_TRIP);
}

// How many seats a passenger booked on a trip.
function seatCountFor(tripDoc, userId) {
  return (tripDoc.passengers || [])
    .filter((passenger) => String(passenger) === String(userId))
    .length;
}

function redirectWithTripError(req, res, tripUrl, code = 'unavailable', freeSeats = 0) {
  let message = TRIP_ERROR_MESSAGES[code] || TRIP_ERROR_MESSAGES.unavailable;
  if (code === 'seats') {
    message = freeSeats > 0
      ? `Il ne reste que ${freeSeats} place${freeSeats === 1 ? '' : 's'} sur ce trajet.`
      : 'Ce trajet est complet.';
  }
  setFlash(req, 'error', message);
  return res.redirect(tripUrl);
}

// "08" -> "08:00", the format expected by <input type="time">.
function formatHour(hour) {
  return `${String(hour).padStart(2, '0')}:00`;
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
      departCommunes: communesFor(foundTrip.depart),
      arriveeCommunes: communesFor(foundTrip.arrivee),
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
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
    const canonicalDepart = canonicalWilaya(values.depart);
    const canonicalArrivee = canonicalWilaya(values.arrivee);

    let error = '';
    if (!values.depart || !values.depart0 || !values.arrivee || !values.arrivee0) {
      error = 'Renseignez la wilaya et la commune de départ et d’arrivée.';
    } else if (!canonicalDepart || !canonicalArrivee) {
      error = 'Choisissez une wilaya valide pour le départ et l’arrivée.';
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
        departCommunes: communesFor(values.depart),
        arriveeCommunes: communesFor(values.arrivee),
      });
    }

    foundTrip.depart = canonicalDepart;
    foundTrip.departKey = normalizePlace(canonicalDepart);
    foundTrip.depart0 = values.depart0;
    foundTrip.arrivee = canonicalArrivee;
    foundTrip.arriveeKey = normalizePlace(canonicalArrivee);
    foundTrip.arrivee0 = values.arrivee0;
    foundTrip.dateData = parsedDate.display;
    foundTrip.time = parsedTime.display;
    foundTrip.departureAt = combineDepartureAt(parsedDate.display, parsedTime.display);
    foundTrip.places = places;
    foundTrip.price = parsedPrice.display;
    foundTrip.priceDZD = parsedPrice.amount;
    foundTrip.description = values.description;
    foundTrip.distanceKm = distanceBetweenWilayas(foundTrip.depart, foundTrip.arrivee) || 0;

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
    return serverError(res);
  }
});

// Trip search / listing
router.get('/trajets', async (req, res) => {
  try {
    const depart = pickString(req.query.depart);
    const arrivee = pickString(req.query.arrivee);
    // Only keep a date the app understands, so pagination links stay valid.
    const date = formatDateIso(pickString(req.query.date));
    const requestedPlaces = Number(req.query.places);
    const wantedPlaces = Number.isInteger(requestedPlaces) && requestedPlaces > 0 && requestedPlaces <= 5
      ? requestedPlaces
      : 1;
    const places = req.query.places ? wantedPlaces : '';
    const sortKey = ['soonest', 'price', 'recent', 'rating', 'distance'].includes(req.query.sort)
      ? req.query.sort
      : 'soonest';
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = 10;

    // Only published rides are searchable: drafts are private, cancelled and
    // completed rides belong to their participants' history.
    const filter = { status: 'published' };
    const conditions = [];

    if (depart) {
      // The accent free key matches "bejaia" and "Béjaïa" alike, the raw
      // field keeps older trips without a key reachable.
      conditions.push({
        $or: [
          { departKey: new RegExp(escapeRegex(normalizePlace(depart)), 'i') },
          { depart: new RegExp(escapeRegex(depart), 'i') },
        ],
      });
    }
    if (arrivee) {
      conditions.push({
        $or: [
          { arriveeKey: new RegExp(escapeRegex(normalizePlace(arrivee)), 'i') },
          { arrivee: new RegExp(escapeRegex(arrivee), 'i') },
        ],
      });
    }
    filter.$expr = {
      $gte: [
        { $subtract: ['$places', { $ifNull: ['$places_taken', 0] }] },
        wantedPlaces,
      ],
    };

    const minPrice = Number.parseInt(req.query.prixMin, 10);
    const maxPrice = Number.parseInt(req.query.prixMax, 10);
    const priceFilter = {};
    if (Number.isInteger(minPrice) && minPrice > 0) {
      priceFilter.$gte = minPrice;
    }
    if (Number.isInteger(maxPrice) && maxPrice > 0) {
      priceFilter.$lte = maxPrice;
    }
    if (Object.keys(priceFilter).length) {
      filter.priceDZD = priceFilter;
    }

    const parsedDate = date ? parseDateInput(date) : null;
    if (parsedDate) {
      const start = parsedDate.date;
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      conditions.push({
        $or: [
          { departureAt: { $gte: start, $lt: end } },
          // Legacy drafts have no typed date yet, so match the stored label too.
          { departureAt: null, dateData: { $in: [parsedDate.display, parsedDate.displayEn] } },
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

    const hourFilter = {};
    const startHour = Number.parseInt(req.query.heureDebut, 10);
    const endHour = Number.parseInt(req.query.heureFin, 10);
    if (Number.isInteger(startHour) && startHour >= 0 && startHour <= 23) {
      hourFilter.$gte = startHour;
    }
    if (Number.isInteger(endHour) && endHour >= 0 && endHour <= 23) {
      hourFilter.$lt = endHour + 1;
    }
    if (Object.keys(hourFilter).length) {
      conditions.push({ departureAt: { $hour: hourFilter } });
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
      rating: { driverRating: -1, departureAt: 1 },
      distance: { distanceKm: 1, departureAt: 1 },
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
    if (minPrice > 0) queryParams.set('prixMin', String(minPrice));
    if (maxPrice > 0) queryParams.set('prixMax', String(maxPrice));
    if (hourFilter.$gte !== undefined) queryParams.set('heureDebut', formatHour(startHour));
    if (hourFilter.$lt !== undefined) queryParams.set('heureFin', formatHour(endHour));
    if (sortKey !== 'soonest') queryParams.set('sort', sortKey);
    const baseQuery = queryParams.toString();

    return res.render('trajets', {
      stylesheet: 'trajets/',
      title: 'Trajets',
      trips,
      filters: {
        depart,
        arrivee,
        date,
        places,
        sort: sortKey,
        prixMin: minPrice > 0 ? String(minPrice) : '',
        prixMax: maxPrice > 0 ? String(maxPrice) : '',
        heureDebut: hourFilter.$gte !== undefined ? formatHour(startHour) : '',
        heureFin: hourFilter.$lt !== undefined ? formatHour(endHour) : '',
      },
      pagination: { total, page: currentPage, pages, baseQuery, pageSize },
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
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
    const mySeats = userId ? passengerIds.filter((id) => id === userId).length : 0;
    const remaining = Math.max((foundTrip.places || 0) - (foundTrip.places_taken || 0), 0);
    const isDraft = foundTrip.status === 'draft';
    const isCancelled = foundTrip.status === 'cancelled';
    const hasDeparted = isPastDeparture(foundTrip);
    const isCompleted = effectiveStatus(foundTrip) === 'completed';

    if (isDraft && !isDriver) {
      return tripNotFound(res);
    }

    const canReview = Boolean(isBooked && hasDeparted && !isCancelled);
    let hasReviewed = false;
    if (canReview) {
      const existingReview = await Review.findOne({
        trip: foundTrip._id,
        author: userId,
      }).lean();
      hasReviewed = Boolean(existingReview);
    }

    let isFavorite = false;
    if (userId) {
      const existingFavorite = await Favorite.findOne({
        user: userId,
        trip: foundTrip._id,
      }).lean();
      isFavorite = Boolean(existingFavorite);
    }

    return res.render('trajet', {
      stylesheet: 'trajet/',
      title: 'Détail du trajet',
      trip: foundTrip,
      isDriver,
      isBooked,
      mySeats,
      isDraft,
      isCancelled,
      isCompleted,
      hasDeparted,
      remaining,
      canReview: canReview && !hasReviewed,
      hasReviewed,
      isFavorite,
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Reserve one or more seats
router.post('/trajets/:id/reserver', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;
  const seats = requestedSeats(req.body.places);

  try {
    const updatedTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $nin: ['draft', 'cancelled'] },
        driver: { $ne: req.session.userId },
        passengers: { $ne: req.session.userId },
        $expr: {
          $lte: [
            { $add: [{ $ifNull: ['$places_taken', 0] }, seats] },
            '$places',
          ],
        },
        $or: [
          { departureAt: { $gt: new Date() } },
          { departureAt: null },
        ],
      },
      {
        // The passengers array holds one entry per booked seat.
        $push: { passengers: { $each: new Array(seats).fill(req.session.userId) } },
        $inc: { places_taken: seats },
      },
      { new: true }
    );

    if (updatedTrip) {
      await notifyUsers([updatedTrip.driver], {
        actor: req.session.userId,
        tripId: updatedTrip._id,
        type: 'booking',
        body: `${currentUserName(res, 'Un passager')} a réservé ${seats} place${seats === 1 ? '' : 's'} sur le trajet ${tripLabel(updatedTrip)}.`,
      });
      setFlash(req, 'success', seats === 1
        ? 'Votre place est réservée.'
        : `Vos ${seats} places sont réservées.`);
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
    const freeSeats = (foundTrip.places || 0) - (foundTrip.places_taken || 0);
    if (freeSeats < seats) {
      return redirectWithTripError(req, res, tripUrl, 'seats', freeSeats);
    }
    return redirectWithTripError(req, res, tripUrl);
  } catch (err) {
    console.error(err);
    return redirectWithTripError(req, res, tripUrl);
  }
});

// Cancel a reservation, every seat booked by the passenger is released
router.post('/trajets/:id/annuler', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const foundTrip = await trip.findById(req.params.id).lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }

    const seats = seatCountFor(foundTrip, req.session.userId);
    if (!seats) {
      return redirectWithTripError(req, res, tripUrl, 'already');
    }

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
        $inc: { places_taken: -seats },
      },
      { new: true }
    );

    if (updatedTrip) {
      await notifyUsers([updatedTrip.driver], {
        actor: req.session.userId,
        tripId: updatedTrip._id,
        type: 'reservation_cancelled',
        body: `${currentUserName(res, 'Un passager')} a annulé sa réservation de ${seats} place${seats === 1 ? '' : 's'} sur le trajet ${tripLabel(updatedTrip)}.`,
      });
      setFlash(req, 'success', seats === 1
        ? 'Votre réservation a été annulée.'
        : `Votre réservation de ${seats} places a été annulée.`);
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
    await Favorite.deleteMany({ trip: req.params.id });
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
    const [publishedRaw, booked, drafts, cancelledTrips] = await Promise.all([
      trip.find({ driver: req.session.userId, status: { $in: ['published', 'completed'] } })
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

    // A published trip that already left is completed.
    const published = publishedRaw.filter((savedTrip) => effectiveStatus(savedTrip) === 'published');
    const completed = publishedRaw.filter((savedTrip) => effectiveStatus(savedTrip) === 'completed');

    return res.render('mes-trajets', {
      stylesheet: 'mes-trajets/',
      title: 'Mes trajets',
      published,
      completed,
      booked,
      drafts,
      cancelledTrips,
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

module.exports = router;
