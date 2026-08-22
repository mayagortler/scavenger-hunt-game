// js/puzzles/puzzle5-riddle.js
import { renderSpeechBubble } from '../speechBubble.js';

const INTRO_TEXT =
  'היי חברים שלי. אני קרטוניב, שהגיע איתכם ליוון כי ניב האמיתי היה אפס מדי בשביל לבוא. ' +
  'עכשיו אני כאן כדי להציג לכם את החידה החמישית. מממהמ בהצלחה.';

// Reordered per request: the image that used to sit in the middle is now
// first/leftmost, and the image that used to be leftmost is now in the
// middle (the third image's position is unchanged).
const RIDDLE_IMAGES = [
  'assets/images/puzzle5-riddle-1.png',
  'assets/images/puzzle5-riddle-3.png',
  'assets/images/puzzle5-riddle-2.png',
];

export function initPuzzle5(container, { onContinue }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-kartoniv.jpeg',
    characterName: 'קרטוניב',
    text: INTRO_TEXT,
    buttonLabel: '←',
    onAdvance: () => {
      dialogueEl.remove();
      renderRiddle();
    },
  });

  function renderRiddle() {
    let index = 0;

    const wrapper = document.createElement('div');
    wrapper.className = 'riddle-images';

    const prevButton = document.createElement('button');
    prevButton.className = 'riddle-nav-button';
    prevButton.textContent = '→';
    prevButton.setAttribute('aria-label', 'תמונה קודמת');

    const img = document.createElement('img');
    img.className = 'riddle-image';

    // Linear, non-circular navigation: forward past the last image finishes
    // the riddle (no separate "solved" button — this arrow doubles as it).
    const nextButton = document.createElement('button');
    nextButton.className = 'riddle-nav-button';
    nextButton.textContent = '←';
    nextButton.setAttribute('aria-label', 'תמונה הבאה');

    function render() {
      img.src = RIDDLE_IMAGES[index];
      prevButton.disabled = index === 0;
    }

    prevButton.addEventListener('click', () => {
      if (index === 0) return;
      index -= 1;
      render();
    });

    nextButton.addEventListener('click', () => {
      if (index < RIDDLE_IMAGES.length - 1) {
        index += 1;
        render();
      } else {
        onContinue?.();
      }
    });

    render();

    wrapper.appendChild(prevButton);
    wrapper.appendChild(img);
    wrapper.appendChild(nextButton);
    container.appendChild(wrapper);
  }
}
