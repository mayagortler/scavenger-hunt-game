// js/shuffle.js
// Fisher-Yates. Used by the drag-and-drop puzzles to scramble the order pieces
// are LAID OUT in their tray; each piece keeps its own correctSlot, so the
// answer is never changed — only the starting arrangement the player sees.
export function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
