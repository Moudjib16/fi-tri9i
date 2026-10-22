const clock = document.getElementById('clock');
const timeOptions = Array.from(document.querySelectorAll('.time-option'));
const timeMenu = document.getElementById('time-menu');
const arr = document.getElementById('arr');
const white = document.getElementById('white');

function normalizeTime(value) {
  return String(value || '').replace(/\s*:\s*/g, ' : ').trim();
}

function updateSelectedOption() {
  if (!clock) {
    return;
  }
  const current = normalizeTime(clock.value);
  timeOptions.forEach(function (option) {
    option.setAttribute('aria-selected', String(normalizeTime(option.textContent) === current));
  });
}

function setTimeMenuOpen(open, moveFocus) {
  if (!timeMenu || !clock || !arr || !white) {
    return;
  }
  timeMenu.style.display = open ? 'flex' : 'none';
  white.style.display = open ? 'flex' : 'none';
  arr.style.rotate = open ? '180deg' : '0deg';
  arr.setAttribute('aria-expanded', String(open));
  clock.setAttribute('aria-expanded', String(open));

  if (!open) {
    return;
  }

  updateSelectedOption();
  if (!moveFocus) {
    return;
  }
  const selectedOption = timeOptions.find(function (option) {
    return option.getAttribute('aria-selected') === 'true';
  });
  requestAnimationFrame(function () {
    (selectedOption || timeOptions[0]).focus();
  });
}

function toggleTimeMenu() {
  setTimeMenuOpen(timeMenu && timeMenu.style.display !== 'flex', true);
}

function chooseTime(option) {
  if (!clock || !option) {
    return;
  }
  clock.value = option.textContent.trim();
  updateSelectedOption();
  setTimeMenuOpen(false, false);
  clock.focus();
}

if (arr) {
  arr.addEventListener('click', toggleTimeMenu);
}

if (white) {
  white.addEventListener('click', function () {
    setTimeMenuOpen(false, false);
  });
}

if (clock) {
  clock.addEventListener('click', function () {
    setTimeMenuOpen(true, false);
  });

  clock.addEventListener('input', updateSelectedOption);

  clock.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowDown' || event.key === 'Enter') {
      event.preventDefault();
      setTimeMenuOpen(true, true);
    } else if (event.key === 'Escape') {
      setTimeMenuOpen(false, false);
    }
  });
}

if (timeMenu) {
  timeMenu.addEventListener('keydown', function (event) {
    const currentIndex = timeOptions.indexOf(document.activeElement);
    let target = null;

    if (event.key === 'ArrowDown') {
      target = timeOptions[(currentIndex + 1) % timeOptions.length];
    } else if (event.key === 'ArrowUp') {
      target = timeOptions[(currentIndex - 1 + timeOptions.length) % timeOptions.length];
    } else if (event.key === 'Home') {
      target = timeOptions[0];
    } else if (event.key === 'End') {
      target = timeOptions[timeOptions.length - 1];
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setTimeMenuOpen(false, false);
      if (clock) {
        clock.focus();
      }
      return;
    } else if (event.key === 'Tab') {
      setTimeMenuOpen(false, false);
      return;
    } else {
      return;
    }

    event.preventDefault();
    target.focus();
  });
}

timeOptions.forEach(function (option) {
  option.addEventListener('click', function () {
    chooseTime(option);
  });
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && timeMenu && timeMenu.style.display === 'flex') {
    setTimeMenuOpen(false, false);
    if (arr) {
      arr.focus();
    }
  }
});

const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.history.back();
  });
}

if (window.wizard) {
  window.wizard.initStep({
    buttonId: 'prochaine',
    inputId: 'clock',
    url: '/time',
    next: '/publier/people',
    invalidMessage: 'Heure invalide, réessayez.',
  });
}
