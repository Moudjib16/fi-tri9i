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

module.exports = {
  regenerateSession,
  requireUser,
  requirePublishUser,
  requireDraftTrip,
};
