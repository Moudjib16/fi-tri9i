const clock = document.getElementById('clock');
const timeOptions = document.querySelectorAll('.time-option');
const arr = document.getElementById('arr');
const white = document.getElementById('white');
const prix = document.getElementById('prix');

function toggleTimeMenu() {
  if (!white || !prix || !arr || !clock) {
    return;
  }
  const isOpen = prix.style.display === 'flex';
  prix.style.display = isOpen ? 'none' : 'flex';
  white.style.display = isOpen ? 'flex' : 'none';
  arr.style.rotate = isOpen ? '0deg' : '180deg';
  clock.style.backgroundColor = isOpen ? 'white' : '#E3F1F6';
}

if (arr) {
  arr.addEventListener('click', toggleTimeMenu);
}

timeOptions.forEach(function (option) {
  option.addEventListener('click', function () {
    if (clock) {
      clock.value = option.innerText;
    }
    toggleTimeMenu();
  });
});

const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.history.back();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const btn6 = document.getElementById('btn6');
  if (btn6) {
    btn6.style.backgroundColor = '#0082AE';
  }
});
