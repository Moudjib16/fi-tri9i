document.addEventListener('DOMContentLoaded', function () {
  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');
  if (btn2) {
    btn2.style.backgroundColor = '#0082AE';
  }
  if (btn1) {
    btn1.addEventListener('click', function () {
      window.location.href = '/publier/page1';
    });
  }
});

const precedentButton = document.getElementById('prec');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.location.href = '/publier/page1';
  });
}
