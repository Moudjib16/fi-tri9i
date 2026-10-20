const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const {
  pickString,
  parseDateInput,
  parseTimeInput,
  parsePriceInput,
  combineDepartureAt,
  isPastDate,
} = require('../lib/validation');
const { requireUser, requirePublishUser, requireDraftTrip } = require('../lib/session');
const { setFlash } = require('../lib/flash');

const router = express.Router();

// Helper: load the trip stored in the session
async function getSessionTrip(req) {
  const tripId = req.session.tripId;
  if (!tripId) {
    return { error: 'Trip ID not found in session' };
  }
  const existingTrip = await trip.findById(tripId);
  if (!existingTrip) {
    delete req.session.tripId;
    return { error: 'Trip not found' };
  }
  if (String(existingTrip.driver || '') !== String(req.session.userId || '')) {
    delete req.session.tripId;
    return { error: 'This trip does not belong to you' };
  }
  if (existingTrip.status !== 'draft') {
    delete req.session.tripId;
    return { error: 'This trip is no longer a draft' };
  }
  return { existingTrip };
}

// Helper: load the draft for a wizard page without failing hard
async function loadDraft(req) {
  const { existingTrip } = await getSessionTrip(req);
  return existingTrip || null;
}

// Keep the sortable Date in sync with the two display fields.
function syncDepartureAt(existingTrip) {
  const departureAt = combineDepartureAt(existingTrip.dateData, existingTrip.time);
  existingTrip.departureAt = departureAt;
  return departureAt;
}

function getMissingStep(existingTrip) {
  if (!existingTrip.depart) return '/publier/page1';
  if (!existingTrip.depart0) return '/publier/page2';
  if (!existingTrip.arrivee) return '/publier/page3';
  if (!existingTrip.arrivee0) return '/publier/page4';
  if (!existingTrip.dateData) return '/publier/calendaire';
  if (!existingTrip.time) return '/publier/heure';
  if (!existingTrip.places) return '/publier/people';
  if (!existingTrip.price) return '/publier/prix';
  return null;
}

// POST request to save a new trip and store its ID in the session
router.post('/depart', requirePublishUser, async (req, res) => {
  try {
    const depart = pickString(req.body.depart || req.body.content);
    if (!depart) {
      return res.status(400).send({ message: 'Missing depart' });
    }

    // Reuse the current draft when the user restarts the wizard so abandoned
    // drafts do not pile up in the database.
    const currentDraft = await loadDraft(req);
    let savedTrip;
    if (currentDraft) {
      currentDraft.depart = depart;
      currentDraft.depart0 = '';
      currentDraft.arrivee = '';
      currentDraft.arrivee0 = '';
      currentDraft.dateData = '';
      currentDraft.departureAt = null;
      currentDraft.time = '';
      currentDraft.price = '';
      currentDraft.priceDZD = null;
      currentDraft.places = 1;
      currentDraft.places_taken = 0;
      currentDraft.description = '';
      currentDraft.passengers = [];
      currentDraft.publishedAt = null;
      savedTrip = await currentDraft.save();
    } else {
      const newtrip = new trip({
        depart,
        driver: req.session.userId || null,
      });
      savedTrip = await newtrip.save();
    }

    // Store the ID of the saved trip in the session
    req.session.tripId = savedTrip._id;

    console.log('Saved to database:', savedTrip._id);
    // Redirect to the specified page after successful save
    return res.status(200).redirect('/publier/page2');
  } catch (err) {
    console.log(err);
    // Send an error response if saving fails
    return res.status(500).send({ message: 'Error saving to database' });
  }
});

