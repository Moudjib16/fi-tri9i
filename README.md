# Fi Tri9i — Algerian Carpooling

<p align="center">
  <a href="https://github.com/Moudjib16/projet2cp/actions/workflows/ci.yml"><img src="https://github.com/Moudjib16/projet2cp/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-43853D?logo=node.js&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker ready" />
</p>

Fi Tri9i ("on my way", in Algerian dialect) is a carpooling web app organized by
wilaya: drivers publish their trips through a 9-step wizard, passengers sign up,
log in, and book their seats.

## Screenshots

| Home | Trip search |
|---|---|
| ![Home page](docs/screenshots/home.png) | ![Trip search results](docs/screenshots/search.png) |

<p align="center">
  <img src="docs/screenshots/home-mobile.png" alt="Home page on a phone" width="320">
</p>

## Features

- Sign-up / login with hashed passwords (bcrypt) and Mongo-backed sessions
- 9-step publishing wizard (login required): departure wilaya and commune,
  arrival wilaya and commune, date, time, seat count, price, description
- Reference data for the 58 wilayas: the place inputs suggest them, the wilaya
  is validated and stored with its canonical name, and the search matches a
  wilaya with or without its accents
- Communes are suggested from the selected wilaya, but stay free text so a
  missing entry never blocks a trip
- Drafts are private: a trip only appears in search after the final "publier"
  step validates that every required step is complete; owners can resume or
  delete drafts from "Mes trajets"
- Server-side validation for dates (future only), times (`HH:MM`), seat count
  (1–5) and price (1–100000 DA); departures are stored as a sortable `Date`
- French-first dates: the calendar, the listings and the trip pages all render
  "12 décembre 2030"; ISO, French and legacy English labels are all accepted on
  input
- Trip search by departure, arrival, date, available seats, price range and
  departure time window, with sorting (soonest, price, recent, driver rating,
  shortest trip), pagination and automatic hiding of full or already-departed
  trips
- Estimated distance and driving time between the two wilayas, computed from
  the coordinates of the 58 wilaya capitals, shown on the trip cards and pages
- Driver ratings are copied on their trips, so listings can sort by the best
  rated drivers and cards can show the average rating
- Trip details with seat reservation and cancellation before departure; a
  passenger can book several seats at once and past reservations are read-only
- Public driver profiles with upcoming trips and links from trip cards
- Drivers can edit published trips while keeping enough seats for existing
  reservations
- Private trip message threads for drivers and their booked passengers
- In-app notifications for bookings, cancellations, trip updates and messages,
  with unread counts in the navbar
- Optional email notifications for the same activity, controlled from the
  account page, with SMTP delivery configured by environment
- Email verification with hashed, expiring, single-use tokens; new accounts
  can request a fresh link from their account page
- Password reset by email with hashed, expiring, single-use tokens and a
  non-enumerating "if this account exists" response
- One review per passenger after a completed trip; driver profiles show the
  average rating and recent comments
- Account page with secure password changes and current profile details
- Editable profile: display name, private phone number, short public bio and
  passager/conducteur role, all managed from the account page
- Favourites: save published trips from a trip page and review them in
  "Mes favoris"
- Reporting: flag a trip or a driver and follow the moderation status in
  "Mes signalements"
- Moderation dashboard for administrators: treat reports, cancel trips,
  suspend accounts and manage admin roles, with a pagination per section
- Durable moderation audit trail for report decisions, trip cancellations,
  account suspensions and admin role changes, shown in the dashboard
- Drivers can cancel published trips; cancelled rides leave search, appear in
  driver history, and are flagged in passengers' reservations
- "My trips" dashboard: drafts, upcoming rides, completed rides, cancelled
  rides and reservations in one place
- A published trip that already left is completed: it leaves the upcoming
  list, appears under "Trajets terminés" and can no longer be edited
  (`npm run complete-trips` persists the status in the database)
- Flash confirmations and errors for publishing, deleting, booking and
  cancelling trips
- About page, session-aware navbar and working footer/shortcut links
- Dedicated error pages (existing email, suspended account, 403, 404, 500);
  invalid credentials share one non-enumerating login error, and every failure
  renders a page, never a raw JSON payload
- Security: helmet with a strict CSP, shared rate limiting on authentication,
  account actions and every write, timing-safe CSRF checks on every POST,
  httpOnly cookies, session regeneration on login/signup and after a password
  reset, hashed single-use account tokens, bcrypt's 72-byte password limit
  enforced at signup and password change, and suspended drivers' upcoming trips
  cancelled with a notification to their passengers
