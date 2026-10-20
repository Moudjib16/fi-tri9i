const express = require('express');

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

module.exports = router;
