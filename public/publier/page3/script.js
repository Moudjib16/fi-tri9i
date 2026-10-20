document.addEventListener('DOMContentLoaded', function () {
  const btn1 = document.getElementById('btn1');
  const btn2 = document.getElementById('btn2');
  const btn3 = document.getElementById('btn3');

  if (btn3) {
    btn3.style.backgroundColor = '#0082AE';
  }
  if (btn1) {
    btn1.addEventListener('click', function () {
      window.location.href = '/publier/page1';
    });
  }
  if (btn2) {
    btn2.addEventListener('click', function () {
      window.location.href = '/publier/page2';
    });
  }
});

const precedentButton = document.getElementById('prec');
if (precedentButton) {
  precedentButton.addEventListener('click', function () {
    window.location.href = '/publier/page2';
  });
}
