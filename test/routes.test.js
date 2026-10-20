process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const bcrypt = require('bcrypt');

const tripId = '64f000000000000000000001';
const passengerId = '64f000000000000000000002';
const driverId = '64f000000000000000000003';

const state = {
  users: [],
  messages: [],
  notifications: [],
  trips: [
    {
      _id: tripId,
      status: 'published',
      depart: 'Alger',
      depart0: 'Bab Ezzouar',
      arrivee: 'Bejaia',
      arrivee0: 'Amizour',
      dateData: '12 December 2030',
      departureAt: new Date('2030-12-12T08:00:00Z'),
      time: '08 : 00',
      price: '1200da',
      priceDZD: 1200,
      places: 2,
      places_taken: 0,
      passengers: [],
      description: 'Trajet de test',
      driver: { _id: driverId, name: 'Karim' },
    },
  ],
};

function tripChain(result) {
  let items = result;
  const query = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    limit(count) {
      items = Array.isArray(items) ? items.slice(0, count) : items;
      return query;
    },
    skip(count) {
      items = Array.isArray(items) ? items.slice(count) : items;
      return query;
    },
    lean: async () => items,
  };

  // findById() is used both as a chain (trip detail) and as a document
  // (publish wizard), so plain trip objects get the document methods too.
  if (result && !Array.isArray(result)) {
    result.save = async () => result;
    result.populate = () => query;
    result.sort = () => query;
    result.skip = () => query;
    result.limit = () => query;
    result.lean = async () => result;
    return result;
  }

  return query;
}

function matchesTrip(candidate, filter) {
  return Object.entries(filter).every(([key, value]) => {
    if (key === '$and') {
      return value.every((clause) => matchesTrip(candidate, clause));
    }
    if (key === '$or') {
      return value.some((clause) => matchesTrip(candidate, clause));
    }
    if (key === 'departureAt') {
      const departure = candidate.departureAt ? new Date(candidate.departureAt) : null;
      if (value === null) {
        return departure === null;
      }
      if (!departure) {
        return false;
      }
      if (value.$gte !== undefined && departure < new Date(value.$gte)) return false;
      if (value.$lt !== undefined && departure >= new Date(value.$lt)) return false;
      if (value.$gt !== undefined && departure <= new Date(value.$gt)) return false;
      return true;
    }
    if (key === 'dateData') {
      return candidate.dateData === value;
    }
    if (key === 'driver') {
      const driver = candidate.driver && candidate.driver._id ? candidate.driver._id : candidate.driver;
      return String(driver) === String(value);
    }
    if (key === 'places') {
      return (candidate.places || 0) >= value.$gte;
    }
    if (key === '$expr') {
      const [left, right] = value.$gte[0].$subtract;
      const leftValue = candidate[left.replace('$', '')] || 0;
      const rightValue = right.$ifNull
        ? candidate[right.$ifNull[0].replace('$', '')] || 0
        : right;
      return leftValue - rightValue >= value.$gte[1];
    }
    if (key === 'status' && value && value.$nin) {
      return !value.$nin.includes(candidate.status);
    }
    if (key === 'status' && value && value.$ne !== undefined) {
      return candidate.status !== value.$ne;
    }
    if (value instanceof RegExp) {
      return value.test(candidate[key] || '');
    }
    return String(candidate[key]) === String(value);
  });
}

function fakeTrip(data = {}) {
  Object.assign(this, data);
  this._id = data._id || `64f${String(state.trips.length + 100).padStart(21, '0')}`;
  this.status = data.status || 'draft';
  this.save = async () => {
    if (!state.trips.includes(this)) {
      state.trips.push(this);
    }
    return this;
  };
}

