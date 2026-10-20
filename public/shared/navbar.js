(function () {
  const toggle = document.getElementById('menu-toggle');
  const arrow = document.getElementById('arrow');
  const menu = document.getElementById('menu');

  if (!toggle || !menu) {
    return;
  }

  let open = false;

  function setOpen(nextOpen) {
    open = nextOpen;
    menu.style.display = open ? 'flex' : 'none';
    if (arrow) {
      arrow.style.rotate = open ? '180deg' : '0deg';
    }
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }

  toggle.addEventListener('click', function (event) {
    event.stopPropagation();
    setOpen(!open);
  });

  document.addEventListener('click', function (event) {
    if (open && !menu.contains(event.target) && !toggle.contains(event.target)) {
      setOpen(false);
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && open) {
      setOpen(false);
      toggle.focus();
    }
  });
})();
