# Aftertext

A community bulletin that brings back teletext. Give each notice a page number, export a small text file, and read the saved bulletin offline.

The reader has a 40-column page view, numeric navigation and a keypad. Reading view shows the complete notice with ordinary text wrapping and is the default on a narrow phone. It moves keyboard focus to the heading of each notice it opens and reports the page, title and position in the page's status region. The editor previews long notices across subpages and measures the actual exported file size.

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

The app stores the current bulletin and the reader's choice of Teletext or Reading view in local storage and caches its static files with a service worker. It has no accounts, analytics, runtime model calls or third-party network requests. Optional source links open only when the reader chooses them. Exporting creates a downloadable JSON file; Aftertext does not send it to anyone.

Offline access needs a successful first load. Clearing browser data removes the saved bulletin and app cache. If storage is unavailable, the app keeps the current session usable and asks the reader to export a copy. The file contains the full bulletin, including any personal information its author puts there.

## Text contract

Bulletins contain up to 32 notices and occupy at most 256,000 UTF-8 bytes. A notice has a unique page number from 101 to 899; page 100 is the index. Imported fields, dates, source URLs and text limits are validated before the existing bulletin is replaced.

The compiler preserves original strings, whitespace and Unicode. Source records reconstruct each title and body independently of layout padding. Grapheme clusters are kept intact. The grid uses a documented approximation for wide characters and emoji; font shaping can differ. Reading view retains the original text without a fixed column width. The app relies on current browser support for `Intl.Segmenter`, ES modules and service workers.

## Kiro development record

This project is being built for Kiroween 2026, Resurrection category. Concept notes existed before the event opened; all application code and the retained Kiro specification were created on November 2, 2026 KST, during the submission period. The Reading view work was added on November 16, 2026 KST.

- Kiro produced the initial specification in [`.kiro/specs/aftertext/kiro-spec.md`](.kiro/specs/aftertext/kiro-spec.md), using a local custom agent with no external tools.
- Codex reviewed it and recorded corrections in [`decisions.md`](.kiro/specs/aftertext/decisions.md), including the need for an app-shell cache and source records that separate original text from presentation padding.
- Kiro generated the initial validation module through the native CLI. Its automatic model route timed out twice without output. A direct, available free-tier model returned the module. Codex corrected syntax defects in its URL helper and a whitespace-only input check before testing.
- Codex implemented the compiler, reader, editor and tests. The mixed-text tests exercise Unicode, whitespace and subpage reconstruction; browser checks exercise actual file download, fresh-context import and offline reload.
- For the Reading view, Kiro CLI ran a second custom agent, [`spec-build`](.kiro/agents/spec-build.json), headless with file read and write tools and no shell. It loaded the steering documents [`product.md`](.kiro/steering/product.md) and [`tech.md`](.kiro/steering/tech.md), wrote `requirements.md`, `design.md` and `tasks.md` in [`.kiro/specs/reading-view/`](.kiro/specs/reading-view/), and implemented the tasks: `src/reading.js`, its first tests, and the changes to `src/ui.js` and `sw.js`.
- A `postToolUse` hook on the write tool ([script](.kiro/scripts/test-after-write.sh)) ran `npm test` after every write. The agent could not run tests itself, so the hook saved each result to a file the agent was told to read.
- Claude Code wrote the feature brief, `tech.md`, the agent file and the hook script, then reviewed Kiro's output. The review found three defects that Kiro's tests had missed: focus sent to a heading that could not receive it, a wrong notice position for bulletins stored out of page order, and a Teletext status line without its subpage. Claude Code wrote eight failing tests and Kiro fixed the defects in one more session; the hook recorded seven failing runs before the suite passed. The [run record](.kiro/specs/reading-view/run-record.md) lists the commands, the hook runs and who wrote what.
- Not used: MCP, the interactive spec mode of the CLI, standalone hook files in `.kiro/hooks/`, the Kiro IDE, Crew and powers.

AI assistance is part of the development process. The original Kiro specification is retained rather than rewritten to imply that its first version was correct. There are no claims of user adoption or competitive results.

## Validation scope

The local checks cover pure validation and compilation, desktop and mobile Chromium flows, malformed file preservation, and offline reload after import. Chrome 156 on macOS was used for the first browser checks and Chrome 157 for the rerun on November 16, 2026.

Reading view was also checked from the keyboard alone in Chromium 156: the skip link, the focus target after each move, the visible focus outline, the text written to the status region, the accessibility tree, widths of 320 and 375 CSS pixels, and a reload with the local server stopped. No screen reader was run, so speech output is unverified. Other browser engines and physical devices have not been tested. These checks do not establish full accessibility conformance.

The source and fictional sample notices are available under the [MIT license](LICENSE). There are no runtime dependencies or third-party image, font or audio assets.