Object.assign(fakeTrip, {
  find(filter = {}) {
    return tripChain(state.trips.filter((candidate) => matchesTrip(candidate, filter)));
  },
  async countDocuments(filter = {}) {
    return state.trips.filter((candidate) => matchesTrip(candidate, filter)).length;
  },
  findById(id) {
    return tripChain(state.trips.find((candidate) => String(candidate._id) === String(id)) || null);
  },
  findOneAndDelete(filter) {
    const index = state.trips.findIndex((candidate) => String(candidate._id) === String(filter._id));
    if (index === -1) {
      return null;
    }
    const rawDriver = state.trips[index].driver;
    const driver = rawDriver ? String(rawDriver._id || rawDriver) : null;
    if (filter.driver && driver !== String(filter.driver)) {
      return null;
    }
    if (filter.status && state.trips[index].status !== filter.status) {
      return null;
    }
    return state.trips.splice(index, 1)[0];
  },
  findOneAndUpdate(filter, update) {
    const found = state.trips.find((candidate) => String(candidate._id) === String(filter._id));
    if (!found) {
      return null;
    }
    if (filter.status && filter.status.$nin && filter.status.$nin.includes(found.status)) {
      return null;
    }
    if (filter.$or) {
      const allowed = filter.$or.some((clause) => {
        const departure = found.departureAt ? new Date(found.departureAt) : null;
        if (clause.departureAt === null) {
          return departure === null;
        }
        if (clause.departureAt && clause.departureAt.$gt !== undefined) {
          return Boolean(departure && departure > new Date(clause.departureAt.$gt));
        }
        return false;
      });
      if (!allowed) {
        return null;
      }
    }
    if (filter.driver) {
      const driver = found.driver ? String(found.driver._id || found.driver) : null;
      if (filter.driver.$ne !== undefined) {
        if (driver === String(filter.driver.$ne)) {
          return null;
        }
      } else if (driver !== String(filter.driver)) {
        return null;
      }
    }
    if (filter.status && typeof filter.status === 'string' && found.status !== filter.status) {
      return null;
    }
    if (filter.passengers !== undefined) {
      const passengers = (found.passengers || []).map(String);
      if (filter.passengers.$ne !== undefined) {
        if (passengers.includes(String(filter.passengers.$ne))) {
          return null;
        }
      } else if (!passengers.includes(String(filter.passengers))) {
        return null;
      }
    }
    if (filter.places_taken && filter.places_taken.$gt !== undefined) {
      if (!((found.places_taken || 0) > filter.places_taken.$gt)) {
        return null;
      }
    }
    if (filter.$expr) {
      if (!((found.places_taken || 0) < found.places)) {
        return null;
      }
    }
    if (update.$push && update.$push.passengers !== undefined) {
      found.passengers = found.passengers || [];
      found.passengers.push(update.$push.passengers);
    }
    if (update.$pull && update.$pull.passengers !== undefined) {
      found.passengers = (found.passengers || []).filter(
        (passenger) => String(passenger) !== String(update.$pull.passengers)
      );
    }
    if (update.$inc && update.$inc.places_taken) {
      found.places_taken = (found.places_taken || 0) + update.$inc.places_taken;
    }
    if (update.$set) {
      Object.assign(found, update.$set);
    }
    return found;
  },
});

const fakeUser = {
  findById(id) {
    const query = {
      select() {
        return query;
      },
      lean: async () => state.users.find((candidate) => String(candidate._id) === String(id)) || null,
    };
    return query;
  },
  findOne({ email }) {
    return state.users.find((candidate) => candidate.email === email) || null;
  },
};

const fakeMessage = {
  async create(data) {
    const message = {
      _id: `64f${String(500 + state.messages.length).padStart(21, '0')}`,
      ...data,
      createdAt: new Date(`2031-01-01T12:${String(state.messages.length).padStart(2, '0')}:00Z`),
    };
    state.messages.push(message);
    return message;
  },
  find(filter = {}) {
    let items = state.messages.filter(
      (candidate) => String(candidate.trip) === String(filter.trip)
    );
    const query = {
      populate() {
        return query;
      },
      sort(spec = {}) {
        const direction = spec.createdAt === -1 ? -1 : 1;
        items.sort((left, right) => (
          (new Date(left.createdAt) - new Date(right.createdAt)) * direction
        ));
        return query;
      },
      limit(count) {
        items = items.slice(0, count);
        return query;
      },
      lean: async () => items.map((message) => {
        const sender = state.users.find(
          (candidate) => String(candidate._id) === String(message.sender)
        );
        return {
          ...message,
          sender: sender ? { _id: sender._id, name: sender.name } : message.sender,
        };
      }),
    };
    return query;
  },
};

