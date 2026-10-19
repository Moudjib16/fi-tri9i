(function () {
  const arrow = document.getElementById('arrow');
  const menu = document.getElementById('menu');

  if (!arrow || !menu) {
    return;
  }

  let visible = false;

  arrow.addEventListener('click', function () {
    visible = !visible;
    menu.style.display = visible ? 'flex' : 'none';
    arrow.style.rotate = visible ? '180deg' : '0deg';
  });
})();
