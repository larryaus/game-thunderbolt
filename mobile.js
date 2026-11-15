(() => {
  // In-app browser bars and the home indicator change the usable viewport.
  let pending = false;
  function fit() {
    pending = false;
    const height = window.visualViewport?.height || window.innerHeight;
    if (height > 0) document.documentElement.style.setProperty('--game-vh', `${Math.round(height)}px`);
  }
  function schedule() { if (!pending) { pending = true; requestAnimationFrame(fit); } }
  fit();
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
})();