// POST request to update the 'depart0' property of the trip using the stored ID
router.post('/depart0', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const depart0 = pickString(req.body.depart0 ?? req.body.content);
    if (!depart0) {
      return res.status(400).send({ message: 'Missing depart0' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    existingTrip.depart0 = depart0;

    await existingTrip.save();

    return res.status(200).redirect('/publier/page3');
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating depart0' });
  }
});

router.post('/arrivee', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const arrivee = pickString(req.body.arrivee ?? req.body.content);
    if (!arrivee) {
      return res.status(400).send({ message: 'Missing arrivee' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    existingTrip.arrivee = arrivee;

    await existingTrip.save();

    return res.status(200).redirect('/publier/page4');
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating arrivee' });
  }
});

router.post('/arrivee0', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const arrivee0 = pickString(req.body.arrivee0 ?? req.body.content);
    if (!arrivee0) {
      return res.status(400).send({ message: 'Missing arrivee0' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    existingTrip.arrivee0 = arrivee0;

    await existingTrip.save();

    return res.status(200).redirect('/publier/calendaire');
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating arrivee0' });
  }
});

router.post('/date', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const parsedDate = parseDateInput(req.body.content ?? req.body.dateData ?? req.body.date);
    if (!parsedDate) {
      return res.status(400).send({ message: 'Date invalide' });
    }
    if (isPastDate(parsedDate.date)) {
      return res.status(400).send({ message: 'La date est déjà passée' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    existingTrip.dateData = parsedDate.display;
    syncDepartureAt(existingTrip);

    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating date' });
  }
});

router.post('/time', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const parsedTime = parseTimeInput(req.body.content ?? req.body.time);
    if (!parsedTime) {
      return res.status(400).send({ message: 'Heure invalide' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.time = parsedTime.display;
    syncDepartureAt(existingTrip);
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating time' });
  }
});

router.post('/places', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const rawPlaces = req.body.content ?? req.body.places;
    const places = Number(rawPlaces);
    if (!Number.isInteger(places) || places < 1 || places > 5) {
      return res.status(400).send({ message: 'Places must be an integer between 1 and 5' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.places = places;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating places' });
  }
});

router.post('/price', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const parsedPrice = parsePriceInput(req.body.content ?? req.body.price);
    if (!parsedPrice) {
      return res.status(400).send({ message: 'Prix invalide (1 à 100000 DA)' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.price = parsedPrice.display;
    existingTrip.priceDZD = parsedPrice.amount;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating price' });
  }
});

router.post('/description', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const description = pickString(req.body.content ?? req.body.description);
    if (description.length > 1000) {
      return res.status(400).send({ message: 'Description too long' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.description = description;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ message: 'Error updating description' });
  }
});

// Final wizard step: validate the draft, save the description and publish it
router.post('/publier/publier', requireUser, requireDraftTrip, async (req, res) => {
  try {
    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.redirect('/publier/page1');
    }

    const description = pickString(req.body.description);
    if (description.length > 1000) {
      return res.redirect('/publier/description?error=description');
    }
    existingTrip.description = description;

    const missingStep = getMissingStep(existingTrip);
    if (missingStep) {
      await existingTrip.save();
      return res.redirect(`${missingStep}?error=incomplete`);
    }

    // Older drafts may only have the display strings, so rebuild the typed
    // fields before publishing instead of trusting unvalidated input.
    const departureAt = syncDepartureAt(existingTrip);
    if (!departureAt) {
      await existingTrip.save();
      return res.redirect('/publier/calendaire?error=incomplete');
    }
    if (isPastDate(departureAt)) {
      await existingTrip.save();
      return res.redirect('/publier/calendaire?error=past');
    }

    if (!existingTrip.priceDZD) {
      const parsedPrice = parsePriceInput(existingTrip.price);
      if (!parsedPrice) {
        await existingTrip.save();
        return res.redirect('/publier/prix?error=incomplete');
      }
      existingTrip.price = parsedPrice.display;
      existingTrip.priceDZD = parsedPrice.amount;
    }

    existingTrip.status = 'published';
    existingTrip.publishedAt = new Date();
    await existingTrip.save();

    delete req.session.tripId;
    setFlash(req, 'success', 'Votre trajet est publié.');
    return res.redirect(`/trajets/${existingTrip._id}`);
  } catch (err) {
    console.error(err);
    return res.status(500).render('404', { stylesheet: '404/', title: 'Erreur' });
  }
});

// 'Publier' pages routing
router.get('/publier/continuer', requireUser, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) {
    return res.redirect('/publier/page1');
  }
  return res.redirect(getMissingStep(draft) || '/publier/description');
});

router.get('/publier/continuer/:id', requireUser, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/mes-trajets');
  }

  try {
    const draft = await trip.findById(req.params.id);
    if (
      !draft
      || String(draft.driver || '') !== String(req.session.userId || '')
      || draft.status !== 'draft'
    ) {
      setFlash(req, 'error', "Ce brouillon n'est plus disponible.");
      return res.redirect('/mes-trajets');
    }

    req.session.tripId = draft._id;
    return res.redirect(getMissingStep(draft) || '/publier/description');
  } catch (err) {
    console.error(err);
    return res.redirect('/mes-trajets');
  }
});

router.get('/publier/page1', requireUser, async (req, res) => {
  const draft = await loadDraft(req);
  res.render('publier/page1', { trip: draft });
});

router.get('/publier/page2', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/page2', { trip: draft });
});

router.get('/publier/page3', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/page3', { trip: draft });
});

router.get('/publier/page4', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/page4', { trip: draft });
});

router.get('/publier/calendaire', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/calendaire', { trip: draft, error: req.query.error || '' });
});

router.get('/publier/heure', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/heure', { trip: draft, error: req.query.error || '' });
});

router.get('/publier/people', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/people', { trip: draft });
});

router.get('/publier/prix', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/prix', { trip: draft, error: req.query.error || '' });
});

router.get('/publier/description', requireUser, requireDraftTrip, async (req, res) => {
  const draft = await loadDraft(req);
  if (!draft) return res.redirect('/publier/page1');
  return res.render('publier/description', { trip: draft, error: req.query.error || '' });
});

module.exports = router;
