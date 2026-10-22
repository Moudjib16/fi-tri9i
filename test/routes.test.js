process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const { normalizePlace } = require('../lib/wilayas');

const tripId = '64f000000000000000000001';
const passengerId = '64f000000000000000000002';
const driverId = '64f000000000000000000003';
const adminId = '64f000000000000000000004';

const state = {
  users: [],
  messages: [],
  notifications: [],
  reviews: [],
  favorites: [],
  reports: [],
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
    sort(spec = {}) {
      const entries = Object.entries(spec);
      items.sort((left, right) => {
        for (const [key, direction] of entries) {
          const a = left[key];
          const b = right[key];
          if (a === b) {
            continue;
          }
          if (a === undefined || a === null) {
            return 1;
          }
          if (b === undefined || b === null) {
            return -1;
          }
          return (a < b ? -1 : 1) * direction;
        }
        return 0;
      });
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
      if (value.$type !== undefined) {
        // Only a real date matches, a missing departure does not.
        if (value.$type !== 'date' || Number.isNaN(departure.getTime())) {
          return false;
        }
        if (value.$lte !== undefined && departure > new Date(value.$lte)) return false;
        return true;
      }
      if (value.$hour !== undefined) {
        const hour = departure.getUTCHours();
        if (value.$hour.$gte !== undefined && hour < value.$hour.$gte) return false;
        if (value.$hour.$lt !== undefined && hour >= value.$hour.$lt) return false;
        return true;
      }
      if (value.$gte !== undefined && departure < new Date(value.$gte)) return false;
      if (value.$lt !== undefined && departure >= new Date(value.$lt)) return false;
      if (value.$gt !== undefined && departure <= new Date(value.$gt)) return false;
      return true;
    }
    if (key === 'priceDZD' && value && typeof value === 'object') {
      const price = candidate.priceDZD || 0;
      if (value.$gte !== undefined && price < value.$gte) return false;
      if (value.$lte !== undefined && price > value.$lte) return false;
      return true;
    }
    if (key === 'departKey' || key === 'arriveeKey') {
      // Legacy trips have no key, the accent free wilaya is used instead.
      const raw = key === 'departKey' ? candidate.depart : candidate.arrivee;
      const stored = candidate[key] || normalizePlace(raw);
      return value.test(stored || '');
    }
    if (key === 'dateData') {
      if (value && Array.isArray(value.$in)) {
        return value.$in.includes(candidate.dateData);
      }
      return candidate.dateData === value;
    }
    if (key === '_id' && value && Array.isArray(value.$in)) {
      return value.$in.map(String).includes(String(candidate._id));
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
    if (key === 'status' && value && Array.isArray(value.$in)) {
      return value.$in.includes(candidate.status);
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

// Auto-generated trip ids must stay unique even when trips are removed,
// otherwise the mock lookup can return the wrong document.
let tripIdCounter = 800;

function fakeTrip(data = {}) {
  Object.assign(this, data);
  tripIdCounter += 1;
  this._id = data._id || `64f${String(tripIdCounter).padStart(21, '0')}`;
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
  async   countDocuments(filter = {}) {
    return state.trips.filter((candidate) => matchesTrip(candidate, filter)).length;
  },
  updateMany(filter, update) {
    const matched = state.trips.filter((candidate) => matchesTrip(candidate, filter));
    matched.forEach((candidate) => {
      if (update && update.$set) {
        Object.assign(candidate, update.$set);
      }
    });
    return { acknowledged: true, modifiedCount: matched.length };
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
      const expr = filter.$expr;
      if (expr.$lte) {
        // Seats left must cover the requested booking.
        const requested = expr.$lte[0].$add ? expr.$lte[0].$add[1] : 0;
        if ((found.places_taken || 0) + requested > (found.places || 0)) {
          return null;
        }
      } else if (expr.$lt) {
        if (!((found.places_taken || 0) < found.places)) {
          return null;
        }
      } else if (expr.$gte) {
        const [left, right] = expr.$gte[0].$subtract;
        const leftValue = found[left.replace('$', '')] || 0;
        const rightValue = right.$ifNull
          ? found[right.$ifNull[0].replace('$', '')] || 0
          : right;
        if (leftValue - rightValue < expr.$gte[1]) {
          return null;
        }
      }
    }
    if (update.$push && update.$push.passengers !== undefined) {
      found.passengers = found.passengers || [];
      const value = update.$push.passengers;
      if (value && Array.isArray(value.$each)) {
        found.passengers.push(...value.$each);
      } else {
        found.passengers.push(value);
      }
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

function fakeUser(data = {}) {
  Object.assign(this, data);
  this._id = data._id || `64f${String(900 + state.users.length).padStart(21, '0')}`;
  this.createdAt = data.createdAt || new Date();
  this.save = async () => {
    if (!state.users.includes(this)) {
      state.users.push(this);
    }
    return this;
  };
}

Object.assign(fakeUser, {
  findById(id) {
    const found = state.users.find((candidate) => String(candidate._id) === String(id)) || null;
    const account = found
      ? {
        ...found,
        save: async () => {
          const index = state.users.findIndex(
            (candidate) => String(candidate._id) === String(account._id)
          );
          const { save, ...data } = account;
          state.users[index] = { ...state.users[index], ...data };
          return state.users[index];
        },
      }
      : null;
    const query = {
      select() {
        return query;
      },
      lean: async () => {
        if (!found) {
          return null;
        }
        const { password, ...safeUser } = found;
        return safeUser;
      },
      then(resolve) {
        resolve(account);
      },
    };
    return query;
  },
  findOne({ email }) {
    const found = state.users.find((candidate) => candidate.email === email) || null;
    const query = {
      select() {
        return query;
      },
      lean: async () => found,
      then(resolve) {
        resolve(found);
      },
    };
    return query;
  },
  find(filter = {}) {
    let items = state.users.filter((candidate) => Object.entries(filter).every(
      ([key, value]) => {
        if (key === '_id' && value && Array.isArray(value.$in)) {
          return value.$in.map(String).includes(String(candidate._id));
        }
        return String(candidate[key]) === String(value);
      }
    ));
    const query = {
      select() {
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
      skip(count) {
        items = items.slice(count);
        return query;
      },
      lean: async () => items.map((candidate) => {
        const { password, ...safeUser } = candidate;
        return safeUser;
      }),
    };
    return query;
  },
  async countDocuments(filter = {}) {
    return state.users.filter((candidate) => Object.entries(filter).every(
      ([key, value]) => String(candidate[key]) === String(value)
    )).length;
  },
});

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

const fakeReview = {
  async create(data) {
    const duplicate = state.reviews.some(
      (review) => String(review.trip) === String(data.trip)
        && String(review.author) === String(data.author)
    );
    if (duplicate) {
      const error = new Error('Duplicate review');
      error.code = 11000;
      throw error;
    }
    const review = {
      _id: `64f${String(900 + state.reviews.length).padStart(21, '0')}`,
      ...data,
      createdAt: new Date(`2031-01-01T09:00:${String(state.reviews.length).padStart(2, '0')}Z`),
    };
    state.reviews.push(review);
    return review;
  },
  findOne(filter = {}) {
    const found = state.reviews.find(
      (review) => (!filter.trip || String(review.trip) === String(filter.trip))
        && (!filter.author || String(review.author) === String(filter.author))
    );
    return {
      lean: async () => (found ? { ...found } : null),
    };
  },
  find(filter = {}) {
    const items = state.reviews.filter(
      (review) => !filter.driver || String(review.driver) === String(filter.driver)
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
      lean: async () => items.map((review) => {
        const author = state.users.find(
          (candidate) => String(candidate._id) === String(review.author)
        );
        return {
          ...review,
          author: author ? { _id: author._id, name: author.name } : review.author,
        };
      }),
    };
    return query;
  },
};

const fakeFavorite = {
  async create(data) {
    const duplicate = state.favorites.some(
      (favorite) => String(favorite.user) === String(data.user)
        && String(favorite.trip) === String(data.trip)
    );
    if (duplicate) {
      const error = new Error('Duplicate favorite');
      error.code = 11000;
      throw error;
    }
    const favorite = {
      _id: `64f${String(700 + state.favorites.length).padStart(21, '0')}`,
      ...data,
      createdAt: new Date(`2031-02-01T09:00:${String(state.favorites.length).padStart(2, '0')}Z`),
    };
    state.favorites.push(favorite);
    return favorite;
  },
  findOne(filter = {}) {
    const found = state.favorites.find(
      (favorite) => (!filter.user || String(favorite.user) === String(filter.user))
        && (!filter.trip || String(favorite.trip) === String(filter.trip))
    );
    return {
      lean: async () => (found ? { ...found } : null),
    };
  },
  find(filter = {}) {
    const items = state.favorites.filter(
      (favorite) => !filter.user || String(favorite.user) === String(filter.user)
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
      lean: async () => items.map((favorite) => {
        const savedTrip = state.trips.find(
          (candidate) => String(candidate._id) === String(favorite.trip)
        );
        return { ...favorite, trip: savedTrip ? { ...savedTrip } : null };
      }),
    };
    return query;
  },
  async deleteOne(filter = {}) {
    const index = state.favorites.findIndex(
      (favorite) => (!filter.user || String(favorite.user) === String(filter.user))
        && (!filter.trip || String(favorite.trip) === String(filter.trip))
    );
    if (index === -1) {
      return { deletedCount: 0 };
    }
    state.favorites.splice(index, 1);
    return { deletedCount: 1 };
  },
  async deleteMany(filter = {}) {
    const before = state.favorites.length;
    state.favorites = state.favorites.filter(
      (favorite) => filter.trip && String(favorite.trip) !== String(filter.trip)
    );
    return { deletedCount: before - state.favorites.length };
  },
};

const fakeReport = {
  async create(data) {
    const report = {
      _id: `64f${String(800 + state.reports.length).padStart(21, '0')}`,
      ...data,
      status: data.status || 'open',
      adminNote: data.adminNote || '',
      resolvedAt: data.resolvedAt || null,
      createdAt: new Date(`2031-03-01T10:00:${String(state.reports.length).padStart(2, '0')}Z`),
    };
    state.reports.push(report);
    return report;
  },
  findOne(filter = {}) {
    const found = state.reports.find((report) => Object.entries(filter).every(
      ([key, value]) => String(report[key]) === String(value)
    ));
    return {
      lean: async () => (found ? { ...found } : null),
    };
  },
  findById(id) {
    const found = state.reports.find((report) => String(report._id) === String(id)) || null;
    const doc = found
      ? {
        ...found,
        save: async () => {
          const index = state.reports.findIndex((report) => String(report._id) === String(doc._id));
          const { save, ...data } = doc;
          state.reports[index] = { ...state.reports[index], ...data };
          return state.reports[index];
        },
      }
      : null;
    const query = {
      lean: async () => (found ? { ...found } : null),
      then(resolve) {
        resolve(doc);
      },
    };
    return query;
  },
  find(filter = {}) {
    let items = state.reports.filter((report) => Object.entries(filter).every(
      ([key, value]) => String(report[key]) === String(value)
    ));
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
      skip(count) {
        items = items.slice(count);
        return query;
      },
      lean: async () => items.map((report) => ({ ...report })),
    };
    return query;
  },
  async countDocuments(filter = {}) {
    return state.reports.filter((report) => Object.entries(filter).every(
      ([key, value]) => String(report[key]) === String(value)
    )).length;
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
installMock('../models/review', fakeReview);
installMock('../models/favorite', fakeFavorite);
installMock('../models/report', fakeReport);

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
  state.users.push({
    _id: adminId,
    name: 'Admin',
    email: 'admin@test.dz',
    password: await bcrypt.hash('secret1', 10),
    userType: 2,
    isAdmin: true,
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
  assert.equal(updated.dateData, '20 mai 2031');
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
  assert.match(state.notifications[0].body, /Sara a réservé 1 place/);

  const driver = await login('karim@test.dz', 'secret1');
  const withBadge = await openPage('/trajets', driver.cookie);
  assert.match(withBadge.html, /nav-badge/);
  assert.match(withBadge.html, /1 non lue/);

  const notificationPage = await openPage('/notifications', driver.cookie);
  assert.equal(notificationPage.response.status, 200);
  assert.match(notificationPage.html, /Sara a réservé 1 place/);
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
  assert.match(cancelledHtml, /Réserver/);
});

test('a passenger can book several seats at once', async () => {
  const groupTripId = '64f000000000000000000611';
  const secondPassengerId = '64f000000000000000000612';

  state.trips.push({
    _id: groupTripId,
    status: 'published',
    depart: 'Oran',
    depart0: 'Es Senia',
    arrivee: 'Tlemcen',
    arrivee0: 'Mansourah',
    dateData: '20 January 2032',
    departureAt: new Date('2032-01-20T08:00:00Z'),
    time: '08 : 00',
    price: '900da',
    priceDZD: 900,
    places: 4,
    places_taken: 0,
    passengers: [],
    description: 'Trajet de groupe',
    driver: { _id: driverId, name: 'Karim' },
  });

  state.users.push({
    _id: secondPassengerId,
    name: 'Lina',
    email: 'lina@test.dz',
    password: await bcrypt.hash('secret1', 10),
    userType: 1,
  });

  const passenger = await login('sara@test.dz', 'secret1');
  const page = await openPage(`/trajets/${groupTripId}`, passenger.cookie);

  // The booking form offers every free seat.
  assert.match(page.html, /Places à réserver/);
  assert.match(page.html, /<option value="4">/);

  const reserve = await fetch(`${baseUrl}/trajets/${groupTripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: page.token, places: '3' }),
    redirect: 'manual',
  });
  assert.equal(reserve.status, 302);
  assert.equal(reserve.headers.get('location'), `/trajets/${groupTripId}`);

  const bookedTrip = state.trips.find((candidate) => candidate._id === groupTripId);
  assert.equal(bookedTrip.places_taken, 3);
  // The passengers array holds one entry per booked seat.
  assert.deepEqual(bookedTrip.passengers, [passengerId, passengerId, passengerId]);

  const booked = await openPage(`/trajets/${groupTripId}`, passenger.cookie);
  assert.match(booked.html, /3 places réservées/);
  assert.match(booked.html, /Annuler ma réservation/);

  // Another passenger cannot take the seats that are left.
  const other = await login('lina@test.dz', 'secret1');
  const otherPage = await openPage(`/trajets/${groupTripId}`, other.cookie);
  assert.match(otherPage.html, /<option value="1">/);
  assert.doesNotMatch(otherPage.html, /<option value="2">/);

  const tooMany = await fetch(`${baseUrl}/trajets/${groupTripId}/reserver`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: other.cookie },
    body: new URLSearchParams({ _csrf: otherPage.token, places: '2' }),
    redirect: 'manual',
  });
  assert.equal(tooMany.status, 302);

  const refused = await openPage(`/trajets/${groupTripId}`, other.cookie);
  assert.match(refused.html, /Il ne reste que 1 place/);
  assert.equal(
    state.trips.find((candidate) => candidate._id === groupTripId).places_taken,
    3
  );

  // Cancelling releases every seat booked by the passenger.
  const cancel = await fetch(`${baseUrl}/trajets/${groupTripId}/annuler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: booked.token }),
    redirect: 'manual',
  });
  assert.equal(cancel.status, 302);

  const cancelledTrip = state.trips.find((candidate) => candidate._id === groupTripId);
  assert.equal(cancelledTrip.places_taken, 0);
  assert.deepEqual(cancelledTrip.passengers, []);

  const tripIndex = state.trips.findIndex((candidate) => candidate._id === groupTripId);
  state.trips.splice(tripIndex, 1);
  state.users = state.users.filter((candidate) => candidate._id !== secondPassengerId);
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

test('search never returns completed or cancelled trips', async () => {
  const base = {
    depart: 'Historyville',
    depart0: 'Centre',
    arrivee: 'Bejaia',
    arrivee0: 'Amizour',
    dateData: '1 janvier 2020',
    departureAt: new Date('2020-01-01T08:00:00Z'),
    time: '08 : 00',
    price: '900da',
    priceDZD: 900,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: '',
    driver: { _id: driverId, name: 'Karim' },
  };

  state.trips.push(
    { ...base, _id: '64f000000000000000000301', status: 'completed' },
    { ...base, _id: '64f000000000000000000302', status: 'cancelled' }
  );

  const listing = await (await fetch(
    `${baseUrl}/trajets?depart=Historyville&date=2020-01-01`
  )).text();

  assert.match(listing, /0 trajets trouvés/);
  assert.doesNotMatch(listing, /Voir le trajet/);

  state.trips = state.trips.filter(
    (candidate) => candidate._id !== '64f000000000000000000301'
      && candidate._id !== '64f000000000000000000302'
  );
});

test('starting a new trip keeps an existing draft untouched', async () => {
  const keepId = '64f000000000000000000098';
  state.trips.push({
    _id: keepId,
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
    description: 'Brouillon à conserver',
    driver: passengerId,
  });

  const existingIds = new Set(state.trips.map((candidate) => candidate._id));
  const { cookie } = await login('sara@test.dz', 'secret1');

  // Resume the draft so it becomes the draft stored in the session.
  const resume = await fetch(`${baseUrl}/publier/continuer/${keepId}`, {
    headers: { cookie },
    redirect: 'manual',
  });
  assert.equal(resume.status, 302);

  const page = await openPage('/publier/page1', cookie);
  const start = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'Alger', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(start.status, 302);

  const kept = state.trips.find((candidate) => candidate._id === keepId);
  assert.equal(kept.depart, 'Draftville');
  assert.equal(kept.depart0, 'Centre');
  assert.equal(kept.description, 'Brouillon à conserver');

  const added = state.trips.filter((candidate) => !existingIds.has(candidate._id));
  assert.equal(added.length, 1);
  assert.equal(added[0].status, 'draft');
  assert.equal(added[0].depart, 'Alger');

  state.trips = state.trips.filter(
    (candidate) => candidate._id !== keepId && candidate._id !== added[0]._id
  );
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

test('the publishing wizard accepts the French calendar date format', async () => {
  const session = await login('sara@test.dz', 'secret1');
  const { cookie } = session;
  const page = await openPage('/publier/page1', cookie);

  const start = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'Alger', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(start.status, 302);

  const calendarPage = await openPage('/publier/calendaire', cookie);
  assert.equal(calendarPage.response.status, 200);

  // The calendar widget posts the selected day with its French weekday.
  const frenchDate = await fetch(`${baseUrl}/date`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ content: 'jeudi 12 décembre 2030', _csrf: calendarPage.token }),
    redirect: 'manual',
  });
  assert.equal(frenchDate.status, 200);
  assert.deepEqual(await frenchDate.json(), { ok: true });

  const isoDate = await fetch(`${baseUrl}/date`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ content: '2031-01-05', _csrf: calendarPage.token }),
    redirect: 'manual',
  });
  assert.equal(isoDate.status, 200);

  const time = await fetch(`${baseUrl}/time`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ content: '08:30', _csrf: calendarPage.token }),
    redirect: 'manual',
  });
  assert.equal(time.status, 200);

  const drafts = state.trips.filter(
    (candidate) => candidate.status === 'draft' && String(candidate.driver) === passengerId
  );
  const draft = drafts[drafts.length - 1];
  assert.equal(draft.dateData, '5 janvier 2031');
  assert.equal(draft.time, '08 : 30');
  assert.equal(draft.departureAt.toISOString(), '2031-01-05T08:30:00.000Z');

  const pastDate = await fetch(`${baseUrl}/date`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ content: '12 janvier 2001', _csrf: calendarPage.token }),
    redirect: 'manual',
  });
  assert.equal(pastDate.status, 400);
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
    description: 'Ancien trajet',
    driver: { _id: driverId, name: 'Karim' },
  });

  const passenger = await login('sara@test.dz', 'secret1');
  const detail = await openPage(`/trajets/${pastTripId}`, passenger.cookie);
  assert.match(detail.html, /Trajet terminé/);
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

