function tripNotFound(res) {
  return res.status(404).render('404', { stylesheet: '404/', title: '404' });
}

module.exports = { tripNotFound };
