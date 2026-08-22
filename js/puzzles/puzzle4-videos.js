// js/puzzles/puzzle4-videos.js
import { renderSpeechBubble } from '../speechBubble.js';

export const VIDEO_ORDER = [
  'https://share.google/nGTqH8IsAVXb0NTNg',
  'https://youtube.com/shorts/qpmFnUTkpL0?si=f15IZDMVppvTMd3j',
  'https://youtu.be/fWKB8zdVM-U?si=0T-qg7zOKwTDMK7H',
  'https://youtu.be/9sh2SwfuO44?si=l0Dx3XoRrD5fVpBt',
  'https://vt.tiktok.com/ZSVfQhqqe/',
  'https://vt.tiktok.com/ZSVUp7Gb8/',
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

const GRID_COLS = 3;
const GRID_ROWS = 2;

export function initPuzzle4(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uri-tabibi.jpeg',
    characterName: 'אורי טביבי',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let cards = createVideoCards();

    const grid = document.createElement('div');
    grid.className = 'video-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${GRID_COLS}, 160px)`;

    const slots = [];
    for (let slot = 0; slot < 6; slot++) {
      const slotEl = document.createElement('div');
      slotEl.className = 'video-slot';
      slotEl.dataset.slot = String(slot);
      slotEl.addEventListener('dragover', (e) => e.preventDefault());
      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        const cardId = Number(e.dataTransfer.getData('text/plain'));
        cards = cards.map((c) => (c.id === cardId ? { ...c, currentSlot: slot } : c));
        renderCardInSlot(cardId, slotEl);
      });
      slots.push(slotEl);
      grid.appendChild(slotEl);
    }

    const tray = document.createElement('div');
    tray.className = 'video-tray';

    function cardFace(card) {
      const face = document.createElement('div');
      face.className = 'video-card-face';
      if (card.flipped) {
        // 3x2 sprite crop of the assembled QR code via background-position (no build-time image cropping needed).
        const col = card.correctSlot % GRID_COLS;
        const row = Math.floor(card.correctSlot / GRID_COLS);
        face.style.backgroundImage = "url('assets/images/puzzle4-qr-code.png')";
        face.style.backgroundSize = `${GRID_COLS * 100}% ${GRID_ROWS * 100}%`;
        face.style.backgroundPosition = `${(col / (GRID_COLS - 1)) * 100}% ${(row / (GRID_ROWS - 1)) * 100}%`;
      } else {
        const front = cardFrontImage(card.url);
        if (front) {
          face.style.backgroundImage = `url('${front}')`;
        } else {
          face.textContent = String(card.id + 1);
          face.classList.add('video-card-placeholder');
        }
      }
      return face;
    }

    function renderCardInSlot(cardId, slotEl) {
      const card = cards.find((c) => c.id === cardId);
      slotEl.innerHTML = '';
      slotEl.appendChild(buildCardEl(card));
      if (isVideoOrderSolved(cards)) {
        grid.classList.add('solved');
        onSolved?.();
      }
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
        if (e.detail === 0) return; // ignore synthetic clicks from drag
        window.open(card.url, '_blank', 'noopener');
      });
      return cardEl;
    }

    for (const card of cards) {
      tray.appendChild(buildCardEl(card));
    }

    const flipButton = document.createElement('button');
    flipButton.textContent = 'הפוך';
    flipButton.addEventListener('click', () => {
      cards = cards.map((c) => ({ ...c, flipped: !c.flipped }));
      slots.forEach((slotEl) => {
        const slot = Number(slotEl.dataset.slot);
        const card = cards.find((c) => c.currentSlot === slot);
        if (card) {
          slotEl.innerHTML = '';
          slotEl.appendChild(buildCardEl(card));
        }
      });
      if (isVideoOrderSolved(cards)) {
        grid.classList.add('solved');
        onSolved?.();
      }
    });

    container.appendChild(grid);
    container.appendChild(tray);
    container.appendChild(flipButton);
  }
}