- Operations: structured JSON request logs with request IDs, configurable log
  level, Mongo-backed shared rate-limit counters in production, a readiness
  endpoint and graceful shutdown

## Tech stack

Node.js 20+ + Express 4, EJS, Mongoose (MongoDB), express-session + connect-mongo,
bcrypt, helmet, express-rate-limit, nodemailer. Tests use the built-in
`node:test` runner.

## Prerequisites

- Node.js >= 20 (see `.nvmrc`, run `nvm use`)
- A reachable MongoDB (local or Docker container on port 27017)

## Install and run

```powershell
Copy-Item .env.example .env   # then edit SESSION_SECRET
npm install
npm start       # http://localhost:3000
npm run dev     # auto-reload with node --watch
npm test        # validation, views, models and booking-flow tests
npm run test:integration  # HTTP and queries against a throwaway real MongoDB
npm run lint    # eslint on server and browser scripts
npm run create-admin -- admin@exemple.com   # grant the moderation role
npm run complete-trips   # mark the trips that already left as completed
npm run backfill-trips   # fill the fields added later on the existing trips
npm run seed    # fill the database with demo accounts and trips
```

`npm run backfill-trips -- --dry-run` shows what would be updated without
writing anything. It also recomputes `departureAt` in the `Africa/Algiers`
timezone, so rerun it once after upgrading an existing database. In production, use `npm ci --omit=dev` and make sure
`SESSION_SECRET` is set; the app refuses to start without it.

### Health check

`GET /health` returns `200 {"status":"ok"}` when MongoDB is connected and
`503 {"status":"unavailable"}` otherwise. The server handles `SIGTERM`/`SIGINT`
by stopping HTTP traffic, closing the session store and disconnecting from
MongoDB.

## Email, logging and rate limiting

Set `SMTP_URL` to a nodemailer connection string such as
`smtp://user:password@smtp.example.com:587` and `EMAIL_FROM` to the sender
address. `APP_URL` is the public base URL used in verification and reset links
(for example `https://fi-tri9i.example.com`). In production, verification,
reset and notification emails are skipped with an `email_not_configured` error
when `SMTP_URL` is absent. In development and tests, emails are captured in
memory and logged as `email_logged` instead of being sent.

`LOG_LEVEL` accepts `debug`, `info`, `warn`, `error` or `silent` (default
`info`, `silent` in tests). Every response carries `X-Request-Id`; a safe
incoming value is reused, otherwise a UUID is generated. `RATE_LIMIT_STORE`
accepts `mongo` (production default) or `memory`; the Mongo store shares
counters across instances and expires old windows automatically.

## Run with Docker

The Compose stack starts the app and a MongoDB 7 container with a persistent
volume:

```powershell
$env:SESSION_SECRET = "replace-with-a-long-random-secret"
docker compose up --build
```

Open http://localhost:3000. Data is kept in the `mongo-data` volume; remove it
with `docker compose down -v` when you want a clean database. Only
`SESSION_SECRET` is required: Compose overrides `MONGO_URI` to reach the
`mongo` service. Set `APP_URL` to the public address and `SMTP_URL` to enable
account and notification emails.

## Deploy

The repository ships a `render.yaml` blueprint: a Docker web service that
exposes the `/health` readiness probe. MongoDB is not part of the blueprint, so
the service needs an external database.

1. Create a free MongoDB Atlas cluster and database user, allow access from
   anywhere (`0.0.0.0/0`) so the host can reach it, and copy the connection
   string with a database name, for example
   `mongodb+srv://user:pass@cluster.mongodb.net/fi_tri9i`.
2. On Render, choose **New → Blueprint**, select this repository and let it read
   `render.yaml`. Render generates `SESSION_SECRET` and builds the `Dockerfile`.
3. Fill in the `sync: false` variables: `MONGO_URI`, `APP_URL`
   (`https://<service-name>.onrender.com`) and, only if you want account and
   notification emails, `SMTP_URL`.
4. Seed the demo data once from a machine that can reach Atlas:
   `MONGO_URI="mongodb+srv://..." npm run seed`.
5. Open the service, log in with a demo account (`karim@demo.dz` / `demo1234`)
   and check that search, publishing and booking work. The free plan sleeps when
   idle, so the first request after a pause takes a few seconds.

Any Docker host works the same way: build the image, set `NODE_ENV=production`,
`SESSION_SECRET`, `APP_URL` and `MONGO_URI`, and point the health check at
`/health`.

