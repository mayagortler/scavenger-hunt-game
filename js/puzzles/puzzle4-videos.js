// js/puzzles/puzzle4-videos.js
import { renderSpeechBubble } from '../speechBubble.js';
import { shuffle } from '../shuffle.js';

// Updated links (2026-08-23): the two originally-TikTok videos now have
// YouTube mirrors, so all six are plain YouTube links.
export const VIDEO_ORDER = [
  'https://www.youtube.com/watch?v=ooOELrGMn14',
  'https://www.youtube.com/shorts/qpmFnUTkpL0',
  'https://www.youtube.com/watch?v=fWKB8zdVM-U',
  'https://www.youtube.com/watch?v=9sh2SwfuO44',
  'https://www.youtube.com/shorts/4vLgHdSVBdI',
  'https://www.youtube.com/shorts/w03oC4C8IkY',
];

export function extractYouTubeId(url) {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([\w-]+)/);
  if (shortsMatch) return shortsMatch[1];
  const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = url.match(/[?&]v=([\w-]+)/);
  if (watchMatch) return watchMatch[1];
  return null;
}

export function youtubeThumbnailUrl(videoId) {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

export function cardFrontImage(url) {
  const id = extractYouTubeId(url);
  return id ? youtubeThumbnailUrl(id) : null;
}

export function getEmbedInfo(url) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) return { type: 'youtube', id: youtubeId };
  return null;
}

export function createVideoCards() {
  return VIDEO_ORDER.map((url, index) => ({ id: index, url, correctSlot: index, currentSlot: null, flipped: false }));
}

export function isVideoOrderSolved(cards) {
  return cards.every((c) => c.currentSlot === c.correctSlot && c.flipped);
}

const INTRO_TEXT =
  'בנות, חיכיתם כל השנה לחידה מספר ארבע. בחידה הזו אתם צריכות לסדר את הסרטונים בסדר כרונולוגי. כרונולוגי! ' +
  'תעשו את זה לאט, בסדר, תעשו את זה מהר, גם בסדר, עד 12, תעשו את זה אחרי 12 אני לא פה. ' +
  'אם תעשו את זה נכון, תגלו את הרמז לתחנה הבאה שלכם, באספקה מיידית. לא מחר, לא עוד שבוע, אספקה מיידית. בהצלחה!';