const fakeNotification = {
  async insertMany(documents) {
    const created = documents.map((document) => {
      const notification = {
        _id: `64f${String(700 + state.notifications.length).padStart(21, '0')}`,
        readAt: null,
        ...document,
        createdAt: new Date(`2031-01-01T10:00:${String(state.notifications.length).padStart(2, '0')}Z`),
      };
      state.notifications.push(notification);
      return notification;
    });
    return created;
  },
  async countDocuments(filter = {}) {
    return state.notifications.filter((notification) => {
      if (filter.recipient && String(notification.recipient) !== String(filter.recipient)) {
        return false;
      }
      if (filter.readAt === null && notification.readAt !== null) {
        return false;
      }
      return true;
    }).length;
  },
  find(filter = {}) {
    let items = state.notifications.filter(
      (notification) => !filter.recipient
        || String(notification.recipient) === String(filter.recipient)
    );
    const query = {
      sort(spec = {}) {
        const direction = spec.createdAt === -1 ? -1 : 1;
        items.sort((left, right) => (
          (new Date(left.createdAt) - new Date(right.createdAt)) * direction
        ));
        return query;
      },
      limit(count) {
        items = items.slice(0, count);
        return query;
      },
      lean: async () => items.map((notification) => ({ ...notification })),
    };
    return query;
  },
  async updateMany(filter = {}, update = {}) {
    let modifiedCount = 0;
    state.notifications.forEach((notification) => {
      if (filter.recipient && String(notification.recipient) !== String(filter.recipient)) {
        return;
      }
      if (filter.readAt === null && notification.readAt !== null) {
        return;
      }
      if (update.$set && update.$set.readAt) {
        notification.readAt = update.$set.readAt;
        modifiedCount += 1;
      }
    });
    return { modifiedCount };
  },
};

function installMock(relativePath, exports) {
  const resolved = require.resolve(relativePath);
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports,
  };
}

installMock('../models/publier', fakeTrip);
installMock('../models/signup', fakeUser);
installMock('../models/message', fakeMessage);
installMock('../models/notification', fakeNotification);

const app = require('../app');

let server;
let baseUrl;

test.before(async () => {
  state.users.push({
    _id: passengerId,
    name: 'Sara',
    email: 'sara@test.dz',
    password: await bcrypt.hash('secret1', 10),
    userType: 1,
  });
  state.users.push({
    _id: driverId,
    name: 'Karim',
    email: 'karim@test.dz',
    password: await bcrypt.hash('secret1', 10),
    userType: 2,
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

function sessionCookie(response) {
  return (response.headers.get('set-cookie') || '').split(';')[0];
}

function csrfToken(html) {
  const match = html.match(/name="_csrf" value="([^"]+)"/);
  return match ? match[1] : '';
}

async function openPage(pathname, cookie = '') {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: cookie ? { cookie } : {},
    redirect: 'manual',
  });
  const html = await response.text();
  return {
    response,
    html,
    cookie: sessionCookie(response) || cookie,
    token: csrfToken(html),
  };
}

async function login(email, password) {
  const page = await openPage('/login');
  const response = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: page.cookie },
    body: new URLSearchParams({ email, password, _csrf: page.token }),
    redirect: 'manual',
  });
  return { response, cookie: sessionCookie(response) || page.cookie };
}

