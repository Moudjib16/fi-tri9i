const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const user = require('../models/signup');
const Report = require('../models/report');
const { pickString } = require('../lib/validation');
const { reportReasonLabel } = require('../lib/reports');
const { describeReports } = require('../lib/reportTargets');
const { setFlash } = require('../lib/flash');
const { requireAdmin } = require('../lib/session');
const { notifyUsers } = require('../lib/notifications');
const { serverError } = require('../lib/http');

const router = express.Router();

router.use('/admin', requireAdmin);

function adminError(res, message) {
  return res.status(404).render('error', {
    stylesheet: '404/',
    title: 'Introuvable',
    status: 404,
    heading: 'Introuvable',
    message,
  });
}

router.get('/admin', async (req, res) => {
  try {
    const [openReports, publishedTrips, accounts] = await Promise.all([
      Report.find({ status: 'open' }).sort({ createdAt: -1 }).limit(50).lean(),
      trip.find({ status: 'published' })
        .populate('driver', 'name')
        .sort({ departureAt: 1 })
        .limit(25)
        .lean(),
      user.find({}).select('name email userType isAdmin suspended createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const described = await describeReports(openReports);
    const reports = described.map((item) => ({
      ...item,
      reasonLabel: reportReasonLabel(item.report.reason),
    }));

    return res.render('admin', {
      stylesheet: 'admin/',
      title: 'Administration',
      reports,
      publishedTrips,
      accounts,
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Treat or dismiss a report
router.post('/admin/signaux/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return adminError(res, 'Ce signalement est introuvable.');
  }

  const action = pickString(req.body.action);
  const note = pickString(req.body.note);

  if (!['resolve', 'dismiss'].includes(action)) {
    setFlash(req, 'error', "L'action demandée est invalide.");
    return res.redirect('/admin');
  }
  if (note.length > 500) {
    setFlash(req, 'error', 'La note de modération est trop longue.');
    return res.redirect('/admin');
  }

  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return adminError(res, 'Ce signalement est introuvable.');
    }
    if (report.status !== 'open') {
      setFlash(req, 'error', 'Ce signalement a déjà été traité.');
      return res.redirect('/admin');
    }

    report.status = action === 'resolve' ? 'resolved' : 'dismissed';
    report.adminNote = note;
    report.resolvedAt = new Date();
    await report.save();

    await notifyUsers([report.reporter], {
      actor: req.session.userId,
      tripId: null,
      type: 'report_resolved',
      body: 'Votre signalement a été examiné par la modération.',
    });

    setFlash(req, 'success', 'Signalement traité.');
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Cancel a published trip from the moderation dashboard
router.post('/admin/trajets/:id/annuler', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return adminError(res, 'Ce trajet est introuvable.');
  }

  try {
    const cancelledTrip = await trip.findOneAndUpdate(
      { _id: req.params.id, status: 'published' },
      { $set: { status: 'cancelled' } },
      { new: true }
    );

    if (!cancelledTrip) {
      setFlash(req, 'error', 'Ce trajet ne peut pas être annulé.');
      return res.redirect('/admin');
    }

    await notifyUsers(cancelledTrip.passengers, {
      actor: req.session.userId,
      tripId: cancelledTrip._id,
      type: 'trip_cancelled',
      body: 'Un trajet a été annulé par la modération.',
    });

    setFlash(req, 'success', 'Trajet annulé.');
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Suspend or restore an account
router.post('/admin/utilisateurs/:id/suspension', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return adminError(res, 'Ce compte est introuvable.');
  }

  if (String(req.params.id) === String(req.session.userId)) {
    setFlash(req, 'error', 'Vous ne pouvez pas suspendre votre propre compte.');
    return res.redirect('/admin');
  }

  try {
    const account = await user.findById(req.params.id);
    if (!account) {
      return adminError(res, 'Ce compte est introuvable.');
    }

    account.suspended = !account.suspended;
    await account.save();

    setFlash(req, 'success', account.suspended
      ? 'Le compte a été suspendu.'
      : 'Le compte a été réactivé.');
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Grant or revoke the administrator role
router.post('/admin/utilisateurs/:id/role', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return adminError(res, 'Ce compte est introuvable.');
  }

  if (String(req.params.id) === String(req.session.userId)) {
    setFlash(req, 'error', 'Vous ne pouvez pas modifier votre propre rôle.');
    return res.redirect('/admin');
  }

  try {
    const account = await user.findById(req.params.id);
    if (!account) {
      return adminError(res, 'Ce compte est introuvable.');
    }

    account.isAdmin = !account.isAdmin;
    await account.save();

    setFlash(req, 'success', account.isAdmin
      ? 'Le compte est désormais administrateur.'
      : 'Le rôle administrateur a été retiré.');
    return res.redirect('/admin');
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

module.exports = router;
