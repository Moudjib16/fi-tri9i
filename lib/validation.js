const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_INDEX = Object.fromEntries(MONTHS.map((month, index) => [month.toLowerCase(), index]));

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

// The publishing wizard stores dates as "12 December 2024"
function dateToDisplay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = utcDate(year, month - 1, day);
  if (!date) {
    return '';
  }
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Accepts both the calendar widget format and an ISO date from other clients.
function parseDateInput(value) {
  const raw = pickString(value);
  if (!raw) {
    return null;
  }

  let year;
  let month;
  let day;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    [year, month, day] = raw.split('-').map(Number);
    month -= 1;
  } else {
    const match = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (!match) {
      return null;
    }
    day = Number(match[1]);
    month = MONTH_INDEX[match[2].toLowerCase()];
    year = Number(match[3]);
    if (month === undefined) {
      return null;
    }
  }

  const date = utcDate(year, month, day);
  if (!date) {
    return null;
  }
  return {
    date,
    display: `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
  };
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
  return new Date(Date.UTC(
    date.date.getUTCFullYear(),
    date.date.getUTCMonth(),
    date.date.getUTCDate(),
    time.hours,
    time.minutes
  ));
}

function isPastDate(date) {
  return date instanceof Date && date.getTime() < Date.now();
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
  isPastDate,
};
