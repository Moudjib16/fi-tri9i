const express = require('express');
const mongoose = require('mongoose');
const trip = require('../models/publier');
const user = require('../models/signup');
const Review = require('../models/review');

const router = express.Router();

router.get('/conducteurs/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).render('404', { title: '404' });
  }

  try {
    const driver = await user.findById(req.params.id).select('name bio userType createdAt').lean();
    if (!driver) {
      return res.status(404).render('404', { title: '404' });
    }

    const upcomingTrips = await trip
      .find({
        driver: driver._id,
        status: 'published',
        $or: [
          { departureAt: { $gte: new Date() } },
          { departureAt: null },
        ],
      })
      .populate('driver', 'name')
      .sort({ departureAt: 1, createdAt: -1 })
      .lean();

    const reviews = await Review.find({ driver: driver._id })
      .populate('author', 'name')
      .sort({ createdAt: -1 })
      .lean();
    const ratingCount = reviews.length;
    const ratingAverage = ratingCount
      ? reviews.reduce((total, review) => total + review.rating, 0) / ratingCount
      : null;

    return res.render('conducteur', {
      title: `${driver.name} — Conducteur`,
      driver,
      upcomingTrips,
      reviews: reviews.slice(0, 10),
      ratingCount,
      ratingAverage,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).render('error', {
      title: 'Erreur serveur',
      status: 500,
      heading: 'Une erreur est survenue',
      message: 'Impossible de charger ce profil pour le moment.',
    });
  }
});

module.exports = router;
