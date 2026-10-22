process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'integration-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { combineDepartureAt } = require('../lib/validation');

let app;
let Trip;
let User;
let Notification;
let AuditLog;
let mongo;
let server;
let baseUrl;

function cookieOf(response) {
  const raw = response.headers.get('set-cookie') || '';
  return raw.split(';')[0];
}

function csrfToken(html) {
  const match = /<meta name="csrf-token" content="([^"]+)"/.exec(html);
  return match ? match[1] : '';
}

async function open(path, cookie = '') {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  const html = await response.text();
  return { response, html, cookie: cookieOf(response) || cookie };
}

async function addUser(name, email, userType = 1) {
  return User.create({
    name,
    email,
    password: await bcrypt.hash('secret1', 4),
    userType,
  });
}

async function login(email) {
  const page = await open('/login');
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      cookie: page.cookie,
    },
    body: new URLSearchParams({
      _csrf: csrfToken(page.html),
      email,
      password: 'secret1',
    }),
    redirect: 'manual',
  });
  assert.equal(response.status, 302);
  return { cookie: cookieOf(response) || page.cookie };
}

function tripFields({ dateData = '15 June 2035', time = '07 : 30', ...overrides } = {}) {
  return {
    status: 'published',
    depart: 'Integrationville',
    departKey: 'integrationville',
    depart0: 'Centre',
    arrivee: 'Alger',
    arriveeKey: 'alger',
    arrivee0: 'Centre',
    dateData,
    departureAt: combineDepartureAt(dateData, time),
    time,
    price: '900da',
    priceDZD: 900,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: 'Integration test trip',
    ...overrides,
  };
}

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'fi-tri9i-integration' });

  app = require('../app');
  Trip = require('../models/publier');
  User = require('../models/signup');
  Notification = require('../models/notification');
  AuditLog = require('../models/auditLog');

  await Promise.all([Trip.init(), User.init(), AuditLog.init()]);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await mongoose.disconnect();
  if (mongo) {
    await mongo.stop();
  }
});

test.beforeEach(async () => {
  await Promise.all([
    Trip.deleteMany({}),
    User.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
});

test('the real schema builds the indexes used by the search', async () => {
  const indexes = await Trip.collection.indexes();
  assert.ok(indexes.some((index) => (
    index.key.status === 1
      && index.key.departKey === 1
      && index.key.arriveeKey === 1
      && index.key.departureAt === 1
  )));
});

test('moderation actions leave a durable audit trail', async () => {
  const actor = new mongoose.Types.ObjectId();
  const target = new mongoose.Types.ObjectId();
  const entry = await AuditLog.create({
    actor,
    actorName: 'Admin',
    action: 'trip.cancel',
    targetType: 'trip',
    targetId: target,
    targetLabel: 'Alger - Oran',
    note: 'Signalements répétés',
    metadata: { passengers: 2 },
  });

  const saved = await AuditLog.findById(entry._id).lean();
  assert.equal(saved.actorName, 'Admin');
  assert.equal(saved.action, 'trip.cancel');
  assert.equal(saved.targetLabel, 'Alger - Oran');
  assert.equal(saved.metadata.passengers, 2);

  const indexes = await AuditLog.collection.indexes();
  assert.ok(indexes.some((index) => (
    index.key.targetType === 1
      && index.key.targetId === 1
      && index.key.createdAt === -1
  )));
});

test('search uses the Algiers date and hour with real Mongo queries', async () => {
  const driver = await addUser('Driver', 'driver@integration.dz', 2);
  const dateData = '15 June 2035';

  await Trip.create([
    tripFields({ driver: driver._id, time: '07 : 30' }),
    tripFields({ driver: driver._id, time: '19 : 30' }),
    tripFields({ driver: driver._id, status: 'completed', depart0: 'CompletedStop' }),
    tripFields({ driver: driver._id, status: 'cancelled', depart0: 'CancelledStop' }),
    tripFields({
      driver: driver._id,
      dateData: '1 January 2036',
      time: '00 : 15',
      depart0: 'Minuit',
    }),
  ]);

  const morning = await open(`/trajets?depart=Integrationville&date=${dateData}&heureDebut=06&heureFin=12`);
  assert.equal(morning.response.status, 200);
  assert.match(morning.html, /07 : 30/);
  assert.doesNotMatch(morning.html, /19 : 30/);
  assert.doesNotMatch(morning.html, /CompletedStop|CancelledStop/);

  const midnight = await open('/trajets?depart=Integrationville&date=2036-01-01');
  assert.match(midnight.html, /00 : 15/);

  const previousDay = await open('/trajets?depart=Integrationville&date=2035-12-31');
  assert.doesNotMatch(previousDay.html, /00 : 15/);

  const all = await open('/trajets?depart=Integrationville');
  assert.match(all.html, /19 : 30/);
  assert.doesNotMatch(all.html, /CompletedStop|CancelledStop/);
  const statuses = await Trip.find({}).distinct('status');
  assert.deepEqual(statuses.sort(), ['cancelled', 'completed', 'published']);
});

test('two simultaneous bookings cannot oversell the last seat', async () => {
  const driver = await addUser('Driver', 'driver@integration.dz', 2);
  await addUser('Passenger One', 'one@integration.dz');
  await addUser('Passenger Two', 'two@integration.dz');

  const trip = await Trip.create(tripFields({
    driver: driver._id,
    places: 1,
    time: '08 : 00',
  }));

  const [first, second] = await Promise.all([
    login('one@integration.dz'),
    login('two@integration.dz'),
  ]);

  const [firstPage, secondPage] = await Promise.all([
    open(`/trajets/${trip._id}`, first.cookie),
    open(`/trajets/${trip._id}`, second.cookie),
  ]);

  const body = (token) => new URLSearchParams({ _csrf: token, places: '1' });
  await Promise.all([
    fetch(`${baseUrl}/trajets/${trip._id}/reserver`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: first.cookie },
      body: body(csrfToken(firstPage.html)),
      redirect: 'manual',
    }),
    fetch(`${baseUrl}/trajets/${trip._id}/reserver`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: second.cookie },
      body: body(csrfToken(secondPage.html)),
      redirect: 'manual',
    }),
  ]);

  const saved = await Trip.findById(trip._id).lean();
  assert.equal(saved.places_taken, 1);
  assert.equal(saved.passengers.length, 1);
  assert.equal(await Notification.countDocuments({ type: 'booking' }), 1);
});
