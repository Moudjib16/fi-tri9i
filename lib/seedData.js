const { parseDateInput } = require('./validation');
const { normalizePlace } = require('./wilayas');
const { distanceBetweenWilayas } = require('./distance');

const PASSWORD = 'demo1234';
const EMAIL_DOMAIN = '@demo.dz';

const PEOPLE = [
  { name: 'Karim Belkacem', email: 'karim', userType: 2, phone: '0551 23 45 67', bio: 'Conducteur régulier entre Alger et Béjaïa.' },
  { name: 'Amina Cherif', email: 'amina', userType: 2, phone: '0662 34 56 78', bio: 'Je pars tôt le matin, tout est possible.' },
  { name: 'Yacine Haddad', email: 'yacine', userType: 2, phone: '0770 11 22 33', bio: 'Covoiturage depuis Oran.' },
  { name: 'Sara Bouaziz', email: 'sara', userType: 1, phone: '0555 12 34 56', bio: 'Je covoiture depuis Alger.' },
  { name: 'Nadia Meziane', email: 'nadia', userType: 1, phone: '0661 98 76 54', bio: '' },
  { name: 'Lina Ould Ali', email: 'lina', userType: 1, phone: '', bio: '' },
];

const TRIPS = [
  {
    driver: 'karim', depart: 'Alger', depart0: 'Bab Ezzouar', arrivee: 'Béjaïa', arrivee0: 'Akbou',
    inDays: 3, hour: 7, price: 1200, places: 3, description: 'Départ matinal, trajet calme avec musique basse.',
  },
  {
    driver: 'amina', depart: 'Alger', depart0: 'Hussein Dey', arrivee: 'Tizi Ouzou', arrivee0: 'Azazga',
    inDays: 5, hour: 17, price: 800, places: 2, description: 'Retour en fin d’après-midi, trajet rapide.',
  },
  {
    driver: 'yacine', depart: 'Oran', depart0: 'Es Sénia', arrivee: 'Tlemcen', arrivee0: 'Chouaïef',
    inDays: 8, hour: 9, price: 1500, places: 4, description: 'Route de la côte, arrêt sur demande.',
  },
  {
    driver: 'karim', depart: 'Béjaïa', depart0: 'Akbou', arrivee: 'Alger', arrivee0: 'Bab Ezzouar',
    inDays: 12, hour: 18, price: 1300, places: 3, description: 'Retour vers la capitale après le week-end.',
  },
  {
    driver: 'amina', depart: 'Constantine', depart0: 'El Khroub', arrivee: 'Sétif', arrivee0: 'El Eulma',
    inDays: 21, hour: 6, price: 700, places: 2, description: 'Très tôt le matin, places limitées.',
  },
  {
    driver: 'yacine', depart: 'Oran', depart0: 'Bâtna', arrivee: 'Alger', arrivee0: 'Har El Mars',
    inDays: -10, hour: 8, price: 2200, places: 3, description: 'Trajet déjà effectué.',
  },
];

function pad(value) {
  return String(value).padStart(2, '0');
}

// Builds the date fields of a trip from a day offset and an hour.
function tripSchedule(daysFromNow, hour) {
  const departureAt = new Date();
  departureAt.setUTCDate(departureAt.getUTCDate() + daysFromNow);
  departureAt.setUTCHours(hour, 0, 0, 0);

  const iso = `${departureAt.getUTCFullYear()}-${pad(departureAt.getUTCMonth() + 1)}-${pad(departureAt.getUTCDate())}`;
  const parsed = parseDateInput(iso);

  return {
    departureAt,
    dateData: parsed ? parsed.display : '',
    time: `${pad(hour)} : 00`,
  };
}

// The fields stored on a trip, ready for the database.
function tripFields(item, driverId) {
  const schedule = tripSchedule(item.inDays, item.hour);

  return {
    status: 'published',
    publishedAt: new Date(),
    depart: item.depart,
    departKey: normalizePlace(item.depart),
    depart0: item.depart0,
    arrivee: item.arrivee,
    arriveeKey: normalizePlace(item.arrivee),
    arrivee0: item.arrivee0,
    dateData: schedule.dateData,
    departureAt: schedule.departureAt,
    time: schedule.time,
    price: `${item.price}da`,
    priceDZD: item.price,
    places: item.places,
    places_taken: 0,
    description: item.description,
    driver: driverId,
    distanceKm: distanceBetweenWilayas(item.depart, item.arrivee) || 0,
  };
}

module.exports = {
  PASSWORD,
  EMAIL_DOMAIN,
  PEOPLE,
  TRIPS,
  pad,
  tripSchedule,
  tripFields,
};
