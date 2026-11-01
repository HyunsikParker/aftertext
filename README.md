# Aftertext

A community bulletin that brings back teletext. Give each notice a page number, export a small text file, and read the saved bulletin offline.

The reader has a 40-column page view, numeric navigation and a keypad. Reading view shows the complete notice with ordinary text wrapping and is the default on a narrow phone. The editor previews long notices across subpages and measures the actual exported file size.

## Run locally

Serve this directory with Python 3:

```sh
python3 -m http.server 4179 --bind 127.0.0.1
```

Open `http://127.0.0.1:4179/`. No package installation or build step is needed. A public deployment needs HTTPS for the service worker; localhost also supports it.

To run the pure-module tests, use Node.js 22 or later:

```sh
npm test
```

The browser checks use Python Playwright and Chrome. With those installed and the local server running:

```sh
python3 tests/browser_check.py
```

Set `CHROME_PATH` to the Chrome executable on your machine. Set `AFTERTEXT_URL` to test another deployment. Screenshots and results go into the ignored `artifacts/browser/` directory. The offline check clears Chrome's ordinary HTTP cache before reloading; the app must load from the service-worker cache.

## Try the complete flow

1. Open a numbered notice from the contents, or type `201` outside a form field.
2. Open **Edit bulletin**, change a notice and choose **Save bulletin**.
3. Choose **Export file**. The JSON file contains the bulletin's original text and issue date.
4. Open that file in another Aftertext browser session with **Open file**.
5. Wait for **App available offline on this device** before disconnecting. Reload the app and browse the saved bulletin.

The example bulletin is fictional. Its places, events and opening times are made up. Replace it with information you have checked and are entitled to share.

## What stays on the device

The app stores the current bulletin in local storage and caches its static files with a service worker. It has no accounts, analytics, runtime model calls or third-party network requests. Optional source links open only when the reader chooses them. Exporting creates a downloadable JSON file; Aftertext does not send it to anyone.

Offline access needs a successful first load. Clearing browser data removes the saved bulletin and app cache. If storage is unavailable, the app keeps the current session usable and asks the reader to export a copy. The file contains the full bulletin, including any personal information its author puts there.

## Text contract

Bulletins contain up to 32 notices and occupy at most 256,000 UTF-8 bytes. A notice has a unique page number from 101 to 899; page 100 is the index. Imported fields, dates, source URLs and text limits are validated before the existing bulletin is replaced.

The compiler preserves original strings, whitespace and Unicode. Source records reconstruct each title and body independently of layout padding. Grapheme clusters are kept intact. The grid uses a documented approximation for wide characters and emoji; font shaping can differ. Reading view retains the original text without a fixed column width. The app relies on current browser support for `Intl.Segmenter`, ES modules and service workers.

## Kiro development record

This project is being built for Kiroween 2026, Resurrection category. Concept notes existed before the event opened; all application code and the retained Kiro specification were created on November 2, 2026 KST, during the submission period.

- Kiro produced the initial specification in [`.kiro/specs/aftertext/kiro-spec.md`](.kiro/specs/aftertext/kiro-spec.md), using a local custom agent with no external tools.
- Codex reviewed it and recorded corrections in [`decisions.md`](.kiro/specs/aftertext/decisions.md), including the need for an app-shell cache and source records that separate original text from presentation padding.
- Kiro generated the initial validation module through the native CLI. Its automatic model route timed out twice without output. A direct, available free-tier model returned the module. Codex corrected syntax defects in its URL helper and a whitespace-only input check before testing.
- Codex implemented the compiler, reader, editor and tests. The mixed-text tests exercise Unicode, whitespace and subpage reconstruction; browser checks exercise actual file download, fresh-context import and offline reload.

AI assistance is part of the development process. The original Kiro specification is retained rather than rewritten to imply that its first version was correct. There are no claims of user adoption or competitive results.

## Validation scope

The local checks cover pure validation and compilation, desktop and mobile Chromium flows, malformed file preservation, and offline reload after import. Chrome 156 on macOS was used for the browser checks. Other browser engines, physical devices and screen-reader combinations have not yet been tested. These checks do not establish full accessibility conformance.

The source and fictional sample notices are available under the [MIT license](LICENSE). There are no runtime dependencies or third-party image, font or audio assets.
