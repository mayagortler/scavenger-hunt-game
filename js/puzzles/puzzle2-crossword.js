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

// The source doc's table writes several word-ending letters in their non-final
// form (e.g. (0,5) is 'מ'), but a Hebrew typist naturally types the final form
// ('ם') at the end of a word. Since solving requires an exact match on all ~52
// cells with no per-cell feedback, one such cell would strand the group with no
// way to find it. Both sides of the comparison are normalized to the base form.
export const FINAL_LETTER_FORMS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };

export function normalizeHebrewLetter(ch) {
  return FINAL_LETTER_FORMS[ch] || ch;
}

export function createEmptyUserGrid(grid) {
  return grid.map((row) => row.map((cell) => (cell ? '' : null)));
}

export function setCellLetter(userGrid, row, col, letter) {
  const next = userGrid.map((r) => [...r]);
  next[row][col] = normalizeHebrewLetter((letter || '').slice(-1));
  return next;
}

export function isCrosswordSolved(userGrid, solutionGrid) {
  for (let r = 0; r < solutionGrid.length; r++) {
    for (let c = 0; c < solutionGrid[r].length; c++) {
      const solutionCell = solutionGrid[r][c];
      if (solutionCell === null) continue;
      const typed = normalizeHebrewLetter((userGrid[r][c] || '').trim());
      if (typed !== normalizeHebrewLetter(solutionCell.letter)) return false;
    }
  }
  return true;
}

// Every row in this grid holds exactly one clue's word (a single horizontal
// run starting at that row's numbered cell), so the clue owning any playable
// cell is just "whichever clue number appears anywhere in this row".
export function getClueNumberForRow(row) {
  const numbered = row.find((cell) => cell && cell.clueNumber);
  return numbered ? numbered.clueNumber : null;
}

// Where a given clue's word starts, so finishing one clue can jump straight
// to the first cell of the next one.
export function getClueStartCell(grid, clueNumber) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c] && grid[r][c].clueNumber === clueNumber) return { row: r, col: c };
    }
  }
  return null;
}

// Column 8 is the letter every one of the 8 across-words crosses through, and
// reading it top-to-bottom spells the final answer "בן גוריון" — the only
// column that should be marked solved, not the whole grid (verified by
// tracing CROSSWORD_GRID: ב-נ-ג-ו-ר-י-ו-נ).
export const FINAL_COLUMN = 8;

export function isFinalColumnSolved(userGrid, solutionGrid) {
  for (let r = 0; r < solutionGrid.length; r++) {
    const solutionCell = solutionGrid[r][FINAL_COLUMN];
    if (solutionCell === null) continue;
    const typed = normalizeHebrewLetter((userGrid[r][FINAL_COLUMN] || '').trim());
    if (typed !== normalizeHebrewLetter(solutionCell.letter)) return false;
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
    characterImage: 'assets/images/char-avi-boaz.jpeg',
    characterName: 'אבי בועז',
    text: INTRO_TEXT,
    buttonLabel: '←',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let userGrid = createEmptyUserGrid(CROSSWORD_GRID);
    let markedSolved = false;

    const wrapper = document.createElement('div');
    wrapper.className = 'crossword-wrapper';

    const clueText = document.createElement('div');
    clueText.className = 'crossword-clue-text';

    const grid = document.createElement('div');
    grid.className = 'crossword-grid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${CROSSWORD_GRID[0].length}, 36px)`;

    function showClue(clueNumber) {
      const clue = CLUES.find((cl) => cl.number === clueNumber);
      if (!clue) return;
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
    }

    // input[r][c] for the auto-advance-to-next-cell behavior below; only
    // playable cells get an entry (blocked cells stay undefined).
    const inputEls = CROSSWORD_GRID.map((row) => row.map(() => undefined));
    // Column-8 cells only (the compiled final-answer column) — solved marks
    // just these, not the whole grid.
    const finalColumnCellEls = [];

    // Shared by every cell's input/backspace handler so the column-highlight
    // and "puzzle solved" checks stay in one place regardless of which
    // direction the group is typing.
    function updateProgress() {
      const columnSolved = isFinalColumnSolved(userGrid, CROSSWORD_GRID);
      finalColumnCellEls.forEach((el) => el.classList.toggle('solved', columnSolved));

      const solved = isCrosswordSolved(userGrid, CROSSWORD_GRID);
      if (solved && !markedSolved) {
        markedSolved = true;
        // Marks progress (map pin turns green) without leaving this screen —
        // the group can keep looking at the solved column, and returns to the
        // map themselves via the persistent map button whenever they're ready.
        onSolved?.();
      }
    }

    CROSSWORD_GRID.forEach((row, r) => {
      const rowClueNumber = getClueNumberForRow(row);
      row.forEach((cell, c) => {
        const cellEl = document.createElement('div');
        cellEl.className = 'crossword-cell';
        if (!cell) {
          cellEl.classList.add('blocked');
          grid.appendChild(cellEl);
          return;
        }
        // Any cell belonging to this clue's word shows its definition, not
        // just the numbered cell — the number is a tiny, easy-to-miss target.
        cellEl.addEventListener('click', () => showClue(rowClueNumber));
        if (cell.clueNumber) {
          const numberEl = document.createElement('span');
          numberEl.className = 'crossword-clue-number';
          numberEl.textContent = String(cell.clueNumber);
          cellEl.appendChild(numberEl);
        }
        const input = document.createElement('input');
        input.maxLength = 2; // allow the numberEl + a following keystroke; letter logic below extracts last char
        input.className = 'crossword-input';
        input.addEventListener('input', () => {
          userGrid = setCellLetter(userGrid, r, c, input.value);
          input.value = userGrid[r][c];

          if (input.value) {
            const nextInput = inputEls[r][c + 1];
            if (nextInput) {
              // Auto-advance to the next cell of the same word.
              nextInput.focus();
            } else {
              // Last letter of this clue — jump to the first cell of the next
              // one instead of leaving focus stranded at the end of the row.
              const nextClueStart = getClueStartCell(CROSSWORD_GRID, rowClueNumber + 1);
              if (nextClueStart) inputEls[nextClueStart.row][nextClueStart.col].focus();
            }
          }

          updateProgress();
        });
        input.addEventListener('keydown', (e) => {
          // Backspace on an already-empty cell clears and refocuses the
          // previous cell of this word, so the group can keep deleting
          // backward across cells instead of getting stuck once one cell
          // is empty (matches the forward auto-advance on typing).
          if (e.key === 'Backspace' && !input.value) {
            const prevInput = inputEls[r][c - 1];
            if (prevInput) {
              e.preventDefault();
              userGrid = setCellLetter(userGrid, r, c - 1, '');
              prevInput.value = '';
              prevInput.focus();
              updateProgress();
            }
          }
        });
        cellEl.appendChild(input);
        grid.appendChild(cellEl);
        inputEls[r][c] = input;
        if (c === FINAL_COLUMN) finalColumnCellEls.push(cellEl);
      });
    });

    wrapper.appendChild(clueText);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  }
}
