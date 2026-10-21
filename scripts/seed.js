require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../db/db');
const user = require('../models/signup');
const trip = require('../models/publier');
const Review = require('../models/review');
const Favorite = require('../models/favorite');
const Message = require('../models/message');
const Notification = require('../models/notification');
const { refreshDriverRating } = require('../lib/ratings');
const {
  PASSWORD,
  EMAIL_DOMAIN,
  PEOPLE,
  TRIPS,
  tripFields,
} = require('../lib/seedData');

async function removePreviousDemoData() {
  const accounts = await user.find({ email: { $regex: `${EMAIL_DOMAIN.replace('.', '\\.')}$` } })
    .select('_id')
    .lean();
  const ids = accounts.map((account) => account._id);

  if (!ids.length) {
    return 0;
  }

  const trips = await trip.find({ driver: { $in: ids } }).select('_id').lean();
  const tripIds = trips.map((savedTrip) => savedTrip._id);

  await Review.deleteMany({ $or: [{ driver: { $in: ids } }, { author: { $in: ids } }] });
  await Favorite.deleteMany({ $or: [{ user: { $in: ids } }, { trip: { $in: tripIds } }] });
  await Message.deleteMany({ trip: { $in: tripIds } });
  await Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { actor: { $in: ids } }] });
  await trip.deleteMany({ _id: { $in: tripIds } });
  await user.deleteMany({ _id: { $in: ids } });

  return ids.length;
}

async function main() {
  await connectDB();

  const removed = await removePreviousDemoData();
  if (removed) {
    console.log(`${removed} compte(s) de démonstration supprimé(s).`);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const accounts = {};

  for (const person of PEOPLE) {
    const account = await user.create({
      name: person.name,
      email: `${person.email}${EMAIL_DOMAIN}`,
      password: hash,
      userType: person.userType,
      phone: person.phone,
      bio: person.bio,
    });
    accounts[person.email] = account;
  }

  const savedTrips = [];

  for (const item of TRIPS) {
    const savedTrip = await trip.create(tripFields(item, accounts[item.driver]._id));
    savedTrips.push(savedTrip);
  }

  // A few passengers booked the upcoming trips.
  const upcoming = savedTrips.filter((savedTrip) => savedTrip.departureAt > new Date());
  const passengers = [accounts.sara, accounts.nadia, accounts.lina];

  for (let index = 0; index < upcoming.length; index += 1) {
    const savedTrip = upcoming[index];
    const passenger = passengers[index % passengers.length];
    savedTrip.passengers.push(passenger._id);
    savedTrip.places_taken = 1;
    await savedTrip.save();
  }

  // The past trip has reviews, so the drivers have a rating.
  const pastTrip = savedTrips.find((savedTrip) => savedTrip.departureAt < new Date());
  if (pastTrip) {
    const reviews = [
      { author: accounts.sara, rating: 5, comment: 'Conducteur ponctuel et prudent.' },
      { author: accounts.nadia, rating: 4, comment: 'Bon trajet, un peu de retard au départ.' },
    ];

    for (const review of reviews) {
      await Review.create({
        trip: pastTrip._id,
        driver: pastTrip.driver,
        author: review.author._id,
        rating: review.rating,
        comment: review.comment,
      });
    }
  }

  for (const account of Object.values(accounts)) {
    await refreshDriverRating(account._id);
  }

  // One favourite and one message to make the demo lively.
  if (upcoming.length) {
    await Favorite.create({
      user: accounts.sara._id,
      trip: upcoming[0]._id,
    });
    await Message.create({
      trip: upcoming[0]._id,
      sender: accounts.sara._id,
      body: 'Bonjour, je serai devant la poste à 7h.',
    });
    await Notification.create({
      recipient: upcoming[0].driver,
      actor: accounts.sara._id,
      trip: upcoming[0]._id,
      type: 'booking',
      body: 'Sara a réservé une place sur votre trajet.',
    });
  }

  console.log(`${PEOPLE.length} comptes et ${TRIPS.length} trajets de démonstration créés.`);
  console.log(`Mot de passe commun : ${PASSWORD}`);
  console.log(`Comptes : ${PEOPLE.map((person) => `${person.email}${EMAIL_DOMAIN}`).join(', ')}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
