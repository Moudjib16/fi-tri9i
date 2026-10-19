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
    filters: { depart: '', arrivee: 'Bejaia', date: '', places: '' },
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
    notice: '',
    cancelled: '',
    error: '',
  });

  assert.match(html, /Se connecter pour réserver/);
  assert.match(html, /Rami/);
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
  });

  const options = html.match(/class="time-option"/g) || [];
  assert.equal(options.length, 108);
  assert.match(html, /À quelle heure partez-vous/);
  assert.doesNotMatch(html, /id="time-option"/);
});

test('my trips renders published and reserved sections', async () => {
  const html = await renderFile(view('mes-trajets.ejs'), {
    stylesheet: 'mes-trajets/',
    title: 'Mes trajets',
    currentUser: { name: 'Rami' },
    published: [{ ...sampleTrip, passengers: [{ name: 'Sara' }] }],
    booked: [{ ...sampleTrip, driver: { name: 'Karim' } }],
  });

  assert.match(html, /Trajets publiés \(1\)/);
  assert.match(html, /Mes réservations \(1\)/);
  assert.match(html, /Sara/);
  assert.match(html, /Karim/);
});
