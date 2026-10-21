const trip = require('../models/publier');
const user = require('../models/signup');
const { formatDateFr } = require('./validation');

async function describeTarget(report) {
  if (report.targetType === 'trip') {
    const savedTrip = await trip.findById(report.targetId).lean();
    if (savedTrip) {
      return {
        targetLabel: `${savedTrip.depart} → ${savedTrip.arrivee || 'Destination à préciser'}`,
        targetUrl: `/trajets/${savedTrip._id}`,
        targetMeta: formatDateFr(savedTrip.dateData) || savedTrip.dateData || '',
      };
    }
    return { targetLabel: 'Trajet supprimé', targetUrl: '/trajets', targetMeta: '' };
  }

  const target = await user.findById(report.targetId).select('name').lean();
  if (target) {
    return {
      targetLabel: target.name,
      targetUrl: `/conducteurs/${target._id}`,
      targetMeta: 'Conducteur',
    };
  }
  return { targetLabel: 'Compte supprimé', targetUrl: '/trajets', targetMeta: '' };
}

// Adds the target label and link to a list of reports.
async function describeReports(reports) {
  const items = [];
  for (const report of reports) {
    const target = await describeTarget(report);
    items.push({ report, ...target });
  }
  return items;
}

module.exports = { describeTarget, describeReports };