## Configuration (.env)

```ini
PORT=3000
MONGO_URI=mongodb://localhost:27017/MyApp
SESSION_SECRET=change-me-in-production
NODE_ENV=development
APP_URL=http://localhost:3000
SMTP_URL=
EMAIL_FROM=Fi Tri9i <no-reply@fi-tri9i.dz>
LOG_LEVEL=info
RATE_LIMIT_STORE=mongo
```

See `.env.example` for the template. The local `.env` file is ignored by git.
`SESSION_SECRET` is mandatory when `NODE_ENV=production`.

## Test walkthrough

1. `/signup` — create an account (password of at least 6 characters,
   Passager=1 / Conducteur=2)
2. `/login` — an unknown email and a wrong password both return the same
   "Email ou mot de passe incorrect" message; a suspended account is refused
   with an explicit page
3. Search trips from the home page or `/trajets` (departure, arrival, date,
   seats), then open a result
4. Log in and click "Réserver une place"; cancel from the trip page or
   `/mes-trajets`
5. `/publier/page1` → … → `/publier/description` — complete the wizard and click
   "publier" (login required; incomplete drafts stay private, appear under
   "Brouillons" in `/mes-trajets`, and can be resumed there)
6. `/mes-trajets` — see published trips and reservations
7. Save a trip with "Ajouter aux favoris", then open `/mes-favoris`
8. Check MongoDB: `db.users.find()`, `db.trips.find()` and
   `db.sessions.find()` on the `MyApp` database
9. Run `npm run create-admin -- <email>` to grant the moderation role, then open
   `/admin` to triage reports
10. Run `npm run seed` to load demo accounts (`karim@demo.dz`, `amina@demo.dz`,
    `yacine@demo.dz`, `sara@demo.dz`, `nadia@demo.dz`, `lina@demo.dz`, password
    `demo1234`) with published trips, a booking, reviews and messages

## Project structure

```text
app.js            # Express setup, middleware, health check and graceful shutdown
routes/           # pages, account, admin, auth, drivers, favourites, messages, notifications, reports, reviews, trips and publish routers
db/db.js          # Mongoose connection (via MONGO_URI)
lib/config.js     # Environment, session, mail, logging and rate-limit configuration
lib/validation.js # Shared input/date helpers
lib/wilayas.js    # Reference data for the 58 wilayas and their communes
lib/distance.js   # Distance and driving time between two wilayas
lib/ratings.js    # Keeps the driver rating stored on their trips up to date
lib/tripStatus.js # Resolves and persists the completed trips
lib/tripMigration.js # Computes the fields added later on the existing trips
lib/seedData.js  # Demo accounts and trips used by the seed script
lib/reports.js    # Shared report reasons and labels
lib/reportTargets.js # Batch-resolves the trip or profile targeted by reports
lib/notifications.js # Creates in-app notifications and optional emails for trip participants
lib/email.js      # SMTP transport, email templates and the test outbox
lib/accountTokens.js # Hashed, expiring single-use verification and reset tokens
lib/auditLog.js   # Moderation action labels and audit-trail helper
lib/logger.js     # Structured JSON logs and request-id middleware
lib/mongoRateLimitStore.js # Shared Mongo-backed rate-limit counters
lib/session.js    # Session regeneration and route guards
lib/flash.js      # One-shot flash messages stored in the session
lib/http.js       # Shared HTTP helpers (404 page and server error page)
models/           # User, Trip, Message, Notification, Review, Favorite, Report and AuditLog schemas
                  # (the Trip passengers array holds one entry per booked seat)
views/            # EJS templates (home, trajets, trajet, mes-favoris, mes-signalements, publier/*, partials)
public/           # shared design system (ui.css) and page scripts
scripts/          # maintenance scripts (create-admin, complete-trips, backfill-trips, seed)
test/             # node:test suites (routes, models, validation, views, wilayas, distance, http, seed)
integration/       # HTTP integration tests backed by a temporary real MongoDB
Dockerfile        # Production image (Node 20, non-root user, health check)
docker-compose.yml # App + MongoDB 7 with a persistent volume
render.yaml       # Render blueprint (Docker service + /health readiness probe)
docs/screenshots/ # Screenshots used in this README
.github/workflows/ # CI: lint and tests on Node 20/22, MongoDB integration tests,
                  # production dependency audit and Docker image build
```

## Roadmap

- Online payments and richer notification preferences (per category, digest)

## License

MIT - see [LICENSE](LICENSE).
