const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const user = require('../models/signup');
const Report = require('../models/report');
const { pickString, formatDateFr } = require('../lib/validation');
const { REPORT_REASONS, reportReasonLabel } = require('../lib/reports');
const { describeReports } = require('../lib/reportTargets');
const { setFlash } = require('../lib/flash');
const { tripNotFound, serverError } = require('../lib/http');

const router = express.Router();

function notFound(res) {
  return res.status(404).render('404', { title: '404' });
}

function reasonLabel(value) {
  return reportReasonLabel(value);
}

async function loadTripTarget(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    tripNotFound(res);
    return null;
  }

  const foundTrip = await trip.findById(req.params.id).populate('driver', 'name').lean();
  if (!foundTrip) {
    tripNotFound(res);
    return null;
  }

  return {
    targetType: 'trip',
    targetId: foundTrip._id,
    targetLabel: `${foundTrip.depart} → ${foundTrip.arrivee || 'Destination à préciser'}`,
    targetDate: formatDateFr(foundTrip.dateData) || foundTrip.dateData || '',
    targetUrl: `/trajets/${foundTrip._id}`,
    formAction: `/trajets/${foundTrip._id}/signaler`,
  };
}

async function loadUserTarget(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    notFound(res);
    return null;
  }

  const target = await user.findById(req.params.id).select('name userType').lean();
  if (!target) {
    notFound(res);
    return null;
  }

  return {
    targetType: 'user',
    targetId: target._id,
    targetLabel: target.name,
    targetDate: '',
    targetUrl: `/conducteurs/${target._id}`,
    formAction: `/conducteurs/${target._id}/signaler`,
  };
}

async function renderReportForm(req, res, target) {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(target.formAction)}`);
  }

  return res.render('signaler', {
    title: 'Signaler',
    target,
    reasons: REPORT_REASONS,
    values: { reason: '', message: '' },
    error: '',
  });
}

async function submitReport(req, res, target) {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(target.formAction)}`);
  }

  const values = {
    reason: pickString(req.body.reason),
    message: pickString(req.body.message),
  };

  let error = '';
  if (!REPORT_REASONS.some((reason) => reason.value === values.reason)) {
    error = 'Choisissez un motif de signalement.';
  } else if (values.message.length > 500) {
    error = 'Votre message est trop long.';
  }

  if (error) {
    return res.status(400).render('signaler', {
      title: 'Signaler',
      target,
      reasons: REPORT_REASONS,
      values,
      error,
    });
  }

  try {
    const existing = await Report.findOne({
      reporter: req.session.userId,
      targetType: target.targetType,
      targetId: target.targetId,
      status: 'open',
    }).lean();

    if (existing) {
      setFlash(req, 'error', 'Vous avez déjà signalé ce contenu, il est en cours d’examen.');
      return res.redirect(target.targetUrl);
    }

    await Report.create({
      reporter: req.session.userId,
      targetType: target.targetType,
      targetId: target.targetId,
      reason: values.reason,
      message: values.message,
    });

    setFlash(req, 'success', 'Merci, votre signalement a été transmis à la modération.');
    return res.redirect(target.targetUrl);
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
}

router.get('/trajets/:id/signaler', async (req, res) => {
  try {
    const target = await loadTripTarget(req, res);
    if (!target) {
      return;
    }
    return await renderReportForm(req, res, target);
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

router.post('/trajets/:id/signaler', async (req, res) => {
  try {
    const target = await loadTripTarget(req, res);
    if (!target) {
      return;
    }
    return await submitReport(req, res, target);
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

router.get('/conducteurs/:id/signaler', async (req, res) => {
  try {
    const target = await loadUserTarget(req, res);
    if (!target) {
      return;
    }
    return await renderReportForm(req, res, target);
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

router.post('/conducteurs/:id/signaler', async (req, res) => {
  try {
    const target = await loadUserTarget(req, res);
    if (!target) {
      return;
    }
    return await submitReport(req, res, target);
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

// Reports filed by the current user
router.get('/mes-signalements', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/mes-signalements')}`);
  }

  try {
    const reports = await Report.find({ reporter: req.session.userId })
      .sort({ createdAt: -1 })
      .lean();

    const described = await describeReports(reports);
    const items = described.map((item) => ({
      ...item,
      reasonLabel: reasonLabel(item.report.reason),
    }));

    return res.render('mes-signalements', {
      title: 'Mes signalements',
      items,
    });
  } catch (err) {
    console.error(err);
    return serverError(res);
  }
});

module.exports = router;
