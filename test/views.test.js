const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const util = require('node:util');
const ejs = require('ejs');
const { REPORT_REASONS } = require('../lib/reports');

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

test('notifications page renders unread activity and trip links', async () => {
  const html = await renderFile(view('notifications.ejs'), {
    title: 'Notifications',
    currentUser: { _id: '64f000000000000000000002', name: 'Rami' },
    unreadNotifications: 1,
    notifications: [
      {
        _id: '64f000000000000000000020',
        trip: sampleTrip._id,
        type: 'booking',
        body: 'Sara a réservé une place sur votre trajet.',
        createdAt: new Date('2031-01-01T12:00:00Z'),
        readAt: null,
      },
    ],
  });

  assert.match(html, /Notifications/);
  assert.match(html, /notification-item is-unread/);
  assert.match(html, /Sara a réservé une place sur votre trajet\./);
  assert.match(html, /href="\/trajets\/64f000000000000000000001"/);
  assert.match(html, /nav-badge/);
});

test('review form renders rating choices and a public notice', async () => {
  const html = await renderFile(view('avis.ejs'), {
    title: 'Laisser un avis',
    currentUser: { name: 'Rami' },
    trip: sampleTrip,
    driverName: 'Rami',
    values: { rating: '4', comment: 'Très bien' },
    error: 'Erreur de test',
  });

  assert.match(html, /Comment s'est passé votre trajet/);
  assert.match(html, /action="\/trajets\/64f000000000000000000001\/avis"/);
  assert.match(html, /value="4" selected/);
  assert.match(html, /Très bien/);
  assert.match(html, /Votre avis sera public/);
  assert.match(html, /Erreur de test/);
});

test('driver profile shows average rating and recent reviews', async () => {
  const html = await renderFile(view('conducteur.ejs'), {
    title: 'Rami — Conducteur',
    currentUser: { name: 'Sara' },
    driver: { _id: '64f000000000000000000002', name: 'Rami', createdAt: new Date('2025-01-01') },
    upcomingTrips: [sampleTrip],
    ratingCount: 2,
    ratingAverage: 4.5,
    reviews: [
      {
        _id: '64f000000000000000000030',
        rating: 5,
        comment: 'Trajet impeccable.',
        createdAt: new Date('2031-01-01T12:00:00Z'),
        author: { _id: '64f000000000000000000001', name: 'Sara' },
      },
    ],
  });

  assert.match(html, /4\.5/);
  assert.match(html, /2 avis/);
  assert.match(html, /Avis des passagers/);
  assert.match(html, /Trajet impeccable\./);
  assert.match(html, /Sara/);
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

test('account page renders profile details and password errors', async () => {
  const html = await renderFile(view('compte.ejs'), {
    title: 'Mon compte',
    currentUser: {
      _id: '64f000000000000000000002',
      name: 'Sara',
      email: 'sara@test.dz',
      userType: 1,
    },
    errors: {
      currentPassword: 'Mot de passe actuel incorrect.',
      password: 'Le nouveau mot de passe est trop court.',
    },
  });

  assert.match(html, /Mon compte/);
  assert.match(html, /Sara/);
  assert.match(html, /sara@test\.dz/);
  assert.match(html, /Passager/);
  assert.match(html, /action="\/compte\/mot-de-passe"/);
  assert.match(html, /name="currentPassword"/);
  assert.match(html, /name="confirm-password"/);
  assert.match(html, /Mot de passe actuel incorrect\./);
  assert.match(html, /Le nouveau mot de passe est trop court\./);
});

test('favourites page lists saved trips with a remove action', async () => {
  const html = await renderFile(view('mes-favoris.ejs'), {
    stylesheet: 'mes-favoris/',
    title: 'Mes favoris',
    currentUser: { name: 'Sara' },
    trips: [sampleTrip],
  });

  assert.match(html, /Mes favoris/);
  assert.match(html, /1 trajet en favori/);
  assert.match(html, /Alger/);
  assert.match(html, /action="\/trajets\/64f000000000000000000001\/favori"/);
  assert.match(html, /Retirer des favoris/);
  assert.match(html, /Voir le trajet/);
});

test('report form renders the reason list and the reported target', async () => {
  const html = await renderFile(view('signaler.ejs'), {
    title: 'Signaler',
    currentUser: { name: 'Sara' },
    target: {
      targetType: 'trip',
      targetId: '64f000000000000000000001',
      targetLabel: 'Alger → Bejaia',
      targetDate: '12 December 2026',
      targetUrl: '/trajets/64f000000000000000000001',
      formAction: '/trajets/64f000000000000000000001/signaler',
    },
    reasons: REPORT_REASONS,
    values: { reason: 'unsafe', message: 'Conduite trop rapide' },
    error: '',
  });

  assert.match(html, /Signaler ce trajet/);
  assert.match(html, /Alger → Bejaia/);
  assert.match(html, /Conduite dangereuse/);
  assert.match(html, /value="unsafe" selected/);
  assert.match(html, /Conduite trop rapide/);
  assert.match(html, /action="\/trajets\/64f000000000000000000001\/signaler"/);
});

test('admin dashboard renders reports, published trips and accounts', async () => {
  const html = await renderFile(view('admin.ejs'), {
    stylesheet: 'admin/',
    title: 'Administration',
    currentUser: { name: 'Admin', isAdmin: true },
    reports: [{
      report: {
        _id: '64f000000000000000000800',
        status: 'open',
        reason: 'unsafe',
        message: 'Conduite rapide',
        createdAt: new Date('2031-03-01T10:00:00Z'),
      },
      targetLabel: 'Alger → Bejaia',
      targetUrl: '/trajets/64f000000000000000000001',
      reasonLabel: 'Conduite dangereuse',
    }],
    publishedTrips: [{
      _id: '64f000000000000000000001',
      depart: 'Alger',
      arrivee: 'Bejaia',
      dateData: '12 December 2026',
      time: '08 : 00',
      driver: { name: 'Karim' },
    }],
    accounts: [{
      _id: '64f000000000000000000002',
      name: 'Sara',
      email: 'sara@test.dz',
      userType: 1,
      isAdmin: false,
      suspended: false,
    }],
  });

  assert.match(html, /Administration/);
  assert.match(html, /Signalements ouverts \(1\)/);
  assert.match(html, /Conduite dangereuse/);
  assert.match(html, /action="\/admin\/signaux\/64f000000000000000000800"/);
  assert.match(html, /Annuler le trajet/);
  assert.match(html, /sara@test\.dz/);
  assert.match(html, /Suspendre/);
  assert.match(html, /Nommer admin/);
});