test('passengers can review completed trips and profiles show ratings', async () => {
  state.reviews.length = 0;
  const pastTripId = '64f000000000000000000098';

  const guest = await fetch(`${baseUrl}/trajets/${pastTripId}/avis`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(
    guest.headers.get('location'),
    `/login?next=${encodeURIComponent(`/trajets/${pastTripId}/avis`)}`
  );

  const passenger = await login('sara@test.dz', 'secret1');
  const form = await openPage(`/trajets/${pastTripId}/avis`, passenger.cookie);
  assert.equal(form.response.status, 200);
  assert.match(form.html, /Comment s'est passé votre trajet/);
  assert.match(form.html, /name="rating"/);
  assert.ok(form.token);

  const publish = await fetch(`${baseUrl}/trajets/${pastTripId}/avis`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({
      _csrf: form.token,
      rating: '5',
      comment: 'Trajet impeccable, conducteur ponctuel.',
    }),
    redirect: 'manual',
  });
  assert.equal(publish.status, 302);
  assert.equal(publish.headers.get('location'), `/conducteurs/${driverId}`);
  assert.equal(state.reviews.length, 1);
  assert.equal(state.reviews[0].driver, driverId);
  assert.equal(state.reviews[0].author, passengerId);
  assert.equal(state.reviews[0].rating, 5);

  // The rating is copied on the driver trips so listings can sort by it.
  const ratedTrips = state.trips.filter((candidate) => String(candidate.driver && candidate.driver._id) === driverId);
  assert.ok(ratedTrips.length > 0);
  ratedTrips.forEach((candidate) => {
    assert.equal(candidate.driverRating, 5);
    assert.equal(candidate.driverRatingCount, 1);
  });

  const duplicate = await fetch(`${baseUrl}/trajets/${pastTripId}/avis`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: form.token, rating: '4', comment: 'Deuxième avis' }),
    redirect: 'manual',
  });
  assert.equal(duplicate.status, 302);
  assert.equal(duplicate.headers.get('location'), `/conducteurs/${driverId}`);
  assert.equal(state.reviews.length, 1);

  const profile = await (await fetch(`${baseUrl}/conducteurs/${driverId}`)).text();
  assert.match(profile, /Avis des passagers/);
  assert.match(profile, /5\.0/);
  assert.match(profile, /Trajet impeccable, conducteur ponctuel\./);
  assert.match(profile, /Sara/);

  const detail = await (await fetch(`${baseUrl}/trajets/${pastTripId}`, {
    headers: { cookie: passenger.cookie },
  })).text();
  assert.match(detail, /Avis donné/);
  assert.doesNotMatch(detail, /Laisser un avis/);

  state.reviews.length = 0;
});

