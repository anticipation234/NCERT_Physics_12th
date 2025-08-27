document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('video-overlay');
  const toggle = document.getElementById('toggleVideo');

  if (toggle && overlay) {
    toggle.addEventListener('change', () => {
      overlay.classList.toggle('is-visible', toggle.checked);
    });
  }
});
