# Reading view: Tasks

## Implementation tasks

- [x] 1. Create src/reading.js with announcement message builder
  - Export `buildAnnouncementMessage(pageData, totalNotices)` that constructs a polite message string
  - Return "Page 100, index, N notice" or "notices" when `kind === 'index'`
  - Return "Page {number}, {title}, notice {position} of {total}" for articles
  - Export `findNoticePosition(pageNumber, articles)` that returns the 1-based position of a notice
  - Return 0 if the page number is not in the articles array
  - No DOM access, no side effects, pure functions only
  - _Requirements: 1.1_

- [x] 2. Create tests/reading.test.js and tests/syntax.test.js
  - Import `node:test`, `node:assert/strict` and `src/reading.js`
  - Test `buildAnnouncementMessage` for index page: returns "Page 100, index, 9 notices"
  - Test `buildAnnouncementMessage` for article page: returns "Page 201, Library hours, notice 1 of 7"
  - Test `buildAnnouncementMessage` with one notice: returns "1 notice" not "notices"
  - Test `findNoticePosition` returns correct 1-based position
  - Test `findNoticePosition` returns 0 for missing page
  - In `tests/syntax.test.js`, import `node:child_process` and use `execFileSync` to run `node --check` on `src/ui.js`, `src/core.js`, `src/validate.js`, `src/sample.js`, `src/reading.js`, `sw.js`
  - Catch errors and report which file failed to parse
  - _Requirements: 1.1, 1.5_

- [x] 3. Update src/ui.js with announcements and focus
  - Import `buildAnnouncementMessage` and `findNoticePosition` from `./reading.js`
  - In `go(number, subpage, announce)`, replace the short notice message with `buildAnnouncementMessage(state.compiled.pages[state.page], state.bulletin.articles.length)` when `announce` is true
  - In `step(direction)`, if `state.format === 'text'`, use `buildAnnouncementMessage()` instead of the subpage message
  - After `renderReader()` in navigation functions (`go`, `step`, contents button click, keypad digit, jump form, wordmark), if `state.mode === 'reader'` and `state.format === 'text'`, call `$('reading-text').querySelector('h2')?.focus()`
  - Do not move focus on the initial load in `setBulletin()`
  - Do not move focus when the editor is open
  - Ensure `renderReader()` sets `aria-current="page"` on the active contents button (already exists, verify it works)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3_

- [x] 4. Add format persistence to src/ui.js
  - In `#grid-mode` and `#text-mode` click handlers, after updating `state.format`, try to write it to `localStorage.setItem('aftertext:format:v1', state.format)`
  - Wrap in try-catch and ignore errors
  - After restoring the bulletin in the initial load block, read the saved format: `const saved = localStorage.getItem('aftertext:format:v1'); if (saved === 'grid' || saved === 'text') state.format = saved;`
  - Wrap in try-catch and ignore errors
  - Do not change the default format logic (mobile defaults to text, desktop to grid)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 5. Update sw.js cache for the new module
  - Change `CACHE` from `${PREFIX}v2` to `${PREFIX}v3`
  - Add `'./src/reading.js'` to the `ASSETS` array
  - _Requirements: (supports all; ensures offline access)_

- [x] 6. Verify navigation keys still work
  - Read the keyboard event listener in `src/ui.js`
  - Confirm that digit keys, arrow keys, Home, Escape and Backspace are handled
  - Confirm that the handler checks `state.mode === 'reader'` and skips if focus is in a form field
  - Confirm that ctrl, alt and meta modifiers are ignored
  - No code change needed if these checks are present
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 7. Fix focus, notice position and Teletext subpage found in review
  - Export `focusReadingHeading(host)` from reading.js that sets `tabindex="-1"` on the h2 element and calls `.focus()`, returning true on success or false if no heading is found
  - Export `shouldMoveFocus(state)` from reading.js that returns true only when `state.mode === 'reader'`, `state.format === 'text'`, and `state.initiated === true`
  - Update `buildAnnouncementMessage` to accept an optional `format` parameter; when `format === 'grid'` and `subpageCount > 1`, append subpage information
  - Fix `findNoticePosition` to sort articles by page before finding position, so it works correctly even when articles are stored in non-page order
  - Update `go()` to accept an `initiated` parameter (default true) and use `shouldMoveFocus` to determine when to call `focusReadingHeading`
  - Update `step()` to call `focusReadingHeading` via `shouldMoveFocus`
  - Update the text-mode button click handler to call `focusReadingHeading` when switching to text format in reader mode
  - Update the wordmark click handler to pass `initiated=false` to `go(100)` so focus does not move on app-load navigation
  - Pass `state.compiled.articles` instead of `state.bulletin.articles` to `buildAnnouncementMessage` in both `go()` and `step()`
  - Pass `state.format` to `buildAnnouncementMessage` in both `go()` and `step()`
  - _Requirements: 1.1, 1.5, 2.1, 2.2, 2.3_

