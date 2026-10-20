function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function requireUser(req, res, next) {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return next();
}

function requirePublishUser(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login?next=%2Fpublier%2Fpage1');
  }
  return next();
}

function requireDraftTrip(req, res, next) {
  if (!req.session.tripId) {
    return res.redirect('/publier/page1');
  }
  return next();
}

// Moderation area: only accounts flagged as administrators may continue.
function requireAdmin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
  }

  if (!res.locals.currentUser || !res.locals.currentUser.isAdmin) {
    return res.status(403).render('error', {
      stylesheet: '404/',
      title: 'Accès refusé',
      status: 403,
      heading: 'Accès refusé',
      message: "Cette page est réservée à l'équipe de modération.",
    });
  }
  return next();
}

module.exports = {
  regenerateSession,
  requireUser,
  requirePublishUser,
  requireDraftTrip,
  requireAdmin,
};