test('public pages render and guest actions redirect to login', async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Fi Tri9i/);

  const csp = home.headers.get('content-security-policy') || '';
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);

  const about = await fetch(`${baseUrl}/a-propos`);
  assert.equal(about.status, 200);
  assert.match(await about.text(), /Rechercher un trajet/);

  const listing = await fetch(`${baseUrl}/trajets?arrivee=Bejaia`);
  assert.equal(listing.status, 200);
  const listingHtml = await listing.text();
  assert.match(listingHtml, /Alger/);
  assert.match(listingHtml, /Voir le trajet/);

  const detail = await openPage(`/trajets/${tripId}`);
  assert.equal(detail.response.status, 200);
  assert.match(detail.html, /Se connecter pour réserver/);

  const loginPage = await openPage('/login');
  assert.ok(loginPage.token);

  const noTokenReserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { cookie: loginPage.cookie },
    redirect: 'manual',
  });
  assert.equal(noTokenReserve.status, 403);
  assert.match(await noTokenReserve.text(), /Accès refusé/);

  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: loginPage.cookie },
    body: new URLSearchParams({ _csrf: loginPage.token }),
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);
  assert.match(reserve.headers.get('location'), /^\/login\?next=/);

  const mine = await fetch(`${baseUrl}/mes-trajets`, { redirect: 'manual' });
  assert.equal(mine.status, 302);
  assert.equal(mine.headers.get('location'), '/login?next=%2Fmes-trajets');

  const publish = await fetch(`${baseUrl}/publier/page1`, { redirect: 'manual' });
  assert.equal(publish.status, 302);
  assert.equal(publish.headers.get('location'), '/login?next=%2Fpublier%2Fpage1');

  const depart = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: loginPage.cookie },
    body: new URLSearchParams({ depart: 'Alger', _csrf: loginPage.token }),
    redirect: 'manual',
  });
  assert.equal(depart.status, 302);
  assert.equal(depart.headers.get('location'), '/login?next=%2Fpublier%2Fpage1');
});

test('driver profile lists upcoming trips without exposing contact details', async () => {
  const response = await fetch(`${baseUrl}/conducteurs/${driverId}`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Karim/);
  assert.match(html, /Trajets à venir/);
  assert.match(html, new RegExp(`/trajets/${tripId}`));
  assert.doesNotMatch(html, /karim@test\.dz/);

  const missing = await fetch(`${baseUrl}/conducteurs/64f000000000000000000404`);
  assert.equal(missing.status, 404);
});

test('driver can edit a published trip and seats cannot drop below reservations', async () => {
  const editTripId = '64f000000000000000000303';
  state.trips.push({
    _id: editTripId,
    status: 'published',
    depart: 'Oran',
    depart0: 'Es Senia',
    arrivee: 'Tlemcen',
    arrivee0: 'Chetouane',
    dateData: '15 June 2031',
    departureAt: new Date('2031-06-15T10:00:00Z'),
    time: '10 : 00',
    price: '900da',
    priceDZD: 900,
    places: 4,
    places_taken: 2,
    passengers: [passengerId, '64f000000000000000000304'],
    description: 'Trajet à modifier',
    driver: { _id: driverId, name: 'Karim' },
  });

  const driver = await login('karim@test.dz', 'secret1');
  const editPage = await openPage(`/trajets/${editTripId}/modifier`, driver.cookie);
  assert.equal(editPage.response.status, 200);
  assert.match(editPage.html, /Modifier le trajet/);
  assert.match(editPage.html, /2 places déjà réservées/);

  const update = await fetch(`${baseUrl}/trajets/${editTripId}/modifier`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: driver.cookie },
    body: new URLSearchParams({
      _csrf: editPage.token,
      depart: 'Constantine',
      depart0: 'El Khroub',
      arrivee: 'Annaba',
      arrivee0: 'El Bouni',
      date: '2031-05-20',
      time: '09:30',
      places: '3',
      price: '1500',
      description: 'Trajet mis à jour',
    }),
    redirect: 'manual',
  });
  assert.equal(update.status, 302);
  assert.equal(update.headers.get('location'), `/trajets/${editTripId}`);

  const updated = state.trips.find((candidate) => candidate._id === editTripId);
  assert.equal(updated.depart, 'Constantine');
  assert.equal(updated.depart0, 'El Khroub');
  assert.equal(updated.arrivee, 'Annaba');
  assert.equal(updated.arrivee0, 'El Bouni');
  assert.equal(updated.dateData, '20 May 2031');
  assert.equal(updated.time, '09 : 30');
  assert.equal(updated.departureAt.toISOString(), '2031-05-20T09:30:00.000Z');
  assert.equal(updated.places, 3);
  assert.equal(updated.price, '1500da');
  assert.equal(updated.priceDZD, 1500);
  assert.equal(updated.description, 'Trajet mis à jour');
  assert.equal(updated.places_taken, 2);

  const tooFewSeats = await fetch(`${baseUrl}/trajets/${editTripId}/modifier`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: driver.cookie },
    body: new URLSearchParams({
      _csrf: editPage.token,
      depart: 'Constantine',
      depart0: 'El Khroub',
      arrivee: 'Annaba',
      arrivee0: 'El Bouni',
      date: '2031-05-20',
      time: '09:30',
      places: '1',
      price: '1500',
      description: 'Trajet mis à jour',
    }),
    redirect: 'manual',
  });
  assert.equal(tooFewSeats.status, 400);
  assert.match(await tooFewSeats.text(), /déjà 2 réservations/);

  const passenger = await login('sara@test.dz', 'secret1');
  const forbidden = await openPage(`/trajets/${editTripId}/modifier`, passenger.cookie);
  assert.equal(forbidden.response.status, 404);

  const editIndex = state.trips.findIndex((candidate) => candidate._id === editTripId);
  assert.notEqual(editIndex, -1);
  state.trips.splice(editIndex, 1);
  state.notifications.length = 0;
});

