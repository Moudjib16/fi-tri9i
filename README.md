# Fi Tri9i — Algerian Carpooling

Fi Tri9i ("on my way", in Algerian dialect) is a carpooling web app organized by
wilaya: drivers publish their trips through a 9-step wizard, passengers sign up,
log in, and book their seats.

## Features

- Sign-up / login with hashed passwords (bcrypt) and Mongo-backed sessions
- 9-step publishing wizard (login required): departure wilaya and commune,
  arrival wilaya and commune, date, time, seat count, price, description
- Trip search by departure, arrival, date and available seats
- Trip details with seat reservation and cancellation
- "My trips" dashboard: published rides and reservations in one place
- About page, session-aware navbar and working footer/shortcut links
- Server-side validation at every step + JSON responses for the AJAX steps
- Dedicated error pages (existing email, user not found, wrong password, 404)
- Security: helmet with CSP, rate limiting on authentication, httpOnly cookies

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
5. `/publier/page1` → … → `/publier/description` — publish a trip (login
   required; form steps redirect, date/time/places/price/description steps save
   via AJAX)
6. `/mes-trajets` — see published trips and reservations
7. Check MongoDB: `db.users.find()`, `db.trips.find()` and
   `db.sessions.find()` on the `MyApp` database

## Project structure

```text
app.js            # Express application (auth, search, booking, wizard routes)
db/db.js          # Mongoose connection (via MONGO_URI)
lib/validation.js # Shared input/date helpers
models/           # User and Trip schemas
views/            # EJS templates (home, trajets, trajet, publier/*, partials)
public/           # per-page CSS, JS and images
test/             # node:test suites (validation, views, booking flow)
```

## Roadmap

- Extract routes into Express routers (`routes/`)
- Trip editing and driver profiles
- Messaging, payments, email verification, password reset
- Replace `'unsafe-inline'` in the CSP by moving inline page scripts to files
