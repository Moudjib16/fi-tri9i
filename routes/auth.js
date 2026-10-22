const express = require('express');
const bcrypt = require('bcrypt');
const user = require('../models/signup');
const config = require('../lib/config');
const { safeRedirect } = require('../lib/validation');
const { requireUser, regenerateSession } = require('../lib/session');
const { serverError } = require('../lib/http');
const { setFlash } = require('../lib/flash');
const { createToken, hashToken, expiresInHours } = require('../lib/accountTokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../lib/email');
const { logger } = require('../lib/logger');

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

function passwordError(password, confirmPassword) {
  if (!password || password.length < 6) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    return 'Le mot de passe est trop long (72 octets maximum).';
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    return 'Les mots de passe ne correspondent pas.';
  }
  return '';
}

function issueVerification(account) {
  const token = createToken();
  account.emailVerificationTokenHash = hashToken(token);
  account.emailVerificationExpires = expiresInHours(config.emailVerificationTtlHours);
  return token;
}

function findByToken(field, expiresField, token, additionalSelect = '') {
  if (!token || typeof token !== 'string') {
    return null;
  }
  return user.findOne({
    [field]: hashToken(token),
    [expiresField]: { $gt: new Date() },
  }).select(`+${field} +${expiresField}${additionalSelect}`);
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

router.get('/mot-de-passe-oublie', (req, res) => {
  res.render('mot-de-passe-oublie', { sent: false, error: '' });
});

router.post('/mot-de-passe-oublie', async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    return res.status(400).render('mot-de-passe-oublie', {
      sent: false,
      error: 'Renseignez votre adresse email.',
    });
  }

  try {
    const account = await user.findOne({ email }).select('+passwordResetTokenHash +passwordResetExpires');
    if (account) {
      const token = createToken();
      account.passwordResetTokenHash = hashToken(token);
      account.passwordResetExpires = expiresInHours(config.passwordResetTtlHours);
      await account.save();
      try {
        await sendPasswordResetEmail(account, token);
      } catch (err) {
        logger.error('password_reset_email_failed', { userId: String(account._id), err });
      }
    }
    // Always answer the same way to avoid revealing which emails are registered.
    return res.render('mot-de-passe-oublie', { sent: true, error: '' });
  } catch (err) {
    logger.error('password_reset_request_failed', { err });
    return serverError(res);
  }
});

router.get('/reinitialiser-mot-de-passe/:token', async (req, res) => {
  try {
    const account = await findByToken(
      'passwordResetTokenHash',
      'passwordResetExpires',
      req.params.token
    );
    return res.status(account ? 200 : 400).render('reinitialiser-mot-de-passe', {
      token: req.params.token,
      invalid: !account,
      error: account ? '' : 'Ce lien est invalide ou a expiré.',
    });
  } catch (err) {
    logger.error('password_reset_page_failed', { err });
    return serverError(res);
  }
});

router.post('/reinitialiser-mot-de-passe/:token', async (req, res) => {
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const confirmPassword = typeof req.body['confirm-password'] === 'string'
    ? req.body['confirm-password']
    : '';

  try {
    const account = await findByToken(
      'passwordResetTokenHash',
      'passwordResetExpires',
      req.params.token,
      ' +password'
    );
    if (!account) {
      return res.status(400).render('reinitialiser-mot-de-passe', {
        token: req.params.token,
        invalid: true,
        error: 'Ce lien est invalide ou a expiré.',
      });
    }

    const validationError = passwordError(password, confirmPassword);
    if (validationError) {
      return res.status(400).render('reinitialiser-mot-de-passe', {
        token: req.params.token,
        invalid: false,
        error: validationError,
      });
    }

    account.password = await bcrypt.hash(password, 10);
    account.passwordResetTokenHash = null;
    account.passwordResetExpires = null;
    await account.save();

    await regenerateSession(req);
    setFlash(req, 'success', 'Votre mot de passe a été réinitialisé. Connectez-vous.');
    return req.session.save((err) => {
      if (err) {
        return serverError(res);
      }
      return res.redirect('/login');
    });
  } catch (err) {
    logger.error('password_reset_failed', { err });
    return serverError(res);
  }
});

router.get('/verifier-email/:token', async (req, res) => {
  try {
    const account = await findByToken(
      'emailVerificationTokenHash',
      'emailVerificationExpires',
      req.params.token
    );
    if (!account) {
      setFlash(req, 'error', 'Ce lien de vérification est invalide ou a expiré.');
      return res.redirect('/login');
    }

    account.emailVerified = true;
    account.emailVerificationTokenHash = null;
    account.emailVerificationExpires = null;
    await account.save();

    if (req.session.userId && String(req.session.userId) === String(account._id)) {
      setFlash(req, 'success', 'Votre adresse email est maintenant vérifiée.');
      return res.redirect('/compte');
    }

    setFlash(req, 'success', 'Votre adresse email est maintenant vérifiée. Connectez-vous.');
    return res.redirect('/login');
  } catch (err) {
    logger.error('email_verification_failed', { err });
    return serverError(res);
  }
});

router.post('/verifier-email/renvoyer', requireUser, async (req, res) => {
  try {
    const account = await user.findById(req.session.userId)
      .select('+emailVerificationTokenHash +emailVerificationExpires');
    if (!account) {
      delete req.session.userId;
      setFlash(req, 'error', 'Votre compte est introuvable. Reconnectez-vous.');
      return res.redirect('/login');
    }
    if (account.emailVerified) {
      setFlash(req, 'success', 'Votre adresse email est déjà vérifiée.');
      return res.redirect('/compte');
    }

    const token = issueVerification(account);
    await account.save();
    await sendVerificationEmail(account, token);
    setFlash(req, 'success', 'Un nouvel email de vérification vient d\'être envoyé.');
    return res.redirect('/compte');
  } catch (err) {
    logger.error('verification_resend_failed', { err });
    return serverError(res);
  }
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
    const userdata = new user({
      name,
      email,
      password: hashPassword,
      userType,
      emailVerified: false,
    });
    const verificationToken = issueVerification(userdata);
    const result = await userdata.save();
    try {
      await sendVerificationEmail(result, verificationToken);
    } catch (err) {
      logger.error('verification_email_failed', { userId: String(result._id), err });
    }

    await regenerateSession(req);
    req.session.userId = result._id;
    setFlash(req, 'success', 'Compte créé. Vérifiez votre adresse email pour le sécuriser.');
    return req.session.save((err) => {
      if (err) {
        return serverError(res);
      }
      return res.redirect('/');
    });
  } catch (err) {
    logger.error('signup_failed', { err });
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
    const check = await user.findOne({ email }).select('+password');
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
    logger.error('login_failed', { err });
    return serverError(res);
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;
