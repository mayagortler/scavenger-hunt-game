// js/puzzles/puzzle2-crossword.js
import { renderSpeechBubble } from '../speechBubble.js';

// Transcribed verbatim from the source doc's crossword table (see
// docs/superpowers/specs/source/game-description.txt). null = blocked cell.
export const CROSSWORD_GRID = [
  [{ letter: 'פ', clueNumber: 1 }, { letter: 'ל' }, { letter: 'י' }, { letter: 'ק' }, { letter: 'י' }, { letter: 'מ' }, { letter: 'ש' }, { letter: 'ו' }, { letter: 'ב' }, { letter: 'ב' }, { letter: 'י' }, { letter: 'מ' }],
  [null, null, null, null, null, { letter: 'א', clueNumber: 2 }, { letter: 'י' }, { letter: 'ת' }, { letter: 'נ' }, null, null, null],
  [null, null, null, null, null, { letter: 'ק', clueNumber: 3 }, { letter: 'ו' }, { letter: 'ט' }, { letter: 'ג' }, null, null, null],
  [null, null, null, null, { letter: 'ר', clueNumber: 4 }, { letter: 'ו' }, { letter: 'ק' }, { letter: 'ח' }, { letter: 'ו' }, { letter: 'ת' }, null, null],
  [null, null, null, { letter: 'כ', clueNumber: 5 }, { letter: 'מ' }, { letter: 'ה' }, { letter: 'ח' }, { letter: 'ב' }, { letter: 'ר' }, { letter: 'י' }, { letter: 'מ' }, null],
  [null, null, null, null, null, null, { letter: 'ש', clueNumber: 6 }, { letter: 'נ' }, { letter: 'י' }, { letter: 'צ' }, { letter: 'ל' }, null],
  [null, null, null, null, null, { letter: 'ע', clueNumber: 7 }, { letter: 'ד' }, { letter: 'כ' }, { letter: 'ו' }, { letter: 'נ' }, null, null],
  [null, { letter: 'נ', clueNumber: 8 }, { letter: 'ד' }, { letter: 'ב' }, { letter: 'ז' }, { letter: 'ל' }, { letter: 'צ' }, { letter: 'מ' }, { letter: 'נ' }, null, null, null],
];

export const CLUES = [
  { number: 1, text: 'איך קראו לקבוצת הווטסאפ של החיילים?', image: null },
  { number: 2, text: 'מי שלח את הודעת השחרור הבאה?', image: 'assets/images/puzzle2-clue-2.jpeg' },
  { number: 3, text: 'על מי מדובר בהודעות הבאות?', image: 'assets/images/puzzle2-clue-3.jpeg' },
  { number: 4, text: 'מה למד ובמה עובד אליהו קוסמן?', image: null },
  { number: 5, text: 'איך קראו ללהקה של יונתן נבו?', image: null },
  { number: 6, text: 'מה המילה המוסתרת בהודעה הבאה?', image: 'assets/images/puzzle2-clue-6.jpeg' },
  { number: 7, text: 'מה המילה המוסתרת בהודעות הבאות?', image: 'assets/images/puzzle2-clue-7.jpeg' },
  { number: 8, text: 'מי עזב את הקבוצה בעקבות ההודעות האלה?', image: 'assets/images/puzzle2-clue-8.jpeg' },
];

export function createEmptyUserGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell ? '' : null)));
}

export function setCellLetter(userGrid, row, col, letter) {
  const next = userGrid.map((r) => [...r]);
  next[row][col] = (letter || '').slice(-1);
  return next;
}

export function isCrosswordSolved(userGrid, solutionGrid) {
  for (let r = 0; r < solutionGrid.length; r++) {
    for (let c = 0; c < solutionGrid[r].length; c++) {
      const solutionCell = solutionGrid[r][c];
      if (solutionCell === null) continue;
      if ((userGrid[r][c] || '').trim() !== solutionCell.letter) return false;
    }
  }
  return true;
}

const INTRO_TEXT =
  'היי; התגעגעתם אליי? כן. החידה הבאה. שאלות; השלמת מילים מהווצאפ. למלא בתשבץ. לפתור נכון – ג ר מ נ י ה. בהצלחה.';

export function initPuzzle2(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-avi-boaz.png',
    characterName: 'אבי בועז',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let userGrid = createEmptyUserGrid(CROSSWORD_GRID);

    const wrapper = document.createElement('div');
    wrapper.className = 'crossword-wrapper';

    const clueText = document.createElement('div');
    clueText.className = 'crossword-clue-text';

    const grid = document.createElement('div');
    grid.className = 'crossword-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${CROSSWORD_GRID[0].length}, 36px)`;

    CROSSWORD_GRID.forEach((row, r) => {
      row.forEach((cell, c) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'crossword-cell';
        if (!cell) {
          cellEl.classList.add('blocked');
          grid.appendChild(cellEl);
          return;
        }
        if (cell.clueNumber) {
          const numberEl = document.createElement('span');
          numberEl.className = 'crossword-clue-number';
          numberEl.textContent = String(cell.clueNumber);
          numberEl.addEventListener('click', () => {
            const clue = CLUES.find((cl) => cl.number === cell.clueNumber);
            clueText.innerHTML = '';
            const p = document.createElement('p');
            p.textContent = clue.text;
            clueText.appendChild(p);
            if (clue.image) {
              const img = document.createElement('img');
              img.src = clue.image;
              img.className = 'crossword-clue-image';
              clueText.appendChild(img);
            }
          });
          cellEl.appendChild(numberEl);
        }
        const input = document.createElement('input');
        input.maxLength = 2; // allow the numberEl + a following keystroke; letter logic below extracts last char
        input.className = 'crossword-input';
        input.addEventListener('input', () => {
          userGrid = setCellLetter(userGrid, r, c, input.value);
          input.value = userGrid[r][c];
          if (isCrosswordSolved(userGrid, CROSSWORD_GRID)) {
            grid.classList.add('solved');
          }
        });
        cellEl.appendChild(input);
        grid.appendChild(cellEl);
      });
    });

    wrapper.appendChild(clueText);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    // Solved-state watcher so onSolved fires once, from outside the per-cell handler above.
    const observer = new MutationObserver(() => {
      if (grid.classList.contains('solved')) {
        observer.disconnect();
        onSolved?.();
      }
    });
    observer.observe(grid, { attributes: true, attributeFilter: ['class'] });
  }
}
