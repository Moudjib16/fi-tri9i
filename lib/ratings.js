const Review = require('../models/review');
const trip = require('../models/publier');

function roundRating(value) {
  return Math.round(value * 10) / 10;
}

// Recomputes the average rating of a driver and stores a copy on each of
// their trips, so the listing can sort by rating without an extra join.
async function refreshDriverRating(driverId) {
  if (!driverId) {
    return { average: 0, count: 0 };
  }

  const reviews = await Review.find({ driver: driverId }).lean();
  const count = reviews.length;
  const average = count
    ? roundRating(reviews.reduce((total, review) => total + (review.rating || 0), 0) / count)
    : 0;

  await trip.updateMany(
    { driver: driverId },
    { $set: { driverRating: average, driverRatingCount: count } }
  );

  return { average, count };
}

module.exports = { refreshDriverRating, roundRating };
