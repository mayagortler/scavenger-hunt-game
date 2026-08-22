import { FINAL_STATION_IDS } from '../stations.js';

export function allFinalStationsDiscovered(letterDiscoveries) {
  const discovered = new Set(letterDiscoveries.map((d) => d.stationId));
  return FINAL_STATION_IDS.every((id) => discovered.has(id));
}

export function renderFinalScreen(container, { finalLetters, onFinish }) {
  container.innerHTML = '';

  const lettersEl = document.createElement('div');
  lettersEl.className = 'final-letters';
  lettersEl.textContent = finalLetters.split('').join(' ');
  container.appendChild(lettersEl);

  const finishButton = document.createElement('button');
  finishButton.textContent = 'סיום';
  finishButton.className = 'final-finish-button';
  finishButton.addEventListener('click', () => onFinish?.());
  container.appendChild(finishButton);
}