test('users can change their password from the account page', async () => {
  const guest = await fetch(`${baseUrl}/compte`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login?next=%2Fcompte');

  const passenger = await login('sara@test.dz', 'secret1');
  assert.equal(passenger.response.status, 302);

  const page = await openPage('/compte', passenger.cookie);
  assert.equal(page.response.status, 200);
  assert.match(page.html, /Changer de mot de passe/);
  assert.match(page.html, /sara@test\.dz/);
  assert.match(page.html, /Passager/);
  assert.ok(page.token);

  const postPassword = (fields) => fetch(`${baseUrl}/compte/mot-de-passe`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: page.token, ...fields }),
    redirect: 'manual',
  });

  const wrongCurrent = await postPassword({
    currentPassword: 'mauvais-secret',
    password: 'nouveauSecret1',
    'confirm-password': 'nouveauSecret1',
  });
  assert.equal(wrongCurrent.status, 401);
  assert.match(await wrongCurrent.text(), /mot de passe actuel est incorrect/);

  const mismatch = await postPassword({
    currentPassword: 'secret1',
    password: 'nouveauSecret1',
    'confirm-password': 'autreSecret1',
  });
  assert.equal(mismatch.status, 400);
  assert.match(await mismatch.text(), /ne correspondent pas/);

  const original = state.users.find((candidate) => candidate._id === passengerId).password;

  const changed = await postPassword({
    currentPassword: 'secret1',
    password: 'nouveauSecret1',
    'confirm-password': 'nouveauSecret1',
  });
  assert.equal(changed.status, 302);
  assert.equal(changed.headers.get('location'), '/compte');

  const updated = state.users.find((candidate) => candidate._id === passengerId);
  assert.notEqual(updated.password, 'nouveauSecret1');
  assert.equal(await bcrypt.compare('nouveauSecret1', updated.password), true);

  const changedCookie = sessionCookie(changed) || passenger.cookie;
  const confirmation = await openPage('/compte', changedCookie);
  assert.equal(confirmation.response.status, 200);
  assert.match(confirmation.html, /Votre mot de passe a été mis à jour/);

  const oldLogin = await login('sara@test.dz', 'secret1');
  assert.equal(oldLogin.response.status, 401);

  const newLogin = await login('sara@test.dz', 'nouveauSecret1');
  assert.equal(newLogin.response.status, 302);

  updated.password = original;
});

