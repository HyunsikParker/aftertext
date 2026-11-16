# Reading view: Design

This design covers page-change announcements, focus management in Reading view, format persistence, and the tests that confirm each requirement.

## Overview

The reading-view feature adds a pure module `src/reading.js` that constructs polite announcement messages from page metadata. It extends `src/ui.js` to move focus to the notice heading in Reading view after navigation, persist the chosen format in local storage, and ensure `aria-current` marks the active notice in the contents list. The service worker file list and existing behaviour remain unchanged. A new Node test checks that every source file can be parsed without a browser.

## Files that change

### `src/reading.js` (new)

A pure module that exports functions to build announcement messages and manage focus. No DOM or global state.

**Exported functions:**

1. **`focusReadingHeading(host)`**
   - **Input:** `host` is an object with a `querySelector` method (e.g., a DOM element or a test mock).
   - **Output:** Returns `true` if the heading was successfully focused, `false` if no heading was found.
   - **Behaviour:** Finds the `h2` element using `host.querySelector('h2')`. If found, sets `tabIndex = -1` to make it focusable (in case it is not already), then calls `.focus()`. Returns `true` on success. If the heading is not found, returns `false` without throwing.
   - **Example:** `focusReadingHeading($('reading-text'))` sets focus to the notice heading inside the reading view container.

2. **`shouldMoveFocus(state)`**
   - **Input:** `state` is an object with `{ mode, format, initiated }` properties.
   - **Output:** Returns `true` if focus should move, `false` otherwise.
   - **Behaviour:** Returns `true` only when all three conditions are met: `state.mode === 'reader'` (not in editor), `state.format === 'text'` (in Reading view, not Teletext), and `state.initiated === true` (navigation was done by the reader, not by the initial load).
   - **Example:** `shouldMoveFocus({ mode: 'reader', format: 'text', initiated: true })` returns `true`.

3. **`buildAnnouncementMessage(pageData, articles, format)`**
   - **Input:** `pageData` is an object with `{ pageNumber, kind, title, subpageIndex, subpageCount }`. `articles` is an array of article objects with a `page` property (position is determined by sorting by page). `format` is an optional string, either `'text'` or `'grid'`.
   - **Output:** A string suitable for a polite live region, for example `"Page 104, Repair morning, notice 4 of 9"` or `"Page 100, index, 9 notices"`.
   - **Behaviour:** If `kind === 'index'`, return `"Page 100, index, {totalNotices} notice" or "notices"`. Otherwise return `"Page {pageNumber}, {title}, notice {position} of {totalNotices}"`, where position is the 1-based index of this notice in the bulletin when articles are sorted by page. If `format === 'grid'` and `subpageCount > 1`, append `", subpage {subpageIndex + 1} of {subpageCount}"`. Do not include subpage information for Reading view (`format === 'text'`).
   - **Example:** `buildAnnouncementMessage({ pageNumber: 201, kind: 'article', title: 'Library hours', subpageIndex: 0, subpageCount: 1 }, [{ page: 101 }, { page: 201 }], 'text')` returns `"Page 201, Library hours, notice 2 of 2"`.

4. **`findNoticePosition(pageNumber, articles)`**
   - **Input:** `pageNumber` (integer), `articles` (array of article objects with a `page` property, in any order).
   - **Output:** The 1-based position of the notice with the given page number when articles are sorted by page, or 0 if not found.
   - **Example:** `findNoticePosition(105, [{ page: 200 }, { page: 101 }, { page: 105 }])` returns `2` (because when sorted by page, it is the second notice).

### `src/ui.js`

**Changes:**

