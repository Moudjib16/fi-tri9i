require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const mongoose = require('mongoose');
const user = require('./models/signup');
const trip = require('./models/publier');
const bcrypt = require('bcrypt');
const connectDB = require('./db/db');
const session = require ('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const bodyParser = require('body-parser');


// Register view engine
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true }));
//session middleware to store user data
app.use(session({
  secret: process.env.SESSION_SECRET || 'ID',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(bodyParser.json());

// Expose the logged-in user to every rendered view
app.use(async (req, res, next) => {
  res.locals.currentUser = null;
  if (!req.session.userId) {
    return next();
  }
  try {
    const currentUser = await user.findById(req.session.userId).select('name email userType').lean();
    if (currentUser) {
      res.locals.currentUser = currentUser;
    } else {
      delete req.session.userId;
    }
  } catch (err) {
    console.error('Unable to load session user:', err.message);
  }
  return next();
});

// Basic brute-force protection for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});
app.use('/login', authLimiter);
app.use('/signup', authLimiter);

// Connect to MongoDB
connectDB();

// Routes
app.get('/', (req, res) => {
  res.render('home', { stylesheet: 'home/', title: 'Home' });
});





//signup logic 
app.post('/signup', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    const confirmPassword = req.body['confirm-password'];
    const userType = Number(req.body.userType);

    if (!name || !email || !password || ![1, 2].includes(userType)) {
      return res.status(400).render('signup', { exist: 'Please fill all fields correctly.' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).render('signup', { exist: 'Password must be at least 6 characters.' });
    }
    if (confirmPassword !== undefined && confirmPassword !== password) {
      return res.status(400).render('signup', { exist: 'Passwords do not match.' });
    }

    const userexist = await user.findOne({ email });
    if (userexist) {
      return res.status(409).render('signup/emailExist');
    }

    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);
    const userdata = new user({ name, email, password: hashPassword, userType });
    const result = await userdata.save();
    console.log('Saved to database:', result._id);
    req.session.userId = result._id;
    return res.redirect('/');
  } catch (err) {
    console.log(err);
    if (err && err.code === 11000) {
      return res.status(409).render('signup/emailExist');
    }
    if (err && err.name === 'ValidationError') {
      return res.status(400).render('signup', { exist: 'Invalid signup data.' });
    }
    return res.status(500).send({ message: 'Error saving to database' });
  }
});


app.post('/login', async (req,res) =>{
  try{
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = req.body.password;
    if (!email || !password) {
      return res.status(400).send('wrong details');
    }
    const check = await user.findOne({ email });
    if(!check){
      return res.status(404).render('login/nouser');
    }
    const passwordMatch = await bcrypt.compare(password, check.password);
    if(passwordMatch){
      req.session.userId = check._id;
      return res.redirect(safeRedirect(req.body.next) || '/');
    }
    else{
      return res.status(401).render('login/wrongpass');
    }
  }
  catch (err) {
    console.log(err);
    return res.status(500).send('wrong details');
  }
})

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});
app.get('/home', (req, res) => {
    res.redirect('/');
  });

