// js/typewriter.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { visibleText, isTypingComplete } from './typewriter.js';

test('visibleText reveals characters proportional to elapsed time', () => {
  const text = 'הולה מוצאצוס';
  assert.equal(visibleText(text, 0, 30), '');
  assert.equal(visibleText(text, 100, 30), text.slice(0, 3)); // 30 chars/sec * 0.1s = 3
});

test('visibleText never exceeds the full text length', () => {
  const text = 'שלום';
  assert.equal(visibleText(text, 100000, 30), text);
});

test('isTypingComplete is false until enough time has passed, then true', () => {
  const text = 'אבגדה'; // 5 chars
  assert.equal(isTypingComplete(text, 50, 30), false); // 30*0.05=1.5 chars shown
  assert.equal(isTypingComplete(text, 1000, 30), true); // 30 chars shown >= 5
});
