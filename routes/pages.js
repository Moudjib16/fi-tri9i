const express = require('express');
const { WILAYAS, normalizePlace } = require('../lib/wilayas');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('home', {
    title: 'Covoiturage en Algérie',
    description: "Trouvez un trajet entre les wilayas algériennes, comparez les horaires et les prix, et réservez votre place en quelques clics.",
  });
});

router.get('/home', (req, res) => {
  res.redirect('/');
});

router.get('/a-propos', (req, res) => {
  res.render('a-propos', {
    title: 'À propos',
    description: "Découvrez Fi Tri9i, le covoiturage entre les wilayas algériennes : publication de trajets, réservation de places et partage des frais.",
  });
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
