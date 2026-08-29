// js/speechBubble.js
import { visibleText, isTypingComplete } from './typewriter.js';

export function renderSpeechBubble(container, { characterImage, characterName, text, buttonLabel, onAdvance, panelLeft, panelWidth }) {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'speech-fullscreen';

  const img = document.createElement('img');
  img.src = characterImage;
  img.alt = characterName;
  img.className = 'speech-character-fullscreen';

  const panel = document.createElement('div');
  panel.className = 'speech-panel';
  // Each character stands in a different spot in their own photo, so how far
  // right the bubble sits (to end up next to them, not just off the edge) is
  // tuned per photo by the caller instead of one fixed value for everyone.
  if (panelLeft) panel.style.left = panelLeft;
  // Same idea for width: most lines fit the default panel fine, but a
  // particularly long line reads better spread out wider instead of wrapping
  // to many narrow lines — tuned per call site, not globally.
  if (panelWidth) panel.style.width = panelWidth;

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
