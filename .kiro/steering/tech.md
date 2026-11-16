# Engineering rules for Aftertext

These rules apply to every change. `product.md` says what the product is; this file says how it is built and checked.

## Stack and commands

- Plain HTML, CSS and native ES modules in the browser. Node 22 is used only to run tests. There is no build step and no bundler.
- No dependencies. `package.json` has none and must stay that way: no packages, no CDN scripts, no remote fonts, no new binary assets.
- Test command: `npm test` (it runs `node --test tests/*.test.js`). New tests go in `tests/<name>.test.js` and import only `node:test`, `node:assert/strict` and other `node:` modules.
- A Kiro hook runs `npm test` after every file write and stores the latest result in `.kiro/test-status.txt`. Read that file after you change code. A change is not finished while its first line starts with `FAIL`. Never weaken or delete a test to get a pass.
- Files: `index.html`, `styles.css`, `sw.js` (app-shell cache), `src/validate.js` (limits, validation, file format), `src/core.js` (40-column compiler), `src/ui.js` (all DOM code), `src/sample.js` (fictional example), `tests/`.
- Logic that can be tested without a browser belongs in a module that does not touch `document` or `window`, so Node can import it. `src/ui.js` only wires such modules to the page.

## Limits that do not change

- `LIMITS` in `src/validate.js`: at most 32 notices and at most 256000 bytes per bulletin file. Do not raise, bypass or copy these numbers; import `LIMITS`.
- The bulletin file format does not change. A file exported by the published version must still open, and a file exported now must open in the published version.
- Offline: after the first visit every screen works with no network. No request to another origin. If you add a file that the browser loads, add it to the cached file list in `sw.js` and change the cache name so installed copies pick it up.
- Notice text is never trimmed, normalised or rewritten. Put text into the page with `textContent` or `createTextNode`, never with `innerHTML`.
- Saved data stays on the device. A storage failure must leave reading and editing usable and must not be reported as a successful save.

## Accessibility rules

- Every action works with a keyboard alone. Focus order follows reading order. No keyboard trap.
- Focus is always visible: an outline of at least 2px with at least 3:1 contrast against what is next to it. Never remove an outline without a replacement.
- Move focus only in response to something the reader did, never on load, and never while the reader is typing in a field.
- Say what changed in one polite live region. One message per change, none on first load, and no second region that repeats the same message.
- Use native elements (`button`, `a`, `nav`, `article`, `h1` to `h3`) before ARIA. State is carried by `aria-pressed`, `aria-current` and `hidden`. Accessible names come from visible text.
- One `h1` per screen and no skipped heading levels.
- Single-character keys (the digit keys) act only when focus is not in a field, and each has a visible, focusable alternative. Do not add letter shortcuts that work without a modifier (WCAG 2.1.4); do not take over keys that browsers or screen readers use.
- Reading view reflows at 320 CSS px wide and at 200% zoom with no sideways scrolling. Targets are at least 24 by 24 CSS px.
- Text contrast is at least 4.5:1. Nothing depends on colour alone. Honour `prefers-reduced-motion`.
- These are rules to build and test against. Do not write that the app conforms to WCAG or works with a screen reader unless a test record in this repository says who checked it and how.

## Claims and records

- A test shows only what it exercises. This agent cannot open a browser, so it never writes that a browser, keyboard or screen-reader check passed. List such checks for a person to do.
- A feature spec lives in `.kiro/specs/<feature>/` as `requirements.md`, `design.md` and `tasks.md`. Tick a task only when the test status is `PASS`.
- Do not edit `README.md`, `submission/`, `media/` or `LICENSE`. Public wording is written and checked by a person.