test('trip participants can exchange private messages', async () => {
  const chatTripId = '64f000000000000000000404';
  state.trips.push({
    _id: chatTripId,
    status: 'published',
    depart: 'Setif',
    depart0: 'El Eulma',
    arrivee: 'Alger',
    arrivee0: 'Bab Ezzouar',
    dateData: '10 July 2031',
    departureAt: new Date('2031-07-10T08:00:00Z'),
    time: '08 : 00',
    price: '1000da',
    priceDZD: 1000,
    places: 3,
    places_taken: 1,
    passengers: [passengerId],
    description: 'Trajet avec messages',
    driver: { _id: driverId, name: 'Karim' },
  });

  const guest = await fetch(`${baseUrl}/trajets/${chatTripId}/messages`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(
    guest.headers.get('location'),
    `/login?next=${encodeURIComponent(`/trajets/${chatTripId}/messages`)}`
  );

  const passenger = await login('sara@test.dz', 'secret1');
  const passengerThread = await openPage(`/trajets/${chatTripId}/messages`, passenger.cookie);
  assert.equal(passengerThread.response.status, 200);
  assert.match(passengerThread.html, /Messages du trajet/);
  assert.match(passengerThread.html, /en tant que passager/);

  const emptyMessage = await fetch(`${baseUrl}/trajets/${chatTripId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: passengerThread.token, message: '   ' }),
    redirect: 'manual',
  });
  assert.equal(emptyMessage.status, 400);
  assert.match(await emptyMessage.text(), /Écrivez un message/);
  assert.equal(state.messages.length, 0);

  const sent = await fetch(`${baseUrl}/trajets/${chatTripId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({
      _csrf: passengerThread.token,
      message: 'Bonjour, je serai à l’arrêt à 8 h.',
    }),
    redirect: 'manual',
  });
  assert.equal(sent.status, 302);
  assert.equal(sent.headers.get('location'), `/trajets/${chatTripId}/messages`);
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].sender, passengerId);

  const driver = await login('karim@test.dz', 'secret1');
  const driverThread = await openPage(`/trajets/${chatTripId}/messages`, driver.cookie);
  assert.equal(driverThread.response.status, 200);
  assert.match(driverThread.html, /en tant que conducteur/);
  assert.match(driverThread.html, /Bonjour, je serai à l’arrêt à 8 h\./);
  assert.match(driverThread.html, /Sara/);

  const reply = await fetch(`${baseUrl}/trajets/${chatTripId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: driver.cookie },
    body: new URLSearchParams({
      _csrf: driverThread.token,
      message: 'Parfait, à demain.',
    }),
    redirect: 'manual',
  });
  assert.equal(reply.status, 302);
  assert.equal(state.messages.length, 2);

  const updatedThread = await openPage(`/trajets/${chatTripId}/messages`, passenger.cookie);
  assert.match(updatedThread.html, /Parfait, à demain\./);
  assert.match(updatedThread.html, /Karim/);

  const outsiderThread = await openPage(`/trajets/${tripId}/messages`, passenger.cookie);
  assert.equal(outsiderThread.response.status, 404);

  const tripIndex = state.trips.findIndex((candidate) => candidate._id === chatTripId);
  assert.notEqual(tripIndex, -1);
  state.trips.splice(tripIndex, 1);
  state.messages.length = 0;
  state.notifications.length = 0;
});

test('booking notifications are visible and marked read on the notifications page', async () => {
  state.notifications.length = 0;
  const notifTripId = '64f000000000000000000505';
  state.trips.push({
    _id: notifTripId,
    status: 'published',
    depart: 'Blida',
    depart0: 'Boufarik',
    arrivee: 'Oran',
    arrivee0: 'Es Senia',
    dateData: '12 August 2031',
    departureAt: new Date('2031-08-12T07:00:00Z'),
    time: '07 : 00',
    price: '1100da',
    priceDZD: 1100,
    places: 2,
    places_taken: 0,
    passengers: [],
    description: 'Trajet avec notification',
    driver: { _id: driverId, name: 'Karim' },
  });

  const guest = await fetch(`${baseUrl}/notifications`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login?next=%2Fnotifications');

  const passenger = await login('sara@test.dz', 'secret1');
  const detail = await openPage(`/trajets/${notifTripId}`, passenger.cookie);
  const reserve = await fetch(`${baseUrl}/trajets/${notifTripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: detail.token }),
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);

  assert.equal(state.notifications.length, 1);
  assert.equal(state.notifications[0].recipient, driverId);
  assert.equal(state.notifications[0].type, 'booking');
  assert.match(state.notifications[0].body, /Sara a réservé une place/);

  const driver = await login('karim@test.dz', 'secret1');
  const withBadge = await openPage('/trajets', driver.cookie);
  assert.match(withBadge.html, /nav-badge/);
  assert.match(withBadge.html, /1 non lue/);

  const notificationPage = await openPage('/notifications', driver.cookie);
  assert.equal(notificationPage.response.status, 200);
  assert.match(notificationPage.html, /Sara a réservé une place/);
  assert.match(notificationPage.html, /notification-item is-unread/);
  assert.ok(state.notifications[0].readAt instanceof Date);

  const afterRead = await openPage('/notifications', driver.cookie);
  assert.doesNotMatch(afterRead.html, /notification-item is-unread/);

  const tripIndex = state.trips.findIndex((candidate) => candidate._id === notifTripId);
  assert.notEqual(tripIndex, -1);
  state.trips.splice(tripIndex, 1);
  state.notifications.length = 0;
});

