const plusButton = document.getElementById('pluss');
const minusButton = document.getElementById('minuss');
const priceInput = document.getElementById('prix');

const MIN_PRICE = 100;
const MAX_PRICE = 100000;
const STEP = 100;

function currentPrice() {
  const value = parseInt(priceInput.value, 10);
  return Number.isNaN(value) ? MIN_PRICE : value;
}

function renderPrice(value) {
  const normalized = Math.min(MAX_PRICE, Math.max(MIN_PRICE, value));
  priceInput.value = `${normalized}da`;
  priceInput.dataset.tone = normalized > 900 ? 'high' : normalized > 400 ? 'mid' : 'low';
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
  if (priceInput) {
    renderPrice(currentPrice());
  }
});