function openVideoModal(url) {
  const info = getEmbedInfo(url);
  if (!info) {
    // Nothing we know how to embed — fall back to opening it externally.
    window.open(url, '_blank', 'noopener');
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'video-modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const modal = document.createElement('div');
  modal.className = 'video-modal';

  const closeButton = document.createElement('button');
  closeButton.className = 'video-modal-close';
  closeButton.textContent = '✕';
  closeButton.addEventListener('click', () => overlay.remove());
  modal.appendChild(closeButton);

  const iframe = document.createElement('iframe');
  iframe.className = 'video-modal-iframe';
  iframe.src = `https://www.youtube.com/embed/${info.id}?autoplay=1`;
  iframe.allow = 'autoplay; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  modal.appendChild(iframe);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
}

const GRID_COLS = 3;
const GRID_ROWS = 2;
// Must match .video-slot / .video-card in css/style.css: a 2:3 portrait cell so
// the assembled GRID_COLS x GRID_ROWS sprite is square.
const CELL_WIDTH_PX = 120;

export function initPuzzle4(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);
  let devSolveImpl = null;

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uri-tabibi.jpeg',
    characterName: 'אורי טביבי',
    panelLeft: '12vw',
    text: INTRO_TEXT,
    buttonLabel: '←',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    // Tray layout order is scrambled; each card keeps its own correctSlot.
    let cards = shuffle(createVideoCards());
    let advanced = false;

    const grid = document.createElement('div');
    grid.className = 'video-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, ${CELL_WIDTH_PX}px)`;

    const slotEls = [];
    for (let slot = 0; slot < 6; slot++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'video-slot';
      slotEl.dataset.slot = String(slot);
      slotEl.addEventListener('dragover', (e) => e.preventDefault());
      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const cardId = Number(e.dataTransfer.getData('text/plain'));
        handleDrop(cardId, slot);
      });
      slotEls.push(slotEl);
      grid.appendChild(slotEl);
    }

    const tray = document.createElement('div');
    tray.className = 'video-tray';

    function cardFace(card) {
      const face = document.createElement('div');
      face.className = 'video-card-face';
      if (card.flipped) {
        // 3x2 sprite crop of the assembled QR code via background-position (no build-time image cropping needed).
        // The grid is inside a dir="rtl" page, so CSS Grid places column 0 on the right — mirror the
        // sprite's column selection to match, or the reassembled QR is left-right flipped and won't scan.
        const col = (GRID_COLS - 1) - (card.correctSlot % GRID_COLS);
        const row = Math.floor(card.correctSlot / GRID_COLS);
        face.style.backgroundImage = "url('assets/images/puzzle4-qr-code.png')";
        face.style.backgroundSize = `${GRID_COLS * 100}% ${GRID_ROWS * 100}%`;
        face.style.backgroundPosition = `${(col / (GRID_COLS - 1)) * 100}% ${(row / (GRID_ROWS - 1)) * 100}%`;
      } else {
        const front = cardFrontImage(card.url);
        if (front) {
          face.style.backgroundImage = `url('${front}')`;
        } else {
          // Order-neutral placeholder: the old `card.id + 1` printed the card's
          // own correct slot number on its face, i.e. the answer.
          face.textContent = '▶';
          face.classList.add('video-card-placeholder');
        }
      }
      return face;
    }

    function buildCardEl(card) {
      const cardEl = document.createElement('div');
      cardEl.className = 'video-card';
      cardEl.draggable = true;
      cardEl.appendChild(cardFace(card));
      cardEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(card.id));
      });
      cardEl.addEventListener('click', (e) => {
        // e.detail is 0 for programmatic/synthetic clicks (e.g. el.click() calls in tests);
        // real pointer clicks always report detail >= 1. This just keeps test-triggered
        // .click() calls from opening a new tab during automated checks.
        if (e.detail === 0) return;
        openVideoModal(card.url);
      });
      return cardEl;
    }

    // Re-render both the tray and the slots from `cards` state so the DOM can never
    // disagree with the model: a card is drawn in exactly one place (its slot if
    // `currentSlot` is set, the tray otherwise), including after drops, bumps, and flips.
    function renderAll() {
      slotEls.forEach((slotEl, slot) => {
        slotEl.innerHTML = '';
        const card = cards.find((c) => c.currentSlot === slot);
        if (card) {
          slotEl.appendChild(buildCardEl(card));
          return;
        }
        // Empty slots show their 1-based position. The page is RTL so the grid
        // flows right-to-left and "first" is not obviously the top-left cell.
        const numberEl = document.createElement('span');
        numberEl.className = 'video-slot-number';
        numberEl.textContent = String(slot + 1);
        slotEl.appendChild(numberEl);
      });

      tray.innerHTML = '';
      cards
        .filter((c) => c.currentSlot === null)
        .forEach((card) => tray.appendChild(buildCardEl(card)));

      // Toggled, not just added: the flip button can un-flip a solved board,
      // which must drop the green frame and bring the gutters/borders back.
      const solved = isVideoOrderSolved(cards);
      grid.classList.toggle('solved', solved);
      if (solved && !advanced) {
        advanced = true;
        // Marks progress (map pin turns green) without leaving this screen —
        // the group can keep looking at / scanning the assembled QR code,
        // and returns to the map themselves via the persistent map button.
        onSolved?.();
      }
    }

    function handleDrop(cardId, slot) {
      cards = cards.map((c) => {
        if (c.id === cardId) return { ...c, currentSlot: slot };
        // Bump whatever card previously occupied this slot back to the tray.
        if (c.currentSlot === slot) return { ...c, currentSlot: null };
        return c;
      });
      renderAll();
    }

    renderAll();

    const flipButton = document.createElement('button');
    flipButton.className = 'puzzle-action-button';
    flipButton.textContent = 'הפוך';
    flipButton.addEventListener('click', () => {
      cards = cards.map((c) => ({ ...c, flipped: !c.flipped }));
      renderAll();
    });

    container.appendChild(grid);
    container.appendChild(tray);
    container.appendChild(flipButton);

    // Dev-only shortcut: place and flip every card at once.
    devSolveImpl = () => {
      cards = cards.map((c) => ({ ...c, currentSlot: c.correctSlot, flipped: true }));
      renderAll();
    };
  }

  return {
    devSolve: () => devSolveImpl?.(),
  };
}
