function setFlash(req, type, message) {
  if (type === 'error') {
    req.session.flashError = message;
    return;
  }
  req.session.flashSuccess = message;
}

function flashMiddleware(req, res, next) {
  res.locals.flash = {
    success: req.session.flashSuccess || '',
    error: req.session.flashError || '',
  };
  delete req.session.flashSuccess;
  delete req.session.flashError;
  next();
}

module.exports = { setFlash, flashMiddleware };
