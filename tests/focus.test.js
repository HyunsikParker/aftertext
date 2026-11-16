import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as reading from '../src/reading.js';

// A stand-in for an h2 that behaves like a browser heading: it can take focus
// only when it has a tabindex.
function fakeHeading() {
  const attrs = new Map();
  const heading = {
    focused: false,
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    hasAttribute(name) { return attrs.has(name); },
    get tabIndex() { return attrs.has('tabindex') ? Number(attrs.get('tabindex')) : -1; },
    set tabIndex(value) { attrs.set('tabindex', String(value)); },
    focus() { if (attrs.has('tabindex')) heading.focused = true; }
  };
  return heading;
}
const hostWith = heading => ({ querySelector: selector => (selector === 'h2' ? heading : null) });
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');

test('focusReadingHeading makes the notice heading focusable and focuses it', () => {
  assert.equal(typeof reading.focusReadingHeading, 'function');
  const heading = fakeHeading();
  assert.equal(reading.focusReadingHeading(hostWith(heading)), true);
  assert.equal(heading.getAttribute('tabindex'), '-1');
  assert.equal(heading.focused, true);
});

test('focusReadingHeading reports false and does not throw when there is no heading', () => {
  assert.equal(typeof reading.focusReadingHeading, 'function');
  assert.equal(reading.focusReadingHeading(hostWith(null)), false);
});

test('shouldMoveFocus is true only for something the reader did in Reading view', () => {
  assert.equal(typeof reading.shouldMoveFocus, 'function');
  assert.equal(reading.shouldMoveFocus({ mode: 'reader', format: 'text', initiated: true }), true);
  assert.equal(reading.shouldMoveFocus({ mode: 'reader', format: 'text', initiated: false }), false, 'first load');
  assert.equal(reading.shouldMoveFocus({ mode: 'reader', format: 'grid', initiated: true }), false, 'Teletext grid');
  assert.equal(reading.shouldMoveFocus({ mode: 'editor', format: 'text', initiated: true }), false, 'editor open');
});

test('src/ui.js moves focus through the tested functions', () => {
  assert.match(ui, /import\s*\{[^}]*\bfocusReadingHeading\b[^}]*\}\s*from\s*'\.\/reading\.js'/);
  assert.match(ui, /import\s*\{[^}]*\bshouldMoveFocus\b[^}]*\}\s*from\s*'\.\/reading\.js'/);
  assert.match(ui, /shouldMoveFocus\(/, 'navigation asks shouldMoveFocus');
  assert.doesNotMatch(ui, /querySelector\('h2'\)\?\.focus\(\)/, 'no focus call on a heading that cannot take focus');
});

test('pressing the Reading view button moves focus to the heading', () => {
  assert.match(ui, /\$\('text-mode'\)\.addEventListener\('click',(?:(?!\}\);)[\s\S])*focusReadingHeading\(/);
});
