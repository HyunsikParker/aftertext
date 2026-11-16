# Reading view: Requirements

The reading-view feature adds screen-reader and keyboard support to the bulletin reader. It enables focus management, polite announcements, format persistence, and navigation improvements so that readers using keyboards, screen readers or large text can read saved bulletins effectively.

## What exists today

The following elements and behaviours are already in place and remain unchanged:

- `#reader-content` has `tabindex="-1"` and can receive programmatic focus.
- `#message` is a polite live region (`role="status" aria-live="polite"`).
- A skip link at the top of the page targets `#reader-content` with the text "Skip to bulletin".
- Two format buttons (`#grid-mode` and `#text-mode`) toggle between Teletext and Reading view. Their `aria-pressed` state reflects the current format.
- The app has Previous and Next buttons, a page-input form, a contents list with page-number links, and a numeric keypad.
- Keyboard shortcuts for digit keys (0–9), arrow keys (← and →), Home, Escape and Backspace already work in reader mode when focus is outside a form field.
- The state object tracks the current page index (`state.page`), format (`state.format`) and mode (`state.mode`).
- `go(number)` navigates to a page number; `step(direction)` moves by ±1 in the compiled page list; `renderReader()` updates the screen.
- In Reading view (`state.format === 'text'`), `step()` skips subpages of the same notice.
- The service worker caches static files; local storage persists the bulletin.

Missing behaviours:

- No polite announcement message is constructed or shown after navigation.
- Focus does not move to the notice heading after navigation in Reading view.
- Contents links do not set `aria-current` to mark the notice being read.
- The chosen format (Teletext or Reading view) is not persisted across sessions.
- No test covers focus, announcements or key behaviour.
- No test checks that every source file and the service worker can be parsed.

## Requirements

### 1. Page-change announcement

**User story:** As a screen-reader user navigating a bulletin, I want to hear a short description of the page I have just opened, so that I know where I am without reading the full text.

**Acceptance criteria:**

1.1. WHEN the reader activates Next, Previous, a contents link, the keypad, or types a three-digit page number, THE SYSTEM SHALL construct a polite announcement message that includes the page number, the notice title or "index", and the notice position within the bulletin count.

1.2. WHEN the constructed message is available, THE SYSTEM SHALL write it to the live region (`#message`) so that it is announced by assistive technology.

1.3. WHEN the app loads for the first time in a session, THE SYSTEM SHALL NOT announce the initial page.

1.4. WHEN the editor is open, THE SYSTEM SHALL NOT announce page changes.

1.5. WHEN the notice is longer than one subpage, THE SYSTEM SHALL include subpage information in the Teletext format only, not in Reading view.

### 2. Focus management in Reading view

**User story:** As a keyboard or screen-reader user in Reading view, I want focus to move to the notice heading after I navigate, so that I can read forward from the new notice immediately.

**Acceptance criteria:**

2.1. WHEN the reader navigates to a different notice in Reading view using Next, Previous, a contents link, the keypad or a typed page number, THE SYSTEM SHALL move focus to the heading element of the notice now shown.

2.2. WHEN the reader navigates to the index (page 100) in Reading view, THE SYSTEM SHALL move focus to the index heading.

2.3. WHEN the app loads for the first time in a session, THE SYSTEM SHALL NOT move focus.

2.4. WHEN the editor is open, THE SYSTEM SHALL NOT move focus after navigation.

2.5. WHEN the format is Teletext (grid mode), THE SYSTEM SHALL NOT move focus to the notice heading.

### 3. Navigation keys

**User story:** As a keyboard user, I want the digit keys, arrow keys and Home to work regardless of which format I have chosen, so that I can navigate quickly without leaving the keyboard.

**Acceptance criteria:**

3.1. WHEN the reader is in reader mode and focus is not in a text input, textarea, select or contenteditable element, THE SYSTEM SHALL respond to digit keys (0–9), arrow keys (← and →), Home, Escape and Backspace as documented.

3.2. WHEN a digit key is pressed, THE SYSTEM SHALL add that digit to the page buffer and display it.

3.3. WHEN the page buffer reaches three digits, THE SYSTEM SHALL navigate to that page number.

3.4. WHEN the arrow left key is pressed, THE SYSTEM SHALL navigate to the previous notice or subpage.

3.5. WHEN the arrow right key is pressed, THE SYSTEM SHALL navigate to the next notice or subpage.

3.6. WHEN the Home key is pressed, THE SYSTEM SHALL navigate to page 100 (the index).

3.7. WHEN Escape is pressed, THE SYSTEM SHALL clear the page buffer.

3.8. WHEN Backspace is pressed and the buffer is not empty, THE SYSTEM SHALL remove the last digit.

3.9. WHEN any key with a control, alt or meta modifier is pressed, or when focus is in a form field, THE SYSTEM SHALL NOT handle the key and SHALL allow the browser's default behaviour.

### 4. Skip link

**User story:** As a keyboard user, I want the first focusable element to be a skip link, so that I can jump directly to the bulletin content without tabbing through the masthead and toolbar.

**Acceptance criteria:**

4.1. WHEN the page is loaded, THE SYSTEM SHALL have a visually hidden skip link as the first focusable element.

4.2. WHEN the skip link receives focus, THE SYSTEM SHALL make it visible on screen.

4.3. WHEN the skip link is activated, THE SYSTEM SHALL move focus to the reader content area.

### 5. Current notice indicator

**User story:** As a screen-reader user browsing the contents list, I want the notice I am currently reading to be marked, so that I know which page I am on when I return to the list.

**Acceptance criteria:**

5.1. WHEN a notice is displayed in the reader, THE SYSTEM SHALL set `aria-current="page"` on the corresponding button in the contents list.

5.2. WHEN a different notice is displayed, THE SYSTEM SHALL remove `aria-current` from the previous button and set it on the new one.

5.3. WHEN the index (page 100) is displayed, THE SYSTEM SHALL set `aria-current="page"` on the index button in the contents list.

### 6. Format persistence

**User story:** As a reader who prefers Reading view, I want the app to remember my choice, so that I do not have to switch the format every time I open the app.

**Acceptance criteria:**

6.1. WHEN the reader switches from Teletext to Reading view or vice versa, THE SYSTEM SHALL store that choice on the device.

6.2. WHEN the app is loaded in a later session, THE SYSTEM SHALL restore the reader's last chosen format.

6.3. IF device storage is unavailable, THE SYSTEM SHALL keep the format for the current session and SHALL NOT report a storage failure as an error to the reader.

6.4. WHEN storage is unavailable, THE SYSTEM SHALL continue to allow format switching within the session.

### 7. Focus visibility and reduced motion

**User story:** As a keyboard user, I want to see where focus is at all times, and as a reader sensitive to motion, I want animations to be disabled when I have set that preference.

**Acceptance criteria:**

7.1. WHEN any interactive element receives keyboard focus, THE SYSTEM SHALL display a visible outline of at least 2 CSS pixels with at least 3:1 contrast against adjacent colours.

7.2. WHEN the user's system preference is set to `prefers-reduced-motion: reduce`, THE SYSTEM SHALL disable all animations and transitions.

## Not covered

- A single-page view of the entire bulletin.
- A printable format.
- Translation or internationalization beyond the existing English labels.
- Speech synthesis or audio output beyond screen-reader support.
- Editor keyboard shortcuts, editor focus management, or editor-specific announcements.
- Changes to the README, submission text, or media files.
- Touch gestures, swipe navigation, or mobile-specific interactions beyond responsive layout.
- Support for browsers that do not implement `Intl.Segmenter`, ES modules or service workers.