test('a logged-in passenger can reserve and cancel a seat', async () => {
  const session = await login('sara@test.dz', 'secret1');
  assert.equal(session.response.status, 302);
  assert.match(session.cookie, /^connect\.sid=/);
  const { cookie } = session;

  const publish = await fetch(`${baseUrl}/publier/page1`, { headers: { cookie } });
  assert.equal(publish.status, 200);

  const stepWithoutDraft = await fetch(`${baseUrl}/publier/page2`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(stepWithoutDraft.status, 302);
  assert.equal(stepWithoutDraft.headers.get('location'), '/publier/page1');

  const detailPage = await openPage(`/trajets/${tripId}`, cookie);
  assert.ok(detailPage.token);

  const forbiddenDelete = await fetch(`${baseUrl}/trajets/${tripId}/supprimer`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: detailPage.token }),
    redirect: 'manual',
  });
  assert.equal(forbiddenDelete.status, 302);
  assert.equal(forbiddenDelete.headers.get('location'), `/trajets/${tripId}`);

  const forbiddenHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
  assert.match(forbiddenHtml, /Vous ne pouvez pas supprimer ce trajet/);

  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: detailPage.token }),
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);
  assert.equal(reserve.headers.get('location'), `/trajets/${tripId}`);

  const bookedHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
  assert.match(bookedHtml, /Votre place est réservée/);
  assert.match(bookedHtml, /Annuler ma réservation/);
  assert.match(bookedHtml, /1 \/ 2/);

  const fullSearch = await (await fetch(`${baseUrl}/trajets?places=2`)).text();
  assert.match(fullSearch, /0 trajets trouvés/);

  const cancel = await fetch(`${baseUrl}/trajets/${tripId}/annuler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: detailPage.token }),
    redirect: 'manual',
  });
  assert.equal(cancel.status, 302);
  assert.equal(cancel.headers.get('location'), `/trajets/${tripId}`);

  const cancelledHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
  assert.match(cancelledHtml, /Votre réservation a été annulée/);
  assert.match(cancelledHtml, /Réserver une place/);
});

test('search hides full trips and paginates results', async () => {
  const base = {
    status: 'published',
    depart: 'Paginated',
    depart0: 'Centre',
    arrivee: 'Bejaia',
    arrivee0: 'Amizour',
    dateData: '12 December 2030',
    departureAt: new Date('2030-12-12T08:00:00Z'),
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    places: 2,
    places_taken: 0,
    passengers: [],
    description: '',
    driver: { _id: driverId, name: 'Karim' },
  };

  for (let index = 0; index < 11; index += 1) {
    state.trips.push({ ...base, _id: `64f0000000000000000001${String(index).padStart(2, '0')}` });
  }
  state.trips.push({
    ...base,
    _id: '64f000000000000000000299',
    depart: 'Fullville',
    places: 1,
    places_taken: 1,
  });

  const firstPage = await (await fetch(`${baseUrl}/trajets?depart=Paginated`)).text();
  assert.match(firstPage, /Page 1 \/ 2/);
  assert.match(firstPage, /Suivant/);
  assert.match(firstPage, /11 trajets trouvés/);

  const secondPage = await (await fetch(`${baseUrl}/trajets?depart=Paginated&page=2`)).text();
  assert.match(secondPage, /Page 2 \/ 2/);
  assert.match(secondPage, /Précédent/);

  const fullListing = await (await fetch(`${baseUrl}/trajets?depart=Fullville`)).text();
  assert.match(fullListing, /0 trajets trouvés/);
  assert.doesNotMatch(fullListing, /Voir le trajet/);
});

test('drafts stay private and out of listings', async () => {
  const draftId = '64f000000000000000000099';
  state.trips.push({
    _id: draftId,
    status: 'draft',
    depart: 'Draftville',
    depart0: 'Centre',
    arrivee: 'Bejaia',
    arrivee0: 'Amizour',
    dateData: '12 December 2030',
    departureAt: new Date('2030-12-12T08:00:00Z'),
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    places: 2,
    places_taken: 0,
    passengers: [],
    description: '',
    driver: passengerId,
  });

  const listing = await (await fetch(`${baseUrl}/trajets`)).text();
  assert.doesNotMatch(listing, /Draftville/);

  const guestDetail = await fetch(`${baseUrl}/trajets/${draftId}`, { redirect: 'manual' });
  assert.equal(guestDetail.status, 404);

  const session = await login('sara@test.dz', 'secret1');
  const { cookie } = session;

  const mine = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie } })).text();
  assert.match(mine, /Brouillons \(1\)/);
  assert.match(mine, /Draftville/);
  assert.match(mine, /Reprendre/);

  const page = await openPage('/publier/page1', cookie);
  const start = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'Alger', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(start.status, 302);

  const resume = await fetch(`${baseUrl}/publier/continuer`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(resume.status, 302);
  assert.equal(resume.headers.get('location'), '/publier/page2');

  const selectDraft = await fetch(`${baseUrl}/publier/continuer/${draftId}`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(selectDraft.status, 302);
  assert.equal(selectDraft.headers.get('location'), '/publier/description');

  const selectedResume = await fetch(`${baseUrl}/publier/continuer`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(selectedResume.headers.get('location'), '/publier/description');

  const ownerDetail = await fetch(`${baseUrl}/trajets/${draftId}`, { headers: { cookie } });
  assert.equal(ownerDetail.status, 200);
  assert.match(await ownerDetail.text(), /brouillon/);

  const remove = await fetch(`${baseUrl}/trajets/${draftId}/supprimer`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(remove.status, 302);
  assert.equal(remove.headers.get('location'), '/mes-trajets');

  const afterDelete = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie } })).text();
  assert.match(afterDelete, /Le trajet a été supprimé/);

  const afterFlash = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie } })).text();
  assert.doesNotMatch(afterFlash, /Le trajet a été supprimé/);
});

test('driver can cancel a trip and passengers see it', async () => {
  const passenger = await login('sara@test.dz', 'secret1');
  const passengerDetail = await openPage(`/trajets/${tripId}`, passenger.cookie);
  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: passengerDetail.token }),
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);

  const driver = await login('karim@test.dz', 'secret1');
  const driverDetail = await openPage(`/trajets/${tripId}`, driver.cookie);
  assert.match(driverDetail.html, /Annuler le trajet/);

  const cancelTrip = await fetch(`${baseUrl}/trajets/${tripId}/annuler-trajet`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: driver.cookie },
    body: new URLSearchParams({ _csrf: driverDetail.token }),
    redirect: 'manual',
  });
  assert.equal(cancelTrip.status, 302);
  assert.equal(cancelTrip.headers.get('location'), '/mes-trajets');
  assert.equal(state.trips[0].status, 'cancelled');

  const driverTrips = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie: driver.cookie } })).text();
  assert.match(driverTrips, /Trajets annulés \(1\)/);
  assert.match(driverTrips, /Annulé/);

  const passengerTrips = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie: passenger.cookie } })).text();
  assert.match(passengerTrips, /Annulé par le conducteur/);
  assert.doesNotMatch(passengerTrips, new RegExp(`/trajets/${tripId}/annuler"`));

  const listing = await (await fetch(`${baseUrl}/trajets?depart=Alger`)).text();
  assert.match(listing, /0 trajets trouvés/);

  const cancelledDetail = await (await fetch(`${baseUrl}/trajets/${tripId}`)).text();
  assert.match(cancelledDetail, /Annulé par le conducteur/);
  assert.doesNotMatch(cancelledDetail, /Réserver une place/);
});

