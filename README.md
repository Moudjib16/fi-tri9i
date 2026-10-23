# Fi Tri9i — Algerian Carpooling

<p align="center">
  <a href="https://github.com/Moudjib16/fi-tri9i/actions/workflows/ci.yml"><img src="https://github.com/Moudjib16/fi-tri9i/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/Node.js-20%2B-43853D?logo=node.js&logoColor=white" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white" alt="Docker ready" />
</p>

Fi Tri9i ("on my way" in Algerian dialect) is a carpooling web application
organized by wilaya. Drivers publish intercity trips through a guided wizard;
passengers search, compare and reserve seats.

| Home | Trip search | Mobile |
|:---:|:---:|:---:|
| ![Home page](docs/screenshots/home.png) | ![Trip search results](docs/screenshots/search.png) | ![Home page on mobile](docs/screenshots/home-mobile.png) |

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Configuration](#configuration)
- [Scripts](#scripts)
- [Testing](#testing)
- [Docker](#docker)
- [Deployment](#deployment)
- [Manual walkthrough](#manual-walkthrough)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [License](#license)

## Features

### Accounts and profiles

- Email/password authentication with bcrypt hashing and MongoDB-backed sessions.
- Email verification and password reset with hashed, expiring, single-use tokens.
- Editable profiles (display name, phone, bio, passenger/driver role) and public
  driver pages with upcoming trips, ratings and reviews.
- Administrator accounts with role management.

### Publishing trips

- Nine-step publishing wizard with resumable private drafts.
- Reference data for the 58 wilayas and their communes, matched with or without
  accents.
- Server-side validation for dates, times, seat count and price; departures are
  stored in the `Africa/Algiers` timezone and displayed in French.
- Estimated distance and driving time between wilayas.
- Drivers can edit or cancel published trips while preserving existing
  reservations.
- A trip that has already departed is marked as completed and becomes read-only.

### Search and booking

- Search by departure, arrival, date, available seats, price range and departure
  time window.
- Sorting by soonest departure, price, recency, driver rating or distance, with
  paginated results and full or departed trips hidden.
- Multi-seat reservations and cancellation before departure; past bookings are
  read-only.
- Favourites, private trip message threads and in-app notifications.
- Optional email notifications for bookings, cancellations, trip updates and
  messages.
- One review per passenger after a completed trip.

### Trust, safety and moderation

- Reporting for trips and drivers, with status tracking for the reporter.
- Moderation dashboard for reports, trip cancellations, account suspensions and
  admin roles, backed by a durable audit trail.
- Security: Content Security Policy, CSRF protection, shared rate limiting,
  httpOnly cookies, session rotation, bcrypt password limits and
  non-enumerating authentication errors.

### Operations

- Structured JSON request logs with request IDs and configurable log levels.
- `/health` readiness probe and graceful shutdown.
- MongoDB-backed rate-limit counters shared across instances.
- Docker image, Compose stack and Render deployment blueprint.

## Tech stack

| Layer | Tools |
|---|---|
| Runtime | Node.js 20+, Express 4 |
| Views | EJS |
| Database | MongoDB, Mongoose 8 |
| Sessions | express-session, connect-mongo |
| Security | bcrypt, helmet, express-rate-limit |
| Email | Nodemailer |
| Tests | `node:test`, mongodb-memory-server |

## Getting started

### Prerequisites

- Node.js 20 or newer (see `.nvmrc`; `nvm use` selects the pinned version).
- A reachable MongoDB instance, local, in Docker or hosted (for example Atlas).

### Installation

```bash
cp .env.example .env
npm install
npm run seed   # optional demo accounts and trips
npm run dev    # http://localhost:3000
```

Set `SESSION_SECRET` in `.env` before running the app. For a production-style
start, install with `npm ci --omit=dev` and run `npm start`.

### Demo data

`npm run seed` creates six accounts, all using the password `demo1234`:

`karim@demo.dz`, `amina@demo.dz`, `yacine@demo.dz`, `sara@demo.dz`,
`nadia@demo.dz` and `lina@demo.dz`.

The seed also adds published trips, a booking, reviews and messages. To grant the
moderation role to an existing account:

```bash
npm run create-admin -- admin@example.com
```

## Configuration

The app loads `.env` through `dotenv`; `.env.example` lists every supported
variable.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port. |
| `NODE_ENV` | `development` | Set to `production` in deployed environments. |
| `MONGO_URI` | `mongodb://localhost:27017/MyApp` | MongoDB connection string, including the database name. |
| `SESSION_SECRET` | Development fallback | Required in production; signs cookies and encrypts stored sessions. |
| `APP_URL` | `http://localhost:3000` | Public base URL used in emails, canonical links and social metadata. |
| `SMTP_URL` | Empty | Nodemailer connection string, for example `smtp://user:pass@smtp.example.com:587`. |
| `EMAIL_FROM` | `Fi Tri9i <no-reply@fi-tri9i.dz>` | Sender address for outgoing email. |
| `LOG_LEVEL` | `info` (`silent` in tests) | `debug`, `info`, `warn`, `error` or `silent`. |
| `RATE_LIMIT_STORE` | `mongo` (`memory` in tests) | Shared rate-limit backend. |

When `SMTP_URL` is absent, production skips verification, reset and notification
emails and logs an `email_not_configured` error. Development and tests capture
messages in memory instead of sending them.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the application. |
| `npm run dev` | Start with `node --watch` for automatic reloads. |
| `npm test` | Run unit and view tests. |
| `npm run test:integration` | Run MongoDB-backed integration tests. |
| `npm run lint` | Lint server and browser sources with ESLint. |
| `npm run seed` | Load demo accounts and trips. |
| `npm run create-admin -- <email>` | Grant the moderation role to an account. |
| `npm run complete-trips` | Persist the completed status of departed trips. |
| `npm run backfill-trips` | Fill fields added after the original data model. |
| `npm run backfill-trips -- --dry-run` | Preview the backfill without writing. |

After upgrading an existing database, run `npm run backfill-trips` once. It fills
the fields added since the original schema and recomputes `departureAt` in the
`Africa/Algiers` timezone.

## Testing

```bash
npm run lint
npm test
npm run test:integration
```

`npm test` covers validation, views, models and the booking flow without needing
MongoDB. `npm run test:integration` starts a temporary real MongoDB instance and
exercises queries, sessions, account tokens and concurrent bookings. The first
integration run downloads a MongoDB binary, which is cached for later runs.

CI runs the checks on Node.js 20 and 22, then runs the MongoDB integration suite,
audits production dependencies and builds the Docker image.

## Docker

```bash
cp .env.example .env   # set SESSION_SECRET
docker compose up --build
```

Open http://localhost:3000. Compose starts the app and MongoDB 7 with a
persistent `mongo-data` volume, and points `MONGO_URI` at the `mongo` service.
Remove the database volume with `docker compose down -v` when you want a clean
environment.

## Deployment

### Render

The repository includes `render.yaml`, a Render blueprint for a Docker web
service with the `/health` readiness probe. MongoDB is not part of the blueprint,
so the service needs an external database.

1. Create a MongoDB Atlas cluster and database user, allow access from Render
   (`0.0.0.0/0`), and copy the connection string with a database name.
2. In Render, choose **New → Blueprint** and select this repository. Render
   reads `render.yaml`, generates `SESSION_SECRET` and builds the `Dockerfile`.
3. Set the `sync: false` variables: `MONGO_URI`, `APP_URL`
   (`https://<service-name>.onrender.com`) and, optionally, `SMTP_URL`.
4. Seed demo data once from a machine that can reach Atlas:
   `MONGO_URI="mongodb+srv://..." npm run seed`.

The free plan sleeps when idle, so the first request after a pause may take a few
seconds.

### Other Docker hosts

Build the image and set `NODE_ENV=production`, `SESSION_SECRET`, `APP_URL` and
`MONGO_URI`. Point the health check at `/health`.

## Manual walkthrough

1. Create an account at `/signup`, then sign in at `/login`.
2. Search from `/` or `/trajets` by departure, arrival, date and seats.
3. Open a trip and reserve one or more seats; cancel from `/mes-trajets`.
4. Publish a trip through `/publier/page1` and finish with "publier". Incomplete
   drafts stay private under "Brouillons" in `/mes-trajets`.
5. Save a trip and review it in `/mes-favoris`.
6. Grant an account the moderation role with `npm run create-admin -- <email>`
   and open `/admin`.

## Project structure

```text
.
├── app.js                 # Express setup, middleware, health check, shutdown
├── routes/                # Page, authentication, trip, booking and admin routers
├── models/                # Mongoose schemas (users, trips, messages, reviews...)
├── lib/                   # Config, validation, sessions, email, logging, helpers
├── views/                 # EJS templates and partials
├── public/                # Shared CSS and browser scripts
├── db/                    # MongoDB connection
├── scripts/               # Seed, admin and maintenance scripts
├── test/                  # Unit and view tests
├── integration/           # MongoDB-backed integration tests
├── docs/screenshots/      # Images used in this README
├── .github/workflows/     # CI: lint, tests, audit and Docker build
├── Dockerfile             # Production image (Node 20, non-root user)
├── docker-compose.yml     # App + MongoDB 7 with a persistent volume
└── render.yaml            # Render blueprint
```

## Roadmap

- Online payments and richer notification preferences (per category, digest).

## License

MIT — see [LICENSE](LICENSE).
