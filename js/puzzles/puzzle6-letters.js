import { FINAL_STATION_IDS } from '../stations.js';

export function allFinalStationsDiscovered(letterDiscoveries) {
  const discovered = new Set(letterDiscoveries.map((d) => d.stationId));
  return FINAL_STATION_IDS.every((id) => discovered.has(id));
}

export function renderFinalScreen(container, { finalLetters, onFinish }) {
  container.innerHTML = '';

  const lettersEl = document.createElement('div');
  lettersEl.className = 'final-letters';
  // Each letter is its own element (not one text node) purely so CSS can
  // stagger its reveal animation by index via the --i custom property.
  finalLetters.split('').forEach((letter, i) => {
    const span = document.createElement('span');
    span.className = 'final-letter';
    span.style.setProperty('--i', i);
    span.textContent = letter;
    lettersEl.appendChild(span);
  });
  container.appendChild(lettersEl);

  const finishButton = document.createElement('button');
  finishButton.textContent = 'סיום';
  finishButton.className = 'final-finish-button';
  finishButton.addEventListener('click', () => onFinish?.());
  container.appendChild(finishButton);
}