1. Import `buildAnnouncementMessage`, `focusReadingHeading`, and `shouldMoveFocus` from `./reading.js`.
2. Update `go(number, subpage, announce, initiated)` to accept an optional `initiated` parameter (default true). When `announce` is true, call `buildAnnouncementMessage(state.compiled.pages[state.page], state.compiled.articles, state.format)` and pass the result to `notice()`. Call `focusReadingHeading($('reading-text'))` if `shouldMoveFocus({ mode: state.mode, format: state.format, initiated })` returns true.
3. Update `step(direction)` to call `buildAnnouncementMessage(p, state.compiled.articles, state.format)` when `state.format === 'text'`. Call `focusReadingHeading($('reading-text'))` if `shouldMoveFocus({ mode: state.mode, format: state.format, initiated: true })` returns true.
4. Update the `#text-mode` click handler to call `focusReadingHeading($('reading-text'))` if `shouldMoveFocus({ mode: state.mode, format: state.format, initiated: true })` returns true, after the format is changed and saved.
5. Update the wordmark click handler to pass `initiated=false` to `go(100, 0, true, false)` so that focus does not move on app-load navigation.
6. In `renderReader()`, the code already sets `aria-current="page"` on contents buttons. Ensure this logic is always active.
7. Add format persistence: after switching format in the `#grid-mode` and `#text-mode` click handlers, try to save `state.format` to local storage under the key `aftertext:format:v1`. If storage fails, do not report an error. On initial load, after the bulletin is restored, read the saved format and set `state.format` to it if valid; otherwise keep the default (grid on desktop, text on mobile).
8. The skip link already exists in `index.html` and is styled. No change needed.
9. Focus visibility is already defined in `styles.css`. No change needed.

### `tests/reading.test.js` (new)

Node tests for `src/reading.js`:

1. `buildAnnouncementMessage` returns the correct format for an index page.
2. `buildAnnouncementMessage` returns the correct format for an article page with position.
3. `findNoticePosition` returns the 1-based position of a notice.
4. `findNoticePosition` returns 0 for a page number not in the bulletin.
5. `buildAnnouncementMessage` handles a bulletin with one notice.
6. `buildAnnouncementMessage` handles plural "notices" correctly.

### `tests/syntax.test.js` (new)

Node test that uses `node:child_process` to run `node --check` on every file in `src/` and `sw.js`:

1. Test that `index.html` is not checked (it is HTML, not JS).
2. For each of `src/ui.js`, `src/core.js`, `src/validate.js`, `src/sample.js`, `src/reading.js`, `sw.js`, run `node --check <file>`. If any file fails, the test fails.
3. Use `execFileSync` from `node:child_process` to run the check synchronously. Catch errors and report which file failed.

### `styles.css`

No changes required. Focus visibility (`:focus-visible` with a 3px outline) and reduced-motion (`@media(prefers-reduced-motion:reduce)`) are already present.

### `sw.js`

Add `./src/reading.js` to the `ASSETS` array. Increment the cache version to `v3` so that installed service workers pick up the new file.

### `index.html`

No changes required. The skip link, live region, `tabindex="-1"` on `#reader-content`, and format buttons are already present.

## Focus and announcement rules

| Trigger | Focus target (Reading view only) | Announcement message |
|---------|----------------------------------|----------------------|
| Next button | Notice heading (`#reading-text h2`) | Page number, title, position |
| Previous button | Notice heading | Page number, title, position |
| Contents link | Notice heading | Page number, title, position |
| Keypad (3 digits) | Notice heading | Page number, title, position |
| Typed page number (jump form) | Notice heading | Page number, title, position |
| Arrow right key | Notice heading | Page number, title, position |
| Arrow left key | Notice heading | Page number, title, position |
| Home key | Index heading | "Page 100, index, N notices" |
| Wordmark link | Index heading | "Page 100, index, N notices" |
| Text-mode button click | Notice heading | (no message) |
| Initial load | (no change) | (no message) |
| Format switch to Teletext | (no change) | (no message) |
| Editor open | (no change) | (no message) |

In Teletext format, focus does not move to the heading. The announcement message is still constructed.

## Error handling

**Storage failure:** If local storage is unavailable, format persistence fails silently. The chosen format is kept for the current session. No error message is shown to the reader. This matches the existing behaviour for bulletin persistence.

**Missing heading:** If `$('reading-text').querySelector('h2')` returns `null`, calling `.focus()` on `null?.focus()` does nothing (optional chaining). This is safe and correct.

## Test plan