test('users can edit their profile from the account page', async () => {
  const guestPage = await openPage('/login');
  const guest = await fetch(`${baseUrl}/compte/profil`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: guestPage.cookie },
    body: new URLSearchParams({ _csrf: guestPage.token, name: 'Intrus' }),
    redirect: 'manual',
  });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login?next=%2Fcompte%2Fprofil');

  // A POST without a CSRF token is always rejected.
  const noToken = await fetch(`${baseUrl}/compte/profil`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ name: 'Intrus' }),
    redirect: 'manual',
  });
  assert.equal(noToken.status, 403);

  const passenger = await login('sara@test.dz', 'secret1');
  const page = await openPage('/compte', passenger.cookie);
  assert.equal(page.response.status, 200);
  assert.match(page.html, /Mes informations/);
  assert.match(page.html, /name="bio"/);
  assert.match(page.html, /name="phone"/);

  const postProfile = (fields) => fetch(`${baseUrl}/compte/profil`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: page.token, ...fields }),
    redirect: 'manual',
  });

  const invalidName = await postProfile({
    name: 'A',
    phone: '0555 12 34 56',
    bio: 'Salut',
    userType: '1',
  });
  assert.equal(invalidName.status, 400);
  assert.match(await invalidName.text(), /Indiquez un nom valide/);

  const invalidPhone = await postProfile({
    name: 'Sara B',
    phone: 'appelle-moi',
    bio: 'Salut',
    userType: '1',
  });
  assert.equal(invalidPhone.status, 400);
  assert.match(await invalidPhone.text(), /numéro de téléphone valide/);

  const updated = await postProfile({
    name: 'Sara Bouaziz',
    phone: '0555 12 34 56',
    bio: 'Je covoiture depuis Alger.',
    userType: '2',
  });
  assert.equal(updated.status, 302);
  assert.equal(updated.headers.get('location'), '/compte');

  const account = state.users.find((candidate) => candidate._id === passengerId);
  assert.equal(account.name, 'Sara Bouaziz');
  assert.equal(account.phone, '0555 12 34 56');
  assert.equal(account.bio, 'Je covoiture depuis Alger.');
  assert.equal(account.userType, 2);

  const confirmation = await openPage('/compte', passenger.cookie);
  assert.match(confirmation.html, /Votre profil a été mis à jour/);
  assert.match(confirmation.html, /Sara Bouaziz/);
  assert.match(confirmation.html, /Je covoiture depuis Alger\./);

  // The phone number stays private and is never shown on the public profile.
  const profile = await (await fetch(`${baseUrl}/conducteurs/${passengerId}`)).text();
  assert.match(profile, /Je covoiture depuis Alger\./);
  assert.doesNotMatch(profile, /0555 12 34 56/);

  account.name = 'Sara';
  account.phone = '';
  account.bio = '';
  account.userType = 1;
});

