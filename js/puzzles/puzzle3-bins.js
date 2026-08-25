// js/puzzles/puzzle3-bins.js
import { renderSpeechBubble } from '../speechBubble.js';

export const BIN_LETTER_MAP = { 0: 'י', 1: 'א', 2: 'ב', 3: 'ק', 4: 'מ', 5: 'ח', 6: ' ', 7: 'ז', 8: 'ו', 9: 'ש' };
export const SLASH_ID = 'slash';
export const TARGET_TEXT = 'אורי טביבי';
const BIN_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, SLASH_ID];

export function createBinState() {
  return { text: '', slashClickCount: 0 };
}

export function clickBin(state, binId) {
  if (binId === SLASH_ID) {
    const nextCount = state.slashClickCount + 1;
    const letter = nextCount % 2 === 1 ? 'ר' : 'ט';
    return { text: state.text + letter, slashClickCount: nextCount };
  }
  return { text: state.text + BIN_LETTER_MAP[binId], slashClickCount: state.slashClickCount };
}

export function resetBins() {
  return createBinState();
}

export function isBinsSolved(state) {
  return state.text === TARGET_TEXT;
}

const INTRO_TEXT =
  "אהלן וסהלן יא שבאב. איסמי עוזי הדרוזי וואלה באתי פה במיוחד לכבוד החידה השלישית. " +
  'יא אח\'וואן, לפניכם 11 פחים – וואלה כל פח שווה 3000 דולר! וכל פח מחביא אות או סימן. ' +
  'מה אתם צריכים לעשות? על ראסי ועל עיני: ללחוץ על הפחים בדיוק לפי התאריך שבו התקיים חידון מארוול האולטימטיבי הראשון. ' +
  'ואל תשכחו לכתוב תאריך מלא ולהשתמש בסלאש כשצריך. פאהם? יאללה, שוואיה שוואיה, בלי לחץ. בהצלחה!';

export function initPuzzle3(container, { onSolved }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);
  let devSolveImpl = null;

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uzi-hadrozi.jpeg',
    characterName: 'עוזי הדרוזי',
    panelLeft: '28vw',
    text: INTRO_TEXT,
    buttonLabel: '←',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let state = createBinState();
    let advanced = false;

    const wrapper = document.createElement('div');
    wrapper.className = 'bins-wrapper';
    wrapper.style.position = 'relative';

    const bg = document.createElement('img');
    bg.src = 'assets/images/puzzle3-terminal3-bg.jpeg';
    bg.className = 'bins-background';
    wrapper.appendChild(bg);

    // Free layout: two rows of bins along the bottom of the background image
    // (6 on top, 5 below) instead of one cramped row of 11.
    const TOP_ROW_COUNT = 6;
    BIN_IDS.forEach((binId, index) => {
      const inTopRow = index < TOP_ROW_COUNT;
      const rowIndex = inTopRow ? index : index - TOP_ROW_COUNT;
      const rowCount = inTopRow ? TOP_ROW_COUNT : BIN_IDS.length - TOP_ROW_COUNT;

      const bin = document.createElement('button');
      bin.className = 'bin';
      bin.style.position = 'absolute';
      bin.style.bottom = inTopRow ? '34%' : '6%';
      // Offset by half the bin's own width (32px = half of the 64px .bin size)
      // so the row's outer bins are centered on their mark instead of
      // overflowing the wrapper — done via calc(), not an inline transform,
      // so the hover/active transforms in css/style.css still apply (an
      // inline style.transform would silently out-rank them).
      bin.style.left = `calc(${8 + rowIndex * (84 / (rowCount - 1))}% - 32px)`;
      bin.style.backgroundImage = "url('assets/images/puzzle3-bin-icon.png')";
      bin.textContent = binId === SLASH_ID ? '/' : String(binId);
      bin.addEventListener('click', () => {
        state = clickBin(state, binId);
        textBox.value = state.text;
        // Recomputed on every click rather than added once: clicking on past the
        // target text must drop the green marking again, not leave the box
        // falsely green with the wrong text in it.
        const solved = isBinsSolved(state);
        textBox.classList.toggle('solved', solved);
        if (solved && !advanced) {
          advanced = true;
          onSolved?.();
        }
      });
      wrapper.appendChild(bin);
    });

    const textBox = document.createElement('input');
    textBox.type = 'text';
    textBox.readOnly = true;
    textBox.dir = 'rtl';
    textBox.className = 'bins-text';

    const resetButton = document.createElement('button');
    resetButton.className = 'puzzle-action-button';
    resetButton.textContent = 'איפוס';
    resetButton.addEventListener('click', () => {
      state = resetBins();
      textBox.value = '';
      textBox.classList.remove('solved');
    });

    container.appendChild(wrapper);
    container.appendChild(textBox);
    container.appendChild(resetButton);

    // Dev-only shortcut: jump straight to the target text.
    devSolveImpl = () => {
      state = { ...state, text: TARGET_TEXT };
      textBox.value = state.text;
      textBox.classList.add('solved');
      if (!advanced) {
        advanced = true;
        onSolved?.();
      }
    };
  }

  return {
    devSolve: () => devSolveImpl?.(),
  };
}
