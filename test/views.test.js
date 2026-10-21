const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const util = require('node:util');
const ejs = require('ejs');
const { REPORT_REASONS } = require('../lib/reports');
const { formatDateFr, formatDateIso } = require('../lib/validation');
const { wilayaOptions } = require('../lib/wilayas');
const { tripDistanceOf } = require('../lib/distance');

const renderFile = util.promisify(ejs.renderFile);
const view = (name) => path.join(__dirname, '..', 'views', name);
// Mirrors the helpers that app.js exposes to every rendered view.
const render = (name, data) => renderFile(view(name), {
  formatDate: formatDateFr,
  formatDateIso,
  wilayas: wilayaOptions(),
  tripDistance: tripDistanceOf,
  ...data,
});

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
  const html = await render('home.ejs', {
    stylesheet: 'home/',
    title: 'Home',
    currentUser: null,
  });

  assert.match(html, /action="\/trajets"/);
  assert.match(html, /Connexion/);
  assert.match(html, /Inscription/);
  // The wilaya datalist suggests the 58 wilayas.
  assert.match(html, /<datalist id="wilayas">/);
  assert.match(html, /<option value="Béjaïa">/);
  assert.match(html, /<option value="Alger">/);
});

test('trip listing renders trip cards', async () => {
  const html = await render('trajets.ejs', {
    stylesheet: 'trajets/',
    title: 'Trajets',
    currentUser: { name: 'Sara' },
    trips: [sampleTrip],
    filters: {
      depart: '',
      arrivee: 'Bejaia',
      date: '',
      places: '',
      sort: 'soonest',
      prixMin: '',
      prixMax: '',
      heureDebut: '',
      heureFin: '',
    },
    pagination: { total: 1, page: 1, pages: 1, baseQuery: 'arrivee=Bejaia', pageSize: 10 },
  });

  assert.match(html, /Alger/);
  assert.match(html, /Bejaia/);
  assert.match(html, /Voir le trajet/);
  assert.match(html, /1 trajet trouvé/);
  // The card shows the estimated distance between the two wilayas.
  assert.match(html, /Distance/);
  assert.match(html, /km/);
});

test('trip listing renders the price, time window and rating filters', async () => {
  const html = await render('trajets.ejs', {
    stylesheet: 'trajets/',
    title: 'Trajets',
    currentUser: { name: 'Sara' },
    trips: [sampleTrip],
    filters: {
      depart: '',
      arrivee: '',
      date: '',
      places: '',
      sort: 'rating',
      prixMin: '500',
      prixMax: '1500',
      heureDebut: '08:00',
      heureFin: '18:00',
    },
    pagination: { total: 1, page: 1, pages: 1, baseQuery: '', pageSize: 10 },
  });

  assert.match(html, /name="prixMin" min="1" max="100000" value="500"/);
  assert.match(html, /name="prixMax" min="1" max="100000" value="1500"/);
  assert.match(html, /type="time" name="heureDebut" value="08:00"/);
  assert.match(html, /type="time" name="heureFin" value="18:00"/);
  assert.match(html, /<option value="rating" selected>/);
  assert.match(html, /Conducteurs les mieux notés/);
});