test('search filters trips by price, departure window and driver rating', async () => {
  const cheapId = '64f000000000000000000851';
  const priceyId = '64f000000000000000000852';
  const morningId = '64f000000000000000000853';
  const eveningId = '64f000000000000000000854';

  const base = {
    status: 'published',
    depart: 'Filtreville',
    depart0: 'Centre',
    arrivee: 'Bejaia',
    arrivee0: 'Amizour',
    dateData: '12 December 2030',
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: '',
    driver: { _id: driverId, name: 'Karim' },
  };

  state.trips.push({ ...base, _id: cheapId, price: '400da', priceDZD: 400 });
  state.trips.push({ ...base, _id: priceyId, price: '2500da', priceDZD: 2500 });
  state.trips.push({
    ...base,
    _id: morningId,
    departureAt: new Date('2030-12-12T07:30:00Z'),
    time: '07 : 30',
  });
  state.trips.push({
    ...base,
    _id: eveningId,
    departureAt: new Date('2030-12-12T19:30:00Z'),
    time: '19 : 30',
  });

  const cheap = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&prixMax=1000`)).text();
  assert.match(cheap, /400da/);
  assert.doesNotMatch(cheap, /2500da/);

  const pricey = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&prixMin=2000`)).text();
  assert.match(pricey, /2500da/);
  assert.doesNotMatch(pricey, /400da/);

  const morning = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&heureDebut=06&heureFin=12`)).text();
  assert.match(morning, /07 : 30/);
  assert.doesNotMatch(morning, /19 : 30/);
  assert.match(morning, /type="time" name="heureDebut" value="06:00"/);
  assert.match(morning, /type="time" name="heureFin" value="12:00"/);

  const evening = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&heureDebut=18`)).text();
  assert.match(evening, /19 : 30/);
  assert.doesNotMatch(evening, /07 : 30/);

  // The filters are kept in the search form.
  const filtered = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&prixMax=1000`)).text();
  assert.match(filtered, /name="prixMax" min="1" max="100000" value="1000"/);
  assert.match(filtered, /name="depart" list="wilayas" value="Filtreville"/);

  // A review refreshes the rating stored on the driver trips.
  const ratedTrip = state.trips.find((candidate) => candidate._id === cheapId);
  ratedTrip.driverRating = 4.5;
  ratedTrip.driverRatingCount = 2;
  const bestId = '64f000000000000000000855';
  state.trips.push({ ...base, _id: bestId, driverRating: 4.8, driverRatingCount: 5 });

  const byRating = await (await fetch(`${baseUrl}/trajets?depart=Filtreville&sort=rating`)).text();
  assert.match(byRating, /4\.8/);
  assert.match(byRating, /4\.5/);

  for (const id of [cheapId, priceyId, morningId, eveningId, bestId]) {
    const index = state.trips.findIndex((candidate) => candidate._id === id);
    if (index !== -1) {
      state.trips.splice(index, 1);
    }
  }
});

test('only the 58 wilayas are accepted and stored with their canonical name', async () => {
  const passenger = await login('sara@test.dz', 'secret1');
  const { cookie } = passenger;
  const page = await openPage('/publier/page1', cookie);

  const unknown = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'Narnia', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(unknown.status, 302);
  assert.equal(unknown.headers.get('location'), '/publier/page1');

  const rejection = await (await fetch(`${baseUrl}/publier/page1`, { headers: { cookie } })).text();
  assert.match(rejection, /Choisissez une wilaya valide/);

  // The wilaya is stored with its canonical spelling, whatever the input.
  const accepted = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'bejaia', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(accepted.status, 302);
  assert.equal(accepted.headers.get('location'), '/publier/page2');

  const drafts = state.trips.filter(
    (candidate) => candidate.status === 'draft' && String(candidate.driver) === passengerId
  );
  const draft = drafts[drafts.length - 1];
  assert.equal(draft.depart, 'Béjaïa');
  assert.equal(draft.departKey, 'bejaia');

  // The search matches the wilaya with or without its accents.
  const accentTripId = '64f000000000000000000856';
  state.trips.push({
    _id: accentTripId,
    status: 'published',
    depart: 'Béjaïa',
    departKey: 'bejaia',
    depart0: 'Amizour',
    arrivee: 'Alger',
    arriveeKey: 'alger',
    arrivee0: 'Bab Ezzouar',
    dateData: '12 December 2030',
    departureAt: new Date('2030-12-12T08:00:00Z'),
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    places: 2,
    places_taken: 0,
    passengers: [],
    description: 'Trajet accentué',
    driver: { _id: driverId, name: 'Karim' },
  });

  const search = await (await fetch(`${baseUrl}/trajets?depart=bejaia`)).text();
  assert.match(search, /Amizour/);

  const searchWithAccent = await (await fetch(`${baseUrl}/trajets?depart=Béjaïa`)).text();
  assert.match(searchWithAccent, /Amizour/);

  const searchOther = await (await fetch(`${baseUrl}/trajets?depart=oran`)).text();
  assert.doesNotMatch(searchOther, /Amizour/);

  const index = state.trips.findIndex((candidate) => candidate._id === accentTripId);
  state.trips.splice(index, 1);
});

test('the place reference data is served as json', async () => {
  const response = await fetch(`${baseUrl}/api/places`);
  assert.equal(response.status, 200);
  const places = await response.json();
  assert.ok(Array.isArray(places.alger));
  assert.ok(places.alger.includes('Bab Ezzouar'));
  assert.ok(Array.isArray(places.bejaia));
});

test('search sorts the trips by distance', async () => {
  const nearId = '64f000000000000000000866';
  const farId = '64f000000000000000000867';

  const base = {
    status: 'published',
    depart: 'Alger',
    depart0: 'Centre',
    arrivee: 'Oran',
    arrivee0: 'Es Sénia',
    dateData: '12 December 2030',
    departureAt: new Date('2030-12-12T08:00:00Z'),
    time: '08 : 00',
    price: '1200da',
    priceDZD: 1200,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: '',
    driver: { _id: driverId, name: 'Karim' },
  };

  state.trips.push({ ...base, _id: nearId, depart0: 'Procheville', distanceKm: 205 });
  state.trips.push({ ...base, _id: farId, depart0: 'Lointainville', distanceKm: 402 });

  const sorted = await (await fetch(`${baseUrl}/trajets?depart=Alger&sort=distance`)).text();
  const nearIndex = sorted.indexOf('Procheville');
  const farIndex = sorted.indexOf('Lointainville');
  assert.ok(nearIndex !== -1 && farIndex !== -1);
  assert.ok(nearIndex < farIndex, 'the shortest trip must come first');

  for (const id of [nearId, farId]) {
    const index = state.trips.findIndex((candidate) => candidate._id === id);
    state.trips.splice(index, 1);
  }
});

test('users can save trips to their favourites', async () => {
  state.favorites.length = 0;
  const favTripId = '64f000000000000000000601';
  state.trips.push({
    _id: favTripId,
    status: 'published',
    depart: 'Oran',
    depart0: 'Es Senia',
    arrivee: 'Tlemcen',
    arrivee0: 'Mansourah',
    dateData: '20 January 2032',
    departureAt: new Date('2032-01-20T08:00:00Z'),
    time: '08 : 00',
    price: '900da',
    priceDZD: 900,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: 'Trajet favori',
    driver: { _id: driverId, name: 'Karim' },
  });

  const guestPage = await openPage('/login');
  const guestSave = await fetch(`${baseUrl}/trajets/${favTripId}/favori`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: guestPage.cookie },
    body: new URLSearchParams({ _csrf: guestPage.token }),
    redirect: 'manual',
  });
  assert.equal(guestSave.status, 302);
  assert.equal(
    guestSave.headers.get('location'),
    `/login?next=${encodeURIComponent(`/trajets/${favTripId}`)}`
  );

  const passenger = await login('sara@test.dz', 'secret1');
  const detail = await openPage(`/trajets/${favTripId}`, passenger.cookie);
  assert.match(detail.html, /Ajouter aux favoris/);

  const save = await fetch(`${baseUrl}/trajets/${favTripId}/favori`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: detail.token }),
    redirect: 'manual',
  });
  assert.equal(save.status, 302);
  assert.equal(save.headers.get('location'), `/trajets/${favTripId}`);
  assert.equal(state.favorites.length, 1);
  assert.equal(state.favorites[0].user, passengerId);
  assert.equal(state.favorites[0].trip, favTripId);

  const saved = await openPage(`/trajets/${favTripId}`, passenger.cookie);
  assert.match(saved.html, /Retirer des favoris/);

  const list = await openPage('/mes-favoris', passenger.cookie);
  assert.equal(list.response.status, 200);
  assert.match(list.html, /Mes favoris/);
  assert.match(list.html, /Oran/);
  assert.match(list.html, /Retirer des favoris/);
  assert.match(list.html, /1 trajet en favori/);
  assert.match(list.html, /À venir \(1\)/);

  // A favourite that already left stays listed, but in the closed section.
  const pastFavId = '64f000000000000000000602';
  state.trips.push({
    ...state.trips.find((candidate) => candidate._id === favTripId),
    _id: pastFavId,
    depart: 'Terminus',
    dateData: '10 janvier 2020',
    departureAt: new Date('2020-01-10T08:00:00Z'),
  });
  state.favorites.push({ _id: '64f000000000000000000603', user: passengerId, trip: pastFavId });

  const listWithPast = await openPage('/mes-favoris', passenger.cookie);
  assert.match(listWithPast.html, /À venir \(1\)/);
  assert.match(listWithPast.html, /Terminés \(1\)/);
  assert.match(listWithPast.html, /Terminus/);
  assert.match(listWithPast.html, /Trajet terminé/);

  state.favorites.length = 1;
  const closedIndex = state.trips.findIndex((candidate) => candidate._id === pastFavId);
  state.trips.splice(closedIndex, 1);

  const driver = await login('karim@test.dz', 'secret1');
  const driverPage = await openPage(`/trajets/${favTripId}`, driver.cookie);
  const ownTrip = await fetch(`${baseUrl}/trajets/${favTripId}/favori`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: driver.cookie },
    body: new URLSearchParams({ _csrf: driverPage.token }),
    redirect: 'manual',
  });
  assert.equal(ownTrip.status, 302);
  assert.equal(state.favorites.length, 1);

  const remove = await fetch(`${baseUrl}/trajets/${favTripId}/favori`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: saved.token, next: '/mes-favoris' }),
    redirect: 'manual',
  });
  assert.equal(remove.status, 302);
  assert.equal(remove.headers.get('location'), '/mes-favoris');
  assert.equal(state.favorites.length, 0);

  const empty = await openPage('/mes-favoris', passenger.cookie);
  assert.match(empty.html, /Vous n'avez aucun favori/);

  const pastTripId = '64f000000000000000000602';
  state.trips.push({
    _id: pastTripId,
    status: 'published',
    depart: 'Constantine',
    depart0: 'Ali Mendjeli',
    arrivee: 'Annaba',
    arrivee0: 'El Bouni',
    dateData: '10 January 2021',
    departureAt: new Date('2021-01-10T08:00:00Z'),
    time: '08 : 00',
    price: '700da',
    priceDZD: 700,
    places: 2,
    places_taken: 0,
    passengers: [],
    description: 'Trajet passe',
    driver: { _id: driverId, name: 'Karim' },
  });

  const pastSave = await fetch(`${baseUrl}/trajets/${pastTripId}/favori`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: saved.token }),
    redirect: 'manual',
  });
  assert.equal(pastSave.status, 302);
  assert.equal(state.favorites.length, 0);

  const tripIndex = state.trips.findIndex((candidate) => candidate._id === favTripId);
  state.trips.splice(tripIndex, 1);
  const pastIndex = state.trips.findIndex((candidate) => candidate._id === pastTripId);
  state.trips.splice(pastIndex, 1);
});

test('users can report a trip or a driver and follow their reports', async () => {
  state.reports.length = 0;

  const guestPage = await openPage('/login');
  const guestReport = await fetch(`${baseUrl}/trajets/${tripId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: guestPage.cookie },
    body: new URLSearchParams({ _csrf: guestPage.token, reason: 'unsafe' }),
    redirect: 'manual',
  });
  assert.equal(guestReport.status, 302);
  assert.equal(
    guestReport.headers.get('location'),
    `/login?next=${encodeURIComponent(`/trajets/${tripId}/signaler`)}`
  );

  const passenger = await login('sara@test.dz', 'secret1');
  const form = await openPage(`/trajets/${tripId}/signaler`, passenger.cookie);
  assert.equal(form.response.status, 200);
  assert.match(form.html, /Signaler ce trajet/);
  assert.match(form.html, /name="reason"/);
  assert.ok(form.token);

  const invalid = await fetch(`${baseUrl}/trajets/${tripId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: form.token, reason: 'unknown-reason' }),
    redirect: 'manual',
  });
  assert.equal(invalid.status, 400);
  assert.match(await invalid.text(), /Choisissez un motif/);

  const submit = await fetch(`${baseUrl}/trajets/${tripId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({
      _csrf: form.token,
      reason: 'unsafe',
      message: 'Conduite trop rapide sur le dernier tronçon.',
    }),
    redirect: 'manual',
  });
  assert.equal(submit.status, 302);
  assert.equal(submit.headers.get('location'), `/trajets/${tripId}`);
  assert.equal(state.reports.length, 1);
  assert.equal(state.reports[0].reporter, passengerId);
  assert.equal(state.reports[0].targetType, 'trip');
  assert.equal(state.reports[0].targetId, tripId);
  assert.equal(state.reports[0].status, 'open');

  const duplicate = await fetch(`${baseUrl}/trajets/${tripId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: form.token, reason: 'unsafe' }),
    redirect: 'manual',
  });
  assert.equal(duplicate.status, 302);
  assert.equal(state.reports.length, 1);

  const driverForm = await openPage(`/conducteurs/${driverId}/signaler`, passenger.cookie);
  assert.equal(driverForm.response.status, 200);
  assert.match(driverForm.html, /Signaler ce conducteur/);

  const driverReport = await fetch(`${baseUrl}/conducteurs/${driverId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({ _csrf: driverForm.token, reason: 'harassment' }),
    redirect: 'manual',
  });
  assert.equal(driverReport.status, 302);
  assert.equal(driverReport.headers.get('location'), `/conducteurs/${driverId}`);
  assert.equal(state.reports.length, 2);
  assert.equal(state.reports[1].targetType, 'user');
  assert.equal(state.reports[1].targetId, driverId);

  const mine = await openPage('/mes-signalements', passenger.cookie);
  assert.equal(mine.response.status, 200);
  assert.match(mine.html, /Mes signalements/);
  assert.match(mine.html, /2 signalements/);
  assert.match(mine.html, /En cours d/);
  assert.match(mine.html, /Conduite dangereuse/);
  assert.match(mine.html, /Karim/);

  state.reports.length = 0;
});

