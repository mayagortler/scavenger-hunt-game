// js/puzzles/puzzle5-riddle.js
import { renderSpeechBubble } from '../speechBubble.js';

const INTRO_TEXT =
  'היי חברים שלי. אני קרטוניב, שהגיע איתכם ליוון כי ניב האמיתי היה אפס מדי בשביל לבוא. ' +
  'עכשיו אני כאן כדי להציג לכם את החידה החמישית. מממהמ בהצלחה.';

export function initPuzzle5(container, { onContinue }) {
  container.innerHTML = '';
  const dialogueEl = document.createElement('div');
  container.appendChild(dialogueEl);

  renderSpeechBubble(dialogueEl, {
    characterImage: 'assets/images/char-kartoniv.jpeg',
    characterName: 'קרטוניב',
    text: INTRO_TEXT,
    buttonLabel: '→',
    onAdvance: () => {
      dialogueEl.remove();
      renderRiddle();
    },
  });

  function renderRiddle() {
    const wrapper = document.createElement('div');
    wrapper.className = 'riddle-images';
    for (const src of ['assets/images/puzzle5-riddle-1.png', 'assets/images/puzzle5-riddle-2.png', 'assets/images/puzzle5-riddle-3.png']) {
      const img = document.createElement('img');
      img.src = src;
      img.className = 'riddle-image';
      wrapper.appendChild(img);
    }
    container.appendChild(wrapper);

    const continueButton = document.createElement('button');
    continueButton.textContent = 'פתרנו, למפה!';
    continueButton.addEventListener('click', () => onContinue?.());
    container.appendChild(continueButton);
  }
}
