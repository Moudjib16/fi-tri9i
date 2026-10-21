const trip = require('../models/publier');

const PUBLISHED = 'published';
const COMPLETED = 'completed';

// A published trip that already left is completed, even when the database
// still carries the "published" status.
function isPastDeparture(tripDoc) {
  return Boolean(tripDoc && tripDoc.departureAt && new Date(tripDoc.departureAt) <= new Date());
}

function effectiveStatus(tripDoc) {
  if (!tripDoc) {
    return '';
  }
  if (tripDoc.status === PUBLISHED && isPastDeparture(tripDoc)) {
    return COMPLETED;
  }
  return tripDoc.status;
}

// Persists the completion of the trips that already left.
async function completePastTrips() {
  return trip.updateMany(
    { status: PUBLISHED, departureAt: { $type: 'date', $lte: new Date() } },
    { $set: { status: COMPLETED } }
  );
}

module.exports = {
  PUBLISHED,
  COMPLETED,
  isPastDeparture,
  effectiveStatus,
  completePastTrips,
};
