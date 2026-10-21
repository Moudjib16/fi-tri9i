# Fi Tri9i — Algerian Carpooling

Fi Tri9i ("on my way", in Algerian dialect) is a carpooling web app organized by
wilaya: drivers publish their trips through a 9-step wizard, passengers sign up,
log in, and book their seats.

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
  departure time window, with sorting (soonest, price, recent, driver rating),
  pagination and automatic hiding of full or already-departed trips
- Driver ratings are copied on their trips, so listings can sort by the best
  rated drivers and cards can show the average rating
- Trip details with seat reservation and cancellation before departure; past
  reservations are read-only
- Public driver profiles with upcoming trips and links from trip cards
- Drivers can edit published trips while keeping enough seats for existing
  reservations
- Private trip message threads for drivers and their booked passengers
- In-app notifications for bookings, cancellations, trip updates and messages,
  with unread counts in the navbar
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
  suspend accounts and manage admin roles
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
- Dedicated error pages (existing email, user not found, wrong password, 403,
  404, 500); every failure renders a page, never a raw JSON payload
- Security: helmet with a strict CSP, rate limiting on authentication, httpOnly
  cookies, per-session CSRF tokens on every POST, and session regeneration on
  login/signup

## Tech stack

Node.js + Express 4, EJS, Mongoose (MongoDB), express-session + connect-mongo,
bcrypt, helmet, express-rate-limit, morgan. Tests use the built-in `node:test`
runner.

## Prerequisites

- Node.js >= 18
- A reachable MongoDB (local or Docker container on port 27017)

## Install and run

```powershell
npm install
npm start       # http://localhost:3000
npm run dev     # with auto-reload (nodemon)
npm test        # validation, views, wilayas and booking-flow tests
npm run lint    # eslint on the JavaScript sources
npm run create-admin -- admin@exemple.com   # grant the moderation role
npm run complete-trips   # mark the trips that already left as completed
npm run seed    # fill the database with demo accounts and trips
```

## Configuration (.env)

```ini
PORT=3000
MONGO_URI=mongodb://localhost:27017/MyApp
SESSION_SECRET=change-me-in-production
NODE_ENV=development
```

See `.env.example` for the template. The local `.env` file is ignored by git.

## Test walkthrough

1. `/signup` — create an account (password of at least 6 characters,
   Passager=1 / Conducteur=2)
2. `/login` — unknown email → "User Not Found" page, wrong password →
   "Wrong Password" page
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
app.js            # Express setup, middleware and router mounting
routes/           # pages, account, admin, auth, drivers, favourites, messages, notifications, reports, reviews, trips and publish routers
db/db.js          # Mongoose connection (via MONGO_URI)
lib/validation.js # Shared input/date helpers
lib/wilayas.js    # Reference data for the 58 wilayas and their communes
lib/ratings.js    # Keeps the driver rating stored on their trips up to date
lib/tripStatus.js # Resolves and persists the completed trips
lib/seedData.js  # Demo accounts and trips used by the seed script
lib/reports.js    # Shared report reasons and labels
lib/reportTargets.js # Resolves the trip or profile targeted by a report
lib/session.js    # Session regeneration and route guards
lib/flash.js      # One-shot flash messages stored in the session
lib/http.js       # Shared HTTP helpers (404 page and server error page)
models/           # User, Trip, Message, Notification, Review, Favorite and Report schemas
views/            # EJS templates (home, trajets, trajet, mes-favoris, mes-signalements, publier/*, partials)
public/           # shared design system (ui.css) and page scripts
scripts/          # maintenance scripts (create-admin, complete-trips, seed)
test/             # node:test suites (validation, views, wilayas, http, seed, booking flow)
.github/workflows/ # CI running the lint and the test suite
```

## Roadmap

- Email notifications, payments, email verification, password reset