// Trip search / listing
app.get('/trajets', async (req, res) => {
  try {
    const depart = pickString(req.query.depart);
    const arrivee = pickString(req.query.arrivee);
    const date = pickString(req.query.date);
    const requestedPlaces = Number(req.query.places);
    const places = Number.isInteger(requestedPlaces) && requestedPlaces > 0 ? requestedPlaces : '';

    const filter = {};
    if (depart) filter.depart = new RegExp(escapeRegex(depart), 'i');
    if (arrivee) filter.arrivee = new RegExp(escapeRegex(arrivee), 'i');
    if (places) filter.places = { $gte: places };
    if (date) {
      const displayDate = dateToDisplay(date);
      if (displayDate) filter.dateData = displayDate;
    }

    const trips = await trip
      .find(filter)
      .populate('driver', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.render('trajets', {
      stylesheet: 'trajets/',
      title: 'Trajets',
      trips,
      filters: { depart, arrivee, date, places },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load trips' });
  }
});

// Trip details
app.get('/trajets/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return tripNotFound(res);
  }

  try {
    const foundTrip = await trip.findById(req.params.id).populate('driver', 'name').lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }

    const userId = req.session.userId ? String(req.session.userId) : null;
    const passengerIds = (foundTrip.passengers || []).map(String);
    const driverId = foundTrip.driver ? String(foundTrip.driver._id) : null;
    const isDriver = Boolean(userId && driverId === userId);
    const isBooked = Boolean(userId && passengerIds.includes(userId));
    const remaining = Math.max((foundTrip.places || 0) - (foundTrip.places_taken || 0), 0);

    return res.render('trajet', {
      stylesheet: 'trajet/',
      title: 'Détail du trajet',
      trip: foundTrip,
      isDriver,
      isBooked,
      remaining,
      notice: req.query.booked ? 'Votre place est réservée.' : '',
      cancelled: req.query.cancelled ? 'Votre réservation a été annulée.' : '',
      error: req.query.error || '',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load trip' });
  }
});

// Reserve a seat
app.post('/trajets/:id/reserver', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const updatedTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        driver: { $ne: req.session.userId },
        passengers: { $ne: req.session.userId },
        $expr: { $lt: [{ $ifNull: ['$places_taken', 0] }, '$places'] },
      },
      {
        $push: { passengers: req.session.userId },
        $inc: { places_taken: 1 },
      },
      { new: true }
    );

    if (updatedTrip) {
      return res.redirect(`${tripUrl}?booked=1`);
    }

    const foundTrip = await trip.findById(req.params.id).lean();
    if (!foundTrip) {
      return tripNotFound(res);
    }
    if (foundTrip.driver && String(foundTrip.driver) === String(req.session.userId)) {
      return res.redirect(`${tripUrl}?error=driver`);
    }
    if ((foundTrip.passengers || []).map(String).includes(String(req.session.userId))) {
      return res.redirect(`${tripUrl}?error=already`);
    }
    if ((foundTrip.places_taken || 0) >= (foundTrip.places || 0)) {
      return res.redirect(`${tripUrl}?error=full`);
    }
    return res.redirect(`${tripUrl}?error=unavailable`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${tripUrl}?error=unavailable`);
  }
});

// Cancel a reservation
app.post('/trajets/:id/annuler', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.redirect('/trajets');
  }
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent(`/trajets/${req.params.id}`)}`);
  }

  const tripUrl = `/trajets/${req.params.id}`;

  try {
    const updatedTrip = await trip.findOneAndUpdate(
      {
        _id: req.params.id,
        passengers: req.session.userId,
        places_taken: { $gt: 0 },
      },
      {
        $pull: { passengers: req.session.userId },
        $inc: { places_taken: -1 },
      },
      { new: true }
    );

    return res.redirect(updatedTrip ? `${tripUrl}?cancelled=1` : `${tripUrl}?error=unavailable`);
  } catch (err) {
    console.error(err);
    return res.redirect(`${tripUrl}?error=unavailable`);
  }
});

