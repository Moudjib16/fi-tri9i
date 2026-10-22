// Suggests the communes of the selected wilaya in the place inputs.
(function () {
  const wilayaInputs = document.querySelectorAll('[data-communes-for]');
  if (!wilayaInputs.length) {
    return;
  }

  let places = null;

  function normalize(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  function loadPlaces() {
    if (places) {
      return Promise.resolve(places);
    }
    return fetch('/api/places')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        places = data || {};
        return places;
      });
  }

  function fill(input) {
    const list = document.getElementById(input.getAttribute('data-communes-for'));
    if (!list) {
      return;
    }
    const communes = places[normalize(input.value)] || [];
    list.innerHTML = '';
    communes.forEach(function (commune) {
      const option = document.createElement('option');
      option.value = commune;
      list.appendChild(option);
    });
  }

  wilayaInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      loadPlaces()
        .then(function () {
          fill(input);
        })
        .catch(function () {
          // Suggestions are optional, the field stays free text.
        });
    });
  });
}());
