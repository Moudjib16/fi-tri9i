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
  trips: [
    {
      _id: tripId,
      depart: 'Alger',
      depart0: 'Bab Ezzouar',
      arrivee: 'Bejaia',
      arrivee0: 'Amizour',
      dateData: '12 December 2026',
      time: '08 : 00',
      price: '1200da',
      places: 2,
      places_taken: 0,
      passengers: [],
      description: 'Trajet de test',
      driver: { _id: driverId, name: 'Karim' },
    },
  ],
};

function tripChain(result) {
  const query = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    limit() {
      return query;
    },
    lean: async () => result,
  };
  return query;
}

function matchesTrip(candidate, filter) {
  return Object.entries(filter).every(([key, value]) => {
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
    if (value instanceof RegExp) {
      return value.test(candidate[key] || '');
    }
    return String(candidate[key]) === String(value);
  });
}

const fakeTrip = {
  find(filter = {}) {
    return tripChain(state.trips.filter((candidate) => matchesTrip(candidate, filter)));
  },
  findById(id) {
    return tripChain(state.trips.find((candidate) => String(candidate._id) === String(id)) || null);
  },
  findOneAndDelete(filter) {
    const index = state.trips.findIndex((candidate) => String(candidate._id) === String(filter._id));
    if (index === -1) {
      return null;
    }
    const driver = state.trips[index].driver ? String(state.trips[index].driver._id) : null;
    if (filter.driver && driver !== String(filter.driver)) {
      return null;
    }
    return state.trips.splice(index, 1)[0];
  },
  findOneAndUpdate(filter, update) {
    const found = state.trips.find((candidate) => String(candidate._id) === String(filter._id));
    if (!found) {
      return null;
    }
    if (filter.driver && filter.driver.$ne !== undefined) {
      const driver = found.driver ? String(found.driver._id || found.driver) : null;
      if (driver === String(filter.driver.$ne)) {
        return null;
      }
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
    return found;
  },
};

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

  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => new Promise((resolve) => server.close(resolve)));

test('public pages render and guest actions redirect to login', async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Fi Tri9i/);

  const listing = await fetch(`${baseUrl}/trajets?arrivee=Bejaia`);
  assert.equal(listing.status, 200);
  const listingHtml = await listing.text();
  assert.match(listingHtml, /Alger/);
  assert.match(listingHtml, /Voir le trajet/);

  const detail = await fetch(`${baseUrl}/trajets/${tripId}`);
  assert.equal(detail.status, 200);
  assert.match(await detail.text(), /Se connecter pour réserver/);

  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
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
});

test('a logged-in passenger can reserve and cancel a seat', async () => {
  const login = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email: 'sara@test.dz', password: 'secret1' }),
    redirect: 'manual',
  });
  assert.equal(login.status, 302);
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  assert.match(cookie, /^connect\.sid=/);

  const publish = await fetch(`${baseUrl}/publier/page1`, { headers: { cookie } });
  assert.equal(publish.status, 200);

  const stepWithoutDraft = await fetch(`${baseUrl}/publier/page2`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(stepWithoutDraft.status, 302);
  assert.equal(stepWithoutDraft.headers.get('location'), '/publier/page1');

  const forbiddenDelete = await fetch(`${baseUrl}/trajets/${tripId}/supprimer`, {
    method: 'POST',
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(forbiddenDelete.status, 302);
  assert.equal(forbiddenDelete.headers.get('location'), `/trajets/${tripId}?error=forbidden`);

  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);
  assert.equal(reserve.headers.get('location'), `/trajets/${tripId}?booked=1`);

  const bookedHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
  assert.match(bookedHtml, /Annuler ma réservation/);
  assert.match(bookedHtml, /1 \/ 2/);

  const fullSearch = await (await fetch(`${baseUrl}/trajets?places=2`)).text();
  assert.match(fullSearch, /0 trajets trouvés/);

  const cancel = await fetch(`${baseUrl}/trajets/${tripId}/annuler`, {
    method: 'POST',
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(cancel.status, 302);
  assert.equal(cancel.headers.get('location'), `/trajets/${tripId}?cancelled=1`);

  const cancelledHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
  assert.match(cancelledHtml, /Réserver une place/);
});