test('administrators can moderate reports, trips and accounts', async () => {
  state.reports.length = 0;
  const modTripId = '64f000000000000000000701';
  state.trips.push({
    _id: modTripId,
    status: 'published',
    depart: 'Sétif',
    depart0: 'El Eulma',
    arrivee: 'Bordj Bou Arréridj',
    arrivee0: 'BBA',
    dateData: '5 March 2033',
    departureAt: new Date('2033-03-05T08:00:00Z'),
    time: '08 : 00',
    price: '800da',
    priceDZD: 800,
    places: 3,
    places_taken: 0,
    passengers: [],
    description: 'Trajet à modérer',
    driver: { _id: driverId, name: 'Karim' },
  });

  const guest = await fetch(`${baseUrl}/admin`, { redirect: 'manual' });
  assert.equal(guest.status, 302);
  assert.equal(guest.headers.get('location'), '/login?next=%2Fadmin');

  const passenger = await login('sara@test.dz', 'secret1');
  const forbidden = await openPage('/admin', passenger.cookie);
  assert.equal(forbidden.response.status, 403);
  assert.match(forbidden.html, /réservée à l/);

  const reportForm = await openPage(`/trajets/${modTripId}/signaler`, passenger.cookie);
  const created = await fetch(`${baseUrl}/trajets/${modTripId}/signaler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: passenger.cookie },
    body: new URLSearchParams({
      _csrf: reportForm.token,
      reason: 'unsafe',
      message: 'Conduite trop rapide.',
    }),
    redirect: 'manual',
  });
  assert.equal(created.status, 302);
  assert.equal(state.reports.length, 1);

  const admin = await login('admin@test.dz', 'secret1');
  assert.equal(admin.response.status, 302);

  const dashboard = await openPage('/admin', admin.cookie);
  assert.equal(dashboard.response.status, 200);
  assert.match(dashboard.html, /Administration/);
  assert.match(dashboard.html, /Signalements ouverts \(1\)/);
  assert.match(dashboard.html, /Conduite dangereuse/);
  assert.match(dashboard.html, /Sétif/);
  assert.match(dashboard.html, new RegExp(`/admin/signaux/${state.reports[0]._id}`));

  const notificationsBefore = state.notifications.length;
  const resolved = await fetch(`${baseUrl}/admin/signaux/${state.reports[0]._id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({
      _csrf: dashboard.token,
      action: 'resolve',
      note: 'Trajet vérifié, avertissement envoyé.',
    }),
    redirect: 'manual',
  });
  assert.equal(resolved.status, 302);
  assert.equal(resolved.headers.get('location'), '/admin');
  assert.equal(state.reports[0].status, 'resolved');
  assert.equal(state.reports[0].adminNote, 'Trajet vérifié, avertissement envoyé.');
  assert.equal(state.notifications.length, notificationsBefore + 1);
  assert.equal(state.notifications[state.notifications.length - 1].type, 'report_resolved');

  const myReports = await openPage('/mes-signalements', passenger.cookie);
  assert.match(myReports.html, /Traité/);

  const cancelled = await fetch(`${baseUrl}/admin/trajets/${modTripId}/annuler`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({ _csrf: dashboard.token }),
    redirect: 'manual',
  });
  assert.equal(cancelled.status, 302);
  assert.equal(
    state.trips.find((candidate) => candidate._id === modTripId).status,
    'cancelled'
  );

  const suspendTripId = '64f000000000000000000709';
  state.trips.push({
    _id: suspendTripId,
    status: 'published',
    depart: 'Alger',
    depart0: 'Centre',
    arrivee: 'Oran',
    arrivee0: 'Centre',
    dateData: '8 July 2034',
    departureAt: new Date('2034-07-08T08:00:00Z'),
    time: '08 : 00',
    price: '1500da',
    priceDZD: 1500,
    places: 3,
    places_taken: 1,
    passengers: [passengerId],
    description: 'Trajet annulé par la suspension',
    driver: driverId,
  });
  const suspensionCandidates = state.trips
    .filter((candidate) => candidate.driver === driverId
      && candidate.status === 'published'
      && (!candidate.departureAt || new Date(candidate.departureAt) > new Date()))
    .map((candidate) => ({ candidate, status: candidate.status }));
  const notificationsBeforeSuspend = state.notifications.length;

  const suspend = await fetch(`${baseUrl}/admin/utilisateurs/${driverId}/suspension`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({ _csrf: dashboard.token }),
    redirect: 'manual',
  });
  assert.equal(suspend.status, 302);
  assert.equal(state.users.find((candidate) => candidate._id === driverId).suspended, true);
  assert.ok(suspensionCandidates.length > 0);
  for (const { candidate } of suspensionCandidates) {
    assert.equal(candidate.status, 'cancelled');
  }
  assert.ok(state.notifications.slice(notificationsBeforeSuspend).some(
    (notification) => notification.recipient === passengerId
      && notification.type === 'trip_cancelled'
      && /suspension du conducteur/.test(notification.body)
  ));

  const suspendedLogin = await login('karim@test.dz', 'secret1');
  assert.equal(suspendedLogin.response.status, 403);
  assert.match(await suspendedLogin.response.text(), /Compte suspendu/);

  const self = await fetch(`${baseUrl}/admin/utilisateurs/${adminId}/suspension`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({ _csrf: dashboard.token }),
    redirect: 'manual',
  });
  assert.equal(self.status, 302);
  assert.notEqual(state.users.find((candidate) => candidate._id === adminId).suspended, true);

  // An administrator can grant the moderation role to another account.
  const role = await fetch(`${baseUrl}/admin/utilisateurs/${passengerId}/role`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({ _csrf: dashboard.token }),
    redirect: 'manual',
  });
  assert.equal(role.status, 302);
  assert.equal(state.users.find((candidate) => candidate._id === passengerId).isAdmin, true);

  const selfRole = await fetch(`${baseUrl}/admin/utilisateurs/${adminId}/role`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: admin.cookie },
    body: new URLSearchParams({ _csrf: dashboard.token }),
    redirect: 'manual',
  });
  assert.equal(selfRole.status, 302);
  // An administrator cannot change their own role.
  assert.equal(state.users.find((candidate) => candidate._id === adminId).isAdmin, true);

  state.users.find((candidate) => candidate._id === passengerId).isAdmin = false;
  state.users.find((candidate) => candidate._id === driverId).suspended = false;

  for (const { candidate, status } of suspensionCandidates) {
    candidate.status = status;
  }
  state.trips = state.trips.filter((candidate) => candidate._id !== suspendTripId);

  const tripIndex = state.trips.findIndex((candidate) => candidate._id === modTripId);
  state.trips.splice(tripIndex, 1);
  state.reports.length = 0;
});

