(function () {
  const profileToggle = document.getElementById('menu-toggle');
  const profileMenu = document.getElementById('menu');
  const mobileToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  function setProfileOpen(open) {
    if (!profileToggle || !profileMenu) {
      return;
    }
    profileMenu.hidden = !open;
    profileToggle.setAttribute('aria-expanded', String(open));
    profileToggle.setAttribute('aria-label', open ? 'Fermer le menu du compte' : 'Ouvrir le menu du compte');
  }

  if (profileToggle && profileMenu) {
    profileToggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setProfileOpen(profileMenu.hidden);
    });

    document.addEventListener('click', function (event) {
      if (!profileMenu.hidden && !profileMenu.contains(event.target) && !profileToggle.contains(event.target)) {
        setProfileOpen(false);
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !profileMenu.hidden) {
        setProfileOpen(false);
        profileToggle.focus();
      }
    });
  }

  if (mobileToggle && navLinks) {
    function closeMobileNav() {
      navLinks.classList.remove('is-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Ouvrir la navigation');
    }

    mobileToggle.addEventListener('click', function () {
      const open = navLinks.classList.toggle('is-open');
      mobileToggle.setAttribute('aria-expanded', String(open));
      mobileToggle.setAttribute('aria-label', open ? 'Fermer la navigation' : 'Ouvrir la navigation');
    });

    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileNav);
    });

    document.addEventListener('click', function (event) {
      if (navLinks.classList.contains('is-open') && !navLinks.contains(event.target) && !mobileToggle.contains(event.target)) {
        closeMobileNav();
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navLinks.classList.contains('is-open')) {
        closeMobileNav();
        mobileToggle.focus();
      }
    });
  }

  document.querySelectorAll('form[data-confirm]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!window.confirm(form.getAttribute('data-confirm'))) {
        event.preventDefault();
      }
    });
  });
})();
