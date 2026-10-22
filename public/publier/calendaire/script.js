const monthLabel = document.querySelector('.date');
const daysContainer = document.querySelector('.days');
const prevButton = document.querySelector('.prev');
const nextButton = document.querySelector('.next');
const todayButton = document.querySelector('.today-btn');
const gotoButton = document.querySelector('.goto-btn');
const dateInput = document.querySelector('.date-input');
const eventDay = document.querySelector('.event-day');
const eventDate = document.querySelector('.event-date');

const months = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];
const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

const today = new Date();
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let month = today.getMonth();
let year = today.getFullYear();
let selected = new Date(today.getFullYear(), today.getMonth(), today.getDate());

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function formatDate(value) {
  const label = `${weekdays[value.getDay()]} ${value.getDate()} ${months[value.getMonth()]} ${value.getFullYear()}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// The server stores dates as ISO strings, so the locale never matters.
function formatIsoDate(value) {
  const yearValue = value.getFullYear();
  const monthValue = String(value.getMonth() + 1).padStart(2, '0');
  const dayValue = String(value.getDate()).padStart(2, '0');
  return `${yearValue}-${monthValue}-${dayValue}`;
}

// ISO dates are parsed as UTC by the browser, so read them as local calendar days.
function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) {
    return null;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addMonths(value, delta) {
  const first = new Date(value.getFullYear(), value.getMonth() + delta, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(value.getDate(), lastDay));
}

function isPast(value) {
  return value.getTime() < todayStart.getTime();
}

function dayLabel(value) {
  const parts = [weekdays[value.getDay()], String(value.getDate()), months[value.getMonth()], String(value.getFullYear())];
  if (isSameDay(value, today)) {
    parts.push("aujourd'hui");
  }
  if (isPast(value)) {
    parts.push('indisponible');
  }
  return parts.join(' ');
}

function renderDay(value, extraClass, focusIso) {
  const iso = formatIsoDate(value);
  const active = isSameDay(value, selected);
  const classes = ['day'];
  if (extraClass) {
    classes.push(extraClass);
  }
  if (active) {
    classes.push('active');
  }
  if (isSameDay(value, today)) {
    classes.push('today');
  }
  if (isPast(value)) {
    classes.push('past');
  }

  const attributes = [
    'type="button"',
    `class="${classes.join(' ')}"`,
    `data-iso="${iso}"`,
    `aria-label="${dayLabel(value)}"`,
    `aria-pressed="${active ? 'true' : 'false'}"`,
    `tabindex="${iso === focusIso ? '0' : '-1'}"`,
  ];
  if (isSameDay(value, today)) {
    attributes.push('aria-current="date"');
  }
  if (isPast(value)) {
    attributes.push('disabled');
  }
  return `<button ${attributes.join(' ')}>${value.getDate()}</button>`;
}

function focusIso(iso) {
  const target = daysContainer.querySelector(`[data-iso="${iso}"]`);
  if (!target || target.disabled) {
    return;
  }
  daysContainer.querySelectorAll('.day').forEach(function (day) {
    day.tabIndex = day === target ? 0 : -1;
  });
  target.focus();
}

function updateHeader() {
  if (eventDay) {
    eventDay.textContent = weekdays[selected.getDay()];
  }
  if (eventDate) {
    eventDate.textContent = formatDate(selected);
    eventDate.dataset.iso = formatIsoDate(selected);
  }
}

function initCalendar() {
  if (!daysContainer || !monthLabel) {
    return;
  }

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const prevLastDay = new Date(year, month, 0);
  const prevDays = prevLastDay.getDate();
  const lastDate = lastDay.getDate();
  const startDay = firstDay.getDay();
  const nextDays = 7 - lastDay.getDay() - 1;

  const monthName = months[month];
  monthLabel.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  let focusTarget = formatIsoDate(selected);
  if (selected.getFullYear() !== year || selected.getMonth() !== month || isPast(selected)) {
    const todayInMonth = today.getFullYear() === year && today.getMonth() === month;
    focusTarget = todayInMonth && !isPast(today) ? formatIsoDate(today) : '';
    if (!focusTarget && !isPast(firstDay)) {
      focusTarget = formatIsoDate(firstDay);
    }
  }

  let days = '';

  for (let i = startDay; i > 0; i -= 1) {
    const dayValue = new Date(year, month - 1, prevDays - i + 1);
    days += renderDay(dayValue, 'prev-date', focusTarget);
  }

  for (let i = 1; i <= lastDate; i += 1) {
    const current = new Date(year, month, i);
    days += renderDay(current, '', focusTarget);
  }

  for (let i = 1; i <= nextDays; i += 1) {
    const dayValue = new Date(year, month + 1, i);
    days += renderDay(dayValue, 'next-date', focusTarget);
  }

  daysContainer.innerHTML = days;
  updateHeader();
}

function selectDate(value) {
  selected = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  month = selected.getMonth();
  year = selected.getFullYear();
  initCalendar();
  requestAnimationFrame(function () {
    focusIso(formatIsoDate(selected));
  });
}

function focusDate(value) {
  if (isPast(value)) {
    return;
  }
  month = value.getMonth();
  year = value.getFullYear();
  initCalendar();
  requestAnimationFrame(function () {
    focusIso(formatIsoDate(value));
  });
}

if (daysContainer) {
  daysContainer.addEventListener('click', function (event) {
    const button = event.target.closest('.day');
    if (!button || button.disabled) {
      return;
    }
    const value = parseIsoDate(button.dataset.iso);
    if (value) {
      selectDate(value);
    }
  });

  daysContainer.addEventListener('keydown', function (event) {
    const button = event.target.closest('.day');
    if (!button) {
      return;
    }
    const current = parseIsoDate(button.dataset.iso);
    if (!current) {
      return;
    }

    let target = null;
    if (event.key === 'ArrowLeft') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1);
    } else if (event.key === 'ArrowRight') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
    } else if (event.key === 'ArrowUp') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7);
    } else if (event.key === 'ArrowDown') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
    } else if (event.key === 'Home') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() - current.getDay());
    } else if (event.key === 'End') {
      target = new Date(current.getFullYear(), current.getMonth(), current.getDate() + (6 - current.getDay()));
    } else if (event.key === 'PageUp') {
      target = addMonths(current, -1);
    } else if (event.key === 'PageDown') {
      target = addMonths(current, 1);
    } else {
      return;
    }

    event.preventDefault();
    focusDate(target);
  });
}

function changeMonth(delta) {
  const nextDate = addMonths(new Date(year, month, 1), delta);
  month = nextDate.getMonth();
  year = nextDate.getFullYear();
  initCalendar();
}

if (prevButton) prevButton.addEventListener('click', function () { changeMonth(-1); });
if (nextButton) nextButton.addEventListener('click', function () { changeMonth(1); });

if (todayButton) {
  todayButton.addEventListener('click', function () {
    selectDate(today);
  });
}

if (dateInput) {
  dateInput.addEventListener('input', function () {
    dateInput.value = dateInput.value.replace(/[^0-9/]/g, '');
    if (dateInput.value.length === 2) {
      dateInput.value += '/';
    }
    if (dateInput.value.length > 7) {
      dateInput.value = dateInput.value.slice(0, 7);
    }
  });
}

if (gotoButton && dateInput) {
  gotoButton.addEventListener('click', function () {
    const parts = dateInput.value.split('/');
    if (parts.length === 2 && parts[0] > 0 && parts[0] < 13 && parts[1].length === 4) {
      month = Number(parts[0]) - 1;
      year = Number(parts[1]);
      initCalendar();
      return;
    }
    if (window.wizard) {
      window.wizard.showError('Format attendu : mm/yyyy.');
    }
  });
}

const initialValue = eventDate ? eventDate.dataset.initial : '';
if (initialValue) {
  const parsed = parseIsoDate(initialValue) || new Date(initialValue);
  if (!Number.isNaN(parsed.getTime())) {
    selected = parsed;
    month = parsed.getMonth();
    year = parsed.getFullYear();
  }
}
initCalendar();

const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.location.href = '/publier/page4';
  });
}

if (window.wizard) {
  window.wizard.initStep({
    buttonId: 'prochaine',
    getContent: function () {
      return eventDate ? eventDate.dataset.iso || formatIsoDate(selected) : '';
    },
    url: '/date',
    next: '/publier/heure',
    invalidMessage: 'Date invalide, réessayez.',
  });
}
