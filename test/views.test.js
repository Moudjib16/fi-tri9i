const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const util = require('node:util');
const ejs = require('ejs');

const renderFile = util.promisify(ejs.renderFile);
const view = (name) => path.join(__dirname, '..', 'views', name);

const sampleTrip = {
  _id: '64f000000000000000000001',
  depart: 'Alger',
  depart0: 'Bab Ezzouar',
  arrivee: 'Bejaia',
  arrivee0: 'Amizour',
  dateData: '12 December 2026',
  time: '08 : 00',
  price: '1200da',
  places: 4,
  places_taken: 1,
  description: 'Trajet tranquille',
  driver: { _id: '64f000000000000000000002', name: 'Rami' },
};

test('home renders the guest navbar and search form', async () => {
  const html = await renderFile(view('home.ejs'), {
    stylesheet: 'home/',
    title: 'Home',
    currentUser: null,
  });

  assert.match(html, /action="\/trajets"/);
  assert.match(html, /Connexion/);
  assert.match(html, /Inscription/);
});

test('trip listing renders trip cards', async () => {
  const html = await renderFile(view('trajets.ejs'), {
    stylesheet: 'trajets/',
    title: 'Trajets',
    currentUser: { name: 'Sara' },
    trips: [sampleTrip],
    filters: { depart: '', arrivee: 'Bejaia', date: '', places: '', sort: 'soonest' },
    pagination: { total: 1, page: 1, pages: 1, baseQuery: 'arrivee=Bejaia', pageSize: 10 },
  });

  assert.match(html, /Alger/);
  assert.match(html, /Bejaia/);
  assert.match(html, /Voir le trajet/);
  assert.match(html, /1 trajet trouvé/);
});

test('trip detail shows a booking action for guests', async () => {
  const html = await renderFile(view('trajet.ejs'), {
    stylesheet: 'trajet/',
    title: 'Trajet',
    currentUser: null,
    trip: sampleTrip,
    remaining: 3,
    isDriver: false,
    isBooked: false,
  });

  assert.match(html, /Se connecter pour réserver/);
  assert.match(html, /Rami/);
});

test('edit form preloads trip values and reserves booked seats', async () => {
  const html = await renderFile(view('trajet-modifier.ejs'), {
    title: 'Modifier le trajet',
    currentUser: { name: 'Rami' },
    trip: { ...sampleTrip, places: 4, places_taken: 2 },
    values: {
      depart: 'Alger',
      depart0: 'Bab Ezzouar',
      arrivee: 'Bejaia',
      arrivee0: 'Amizour',
      date: '2030-12-12',
      time: '08:00',
      places: '4',
      price: '1200',
      description: 'Trajet tranquille',
    },
    error: 'Erreur de test',
  });

  assert.match(html, /action="\/trajets\/64f000000000000000000001\/modifier"/);
  assert.match(html, /name="places"/);
  assert.match(html, /min="2"/);
  assert.match(html, /value="2030-12-12"/);
  assert.match(html, /Erreur de test/);
});

test('message thread renders participants and highlights own messages', async () => {
  const userId = '64f000000000000000000002';
  const html = await renderFile(view('messages.ejs'), {
    title: 'Messages du trajet',
    currentUser: { _id: userId, name: 'Rami' },
    trip: sampleTrip,
    isDriver: false,
    driverName: 'Rami',
    messages: [
      {
        _id: '64f000000000000000000010',
        body: 'Bonjour, je serai à 8 h.',
        createdAt: new Date('2031-01-01T12:00:00Z'),
        sender: { _id: userId, name: 'Rami' },
      },
    ],
    error: '',
    draft: '',
  });

  assert.match(html, /Messages du trajet/);
  assert.match(html, /class="message is-own"/);
  assert.match(html, /Bonjour, je serai à 8 h\./);
  assert.match(html, /Seuls le conducteur et les passagers réservés/);
  assert.match(html, /action="\/trajets\/64f000000000000000000001\/messages"/);
});

test('about page renders the guest navbar and calls to action', async () => {
  const html = await renderFile(view('a-propos.ejs'), {
    stylesheet: 'a-propos/',
    title: 'À propos',
    currentUser: null,
  });

  assert.match(html, /Fi Tri9i/);
  assert.match(html, /Rechercher un trajet/);
  assert.match(html, /Publier un trajet/);
});

test('time step exposes every selectable departure time', async () => {
  const html = await renderFile(view('publier/heure.ejs'), {
    currentUser: null,
    trip: null,
  });

  const options = html.match(/class="time-option"/g) || [];
  assert.equal(options.length, 108);
  assert.match(html, /À quelle heure partez-vous/);
  assert.doesNotMatch(html, /id="time-option"/);
});

test('wizard steps use inline errors instead of browser alerts', async () => {
  const steps = ['calendaire', 'heure', 'people', 'prix'];

  for (const step of steps) {
    const html = await renderFile(view(`publier/${step}.ejs`), {
      currentUser: null,
      trip: null,
    });

    assert.match(html, /id="wizard-error"/);
    assert.match(html, /role="alert"/);
    assert.match(html, /src="\/shared\/wizard\.js"/);
    assert.doesNotMatch(html, /<script>/);
    assert.doesNotMatch(html, /alert\(/);
  }
});

test('my trips renders published and reserved sections', async () => {
  const html = await renderFile(view('mes-trajets.ejs'), {
    stylesheet: 'mes-trajets/',
    title: 'Mes trajets',
    currentUser: { name: 'Rami' },
    published: [{ ...sampleTrip, passengers: [{ name: 'Sara' }] }],
    booked: [{ ...sampleTrip, driver: { name: 'Karim' } }],
    drafts: [{ ...sampleTrip, depart: 'Draftville', arrivee: '', status: 'draft' }],
    cancelledTrips: [{ ...sampleTrip, status: 'cancelled' }],
  });

  assert.match(html, /Brouillons \(1\)/);
  assert.match(html, /Trajets annulés \(1\)/);
  assert.match(html, /Draftville/);
  assert.match(html, /Reprendre/);
  assert.match(html, /\/publier\/continuer\/64f000000000000000000001/);
  assert.match(html, /Trajets publiés \(1\)/);
  assert.match(html, /Mes réservations \(1\)/);
  assert.match(html, /Sara/);
  assert.match(html, /Karim/);
});