test('passengers cannot cancel a past reservation', async () => {
  const pastTripId = '64f000000000000000000098';
  state.trips.push({
    _id: pastTripId,
    status: 'published',
    depart: 'Oran',
    depart0: 'Centre',
    arrivee: 'Tlemcen',
    arrivee0: 'Centre',
    dateData: '1 January 2020',
    departureAt: new Date('2020-01-01T08:00:00Z'),
    time: '08 : 00',
    price: '900da',
    priceDZD: 900,
    places: 2,
    places_taken: 1,
    passengers: [passengerId],
    description: 'Trajet passé',
    driver: { _id: driverId, name: 'Karim' },
  });

  const passenger = await login('sara@test.dz', 'secret1');
  const detail = await openPage(`/trajets/${pastTripId}`, passenger.cookie);
  assert.match(detail.html, /Trajet passé/);
  assert.doesNotMatch(detail.html, /Annuler ma réservation/);

  const cancel = await fetch(`${baseUrl}/trajets/${pastTripId}/annuler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: detail.token }),
    redirect: 'manual',
  });
  assert.equal(cancel.status, 302);
  assert.equal(cancel.headers.get('location'), `/trajets/${pastTripId}`);

  const pastTrip = state.trips.find((candidate) => candidate._id === pastTripId);
  assert.deepEqual(pastTrip.passengers, [passengerId]);
  assert.equal(pastTrip.places_taken, 1);

  const mine = await (await fetch(`${baseUrl}/mes-trajets`, { headers: { cookie: passenger.cookie } })).text();
  assert.match(mine, /Trajet passé/);
  assert.doesNotMatch(mine, new RegExp(`/trajets/${pastTripId}/annuler"`));
});