test('trip detail shows a booking action for guests', async () => {
  const html = await render('trajet.ejs', {
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

test('trip detail offers a seat selector to a passenger', async () => {
  const html = await render('trajet.ejs', {
    stylesheet: 'trajet/',
    title: 'Trajet',
    currentUser: { name: 'Sara' },
    trip: sampleTrip,
    remaining: 3,
    isDriver: false,
    isBooked: false,
    hasDeparted: false,
    isCancelled: false,
  });

  assert.match(html, /Places à réserver/);
  assert.match(html, /<option value="1">/);
  assert.match(html, /<option value="3">/);
  assert.doesNotMatch(html, /<option value="4">/);
  assert.match(html, /action="\/trajets\/64f000000000000000000001\/reserver"/);
});

test('trip detail shows how many seats a passenger booked', async () => {
  const html = await render('trajet.ejs', {
    stylesheet: 'trajet/',
    title: 'Trajet',
    currentUser: { name: 'Sara' },
    trip: sampleTrip,
    remaining: 1,
    isDriver: false,
    isBooked: true,
    mySeats: 3,
    hasDeparted: false,
    isCancelled: false,
  });

  assert.match(html, /3 places réservées/);
  assert.match(html, /Annuler ma réservation/);
});

test('edit form preloads trip values and reserves booked seats', async () => {
  const html = await render('trajet-modifier.ejs', {
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
    departCommunes: ['Alger Centre', 'Bab Ezzouar'],
    arriveeCommunes: ['Amizour', 'Akbou'],
  });

  assert.match(html, /action="\/trajets\/64f000000000000000000001\/modifier"/);
  assert.match(html, /name="places"/);
  assert.match(html, /min="2"/);
  assert.match(html, /value="2030-12-12"/);
  assert.match(html, /Erreur de test/);
  assert.match(html, /list="wilayas"/);
  assert.match(html, /<option value="Bab Ezzouar">/);
  assert.match(html, /<option value="Amizour">/);
});

test('message thread renders participants and highlights own messages', async () => {
  const userId = '64f000000000000000000002';
  const html = await render('messages.ejs', {
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
  const html = await render('notifications.ejs', {
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
  const html = await render('avis.ejs', {
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
  const html = await render('conducteur.ejs', {
    title: 'Rami — Conducteur',
    currentUser: { name: 'Sara' },
    driver: {
      _id: '64f000000000000000000002',
      name: 'Rami',
      bio: 'Conducteur régulier entre Alger et Béjaïa.',
      createdAt: new Date('2025-01-01'),
    },
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
  assert.match(html, /Conducteur régulier entre Alger et Béjaïa\./);
});

test('about page renders the guest navbar and calls to action', async () => {
  const html = await render('a-propos.ejs', {
    stylesheet: 'a-propos/',
    title: 'À propos',
    currentUser: null,
  });

  assert.match(html, /Fi Tri9i/);
  assert.match(html, /Rechercher un trajet/);
  assert.match(html, /Publier un trajet/);
});

test('time step exposes every selectable departure time', async () => {
  const html = await render('publier/heure.ejs', {
    currentUser: null,
    trip: null,
  });

  const options = html.match(/class="time-option"/g) || [];
  assert.equal(options.length, 108);
  assert.match(html, /À quelle heure partez-vous/);
  assert.doesNotMatch(html, /id="time-option"/);
});

test('the wizard suggests the wilayas and the communes of the draft', async () => {
  const firstStep = await render('publier/page1.ejs', {
    currentUser: null,
    trip: null,
  });
  assert.match(firstStep, /list="wilayas"/);
  assert.match(firstStep, /<datalist id="wilayas">/);

  const secondStep = await render('publier/page2.ejs', {
    currentUser: null,
    trip: { depart: 'Alger', depart0: 'Bab Ezzouar' },
    communes: ['Alger Centre', 'Bab Ezzouar'],
  });
  assert.match(secondStep, /list="communes"/);
  assert.match(secondStep, /<option value="Bab Ezzouar">/);
});

test('wizard steps use inline errors instead of browser alerts', async () => {
  const steps = ['calendaire', 'heure', 'people', 'prix'];

  for (const step of steps) {
    const html = await render(`publier/${step}.ejs`, {
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
  const html = await render('mes-trajets.ejs', {
    stylesheet: 'mes-trajets/',
    title: 'Mes trajets',
    currentUser: { name: 'Rami' },
    published: [{ ...sampleTrip, passengers: [{ name: 'Sara' }] }],
    booked: [{ ...sampleTrip, driver: { name: 'Karim' } }],
    drafts: [{ ...sampleTrip, depart: 'Draftville', arrivee: '', status: 'draft' }],
    cancelledTrips: [{ ...sampleTrip, status: 'cancelled' }],
    completed: [{ ...sampleTrip, depart: 'Terminus', status: 'completed' }],
  });

  assert.match(html, /Brouillons \(1\)/);
  assert.match(html, /Trajets annulés \(1\)/);
  assert.match(html, /Draftville/);
  assert.match(html, /Reprendre/);
  assert.match(html, /\/publier\/continuer\/64f000000000000000000001/);
  assert.match(html, /Trajets à venir \(1\)/);
  assert.match(html, /Mes réservations \(1\)/);
  assert.match(html, /Sara/);
  assert.match(html, /Karim/);
});

test('my trips lists the completed trips apart', async () => {
  const html = await render('mes-trajets.ejs', {
    stylesheet: 'mes-trajets/',
    title: 'Mes trajets',
    currentUser: { name: 'Rami' },
    published: [],
    booked: [],
    drafts: [],
    cancelledTrips: [],
    completed: [{ ...sampleTrip, depart: 'Terminus', status: 'completed' }],
  });

  assert.match(html, /Trajets terminés \(1\)/);
  assert.match(html, /Terminus/);
  assert.match(html, /Terminé/);
});

test('account page renders profile details and password errors', async () => {
  const html = await render('compte.ejs', {
    title: 'Mon compte',
    currentUser: {
      _id: '64f000000000000000000002',
      name: 'Sara',
      email: 'sara@test.dz',
      userType: 1,
      phone: '0555 12 34 56',
      bio: 'Je covoiture depuis Alger.',
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

test('account page renders an editable profile form', async () => {
  const html = await render('compte.ejs', {
    title: 'Mon compte',
    currentUser: {
      _id: '64f000000000000000000002',
      name: 'Sara',
      email: 'sara@test.dz',
      userType: 1,
      phone: '0555 12 34 56',
      bio: 'Je covoiture depuis Alger.',
    },
    errors: {},
  });

  assert.match(html, /action="\/compte\/profil"/);
  assert.match(html, /Mes informations/);
  assert.match(html, /name="name" value="Sara"/);
  assert.match(html, /name="phone" value="0555 12 34 56"/);
  assert.match(html, /Je covoiture depuis Alger\./);
  assert.match(html, /<option value="1" selected>Passager<\/option>/);
  assert.match(html, /<option value="2" >Conducteur<\/option>/);
});

test('account page keeps the submitted profile values after an error', async () => {
  const html = await render('compte.ejs', {
    title: 'Mon compte',
    currentUser: { _id: '64f000000000000000000002', name: 'Sara', email: 'sara@test.dz', userType: 1 },
    errors: { phone: 'Indiquez un numéro de téléphone valide.' },
    profile: { name: 'Sara B', phone: 'appelle-moi', bio: 'Bonjour', userType: 2 },
  });

  assert.match(html, /Indiquez un numéro de téléphone valide\./);
  assert.match(html, /name="name" value="Sara B"/);
  assert.match(html, /name="phone" value="appelle-moi"/);
  assert.match(html, /<option value="2" selected>Conducteur<\/option>/);
});

test('favourites page lists saved trips with a remove action', async () => {
  const html = await render('mes-favoris.ejs', {
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
  assert.match(html, /À venir \(1\)/);
});

test('favourites page separates the trips that already left', async () => {
  const html = await render('mes-favoris.ejs', {
    stylesheet: 'mes-favoris/',
    title: 'Mes favoris',
    currentUser: { name: 'Sara' },
    trips: [
      sampleTrip,
      {
        ...sampleTrip,
        _id: '64f000000000000000000009',
        depart: 'Terminus',
        departureAt: new Date('2020-01-10T08:00:00Z'),
      },
      {
        ...sampleTrip,
        _id: '64f000000000000000000010',
        depart: 'Annule',
        status: 'cancelled',
      },
    ],
  });

  assert.match(html, /À venir \(1\)/);
  assert.match(html, /Terminés \(2\)/);
  assert.match(html, /Terminus/);
  assert.match(html, /Trajet terminé/);
  assert.match(html, /Annulé par le conducteur/);
});

test('report form renders the reason list and the reported target', async () => {
  const html = await render('signaler.ejs', {
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
  const html = await render('admin.ejs', {
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
    totals: {
      reports: 3,
      trips: 12,
      accounts: 42,
      suspended: 1,
      admins: 2,
    },
    pagination: {
      baseQuery: 'signaux=1&trajets=1&comptes=1',
      reports: { page: 1, pages: 2 },
      trips: { page: 1, pages: 3 },
      accounts: { page: 1, pages: 4 },
    },
  });

  assert.match(html, /Administration/);
  assert.match(html, /Signalements ouverts \(3\)/);
  assert.match(html, /Trajets publiés \(12\)/);
  assert.match(html, /Comptes \(42\)/);
  assert.match(html, /Conduite dangereuse/);
  assert.match(html, /action="\/admin\/signaux\/64f000000000000000000800"/);
  assert.match(html, /Annuler le trajet/);
  assert.match(html, /sara@test\.dz/);
  assert.match(html, /Suspendre/);
  assert.match(html, /Nommer admin/);
  // Each section keeps its own pagination.
  assert.match(html, /signaux=2/);
  assert.match(html, /trajets=2/);
  assert.match(html, /comptes=2/);
});
