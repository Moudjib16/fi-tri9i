require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const trip = require('../models/publier');
const { backfillTrip } = require('../lib/tripMigration');

// Fills the fields added after the first release on the existing trips:
// the accent free wilaya keys, the French date label, the sortable departure
// date and the typed price.
//
// Usage: npm run backfill-trips [-- --dry-run]
async function main() {
  const dryRun = process.argv.includes('--dry-run');
  await connectDB();

  const trips = await trip.find({}).lean();
  const operations = [];
  const counters = {};

  for (const savedTrip of trips) {
    const changes = backfillTrip(savedTrip);
    if (!Object.keys(changes).length) {
      continue;
    }

    Object.keys(changes).forEach((field) => {
      counters[field] = (counters[field] || 0) + 1;
    });
    operations.push({
      updateOne: { filter: { _id: savedTrip._id }, update: { $set: changes } },
    });
  }

  if (!operations.length) {
    console.log('Tous les trajets sont déjà à jour.');
  } else if (dryRun) {
    console.log(`${operations.length} trajet(s) seraient mis à jour :`);
    console.log(counters);
  } else {
    await trip.bulkWrite(operations);
    console.log(`${operations.length} trajet(s) mis à jour :`);
    console.log(counters);
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
