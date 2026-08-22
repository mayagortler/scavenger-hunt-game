// js/typewriter.js
export function visibleCharCount(elapsedMs, charsPerSecond) {
  return Math.floor((elapsedMs / 1000) * charsPerSecond);
}

export function visibleText(fullText, elapsedMs, charsPerSecond = 30) {
  const count = visibleCharCount(elapsedMs, charsPerSecond);
  return fullText.slice(0, Math.min(count, fullText.length));
}

export function isTypingComplete(fullText, elapsedMs, charsPerSecond = 30) {
  return visibleCharCount(elapsedMs, charsPerSecond) >= fullText.length;
}
