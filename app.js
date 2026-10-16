require('dotenv').config();
const express = require('express');
const path = require('path');
const morgan = require('morgan');
const user = require('./models/signup');
const trip = require('./models/publier');
const bcrypt = require('bcrypt');
const connectDB = require('./db/db');
const session = require ('express-session');
const app = express();
const bodyParser = require('body-parser');


// Register view engine
app.set('view engine', 'ejs');

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Middleware
app.use(morgan('dev'));
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
      return res.redirect('/');
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
app.get('/home', (req, res) => {
    res.redirect('/');
  });

app.get('/signup', (req, res) => {
  res.render('signup', {exist: ''});
});

app.get('/login', (req, res) => {
  res.render('login');
});





//publier logic 
// POST request to save a new trip and store its ID in the session
app.post('/depart', async (req, res) => {
  try {
    console.log(req.body);
    const newtrip = new trip(req.body);

    // Save the new trip to the database
    const savedTrip = await newtrip.save();

    // Store the ID of the saved trip in the session
    req.session.tripId = savedTrip._id;

    console.log('Saved to database:', savedTrip);
    // Redirect to the specified page after successful save
    res.status(200).redirect('publier/page2');
  } catch (err) {
    console.log(err);
    // Send an error response if saving fails
    res.status(500).send({ message: 'Error saving to database' });
  }
});

// POST request to update the 'depart0' property of the trip using the stored ID
app.post('/depart0', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const { depart0 } = req.body;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the 'depart0' property of the existing document
    existingTrip.depart0 = depart0;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    res.status(200).redirect('publier/page3');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/arrivee', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const { arrivee } = req.body;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the 'depart0' property of the existing document
    existingTrip.arrivee = arrivee;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    res.status(200).redirect('publier/page4');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/arrivee0', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const { arrivee0 } = req.body;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the 'depart0' property of the existing document
    existingTrip.arrivee0 = arrivee0;

    // Save the updated document
    await existingTrip.save();

    // Send a success response
    res.status(200).redirect('publier/calendaire');
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/date', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const dateData = req.body.content;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }

    // Update the 'depart0' property of the existing document
    existingTrip.dateData = dateData;

    // Save the updated document
    await existingTrip.save();
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/time', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const time = req.body.content;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }
    existingTrip.time = time;
    await existingTrip.save();
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/places', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const places = req.body.content;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }
    existingTrip.places = places;
    await existingTrip.save();
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/price', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const price = req.body.content;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }
    existingTrip.price = price;
    await existingTrip.save();
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
  }
});

app.post('/description', async (req, res) => {
  try {
    // Assuming req.body contains the new value for 'depart0'
    const description = req.body.content;

    // Retrieve the stored trip ID from the session
    const tripId = req.session.tripId;

    if (!tripId) {
      // If the ID is not found in the session, send an error response
      return res.status(404).send({ message: 'Trip ID not found in session' });
    }

    // Find the trip document by ID
    const existingTrip = await trip.findById(tripId);

    if (!existingTrip) {
      // If the document doesn't exist, send an error response
      return res.status(404).send({ message: 'Trip not found' });
    }
    existingTrip.description = description;
    await existingTrip.save();
  } catch (err) {
    console.log(err);
    // Send an error response if updating fails
    res.status(500).send({ message: 'Error updating depart0' });
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



// server start
const port = process.env.PORT || 3000;

app.listen(port, () => {
 console.log(`App listening at port ${port}`);
});