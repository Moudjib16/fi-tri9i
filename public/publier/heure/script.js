const clock = document.getElementById('clock');
const timeOptions = document.querySelectorAll('.time-option');
const arr = document.getElementById('arr');
const white = document.getElementById('white');
const prix = document.getElementById('prix');

function setTimeMenuOpen(open) {
  if (!white || !prix || !arr || !clock) {
    return;
  }
  prix.style.display = open ? 'flex' : 'none';
  white.style.display = open ? 'flex' : 'none';
  arr.style.rotate = open ? '180deg' : '0deg';
  arr.setAttribute('aria-expanded', String(open));
}

function toggleTimeMenu() {
  if (!white) {
    return;
  }
  setTimeMenuOpen(white.style.display !== 'flex');
}

if (arr) {
  arr.addEventListener('click', toggleTimeMenu);
}

if (white) {
  white.addEventListener('click', function () {
    setTimeMenuOpen(false);
  });
}

document.addEventListener('keydown', function (event) {
  if (event.key === 'Escape' && white && white.style.display === 'flex') {
    setTimeMenuOpen(false);
    arr.focus();
  }
});

timeOptions.forEach(function (option) {
  option.addEventListener('click', function () {
    if (clock) {
      clock.value = option.innerText;
    }
    setTimeMenuOpen(false);
  });
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
