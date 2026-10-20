const express = require('express');
const bcrypt = require('bcrypt');
const user = require('../models/signup');
const { setFlash } = require('../lib/flash');
const { requireUser, regenerateSession } = require('../lib/session');

const router = express.Router();

router.get('/compte', requireUser, (req, res) => {
  res.render('compte', { title: 'Mon compte', errors: {} });
});

router.post('/compte/mot-de-passe', requireUser, async (req, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string'
    ? req.body.currentPassword
    : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body['confirm-password'] === 'string'
    ? req.body['confirm-password']
    : '';

  const errors = {};
  if (!currentPassword) {
    errors.currentPassword = 'Saisissez votre mot de passe actuel.';
  }
  if (!password || password.length < 6) {
    errors.password = 'Le nouveau mot de passe doit contenir au moins 6 caractères.';
  } else if (Buffer.byteLength(password, 'utf8') > 72) {
    errors.password = 'Le nouveau mot de passe est trop long.';
  }
  if (password !== confirmPassword) {
    errors.confirmPassword = 'Les nouveaux mots de passe ne correspondent pas.';
  }

  if (Object.keys(errors).length) {
    return res.status(400).render('compte', { title: 'Mon compte', errors });
  }

  try {
    const account = await user.findById(req.session.userId);
    if (!account) {
      delete req.session.userId;
      setFlash(req, 'error', 'Votre compte est introuvable. Reconnectez-vous.');
      return res.redirect('/login');
    }

    const passwordMatch = await bcrypt.compare(currentPassword, account.password);
    if (!passwordMatch) {
      return res.status(401).render('compte', {
        title: 'Mon compte',
        errors: { currentPassword: 'Le mot de passe actuel est incorrect.' },
      });
    }

    if (password === currentPassword) {
      return res.status(400).render('compte', {
        title: 'Mon compte',
        errors: { password: 'Choisissez un mot de passe différent du mot de passe actuel.' },
      });
    }

    account.password = await bcrypt.hash(password, 10);
    await account.save();

    await regenerateSession(req);
    req.session.userId = account._id;
    setFlash(req, 'success', 'Votre mot de passe a été mis à jour.');
    return req.session.save((err) => {
      if (err) {
        return res.status(500).send({ message: 'Error saving session' });
      }
      return res.redirect('/compte');
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to update password' });
  }
});

module.exports = router;
