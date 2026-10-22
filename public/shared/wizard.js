(function () {
  function errorBox() {
    return document.getElementById('wizard-error');
  }

  function clearError() {
    const box = errorBox();
    if (box) {
      box.hidden = true;
      box.textContent = '';
    }
  }

  function showError(message) {
    const box = errorBox();
    if (!box) {
      return;
    }
    box.textContent = message;
    box.hidden = false;
  }

  function initStep(options) {
    const button = document.getElementById(options.buttonId);
    if (!button) {
      return;
    }

    button.addEventListener('click', async function () {
      clearError();

      const input = options.inputId ? document.getElementById(options.inputId) : null;
      const content = options.getContent ? options.getContent() : input && input.value;

      if (typeof content !== 'string') {
        showError(options.invalidMessage);
        return;
      }

      const csrfMeta = document.querySelector('meta[name="csrf-token"]');

      try {
        const response = await fetch(options.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfMeta ? csrfMeta.content : '',
          },
          body: JSON.stringify({ content }),
        });

        if (response.ok) {
          window.location.href = options.next;
        } else {
          let message = options.invalidMessage;
          try {
            const payload = await response.json();
            if (payload && payload.message) {
              message = payload.message;
            }
          } catch {
            // Keep the generic message when the server did not return JSON.
          }
          showError(message);
        }
      } catch (error) {
        console.error('Error:', error);
        showError('Erreur réseau, réessayez.');
      }
    });
  }

  window.wizard = { clearError, showError, initStep };
})();
