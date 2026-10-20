const plusButton = document.getElementById('pluss');
const minusButton = document.getElementById('minuss');
const priceInput = document.getElementById('prix');

const MIN_PRICE = 100;
const MAX_PRICE = 4000;
const STEP = 100;

function currentPrice() {
  const value = parseInt(priceInput.value, 10);
  return Number.isNaN(value) ? MIN_PRICE : value;
}

function renderPrice(value) {
  const normalized = Math.min(MAX_PRICE, Math.max(MIN_PRICE, value));
  priceInput.value = `${normalized}da`;
  if (normalized > 900) {
    priceInput.style.color = '#e05457';
    priceInput.style.width = '280px';
  } else if (normalized > 400) {
    priceInput.style.color = 'green';
    priceInput.style.width = '220px';
  } else {
    priceInput.style.color = 'black';
    priceInput.style.width = '220px';
  }
}

if (priceInput) {
  priceInput.addEventListener('input', function () {
    renderPrice(currentPrice());
  });
}

if (plusButton) {
  plusButton.addEventListener('click', function () {
    renderPrice(currentPrice() + STEP);
  });
}

if (minusButton) {
  minusButton.addEventListener('click', function () {
    renderPrice(currentPrice() - STEP);
  });
}

const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.history.back();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const btn8 = document.getElementById('btn8');
  if (btn8) {
    btn8.style.backgroundColor = '#0082AE';
  }
  if (priceInput) {
    renderPrice(currentPrice());
  }
});
