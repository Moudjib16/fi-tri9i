const express = require('express');
const bcrypt = require('bcrypt');
const user = require('../models/signup');
const { safeRedirect } = require('../lib/validation');
const { regenerateSession } = require('../lib/session');
const { serverError } = require('../lib/http');

const router = express.Router();

// bcrypt silently truncates passwords longer than 72 bytes.
const MAX_PASSWORD_BYTES = 72;
// Compared when the email is unknown so both failure paths cost the same.
const DUMMY_HASH = '$2b$10$5vob0WNtnqjBPShZ9yz32ucZ28qeMkNfcUM6B0FD.y6NttODQI1T.';
const INVALID_LOGIN = 'Email ou mot de passe incorrect.';

function renderLoginError(req, res, status, message) {
  return res.status(status).render('login', {
    next: safeRedirect(req.body.next),
    email: typeof req.body.email === 'string' ? req.body.email.trim() : '',
    error: message,
  });
}

router.get('/signup', (req, res) => {
  res.render('signup', { exist: '' });
});

router.get('/login', (req, res) => {
  res.render('login', {
    next: safeRedirect(req.query.next),
    email: '',
    error: '',
  });
});

router.post('/signup', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const confirmPassword = req.body['confirm-password'];
    const userType = Number(req.body.userType);

    if (!name || !email || !password || ![1, 2].includes(userType)) {
      return res.status(400).render('signup', { exist: 'Please fill all fields correctly.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).render('signup', { exist: 'Password must be at least 6 characters.' });
    }
    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return res.status(400).render('signup', { exist: 'Password is too long (72 bytes maximum).' });
    }
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).render('signup', { exist: 'Passwords do not match.' });
    }

    const userexist = await user.findOne({ email });
    if (userexist) {
      return res.status(409).render('signup/emailExist');
    }

    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);
    const userdata = new user({ name, email, password: hashPassword, userType });
    const result = await userdata.save();
    console.log('Saved to database:', result._id);
    await regenerateSession(req);
    req.session.userId = result._id;
    return req.session.save((err) => {
      if (err) {
        return serverError(res);
      }
      return res.redirect('/');
    });
  } catch (err) {
    console.log(err);
    if (err && err.code === 11000) {
      return res.status(409).render('signup/emailExist');
    }
    if (err && err.name === 'ValidationError') {
      return res.status(400).render('signup', { exist: 'Invalid signup data.' });
    }
    return serverError(res);
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!email || typeof password !== 'string' || !password) {
      return renderLoginError(
        req,
        res,
        400,
        'Renseignez votre adresse email et votre mot de passe.'
      );
    }
    const check = await user.findOne({ email });
    const passwordMatch = await bcrypt.compare(password, check ? check.password : DUMMY_HASH);
    if (!check || !passwordMatch) {
      return renderLoginError(req, res, 401, INVALID_LOGIN);
    }
    if (check.suspended) {
      return res.status(403).render('login/suspended');
    }
    const nextUrl = safeRedirect(req.body.next) || '/';
    await regenerateSession(req);
    req.session.userId = check._id;
    return req.session.save((err) => {
      if (err) {
        return serverError(res);
      }
      return res.redirect(nextUrl);
    });
  } catch (err) {
    console.log(err);
    return serverError(res);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
