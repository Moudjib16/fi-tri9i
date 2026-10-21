function tripNotFound(res) {
  return res.status(404).render('404', { stylesheet: '404/', title: '404' });
}

// Renders the shared error page instead of leaking a raw JSON payload.
function serverError(res, message) {
  return res.status(500).render('error', {
    stylesheet: '404/',
    title: 'Erreur serveur',
    status: 500,
    heading: 'Une erreur est survenue',
    message: message || 'Une erreur inattendue est survenue. Réessayez dans quelques instants.',
  });
}

module.exports = { tripNotFound, serverError };
