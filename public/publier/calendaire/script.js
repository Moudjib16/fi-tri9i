const calendar = document.querySelector('.calendar');
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

function updateHeader() {
  if (eventDay) {
    eventDay.textContent = weekdays[selected.getDay()];
  }
  if (eventDate) {
    eventDate.textContent = formatDate(selected);
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

  let days = '';

  for (let i = startDay; i > 0; i -= 1) {
    const dayNumber = prevDays - i + 1;
    days += `<div class="day prev-date" data-day="${dayNumber}" data-month="${month - 1}" data-year="${year}">${dayNumber}</div>`;
  }

  for (let i = 1; i <= lastDate; i += 1) {
    const current = new Date(year, month, i);
    const classes = ['day'];
    if (isSameDay(current, today)) classes.push('today');
    if (isSameDay(current, selected)) classes.push('active');
    days += `<div class="${classes.join(' ')}" data-day="${i}" data-month="${month}" data-year="${year}">${i}</div>`;
  }

  for (let i = 1; i <= nextDays; i += 1) {
    days += `<div class="day next-date" data-day="${i}" data-month="${month + 1}" data-year="${year}">${i}</div>`;
  }

  daysContainer.innerHTML = days;
  updateHeader();

  daysContainer.querySelectorAll('.day').forEach(function (day) {
    day.addEventListener('click', function () {
      selected = new Date(
        Number(day.dataset.year),
        Number(day.dataset.month),
        Number(day.dataset.day)
      );
      month = selected.getMonth();
      year = selected.getFullYear();
      initCalendar();
    });
  });
}

function changeMonth(delta) {
  const nextDate = new Date(year, month + delta, 1);
  month = nextDate.getMonth();
  year = nextDate.getFullYear();
  initCalendar();
}

if (prevButton) prevButton.addEventListener('click', function () { changeMonth(-1); });
if (nextButton) nextButton.addEventListener('click', function () { changeMonth(1); });

if (todayButton) {
  todayButton.addEventListener('click', function () {
    month = today.getMonth();
    year = today.getFullYear();
    selected = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    initCalendar();
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
    if (typeof showError === 'function') {
      showError('Format attendu : mm/yyyy.');
    }
  });
}

const initialValue = eventDate ? eventDate.dataset.initial : '';
if (initialValue) {
  const parsed = new Date(initialValue);
  if (!Number.isNaN(parsed.getTime())) {
    selected = parsed;
    month = parsed.getMonth();
    year = parsed.getFullYear();
  }
}

initCalendar();
