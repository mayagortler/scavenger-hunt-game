// js/puzzles/puzzle1-jigsaw.js
import { renderSpeechBubble } from '../speechBubble.js';

export function checkTextAnswers({ first, second, third }) {
  const normalize = (s) => (s || '').trim().toLowerCase();
  return normalize(first) === 'berlin' && normalize(second) === 'germany' && normalize(third) === 'beer';
}

export function createJigsawPieces(size = 25) {
  return Array.from({ length: size }, (_, id) => ({ id, correctSlot: id, currentSlot: null }));
}

export function placePiece(pieces, pieceId, slot) {
  return pieces.map((p) => (p.id === pieceId ? { ...p, currentSlot: slot } : p));
}

export function isJigsawComplete(pieces) {
  return pieces.every((p) => p.currentSlot === p.correctSlot);
}

const INTRO_TEXT =
  "הולה מוצ'אצ'וס! אני חורחה, וברוכין הבאין לתחנה הראשונה של המשחק – העמק 26! אוֹלֶה! " +
  'במהלך המשחק תפתרו חידות ותעברו בין תחנות כדי לגלות את הקוד שיפתח את התיק שלפניכם. קלארו?';

const RULES_TEXT =
  'שני דברים לפני שמתחילים:\n' +
  'אונו! את המעבר בין התחנות תעשו באמצעות המפה שנמצאת בכפתור למטה.\n' +
  'דוס! בשביל לפתור חלק מהחידות תצטרכו להיעזר בטלפונים שלכם. איי קראמבה!\n' +
  'אמיגוס, מוכנין לחידה הראשונה?';

const OUTRO_TEXT =
  "מוי ביין מוצ'אצ'וס! מכאן אתם ממשיכים לתחנה הבאה שלכם: המקום שבו כולכם נפגשתם לראשונה. אדיוס!";

const PIECE_COUNT = 25;
const GRID_SIZE = 5; // 5x5

export function initPuzzle1(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-jorge.png',
    characterName: 'חורחה',
    text: INTRO_TEXT,
    buttonLabel: 'ואמוס',
    onAdvance: () => {
      renderSpeechBubble(dialogueEl, {
        characterImage: 'assets/images/char-jorge.png',
        characterName: 'חורחה',
        text: RULES_TEXT,
        buttonLabel: 'סי סניור',
        onAdvance: () => {
          dialogueEl.remove();
          renderPuzzle();
        },
      });
    },
  });

  function renderPuzzle() {
    let pieces = createJigsawPieces(PIECE_COUNT);

    const puzzleEl = document.createElement('div');
    puzzleEl.className = 'jigsaw-puzzle';
    container.appendChild(puzzleEl);

    const frame = document.createElement('div');
    frame.className = 'jigsaw-frame';
    frame.style.display = 'grid';
    frame.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 60px)`;
    for (let slot = 0; slot < PIECE_COUNT; slot++) {
      const cell = document.createElement('div');
      cell.className = 'jigsaw-slot';
      cell.dataset.slot = String(slot);
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const pieceId = Number(e.dataTransfer.getData('text/plain'));
        pieces = placePiece(pieces, pieceId, slot);
      });
      frame.appendChild(cell);
    }

    const tray = document.createElement('div');
    tray.className = 'jigsaw-tray';
    for (const piece of pieces) {
      const pieceEl = document.createElement('div');
      pieceEl.className = 'jigsaw-piece';
      pieceEl.draggable = true;
      pieceEl.style.backgroundImage = "url('assets/images/puzzle1-jigsaw-target.jpeg')";
      const row = Math.floor(piece.correctSlot / GRID_SIZE);
      const col = piece.correctSlot % GRID_SIZE;
      pieceEl.style.backgroundPosition = `-${col * 60}px -${row * 60}px`;
      pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(piece.id));
      });
      tray.appendChild(pieceEl);
    }

    puzzleEl.appendChild(frame);
    puzzleEl.appendChild(tray);

    const answersEl = document.createElement('div');
    answersEl.className = 'jigsaw-answers';
    const labels = ['#', '#', '#'];
    const inputs = labels.map(() => {
      const input = document.createElement('input');
      input.type = 'text';
      answersEl.appendChild(document.createTextNode('# '));
      answersEl.appendChild(input);
      return input;
    });
    const checkButton = document.createElement('button');
    checkButton.textContent = 'בדוק';
    checkButton.addEventListener('click', () => {
      const answers = { first: inputs[0].value, second: inputs[1].value, third: inputs[2].value };
      if (checkTextAnswers(answers)) {
        answersEl.classList.add('solved');
        puzzleEl.remove();
        answersEl.remove();
        renderSpeechBubble(dialogueEl, {
          characterImage: 'assets/images/char-jorge.png',
          characterName: 'חורחה',
          text: OUTRO_TEXT,
          buttonLabel: 'המשך',
          onAdvance: () => onSolved?.(),
        });
        container.appendChild(dialogueEl);
      }
    });
    answersEl.appendChild(checkButton);
    container.appendChild(answersEl);
  }
}
