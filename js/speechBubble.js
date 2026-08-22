// js/speechBubble.js
import { visibleText, isTypingComplete } from './typewriter.js';

export function renderSpeechBubble(container, { characterImage, characterName, text, buttonLabel, onAdvance }) {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'speech-fullscreen';

  const img = document.createElement('img');
  img.src = characterImage;
  img.alt = characterName;
  img.className = 'speech-character-fullscreen';

  const panel = document.createElement('div');
  panel.className = 'speech-panel';

  const bubble = document.createElement('div');
  bubble.className = 'speech-bubble';
  const paragraph = document.createElement('p');
  bubble.appendChild(paragraph);

  const button = document.createElement('button');
  button.className = 'speech-advance-button';
  button.textContent = buttonLabel;
  button.disabled = true;

  panel.appendChild(bubble);
  panel.appendChild(button);
  wrapper.appendChild(img);
  wrapper.appendChild(panel);
  container.appendChild(wrapper);

  const start = performance.now();
  let frameId;

  function tick(now) {
    const elapsed = now - start;
    paragraph.textContent = visibleText(text, elapsed);
    if (isTypingComplete(text, elapsed)) {
      button.disabled = false;
    } else {
      frameId = requestAnimationFrame(tick);
    }
  }
  frameId = requestAnimationFrame(tick);

  button.addEventListener('click', () => {
    if (!button.disabled) onAdvance?.();
  });

  return {
    destroy() {
      if (frameId) cancelAnimationFrame(frameId);
      container.innerHTML = '';
    },
  };
}