// Trips published and booked by the current user
app.get('/mes-trajets', async (req, res) => {
  if (!req.session.userId) {
    return res.redirect(`/login?next=${encodeURIComponent('/mes-trajets')}`);
  }

  try {
    const [published, booked] = await Promise.all([
      trip.find({ driver: req.session.userId })
        .populate('passengers', 'name')
        .sort({ createdAt: -1 })
        .lean(),
      trip.find({ passengers: req.session.userId })
        .populate('driver', 'name')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    return res.render('mes-trajets', {
      stylesheet: 'mes-trajets/',
      title: 'Mes trajets',
      published,
      booked,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({ message: 'Unable to load your trips' });
  }
});

app.get('/signup', (req, res) => {
  res.render('signup', {exist: ''});
});

app.get('/login', (req, res) => {
  res.render('login', { next: safeRedirect(req.query.next) });
});





//publier logic
// Helper: load the trip stored in the session
async function getSessionTrip(req) {
  const tripId = req.session.tripId;
  if (!tripId) {
    return { error: 'Trip ID not found in session' };
  }
  const existingTrip = await trip.findById(tripId);
  if (!existingTrip) {
    return { error: 'Trip not found' };
  }
  return { existingTrip };
}

function pickString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function tripNotFound(res) {
  return res.status(404).render('404', { stylesheet: '404/', title: '404' });
}

function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The wizard stores dates as "12 December 2024"
function dateToDisplay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// POST request to save a new trip and store its ID in the session
app.post('/depart', async (req, res) => {
  try {
    const depart = pickString(req.body.depart || req.body.content);
    if (!depart) {
      return res.status(400).send({ message: 'Missing depart' });
    }
    const newtrip = new trip({
      depart,
      driver: req.session.userId || null,
    });

    // Save the new trip to the database
    const savedTrip = await newtrip.save();

    // Store the ID of the saved trip in the session
    req.session.tripId = savedTrip._id;

    console.log('Saved to database:', savedTrip._id);
    // Redirect to the specified page after successful save
    return res.status(200).redirect('/publier/page2');
  } catch (err) {
    console.log(err);
    // Send an error response if saving fails
    return res.status(500).send({ message: 'Error saving to database' });
  }
});

// POST request to update the 'depart0' property of the trip using the stored ID
app.post('/depart0', async (req, res) => {
  try {
    const depart0 = pickString(req.body.depart0 ?? req.body.content);
    if (!depart0) {
      return res.status(400).send({ message: 'Missing depart0' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    // Update the 'depart0' property of the existing document
    existingTrip.depart0 = depart0;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    return res.status(200).redirect('/publier/page3');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/arrivee', async (req, res) => {
  try {
    const arrivee = pickString(req.body.arrivee ?? req.body.content);
    if (!arrivee) {
      return res.status(400).send({ message: 'Missing arrivee' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    // Update the 'arrivee' property of the existing document
    existingTrip.arrivee = arrivee;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    return res.status(200).redirect('/publier/page4');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating arrivee' });
  }
});

app.post('/arrivee0', async (req, res) => {
  try {
    const arrivee0 = pickString(req.body.arrivee0 ?? req.body.content);
    if (!arrivee0) {
      return res.status(400).send({ message: 'Missing arrivee0' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    // Update the 'arrivee0' property of the existing document
    existingTrip.arrivee0 = arrivee0;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    return res.status(200).redirect('/publier/calendaire');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating arrivee0' });
  }
});

app.post('/date', async (req, res) => {
  try {
    const dateData = pickString(req.body.content ?? req.body.dateData ?? req.body.date);
    if (!dateData) {
      return res.status(400).send({ message: 'Missing date' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }

    // Update the 'dateData' property of the existing document
    existingTrip.dateData = dateData;

    // Save the updated document
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating date' });
  }
});

app.post('/time', async (req, res) => {
  try {
    const time = pickString(req.body.content ?? req.body.time);
    if (!time) {
      return res.status(400).send({ message: 'Missing time' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.time = time;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating time' });
  }
});

app.post('/places', async (req, res) => {
  try {
    const rawPlaces = req.body.content ?? req.body.places;
    const places = Number(rawPlaces);
    if (!Number.isInteger(places) || places < 1 || places > 8) {
      return res.status(400).send({ message: 'Places must be an integer between 1 and 8' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.places = places;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating places' });
  }
});

app.post('/price', async (req, res) => {
  try {
    const price = pickString(req.body.content ?? req.body.price);
    if (!price) {
      return res.status(400).send({ message: 'Missing price' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.price = price;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating price' });
  }
});

app.post('/description', async (req, res) => {
  try {
    const description = pickString(req.body.content ?? req.body.description);
    if (description.length > 1000) {
      return res.status(400).send({ message: 'Description too long' });
    }

    const { existingTrip, error } = await getSessionTrip(req);
    if (error) {
      return res.status(404).send({ message: error });
    }
    existingTrip.description = description;
    await existingTrip.save();
    return res.status(200).send({ ok: true });
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    return res.status(500).send({ message: 'Error updating description' });
  }
});


//'Publier' pages routing

app.get('/publier/page1', (req, res) => {
  res.render('publier/page1');
});

app.get('/publier/page2', (req, res) => {
  res.render('publier/page2');
});

app.get('/publier/page3', (req, res) => {
  res.render('publier/page3');
});

app.get('/publier/page4', (req, res) => {
  res.render('publier/page4');
});

app.get('/publier/calendaire', (req, res) => {
  res.render('publier/calendaire');
});

app.get('/publier/heure', (req, res) => {
  res.render('publier/heure');
});

app.get('/publier/people', (req, res) => {
  res.render('publier/people');
});

app.get('/publier/prix', (req, res) => {
  res.render('publier/prix');
});

app.get('/publier/description', (req, res) => {
  res.render('publier/description');
});


// Handle invalid routes
app.use((req, res) => {
  res.status(404).render('404', {stylesheet: '404/', title : '404'});
});

// Centralized error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).send({ message: 'Internal server error' });
});



// server start
const port = process.env.PORT || 3000;

app.listen(port, () => {
 console.log(`App listening at port ${port}`);
});