require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const { completePastTrips } = require('../lib/tripStatus');

async function main() {
  await connectDB();
  const result = await completePastTrips();
  const completed = result.modifiedCount || 0;
  console.log(completed > 0
    ? `${completed} trajet(s) marqué(s) comme terminé(s).`
    : 'Aucun trajet à mettre à jour.');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
