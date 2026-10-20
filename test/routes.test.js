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
  assert.equal(forbiddenDelete.headers.get('location'), `/trajets/${tripId}?error=forbidden`);

  const reserve = await fetch(`${baseUrl}/trajets/${tripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: detailPage.token }),
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
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: detailPage.token }),
    redirect: 'manual',
  });
  assert.equal(cancel.status, 302);
  assert.equal(cancel.headers.get('location'), `/trajets/${tripId}?cancelled=1`);

  const cancelledHtml = await (await fetch(`${baseUrl}/trajets/${tripId}`, { headers: { cookie } })).text();
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