## Checks for a person

The following checks require a browser, keyboard or screen reader. They are not included in the automated test run.

### Browser checks

1. Open the app in Chrome or Firefox. Navigate using Next, Previous, and the contents list. Check that `#message` shows "Page {number}, {title}, notice {position} of {total}".
2. Switch to Reading view. Navigate to a notice. Open DevTools and verify that `document.activeElement` is the `<h2>` heading inside `#reading-text`.
3. Navigate to the index. Verify focus is on the index heading.
4. Switch to Teletext format. Navigate. Verify focus does not move to the heading.
5. Reload the app. Verify that focus does not move on initial load.
6. Open the editor. Switch pages in the preview. Verify that focus does not move and no announcement is shown.
7. Open DevTools and inspect the contents list. Verify that the active notice button has `aria-current="page"`.
8. Switch to Reading view. Reload the app. Verify that Reading view is still selected.
9. Switch to Teletext. Reload. Verify that Teletext is still selected.
10. Open DevTools Console. Run `localStorage.removeItem('aftertext:format:v1')`. Reload. Verify that the default format (grid on desktop, text on mobile) is used.
11. Tab through the page. Verify that every focusable element has a visible outline of at least 2px.
12. Set the system preference to `prefers-reduced-motion: reduce`. Reload the app. Verify that no animations or transitions occur.

### Keyboard checks

1. Load the app. Press Tab. Verify that the first focusable element is the skip link and that it is visible.
2. Activate the skip link (Enter or Space). Verify that focus moves to `#reader-content`.
3. Open a notice. Press the right arrow key. Verify that the next notice is shown.
4. Press the left arrow key. Verify that the previous notice is shown.
5. Press Home. Verify that the index (page 100) is shown.
6. Type `2`, `0`, `1`. Verify that the page buffer shows "201" and that page 201 is opened.
7. Type `1`, `0`. Press Escape. Verify that the buffer is cleared and no navigation occurs.
8. Type `1`. Press Backspace. Verify that the buffer is empty.
9. Focus the page-input field. Type `2`. Verify that the keyboard handler does not intercept the digit and that "2" appears in the field.
10. Hold Ctrl and press the right arrow key. Verify that the browser's default behaviour occurs (e.g., move cursor by word) and that no page navigation occurs.

### Screen-reader checks

1. Open the app with a screen reader (e.g., NVDA, JAWS, VoiceOver). Press Tab. Verify that the skip link is announced.
2. Activate the skip link. Verify that the screen reader announces the reader content area.
3. Navigate to a notice using the Next button. Verify that the screen reader announces "Page {number}, {title}, notice {position} of {total}".
4. Switch to Reading view. Navigate to another notice. Verify that the screen reader announces the heading and begins reading the notice text.
5. Open the contents list. Verify that the active notice is announced as "current page".
6. Press the right arrow key. Verify that the screen reader announces the new page and that the announcement is not interrupted or repeated.
7. Open the editor. Switch to a different notice in the preview. Verify that no announcement is made.
8. Return to the reader. Press Home. Verify that the screen reader announces "Page 100, index, {N} notices" and reads the index heading.
9. Verify that digit keys, arrow keys and Home do not conflict with screen-reader shortcuts (e.g., NVDA's browse mode keys).
10. Set `prefers-reduced-motion: reduce`. Reload the app. Verify that no motion or animation occurs that could trigger vestibular issues.
