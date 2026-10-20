require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const connectDB = require('./db/db');
const user = require('./models/signup');
const { flashMiddleware } = require('./lib/flash');
const pagesRouter = require('./routes/pages');
const driversRouter = require('./routes/drivers');
const messagesRouter = require('./routes/messages');
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const publishRouter = require('./routes/publish');

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'fi-tri9i-dev-secret';

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production');
}

// Register view engine
app.set('view engine', 'ejs');
app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

// Static files
app.use(express.static(path.join(__dirname, 'public'), { redirect: false }));

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
    },
  },
}));
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

// Sessions are persisted in MongoDB so logins survive restarts
const sessionStore = process.env.NODE_ENV === 'test'
  ? undefined
  : MongoStore.create({
    mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/MyApp',
    collectionName: 'sessions',
    ttl: 7 * 24 * 60 * 60,
    crypto: { secret: sessionSecret },
  });

app.use(session({
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use(bodyParser.json({ limit: '32kb' }));
app.use(flashMiddleware);

// Views can render safely before the session user is loaded.
app.use((req, res, next) => {
  res.locals.currentUser = null;
  next();
});

// Per-session CSRF token, required on every state-changing request.
app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === 'POST') {
    const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('error', {
        stylesheet: '404/',
        title: 'Accès refusé',
        status: 403,
        heading: 'Accès refusé',
        message: 'Votre session a expiré. Rechargez la page et réessayez.',
      });
    }
  }
  return next();
});

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

// Routes
app.use(pagesRouter);
app.use(driversRouter);
app.use(messagesRouter);
app.use(authRouter);
app.use(tripsRouter);
app.use(publishRouter);

// Handle invalid routes
app.use((req, res) => {
  res.status(404).render('404', { stylesheet: '404/', title: '404' });
});

// Centralized error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  return res.status(status).render('error', {
    stylesheet: '404/',
    title: status === 403 ? 'Accès refusé' : 'Erreur serveur',
    status,
    heading: status === 403 ? 'Accès refusé' : 'Une erreur est survenue',
    message: status === 403
      ? "Vous n'avez pas les droits nécessaires pour effectuer cette action."
      : 'Une erreur inattendue est survenue. Réessayez dans quelques instants.',
  });
});

// server start
if (require.main === module) {
  connectDB();
  const port = process.env.PORT || 3000;

  app.listen(port, () => {
    console.log(`App listening at port ${port}`);
  });
}

module.exports = app;
