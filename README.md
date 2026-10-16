# Fi Tri9i — Algerian Carpooling

Fi Tri9i ("on my way", in Algerian dialect) is a carpooling web app organized by
wilaya: drivers publish their trips through a 9-step wizard, passengers sign up,
log in, and book their seats.

## Features

- Sign-up / login with hashed passwords (bcrypt) and persistent sessions
- 9-step publishing wizard: departure wilaya and commune, arrival wilaya and
  commune, date, time, seat count, price, description
- Server-side validation at every step + JSON responses for the AJAX steps
- Dedicated error pages (existing email, user not found, wrong password, 404)
- Basic security: helmet, rate limiting on authentication, httpOnly cookies

## Tech stack

Node.js + Express 4, EJS, Mongoose (MongoDB), express-session, bcrypt, helmet,
express-rate-limit, morgan.

## Prerequisites

- Node.js >= 18
- A reachable MongoDB (local or Docker container on port 27017)

## Install and run

```powershell
npm install
npm start       # http://localhost:3000
npm run dev     # with auto-reload (nodemon)
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

1. `/signup` — create an account (password of at least 6 characters, Client=1 / Driver=2)
2. `/login` — unknown email → "User Not Found" page, wrong password → "Wrong Password" page
3. `/publier/page1` → … → `/publier/description` — publish a trip (form steps
   redirect, date/time/places/price/description steps save via AJAX)
4. Check MongoDB: `db.users.find()` and `db.trips.find()` on the `MyApp` database

## Project structure

```text
app.js            # Express application (auth + wizard routes)
db/db.js          # Mongoose connection (via MONGO_URI)
models/           # User and Trip schemas
views/            # EJS templates (home, login, signup, publier/*, partials)
public/           # per-page CSS, JS and images
```

## Roadmap

- Extract routes into Express routers (`routes/`)
- Persistent session store (connect-mongo) for production
- Trip search, profiles, messaging, payments (menus already point to these
  future pages)
- Automated test suite (supertest) and validation with Joi/Zod
