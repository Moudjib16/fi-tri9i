const nodemailer = require('nodemailer');
const config = require('./config');
const { logger } = require('./logger');

const NOTIFICATION_SUBJECTS = {
  booking: 'Nouvelle réservation',
  reservation_cancelled: 'Réservation annulée',
  trip_updated: 'Trajet modifié',
  trip_cancelled: 'Trajet annulé',
  message: 'Nouveau message',
  report_resolved: 'Signalement traité',
};

let transport = null;
const outbox = [];

function linkFor(pathname) {
  return `${config.appUrl.replace(/\/+$/, '')}${pathname}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ title, body }) {
  return [
    '<!DOCTYPE html>',
    '<html lang="fr"><body style="font-family:Arial,sans-serif;color:#1f2933;line-height:1.6">',
    `<h1 style="font-size:20px">${escapeHtml(title)}</h1>`,
    body,
    '<hr style="border:none;border-top:1px solid #d9e2ec;margin:24px 0">',
    '<p style="font-size:12px;color:#627d98">Fi Tri9i - covoiturage en Algérie</p>',
    '</body></html>',
  ].join('');
}

async function sendMail({ to, subject, text, html }) {
  const message = {
    from: config.emailFrom,
    to,
    subject,
    text,
    html,
  };

  if (config.isTest || !config.smtpUrl) {
    outbox.push({ ...message, createdAt: new Date() });
    if (config.isTest) {
      return { delivered: false, queued: true };
    }
    if (config.isProduction) {
      logger.error('email_not_configured', { to, subject });
    } else {
      logger.info('email_logged', { to, subject, text });
    }
    return { delivered: false, queued: true };
  }

  if (!transport) {
    transport = nodemailer.createTransport(config.smtpUrl);
  }
  await transport.sendMail(message);
  return { delivered: true, queued: false };
}

function verificationEmail(account, token) {
  const link = linkFor(`/verifier-email/${encodeURIComponent(token)}`);
  const name = account.name || 'Bonjour';
  const text = [
    `Bonjour ${name},`,
    '',
    'Confirmez votre adresse email pour sécuriser votre compte Fi Tri9i :',
    link,
    '',
    `Ce lien expire dans ${config.emailVerificationTtlHours} heures.`,
    "Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.",
  ].join('\n');

  return {
    to: account.email,
    subject: 'Confirmez votre adresse email - Fi Tri9i',
    text,
    html: layout({
      title: 'Confirmez votre adresse email',
      body: [
        `<p>Bonjour ${escapeHtml(name)},</p>`,
        '<p>Confirmez votre adresse email pour sécuriser votre compte Fi Tri9i.</p>',
        `<p><a href="${escapeHtml(link)}">Vérifier mon adresse email</a></p>`,
        `<p>Ce lien expire dans ${config.emailVerificationTtlHours} heures.</p>`,
      ].join(''),
    }),
  };
}

function passwordResetEmail(account, token) {
  const link = linkFor(`/reinitialiser-mot-de-passe/${encodeURIComponent(token)}`);
  const name = account.name || 'Bonjour';
  const text = [
    `Bonjour ${name},`,
    '',
    'Vous avez demandé la réinitialisation de votre mot de passe Fi Tri9i :',
    link,
    '',
    `Ce lien expire dans ${config.passwordResetTtlHours} heure(s).`,
    "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
  ].join('\n');

  return {
    to: account.email,
    subject: 'Réinitialisation de votre mot de passe - Fi Tri9i',
    text,
    html: layout({
      title: 'Réinitialisation du mot de passe',
      body: [
        `<p>Bonjour ${escapeHtml(name)},</p>`,
        '<p>Vous avez demandé la réinitialisation de votre mot de passe Fi Tri9i.</p>',
        `<p><a href="${escapeHtml(link)}">Choisir un nouveau mot de passe</a></p>`,
        `<p>Ce lien expire dans ${config.passwordResetTtlHours} heure(s).</p>`,
      ].join(''),
    }),
  };
}

function notificationEmail(account, options) {
  const link = options.tripId
    ? linkFor(`/trajets/${encodeURIComponent(String(options.tripId))}`)
    : linkFor('/notifications');
  const title = NOTIFICATION_SUBJECTS[options.type] || 'Nouvelle notification';
  const name = account.name || 'Bonjour';
  const body = String(options.body || '').trim();
  const text = [
    `Bonjour ${name},`,
    '',
    body,
    '',
    `Voir sur Fi Tri9i : ${link}`,
    '',
    'Vous pouvez désactiver ces emails depuis votre compte.',
  ].join('\n');

  return {
    to: account.email,
    subject: `${title} - Fi Tri9i`,
    text,
    html: layout({
      title,
      body: [
        `<p>Bonjour ${escapeHtml(name)},</p>`,
        `<p>${escapeHtml(body)}</p>`,
        `<p><a href="${escapeHtml(link)}">Voir sur Fi Tri9i</a></p>`,
      ].join(''),
    }),
  };
}

async function sendVerificationEmail(account, token) {
  return sendMail(verificationEmail(account, token));
}

async function sendPasswordResetEmail(account, token) {
  return sendMail(passwordResetEmail(account, token));
}

async function sendNotificationEmail(account, options) {
  return sendMail(notificationEmail(account, options));
}

function getOutbox() {
  return outbox.map((message) => ({ ...message }));
}

function clearOutbox() {
  outbox.length = 0;
}

module.exports = {
  sendMail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendNotificationEmail,
  getOutbox,
  clearOutbox,
};
