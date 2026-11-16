# Brief: Reading view for screen readers and keyboards

Spec name: `reading-view`. This brief was written by the Claude session that set up the run. Kiro expands it into `requirements.md`, `design.md` and `tasks.md` in this folder and then implements the tasks.

## Reader

Someone who opens a shared bulletin with a screen reader, with a keyboard only, or with large text.

## Starting point

The app has two formats for a page: the 40-column Teletext grid and Reading view (button `#text-mode`, element `#reading-text`), which shows one notice as ordinary text. The README and the Devpost story say the app has not been tested with a screen reader. No test covers focus, announcements or keys.

Read `index.html`, `src/ui.js` and `styles.css` before writing requirements, and record in `requirements.md` what already exists (for example `#reader-content` has `tabindex="-1"` and `#message` is a polite status region) and what is missing. Keep what already works.

## Wanted

1. Page-change announcement. One polite message for each navigation the reader starts, built by a pure function, for example "Page 104, Repair morning, notice 4 of 9" and "Page 100, index, 9 notices". No message on first load.
2. Focus. In Reading view, after Next, Previous, a contents link, the keypad or a typed page number, focus moves to the heading of the notice now shown (or the index heading), so reading continues from the new text. Never on first load, never while the editor is open, and no change to focus behaviour in the Teletext grid unless it is broken.
3. Keys. List the keys that already work where a screen reader reaches them, and add only what is missing to go to the next notice, the previous notice and the index from Reading view. Keys must not fire while typing in a field and must not take over browser or screen-reader shortcuts.
4. Skip link. The first focusable element is a link "Skip to notice text".
5. Current notice. The contents list marks the notice being read with `aria-current`.
6. Remembered format. The reader's last choice of Teletext or Reading view is kept on this device. A storage failure must not break reading.
7. Visible focus on every reader control, and no motion when `prefers-reduced-motion` is set.

## Limits that stay

- `LIMITS` in `src/validate.js` stay as they are: 32 notices, 256000 bytes per file. The bulletin file format does not change.
- Offline behaviour stays: no network request, no dependency, no new font or asset.
- Original notice text is never changed and is rendered through DOM text APIs only.

## How it is checked

- Pure logic goes in a new ES module (suggested: `src/reading.js`) with tests in `tests/reading.test.js`, run by `npm test`. The nine existing tests keep passing.
- `src/ui.js` needs a browser, so add a Node test that at least parses every file in `src/` and `sw.js` (for example `node --check` through `node:child_process`), so that a syntax error in DOM code fails the test run.
- Browser, keyboard and screen-reader checks are done by a person after this run. Do not write that they passed; list them.

## Out of scope

A single document of the whole bulletin, a printable page set, translations, speech synthesis, new editor features, changes to the README or the submission text.
