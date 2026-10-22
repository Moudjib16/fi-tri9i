const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const WEEKDAYS = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi',
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

// Lowercase and drop accents so "Décembre", "decembre" and "DECEMBRE" all match.
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const MONTH_ALIASES = new Map();
function registerMonth(index, ...aliases) {
  for (const alias of aliases) {
    MONTH_ALIASES.set(normalizeText(alias), index);
  }
}
MONTHS_EN.forEach((month, index) => registerMonth(index, month, month.slice(0, 3)));
MONTHS_FR.forEach((month, index) => registerMonth(index, month));
// French abbreviations commonly typed by users.
registerMonth(0, 'janv');
registerMonth(1, 'fevr');
registerMonth(3, 'avr');
registerMonth(6, 'juil');
registerMonth(7, 'aout');
registerMonth(8, 'sept');

const WEEKDAY_ALIASES = new Set(WEEKDAYS.map(normalizeText));

// Algeria uses UTC+1 all year round (no daylight saving time).
const ALGERIA_UTC_OFFSET_MINUTES = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function algeriaLocalToUtc(year, month, day, hours = 0, minutes = 0) {
  return new Date(
    Date.UTC(year, month, day, hours, minutes)
      - ALGERIA_UTC_OFFSET_MINUTES * 60 * 1000
  );
}

function algeriaDateStart(parsedDate) {
  if (!parsedDate || !parsedDate.date) {
    return null;
  }
  const date = parsedDate.date;
  return algeriaLocalToUtc(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
}

function algeriaDayStart(value = new Date()) {
  const instant = value instanceof Date ? value : new Date(value);
  const shifted = new Date(instant.getTime() + ALGERIA_UTC_OFFSET_MINUTES * 60 * 1000);
  return algeriaLocalToUtc(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
}

function pickString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function utcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month
    || date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isoFromDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The publishing wizard stores dates as "12 décembre 2024"
function dateToDisplay(value) {
  const parsed = parseDateInput(value);
  return parsed ? parsed.display : '';
}

// Accepts ISO dates, the French calendar format ("12 décembre 2024"),
// the English one ("12 December 2024") and an optional leading weekday
// ("jeudi 12 décembre 2024").
function parseDateInput(value) {
  const raw = pickString(value);
  if (!raw) {
    return null;
  }

  let year;
  let month;
  let day;
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]) - 1;
    day = Number(isoMatch[3]);
  } else {
    const tokens = raw.split(/\s+/).filter(Boolean);
    // Drop a leading weekday such as "jeudi" or "Thursday".
    while (tokens.length > 3 && WEEKDAY_ALIASES.has(normalizeText(tokens[0]))) {
      tokens.shift();
    }
    if (tokens.length !== 3) {
      return null;
    }
    const [dayToken, monthToken, yearToken] = tokens;
    if (!/^\d{1,2}$/.test(dayToken) || !/^\d{4}$/.test(yearToken)) {
      return null;
    }
    const alias = MONTH_ALIASES.get(normalizeText(monthToken));
    if (alias === undefined) {
      return null;
    }
    day = Number(dayToken);
    month = alias;
    year = Number(yearToken);
  }

  const date = utcDate(year, month, day);
  if (!date) {
    return null;
  }
  return {
    date,
    iso: isoFromDate(date),
    display: `${date.getUTCDate()} ${MONTHS_FR[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
    // Kept for records stored before the French display format was introduced.
    displayEn: `${date.getUTCDate()} ${MONTHS_EN[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
  };
}

// Renders any stored date representation (ISO, French or English) in French.
function formatDateFr(value) {
  const parsed = parseDateInput(value);
  return parsed ? parsed.display : '';
}

// Renders any stored date representation as an ISO "YYYY-MM-DD" string.
function formatDateIso(value) {
  const parsed = parseDateInput(value);
  return parsed ? parsed.iso : '';
}

function parseTimeInput(value) {
  const raw = pickString(value);
  const match = raw.match(/^([01]?\d|2[0-3])\s*:\s*([0-5]\d)$/);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return {
    hours,
    minutes,
    display: `${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')}`,
  };
}

function parsePriceInput(value) {
  const raw = pickString(value).replace(/\s+/g, '').replace(/da$/i, '').replace(',', '.');
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000) {
    return null;
  }
  return {
    amount,
    display: `${amount}da`,
  };
}

// Combines the stored display date and time into a single sortable Date.
function combineDepartureAt(dateDisplay, timeDisplay) {
  const date = parseDateInput(dateDisplay);
  const time = parseTimeInput(timeDisplay);
  if (!date || !time) {
    return null;
  }
  return algeriaLocalToUtc(
    date.date.getUTCFullYear(),
    date.date.getUTCMonth(),
    date.date.getUTCDate(),
    time.hours,
    time.minutes
  );
}

function isPastDate(date) {
  return date instanceof Date && date.getTime() < Date.now();
}

// A calendar day is in the past only once the whole day is over in Algeria.
function isPastDay(parsedDate, now = new Date()) {
  const dayStart = algeriaDateStart(parsedDate);
  return dayStart !== null && dayStart < algeriaDayStart(now);
}

module.exports = {
  pickString,
  safeRedirect,
  escapeRegex,
  dateToDisplay,
  parseDateInput,
  parseTimeInput,
  parsePriceInput,
  combineDepartureAt,
  algeriaDateStart,
  algeriaDayStart,
  isPastDate,
  isPastDay,
  formatDateFr,
  formatDateIso,
  ALGERIA_UTC_OFFSET_MINUTES,
  DAY_MS,
};
