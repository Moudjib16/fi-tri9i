require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../db/db');
const user = require('../models/signup');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run create-admin -- utilisateur@exemple.com');
    process.exit(1);
  }

  await connectDB();

  const account = await user.findOne({ email });
  if (!account) {
    console.error(`Aucun compte trouvé pour ${email}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  account.isAdmin = true;
  await account.save();

  console.log(`${account.email} est désormais administrateur.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