| Requirement | Node test | Browser test | Screen-reader test |
|-------------|-----------|--------------|-------------------|
| 1.1–1.5 (Announcement message) | `tests/reading.test.js` covers message format | Manual: check that `#message` updates after navigation | Manual: verify announcement is spoken |
| 2.1–2.5 (Focus management) | (cannot test DOM without browser) | Manual: tab after navigation, confirm focus is on heading | Manual: confirm screen reader reads heading |
| 3.1–3.9 (Navigation keys) | (existing behavior, no change) | Manual: press each key, verify navigation | Manual: verify keys do not conflict |
| 4.1–4.3 (Skip link) | (existing; no change) | Manual: tab on load, activate skip link | Manual: verify link is announced and works |
| 5.1–5.3 (Current notice indicator) | (cannot test DOM without browser) | Manual: check `aria-current` in DevTools | Manual: verify "current page" is announced |
| 6.1–6.4 (Format persistence) | (storage cannot be tested in Node) | Manual: switch format, reload, check format is restored | (not applicable) |
| 7.1–7.2 (Focus visibility, reduced motion) | (existing; no change) | Manual: tab through controls, verify outline | Manual: enable reduced-motion, verify no transitions |
| Syntax check | `tests/syntax.test.js` checks all source files parse | (not applicable) | (not applicable) |

**Node tests cover:** Pure message construction, position lookup, syntax checks.

**Browser tests required:** Focus behaviour, `aria-current`, storage persistence, visual focus outline, announcement in `#message`.

**Screen-reader tests required:** Announcement is spoken, focus change is announced, `aria-current` is announced, skip link works, keys do not conflict with screen-reader shortcuts.

## Decisions

### Why not include subpage information in the announcement?

The brief says "for example 'Page 104, Repair morning, notice 4 of 9'". Subpage information ("subpage 2 of 3") is useful in Teletext format where the reader sees one subpage at a time, but in Reading view the full notice is shown. The existing `step()` function already announces subpage position for Teletext. Adding it to Reading view would be redundant and verbose. The announcement focuses on which notice the reader is on, not which subpage.

**Decision:** Subpage information is announced only in Teletext format, via the existing `step()` message. `buildAnnouncementMessage()` does not include it.

### Why not move focus in Teletext format?

Teletext format shows a 40-column grid with visible page numbers and a clear spatial layout. Readers can see the full page without scrolling. Moving focus would be disruptive. Reading view, by contrast, may require scrolling, and screen-reader users benefit from starting at the heading.

**Decision:** Focus moves to the heading only in Reading view.

### Why not add a "reading view only" key for next/previous notice?

The brief says "add only what is missing to go to the next notice, the previous notice and the index from Reading view." The arrow keys and Next/Previous buttons already work. The Home key goes to the index. In Reading view, `step()` already skips subpages and goes directly to the next or previous notice. No new keys are needed.

**Decision:** No new keys. Existing navigation works for Reading view.

### Why store format separately from the bulletin?

The bulletin is a content file. The format choice is a UI preference. Storing them separately allows the reader to switch format without editing the bulletin. If the reader imports a new bulletin, the format preference persists.

**Decision:** Format is stored under `aftertext:format:v1`, separate from the bulletin storage key.

### Why not add a test for focus or announcements in Node?

Node cannot access the DOM or `document.getElementById`. Testing focus requires a browser. The brief says "add a Node test that at least parses every file", which is satisfied by `tests/syntax.test.js`. Browser and screen-reader checks are listed for a person to do.

**Decision:** Node tests cover pure logic and syntax only. Focus and announcement behaviour are listed as manual checks.

### Why increment the service worker cache version?

The service worker must cache the new `src/reading.js` file. Changing the cache name from `v2` to `v3` forces installed service workers to re-fetch all files, ensuring the new module is available offline.

**Decision:** Increment cache version to `v3` and add `./src/reading.js` to `ASSETS`.

### What if the reader switches format mid-session and storage is unavailable?

The format is kept in `state.format` for the session. The app tries to save it but does not report an error if storage fails. On reload, the default format is used. This matches the existing behaviour for bulletin persistence: if storage is unavailable, the reader is told to export a file.

**Decision:** Format persistence fails silently. No error message for a storage failure on format save.
