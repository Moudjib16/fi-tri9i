# Fi Tri9i — Algerian Carpooling

Fi Tri9i ("on my way", in Algerian dialect) is a carpooling web app organized by
wilaya: drivers publish their trips through a 9-step wizard, passengers sign up,
log in, and book their seats.

## Features

- Sign-up / login with hashed passwords (bcrypt) and Mongo-backed sessions
- 9-step publishing wizard (login required): departure wilaya and commune,
  arrival wilaya and commune, date, time, seat count, price, description
- Drafts are private: a trip only appears in search after the final "publier"
  step validates that every required step is complete; owners can resume or
  delete drafts from "Mes trajets"
- Server-side validation for dates (future only), times (`HH:MM`), seat count
  (1–5) and price (1–100000 DA); departures are stored as a sortable `Date`
- French-first dates: the calendar, the listings and the trip pages all render
  "12 décembre 2030"; ISO, French and legacy English labels are all accepted on
  input
- Trip search by departure, arrival, date and available seats, with sorting,
  pagination and automatic hiding of full or already-departed trips
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
- "My trips" dashboard: drafts, published rides, cancelled rides and
  reservations in one place
- Flash confirmations and errors for publishing, deleting, booking and
  cancelling trips
- About page, session-aware navbar and working footer/shortcut links
- Dedicated error pages (existing email, user not found, wrong password, 403,
  404, 500)
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
npm test        # validation, views and booking-flow tests
npm run create-admin -- admin@exemple.com   # grant the moderation role
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

## Project structure

```text
app.js            # Express setup, middleware and router mounting
routes/           # pages, account, admin, auth, drivers, favourites, messages, notifications, reports, reviews, trips and publish routers
db/db.js          # Mongoose connection (via MONGO_URI)
lib/validation.js # Shared input/date helpers
lib/reports.js    # Shared report reasons and labels
lib/reportTargets.js # Resolves the trip or profile targeted by a report
lib/session.js    # Session regeneration and route guards
lib/flash.js      # One-shot flash messages stored in the session
lib/http.js       # Shared HTTP helpers
models/           # User, Trip, Message, Notification, Review, Favorite and Report schemas
views/            # EJS templates (home, trajets, trajet, mes-favoris, mes-signalements, publier/*, partials)
public/           # shared design system (ui.css) and page scripts
scripts/          # maintenance scripts (create-admin)
test/             # node:test suites (validation, views, booking flow)
```

## Roadmap

- Email notifications, payments, email verification, password reset
