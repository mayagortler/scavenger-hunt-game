import { FINAL_STATION_IDS } from '../stations.js';
import { normalizeHebrewLetter } from './puzzle2-crossword.js';

export function allFinalStationsDiscovered(letterDiscoveries) {
  const discovered = new Set(letterDiscoveries.map((d) => d.stationId));
  return FINAL_STATION_IDS.every((id) => discovered.has(id));
}

// The 4 letters are collected in whatever order the group happens to visit
// the stations in, which rarely already spells the answer — the group has to
// rearrange the tiles themselves to reach it.
export const FINAL_TARGET_WORD = 'נועם';

export function createLetterTiles(letters) {
  return letters.split('').map((letter, i) => ({ id: i, letter, slot: i }));
}

// Swaps two tiles' positions (by id), immutably — the only move available,
// since every slot starts (and stays) filled with exactly one tile.
export function swapTiles(tiles, idA, idB) {
  const slotA = tiles.find((t) => t.id === idA)?.slot;
  const slotB = tiles.find((t) => t.id === idB)?.slot;
  if (slotA === undefined || slotB === undefined) return tiles;
  return tiles.map((t) => {
    if (t.id === idA) return { ...t, slot: slotB };
    if (t.id === idB) return { ...t, slot: slotA };
    return t;
  });
}

// Station data stores station6d's letter as plain 'מ' rather than the
// word-final form 'ם' (same non-final-form transcription as the crossword's
// source data) — normalized on both sides so "נועם" is reached regardless of
// which form either side happens to use.
export function tilesSpell(tiles, targetWord) {
  const spelled = [...tiles]
    .sort((a, b) => a.slot - b.slot)
    .map((t) => normalizeHebrewLetter(t.letter))
    .join('');
  return spelled === [...targetWord].map(normalizeHebrewLetter).join('');
}

export function renderFinalScreen(container, { finalLetters, onFinish }) {
  container.innerHTML = '';

  let tiles = createLetterTiles(finalLetters);
  let selectedId = null;
  let solved = false;

  const tilesEl = document.createElement('div');
  tilesEl.className = 'final-letters-puzzle';

  // Hidden until the group actually reaches "נועם" — the green tiles
  // themselves are the answer, so finishing is gated on solving, not just
  // on having collected all 4 letters.
  const finishButton = document.createElement('button');
  finishButton.textContent = 'סיום';
  finishButton.className = 'final-finish-button';
  finishButton.hidden = true;
  finishButton.addEventListener('click', () => onFinish?.());

  function renderTiles() {
    tilesEl.innerHTML = '';
    [...tiles]
      .sort((a, b) => a.slot - b.slot)
      .forEach((tile) => {
        const tileEl = document.createElement('button');
        tileEl.type = 'button';
        tileEl.className = 'final-letter-tile';
        tileEl.textContent = tile.letter;
        if (tile.id === selectedId) tileEl.classList.add('selected');
        if (solved) tileEl.classList.add('solved');
        tileEl.addEventListener('click', () => {
          if (solved) return;
          if (selectedId === null) {
            selectedId = tile.id;
          } else if (selectedId === tile.id) {
            selectedId = null;
          } else {
            tiles = swapTiles(tiles, selectedId, tile.id);
            selectedId = null;
            if (tilesSpell(tiles, FINAL_TARGET_WORD)) {
              solved = true;
              finishButton.hidden = false;
            }
          }
          renderTiles();
        });
        tilesEl.appendChild(tileEl);
      });
  }

  renderTiles();
  container.appendChild(tilesEl);
  container.appendChild(finishButton);
}
