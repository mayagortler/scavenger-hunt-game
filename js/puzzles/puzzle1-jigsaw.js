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
  // Reassigned once renderPuzzle() actually runs (after the intro speech is
  // dismissed) — the dev toolbar's "פתור" button reads this indirectly via
  // the returned handle below, so it always calls whatever is current.
  let devSolveImpl = null;

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-jorge.jpeg',
    characterName: 'חורחה',
    panelLeft: '17vw',
    text: INTRO_TEXT,
    buttonLabel: 'ואמוס',
    onAdvance: () => {
      renderSpeechBubble(dialogueEl, {
        characterImage: 'assets/images/char-jorge.jpeg',
        characterName: 'חורחה',
        panelLeft: '17vw',
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
    // Click-to-place: click a piece (tray or already-placed) to select it,
    // then click a slot to move it there — an alternative to drag-and-drop.
    let selectedPieceId = null;

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
      cell.addEventListener('click', () => {
        if (selectedPieceId === null) return;
        pieces = placePiece(pieces, selectedPieceId, slot);
        selectedPieceId = null;
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
      if (piece.id === selectedPieceId) pieceEl.classList.add('selected');
      pieceEl.draggable = true;
      pieceEl.style.backgroundImage = "url('assets/images/puzzle1-jigsaw-target.jpeg')";
      const row = Math.floor(piece.correctSlot / GRID_SIZE);
      // The frame is inside a dir="rtl" page, so CSS Grid places column 0 on
      // the right (same issue as puzzle 4's QR sprite) — mirror which slice
      // of the source photo a piece shows, or the assembled picture comes
      // out horizontally flipped even when every piece is "correctly" placed.
      const col = (GRID_SIZE - 1) - (piece.correctSlot % GRID_SIZE);
      pieceEl.style.backgroundPosition = `-${col * PIECE_SIZE_PX}px -${row * PIECE_SIZE_PX}px`;
      pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', String(piece.id));
      });
      pieceEl.addEventListener('click', (e) => {
        // Stop this from also reaching the slot it might be sitting in — a
        // click on an already-placed piece must only (de)select it, not
        // immediately "place the selection" into its own slot.
        e.stopPropagation();
        selectedPieceId = selectedPieceId === piece.id ? null : piece.id;
        renderAll();
      });
      return pieceEl;
    }

    // Answers are only relevant once the picture itself is assembled — showing
    // them from the start invites guessing the code without solving the jigsaw.
    const answersEl = document.createElement('div');
    answersEl.className = 'jigsaw-answers';
    answersEl.hidden = true;

    const answersRow = document.createElement('div');
    answersRow.className = 'jigsaw-answers-row';
    const inputs = [0, 1, 2].map(() => {
      const item = document.createElement('div');
      item.className = 'jigsaw-answer-item';
      const hash = document.createElement('span');
      hash.className = 'jigsaw-hash';
      hash.textContent = '#';
      const input = document.createElement('input');
      input.type = 'text';
      item.appendChild(hash);
      item.appendChild(input);
      answersRow.appendChild(item);
      return input;
    });
    answersEl.appendChild(answersRow);

    const feedbackEl = document.createElement('p');
    feedbackEl.className = 'answer-feedback';
    inputs.forEach((input) => input.addEventListener('input', () => {
      feedbackEl.textContent = '';
      answersEl.classList.remove('wrong');
    }));

    // Re-render frame and tray from `pieces` so the DOM can never disagree with
    // the model: a piece is drawn in exactly one place (its slot if currentSlot
    // is set, the tray otherwise). Also re-evaluates whether the picture is
    // fully assembled, to reveal the answers section only once it is.
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

      answersEl.hidden = !isJigsawComplete(pieces);
    }

    renderAll();

    // Dev-only shortcut: snap every piece into its correct slot (revealing
    // the answers section, same as actually assembling it) and pre-fill the
    // correct answers, without touching the "בדוק" click itself — that stays
    // a manual step so the check/outro flow still gets exercised for real.
    devSolveImpl = () => {
      pieces = pieces.map((p) => ({ ...p, currentSlot: p.correctSlot }));
      selectedPieceId = null;
      renderAll();
      inputs[0].value = 'Berlin';
      inputs[1].value = 'Germany';
      inputs[2].value = 'Beer';
    };

    puzzleEl.appendChild(frame);
    puzzleEl.appendChild(tray);

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
          panelLeft: '17vw',
          text: OUTRO_TEXT,
          buttonLabel: 'המשך',
          onAdvance: () => onSolved?.(),
        });
        container.appendChild(dialogueEl);
      } else {
        feedbackEl.textContent = 'לא נכון, נסו שוב';
        // Restart the shake animation even on repeated wrong guesses: removing
        // the class, forcing a reflow, then re-adding is what makes a CSS
        // animation replay — just re-adding an already-present class is a no-op.
        answersEl.classList.remove('wrong');
        void answersEl.offsetWidth;
        answersEl.classList.add('wrong');
      }
    });
    answersEl.appendChild(checkButton);
    answersEl.appendChild(feedbackEl);
    container.appendChild(answersEl);
  }

  return {
    devSolve: () => devSolveImpl?.(),
  };
}
