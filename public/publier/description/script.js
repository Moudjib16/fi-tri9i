const precedentButton = document.getElementById('precedent');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.history.back();
  });
}

document.addEventListener('DOMContentLoaded', function () {
  const btn9 = document.getElementById('btn9');
  if (btn9) {
    btn9.style.backgroundColor = '#0082AE';
  }
});