test('the moderation dashboard paginates its sections', async () => {
  state.reports.length = 0;

  for (let index = 0; index < 12; index += 1) {
    await fakeReport.create({
      reporter: passengerId,
      targetType: 'trip',
      targetId: tripId,
      reason: 'unsafe',
      message: `Signalement ${index + 1}`,
    });
  }

  const admin = await login('admin@test.dz', 'secret1');
  const firstPage = await openPage('/admin', admin.cookie);
  assert.equal(firstPage.response.status, 200);
  assert.match(firstPage.html, /Signalements ouverts \(12\)/);
  assert.match(firstPage.html, /Page 1 \/ 2/);
  assert.match(firstPage.html, /signaux=2/);
  // Only ten reports fit on a page.
  assert.equal((firstPage.html.match(/action="\/admin\/signaux\//g) || []).length, 10);

  const secondPage = await openPage('/admin?signaux=2', admin.cookie);
  assert.equal(secondPage.response.status, 200);
  assert.match(secondPage.html, /Page 2 \/ 2/);
  assert.equal((secondPage.html.match(/action="\/admin\/signaux\//g) || []).length, 2);

  // An out of range page falls back to the last one.
  const outOfRange = await openPage('/admin?signaux=99', admin.cookie);
  assert.equal(outOfRange.response.status, 200);
  assert.match(outOfRange.html, /Page 2 \/ 2/);

  state.reports.length = 0;
});

test('invalid credentials get a clear, non-enumerating login error', async () => {
  const page = await openPage('/login');

  const missing = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: page.cookie },
    body: new URLSearchParams({ _csrf: page.token, email: 'sara@test.dz' }),
    redirect: 'manual',
  });
  assert.equal(missing.status, 400);
  const missingHtml = await missing.text();
  assert.match(missingHtml, /Renseignez votre adresse email et votre mot de passe/);
  assert.match(missingHtml, /value="sara@test.dz"/);

  const unknown = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: page.cookie },
    body: new URLSearchParams({ _csrf: page.token, email: 'ghost@test.dz', password: 'secret1' }),
    redirect: 'manual',
  });
  assert.equal(unknown.status, 401);
  const unknownHtml = await unknown.text();
  assert.match(unknownHtml, /Email ou mot de passe incorrect/);
  assert.doesNotMatch(unknownHtml, /Utilisateur introuvable/);

  const wrong = await fetch(`${baseUrl}/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: page.cookie },
    body: new URLSearchParams({ _csrf: page.token, email: 'sara@test.dz', password: 'badpass' }),
    redirect: 'manual',
  });
  assert.equal(wrong.status, 401);
  const wrongHtml = await wrong.text();
  assert.match(wrongHtml, /Email ou mot de passe incorrect/);
  assert.equal(
    wrongHtml.includes('Email ou mot de passe incorrect.'),
    unknownHtml.includes('Email ou mot de passe incorrect.')
  );
});

test('a visitor can create an account, sign in and sign out', async () => {
  const page = await openPage('/signup');
  assert.equal(page.response.status, 200);
  assert.match(page.html, /name="name"/);
  assert.match(page.html, /name="userType"/);

  const created = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: page.cookie },
    body: new URLSearchParams({
      _csrf: page.token,
      name: 'Nadia',
      email: 'nadia@test.dz',
      password: 'secret123',
      'confirm-password': 'secret123',
      userType: '2',
    }),
    redirect: 'manual',
  });
  assert.equal(created.status, 302);
  assert.equal(created.headers.get('location'), '/');

  const account = state.users.find((candidate) => candidate.email === 'nadia@test.dz');
  assert.ok(account);
  assert.equal(account.name, 'Nadia');
  assert.equal(account.userType, 2);
  assert.notEqual(account.password, 'secret123');
  assert.equal(await bcrypt.compare('secret123', account.password), true);

  // The session is signed in right away.
  const cookie = sessionCookie(created) || page.cookie;
  const profile = await openPage('/compte', cookie);
  assert.equal(profile.response.status, 200);
  assert.match(profile.html, /Nadia/);

  // Signing out drops the session.
  const logout = await fetch(`${baseUrl}/logout`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ _csrf: profile.token }),
    redirect: 'manual',
  });
  assert.equal(logout.status, 302);
  assert.equal(logout.headers.get('location'), '/');

  const afterLogout = await fetch(`${baseUrl}/compte`, { headers: { cookie }, redirect: 'manual' });
  assert.equal(afterLogout.status, 302);
  assert.equal(afterLogout.headers.get('location'), '/login?next=%2Fcompte');

  // The same email cannot be used twice.
  const again = await openPage('/signup');
  const duplicate = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: again.cookie },
    body: new URLSearchParams({
      _csrf: again.token,
      name: 'Nadia',
      email: 'nadia@test.dz',
      password: 'secret123',
      'confirm-password': 'secret123',
      userType: '2',
    }),
    redirect: 'manual',
  });
  assert.equal(duplicate.status, 409);
  assert.match(await duplicate.text(), /Email déjà utilisé/);

  const mismatch = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: again.cookie },
    body: new URLSearchParams({
      _csrf: again.token,
      name: 'Nadia',
      email: 'autre@test.dz',
      password: 'secret123',
      'confirm-password': 'autreSecret',
      userType: '2',
    }),
    redirect: 'manual',
  });
  assert.equal(mismatch.status, 400);

  state.users = state.users.filter((candidate) => candidate.email !== 'nadia@test.dz');
});

test('the wizard saves the seats, the price and the description', async () => {
  const passenger = await login('sara@test.dz', 'secret1');
  const { cookie } = passenger;
  const page = await openPage('/publier/page1', cookie);

  const start = await fetch(`${baseUrl}/depart`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ depart: 'Alger', _csrf: page.token }),
    redirect: 'manual',
  });
  assert.equal(start.status, 302);

  const post = (url, content) => fetch(`${baseUrl}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie },
    body: new URLSearchParams({ content, _csrf: page.token }),
    redirect: 'manual',
  });

  const tooManySeats = await post('/places', '9');
  assert.equal(tooManySeats.status, 400);

  const seats = await post('/places', '3');
  assert.equal(seats.status, 200);

  const badPrice = await post('/price', 'gratuit');
  assert.equal(badPrice.status, 400);

  const price = await post('/price', '1500');
  assert.equal(price.status, 200);

  const tooLong = await post('/description', 'x'.repeat(1001));
  assert.equal(tooLong.status, 400);

  const description = await post('/description', 'Trajet tranquille le matin.');
  assert.equal(description.status, 200);

  const drafts = state.trips.filter(
    (candidate) => candidate.status === 'draft' && String(candidate.driver) === passengerId
  );
  const draft = drafts[drafts.length - 1];
  assert.equal(draft.places, 3);
  assert.equal(draft.price, '1500da');
  assert.equal(draft.priceDZD, 1500);
  assert.equal(draft.description, 'Trajet tranquille le matin.');
});

