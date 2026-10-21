const express = require('express');
const { WILAYAS, normalizePlace } = require('../lib/wilayas');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', { stylesheet: 'home/', title: 'Home' });
});

router.get('/home', (req, res) => {
  res.redirect('/');
});

router.get('/a-propos', (req, res) => {
  res.render('a-propos', { stylesheet: 'a-propos/', title: 'À propos' });
});

// Reference data used by the place inputs to suggest the communes of a wilaya.
router.get('/api/places', (req, res) => {
  const places = {};
  for (const wilaya of WILAYAS) {
    places[normalizePlace(wilaya.name)] = wilaya.communes;
  }
  res.set('Cache-Control', 'public, max-age=86400');
  return res.json(places);
});

module.exports = router;
