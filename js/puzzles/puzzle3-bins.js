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

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-uzi-hadrozi.png',
    characterName: 'עוזי הדרוזי',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderPuzzle();
    },
  });

  function renderPuzzle() {
    let state = createBinState();

    const wrapper = document.createElement('div');
    wrapper.className = 'bins-wrapper';
    wrapper.style.position = 'relative';

    const bg = document.createElement('img');
    bg.src = 'assets/images/puzzle3-terminal3-bg.jpeg';
    bg.className = 'bins-background';
    wrapper.appendChild(bg);

    // Free layout: spread 11 bins evenly along the bottom of the background image.
    BIN_IDS.forEach((binId, index) => {
      const bin = document.createElement('button');
      bin.className = 'bin';
      bin.style.position = 'absolute';
      bin.style.bottom = '8%';
      bin.style.left = `${5 + index * 8}%`;
      bin.style.backgroundImage = "url('assets/images/puzzle3-bin-icon.png')";
      bin.textContent = binId === SLASH_ID ? '/' : String(binId);
      bin.addEventListener('click', () => {
        state = clickBin(state, binId);
        textBox.value = state.text;
        if (isBinsSolved(state)) {
          textBox.classList.add('solved');
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
    resetButton.textContent = 'איפוס';
    resetButton.addEventListener('click', () => {
      state = resetBins();
      textBox.value = '';
      textBox.classList.remove('solved');
    });

    container.appendChild(wrapper);
    container.appendChild(textBox);
    container.appendChild(resetButton);
  }
}
