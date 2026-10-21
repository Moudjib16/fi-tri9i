const {
  parseDateInput,
  parsePriceInput,
  combineDepartureAt,
} = require('./validation');
const { normalizePlace } = require('./wilayas');
const { distanceBetweenWilayas } = require('./distance');

// Computes the fields of a trip that are missing or out of date.
// It returns an empty object when the trip is already up to date.
function backfillTrip(savedTrip) {
  const changes = {};
  if (!savedTrip) {
    return changes;
  }

  // The accent free wilaya keys power the search filters.
  const departKey = normalizePlace(savedTrip.depart);
  if (departKey && savedTrip.departKey !== departKey) {
    changes.departKey = departKey;
  }

  const arriveeKey = normalizePlace(savedTrip.arrivee);
  if (arriveeKey && savedTrip.arriveeKey !== arriveeKey) {
    changes.arriveeKey = arriveeKey;
  }

  // The date label is stored in French since the display format changed.
  const parsedDate = savedTrip.dateData ? parseDateInput(savedTrip.dateData) : null;
  if (parsedDate && parsedDate.display !== savedTrip.dateData) {
    changes.dateData = parsedDate.display;
  }

  // Rebuild the sortable date when it is missing or does not match the label.
  const departureAt = combineDepartureAt(
    parsedDate ? parsedDate.display : savedTrip.dateData,
    savedTrip.time
  );
  if (
    departureAt
    && (!savedTrip.departureAt || new Date(savedTrip.departureAt).getTime() !== departureAt.getTime())
  ) {
    changes.departureAt = departureAt;
  }

  // The typed price is used by the price filter.
  if (savedTrip.price) {
    const parsedPrice = parsePriceInput(savedTrip.price);
    if (parsedPrice && savedTrip.priceDZD !== parsedPrice.amount) {
      changes.priceDZD = parsedPrice.amount;
      changes.price = parsedPrice.display;
    }
  }

  // The estimated distance between the two wilayas.
  const distanceKm = distanceBetweenWilayas(savedTrip.depart, savedTrip.arrivee);
  if (distanceKm !== null && distanceKm !== savedTrip.distanceKm) {
    changes.distanceKm = distanceKm;
  }

  return changes;
}

module.exports = { backfillTrip };
