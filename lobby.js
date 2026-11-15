(() => {
  const cards = [...document.querySelectorAll('.game-card')];
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
    let count = 0;
    cards.forEach(card => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; if (!card.hidden) count++; });
    document.querySelector('.collection-note').hidden = button.dataset.filter !== 'all';
    document.getElementById('game-count').textContent = `${count} GAMES / 即点即玩`;
  }));
  function updateBest() { document.querySelectorAll('[data-best]').forEach(el => { try { const value = Number(localStorage.getItem(el.dataset.best)) || 0; el.textContent = `BEST ${String(value).padStart(6, '0')}`; } catch { el.textContent = 'BEST —'; } }); }
  updateBest();
  window.addEventListener('pageshow', updateBest);
})();