test('a published trip that already left is completed', async () => {
  const { completePastTrips } = require('../lib/tripStatus');
  const driver = await login('karim@test.dz', 'secret1');
  const pastTripId = '64f000000000000000000857';
  state.trips.push({
    _id: pastTripId,
    status: 'published',
    depart: 'Terminus',
    depart0: 'Centre',
    arrivee: 'Alger',
    arrivee0: 'Bab Ezzouar',
    dateData: '1 janvier 2020',
    departureAt: new Date('2020-01-01T08:00:00Z'),
    time: '08 : 00',
    price: '600da',
    priceDZD: 600,
    places: 3,
    places_taken: 1,
    passengers: [],
    description: 'Trajet terminé',
    driver: { _id: driverId, name: 'Karim' },
  });

  const dashboard = await (await fetch(`${baseUrl}/mes-trajets`, {
    headers: { cookie: driver.cookie },
  })).text();
  assert.match(dashboard, /Trajets terminés \(\d+\)/);
  assert.match(dashboard, /Terminus/);

  const detail = await (await fetch(`${baseUrl}/trajets/${pastTripId}`)).text();
  assert.match(detail, /Trajet terminé/);

  // The maintenance helper persists the new status.
  const result = await completePastTrips();
  assert.ok(result.modifiedCount >= 1);
  assert.equal(state.trips.find((candidate) => candidate._id === pastTripId).status, 'completed');

  const afterSync = await (await fetch(`${baseUrl}/mes-trajets`, {
    headers: { cookie: driver.cookie },
  })).text();
  assert.match(afterSync, /Trajets terminés \(\d+\)/);
  assert.match(afterSync, /Terminus/);

  const index = state.trips.findIndex((candidate) => candidate._id === pastTripId);
  state.trips.splice(index, 1);
});