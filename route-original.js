// Preserve old shared game-room bookmarks while directing players to the original.
(() => {
  const q=new URLSearchParams(location.search);
  if(q.get('game')==='commando')location.replace('mslug.html?v=original1');
  if(q.get('game')==='warriors')location.replace('wof.html?v=original1');
})();
