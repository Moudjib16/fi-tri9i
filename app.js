require('dotenv').config();
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const morgan = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./lib/config');
const connectDB = require('./db/db');
const user = require('./models/signup');
const Notification = require('./models/notification');
const { flashMiddleware } = require('./lib/flash');
const { formatDateFr, formatDateIso } = require('./lib/validation');
const { wilayaOptions } = require('./lib/wilayas');
const { tripDistanceOf } = require('./lib/distance');
const { completePastTrips } = require('./lib/tripStatus');
const pagesRouter = require('./routes/pages');
const driversRouter = require('./routes/drivers');
const messagesRouter = require('./routes/messages');
const notificationsRouter = require('./routes/notifications');
const reviewsRouter = require('./routes/reviews');
const accountRouter = require('./routes/account');
const favoritesRouter = require('./routes/favorites');
const reportsRouter = require('./routes/reports');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const tripsRouter = require('./routes/trips');
const publishRouter = require('./routes/publish');

const app = express();

const { isProduction, isTest, sessionSecret } = config;

// Register view engine
app.set('view engine', 'ejs');
app.disable('x-powered-by');
if (isProduction) {
  app.set('trust proxy', 1);
}

// Static files
app.use(express.static(path.join(__dirname, 'public'), {
  redirect: false,
  maxAge: isProduction ? '1d' : 0,
}));

// Readiness probe used by deployments and container orchestrators.
app.get('/health', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ok' : 'unavailable' });
});

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
const sessionStore = isTest
  ? undefined
  : MongoStore.create({
    mongoUrl: config.mongoUri,
    collectionName: 'sessions',
    ttl: config.sessionTtlSeconds,
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
    maxAge: config.sessionMaxAgeMs,
  },
}));
app.use(express.json({ limit: '32kb' }));
app.use(flashMiddleware);

// Views can render safely before the session user is loaded.
app.use((req, res, next) => {
  res.locals.currentUser = null;
  res.locals.unreadNotifications = 0;
  res.locals.formatDate = formatDateFr;
  res.locals.formatDateIso = formatDateIso;
  res.locals.wilayas = wilayaOptions();
  res.locals.tripDistance = tripDistanceOf;
  next();
});

// Per-session CSRF token, required on every state-changing request.
function sameToken(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') {
    return false;
  }
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (req.method === 'POST') {
    const token = (req.body && req.body._csrf) || req.get('x-csrf-token');
    if (!sameToken(token, req.session.csrfToken)) {
      return res.status(403).render('error', {
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
    const currentUser = await user.findById(req.session.userId)
      .select('name email userType phone bio isAdmin suspended')
      .lean();
    if (currentUser && currentUser.suspended) {
      // Suspended accounts are treated as signed out everywhere.
      delete req.session.userId;
    } else if (currentUser) {
      res.locals.currentUser = currentUser;
      try {
        res.locals.unreadNotifications = await Notification.countDocuments({
          recipient: currentUser._id,
          readAt: null,
        });
      } catch (err) {
        console.error('Unable to count notifications:', err.message);
      }
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
  // The test suite signs in many times, it must not hit the production limit.
  max: isTest ? 1000 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  // Page views should never consume the login attempt budget.
  skip: (req) => req.method !== 'POST',
  message: { message: 'Too many attempts, please try again later.' },
});
app.use('/login', authLimiter);
app.use('/signup', authLimiter);

const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
  message: { message: 'Too many attempts, please try again later.' },
});
app.use('/compte/mot-de-passe', accountLimiter);

// Every state-changing request is throttled, so a single client cannot spam
// bookings, messages, reports or favourites.
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTest ? 5000 : 150,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method !== 'POST',
  message: { message: 'Trop de requêtes, réessayez dans quelques minutes.' },
});
app.use(writeLimiter);

// Routes
app.use(pagesRouter);
app.use(driversRouter);
app.use(messagesRouter);
app.use(notificationsRouter);
app.use(reviewsRouter);
app.use(accountRouter);
app.use(favoritesRouter);
app.use(reportsRouter);
app.use(adminRouter);
app.use(authRouter);
app.use(tripsRouter);
app.use(publishRouter);

// Handle invalid routes
app.use((req, res) => {
  res.status(404).render('404', { title: '404' });
});

// Centralized error handler (must be last)
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  return res.status(status).render('error', {
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
  const start = async () => {
    await connectDB();
    const server = app.listen(config.port, () => {
      console.log(`App listening at port ${config.port}`);
    });

    // Keep the status of the trips that already left up to date.
    const completeTrips = () => {
      completePastTrips().catch((err) => {
        console.error('Unable to complete past trips:', err.message);
      });
    };
    completeTrips();
    const timer = setInterval(completeTrips, 15 * 60 * 1000);

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down.`);
      clearInterval(timer);

      const forcedExit = setTimeout(() => process.exit(1), 10 * 1000);
      forcedExit.unref();

      await new Promise((resolve) => server.close(resolve));
      if (sessionStore && typeof sessionStore.close === 'function') {
        await sessionStore.close().catch(() => {});
      }
      await mongoose.disconnect();
      process.exit(0);
    };

    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
  };

  start().catch((err) => {
    console.error('Unable to start the application:', err.message);
    process.exit(1);
  });
}

module.exports = app;
