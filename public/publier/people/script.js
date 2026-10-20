const plusButton = document.getElementById('pluss');
const minusButton = document.getElementById('minuss');
const placesInput = document.getElementById('prix');

const MAX_PLACES = 5;

function updateSeatColor() {
  if (!placesInput) {
    return;
  }
  const value = parseInt(placesInput.value, 10);
  if (Number.isNaN(value)) {
    placesInput.style.color = 'black';
  } else if (value > 3) {
    placesInput.style.color = '#e05457';
  } else if (value > 1) {
    placesInput.style.color = 'green';
  } else {
    placesInput.style.color = 'black';
  }
}

function updateSeatIcons(value) {
  const seats = Number.isInteger(value) ? value : 0;
  for (let i = 1; i <= MAX_PLACES; i += 1) {
    const icon = document.getElementById(`p${i}`);
    if (icon) {
      icon.style.display = i <= seats ? 'block' : 'none';
    }
  }
}

if (placesInput) {
  placesInput.addEventListener('input', function () {
    updateSeatColor();
    updateSeatIcons(parseInt(placesInput.value, 10));
  });
}

if (plusButton) {
  plusButton.addEventListener('click', function () {
    const value = parseInt(placesInput.value, 10);
    if (Number.isNaN(value) || value >= MAX_PLACES) {
      placesInput.value = Number.isNaN(value) ? 1 : value;
    } else {
      placesInput.value = value + 1;
    }
    updateSeatColor();
    updateSeatIcons(parseInt(placesInput.value, 10));
  });
}

if (minusButton) {
  minusButton.addEventListener('click', function () {
    const value = parseInt(placesInput.value, 10);
    if (Number.isNaN(value) || value <= 1) {
      placesInput.value = 1;
    } else {
      placesInput.value = value - 1;
    }
    updateSeatColor();
    updateSeatIcons(parseInt(placesInput.value, 10));
  });
}

const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.history.back();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const btn7 = document.getElementById('btn7');
  if (btn7) {
    btn7.style.backgroundColor = '#0082AE';
  }
  if (placesInput) {
    updateSeatColor();
    updateSeatIcons(parseInt(placesInput.value, 10));
  }
});
