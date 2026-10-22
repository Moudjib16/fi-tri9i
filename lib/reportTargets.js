const trip = require('../models/publier');
const user = require('../models/signup');
const { formatDateFr } = require('./validation');

function describeTrip(savedTrip) {
  if (savedTrip) {
    return {
      targetLabel: `${savedTrip.depart} → ${savedTrip.arrivee || 'Destination à préciser'}`,
      targetUrl: `/trajets/${savedTrip._id}`,
      targetMeta: formatDateFr(savedTrip.dateData) || savedTrip.dateData || '',
    };
  }
  return { targetLabel: 'Trajet supprimé', targetUrl: '/trajets', targetMeta: '' };
}

function describeUser(target) {
  if (target) {
    return {
      targetLabel: target.name,
      targetUrl: `/conducteurs/${target._id}`,
      targetMeta: 'Conducteur',
    };
  }
  return { targetLabel: 'Compte supprimé', targetUrl: '/trajets', targetMeta: '' };
}

// Adds the target label and link to a list of reports, using two batched
// queries instead of two database round-trips per report.
async function describeReports(reports) {
  const tripIds = [...new Set(
    reports.filter((report) => report.targetType === 'trip').map((report) => report.targetId)
  )];
  const userIds = [...new Set(
    reports.filter((report) => report.targetType === 'user').map((report) => report.targetId)
  )];

  const [savedTrips, savedUsers] = await Promise.all([
    tripIds.length ? trip.find({ _id: { $in: tripIds } }).lean() : [],
    userIds.length ? user.find({ _id: { $in: userIds } }).select('name').lean() : [],
  ]);

  const tripsById = new Map(savedTrips.map((item) => [String(item._id), item]));
  const usersById = new Map(savedUsers.map((item) => [String(item._id), item]));

  return reports.map((report) => {
    const target = report.targetType === 'trip'
      ? describeTrip(tripsById.get(String(report.targetId)))
      : describeUser(usersById.get(String(report.targetId)));
    return { report, ...target };
  });
}

module.exports = { describeReports };
