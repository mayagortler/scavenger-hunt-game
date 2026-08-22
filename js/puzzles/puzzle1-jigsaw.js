// js/puzzles/puzzle1-jigsaw.js
import { renderSpeechBubble } from '../speechBubble.js';
import { shuffle } from '../shuffle.js';

export function checkTextAnswers({ first, second, third }) {
  const normalize = (s) => (s || '').trim().toLowerCase();
  return normalize(first) === 'berlin' && normalize(second) === 'germany' && normalize(third) === 'beer';
}

export function createJigsawPieces(size = 25) {
  return Array.from({ length: size }, (_, id) => ({ id, correctSlot: id, currentSlot: null }));
}

export function placePiece(pieces, pieceId, slot) {
  return pieces.map((p) => {
    if (p.id === pieceId) return { ...p, currentSlot: slot };
    // Bump whatever piece already occupied this slot back to the tray, so no
    // two pieces can ever claim the same slot (same swap-safety as puzzle 4).
    if (p.currentSlot === slot) return { ...p, currentSlot: null };
    return p;
  });
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
// Must match .jigsaw-piece / .jigsaw-slot in css/style.css, and GRID_SIZE *
// PIECE_SIZE_PX must equal .jigsaw-piece's background-size.
const PIECE_SIZE_PX = 60;

export function initPuzzle1(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-jorge.jpeg',
    characterName: 'חורחה',
    text: INTRO_TEXT,
    buttonLabel: 'ואמוס',
    onAdvance: () => {
      renderSpeechBubble(dialogueEl, {
        characterImage: 'assets/images/char-jorge.jpeg',
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
    // Tray layout order is scrambled; each piece keeps its own correctSlot.
    let pieces = shuffle(createJigsawPieces(PIECE_COUNT));

    const puzzleEl = document.createElement('div');
    puzzleEl.className = 'jigsaw-puzzle';
    container.appendChild(puzzleEl);

    const frame = document.createElement('div');
    frame.className = 'jigsaw-frame';
    frame.style.display = 'grid';
    frame.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${PIECE_SIZE_PX}px)`;

    const slotEls = [];
    for (let slot = 0; slot < PIECE_COUNT; slot++) {
      const cell = document.createElement('div');
      cell.className = 'jigsaw-slot';
      cell.dataset.slot = String(slot);
      cell.addEventListener('dragover', (e) => e.preventDefault());
      cell.addEventListener('drop', (e) => {
        e.preventDefault();
        const pieceId = Number(e.dataTransfer.getData('text/plain'));
        pieces = placePiece(pieces, pieceId, slot);
        renderAll();
      });
      slotEls.push(cell);
      frame.appendChild(cell);
    }

    const tray = document.createElement('div');
    tray.className = 'jigsaw-tray';
    // Dropping a piece back here takes it out of the frame again.
    tray.addEventListener('dragover', (e) => e.preventDefault());
    tray.addEventListener('drop', (e) => {
      e.preventDefault();
      const pieceId = Number(e.dataTransfer.getData('text/plain'));
      pieces = pieces.map((p) => (p.id === pieceId ? { ...p, currentSlot: null } : p));
      renderAll();
    });

    function buildPieceEl(piece) {
      const pieceEl = document.createElement('div');
      pieceEl.className = 'jigsaw-piece';
      pieceEl.draggable = true;
      pieceEl.style.backgroundImage = "url('assets/images/puzzle1-jigsaw-target.jpeg')";
      const row = Math.floor(piece.correctSlot / GRID_SIZE);
      const col = piece.correctSlot % GRID_SIZE;
      pieceEl.style.backgroundPosition = `-${col * PIECE_SIZE_PX}px -${row * PIECE_SIZE_PX}px`;
      pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(piece.id));
      });
      return pieceEl;
    }

    // Re-render frame and tray from `pieces` so the DOM can never disagree with
    // the model: a piece is drawn in exactly one place (its slot if currentSlot
    // is set, the tray otherwise). Before this the drop handler only updated the
    // array, so the frame stayed empty and the tray stayed full no matter what
    // the player did — the very first interaction in the game looked broken.
    function renderAll() {
      slotEls.forEach((slotEl, slot) => {
        slotEl.innerHTML = '';
        const piece = pieces.find((p) => p.currentSlot === slot);
        if (piece) slotEl.appendChild(buildPieceEl(piece));
      });

      tray.innerHTML = '';
      pieces
        .filter((p) => p.currentSlot === null)
        .forEach((piece) => tray.appendChild(buildPieceEl(piece)));
    }

    renderAll();

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
          characterImage: 'assets/images/char-jorge.jpeg',
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
