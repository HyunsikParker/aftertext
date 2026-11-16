## Inspiration

A community notice should be easy to find and keep. Aftertext uses teletext's numbered pages and limited-width screen for a bulletin that someone can edit, export and read offline. A reading-room timetable, a book swap and a repair morning all fit in one small file.

The Resurrection entry is the numbered text service itself: a 40-column page view, subpages and remote-style navigation, rebuilt around browser storage and portable files. The example village and its notices are fictional.

## What it does

Open a notice from the contents or type its three-digit page number. Long notices continue across subpages. Reading view shows the full text with ordinary wrapping and opens by default at phone width.

Reading view can be used from the keyboard alone. Pressing its button puts keyboard focus on the heading of the notice shown. Moving to another notice with the arrow keys, Home, a typed page number or the buttons on the page does the same and writes one line to the page's status region, such as "Page 202, Repair morning, notice 3 of 5". The choice between Teletext and Reading view is remembered on the device.

The editor previews each page while the author works. Saving keeps the bulletin on that device; exporting downloads a JSON file that another Aftertext session can open. After the first successful load, a service worker keeps the app available offline. The issue date remains visible so readers can judge the age of their copy.

The app supports up to 32 notices and a 256,000-byte file. It needs no account or runtime AI service. There is no server-side publishing or automatic synchronization: the person sharing a bulletin chooses how to pass its file to others.

## How it was built with Kiro

Kiro CLI produced the initial specification using a local custom agent named `spec`. That agent had no external tools and was instructed to use only the supplied brief, produce testable requirements and avoid inventing results. Its configuration and original output are included in the root `.kiro` directory.

Codex reviewed that specification before implementing it. The review separated display padding from original text and added an app-shell cache: saving bulletin data alone would not make the application reload offline. Those decisions are recorded beside the retained specification.

Kiro CLI also generated the initial input validator. Its automatic model route timed out twice without output; an available free-tier model selected directly returned the module. Codex corrected syntax defects in its URL helper and a missing whitespace-only check, then implemented the compiler, editor, reader and tests. The README identifies each tool's contribution. That first build used no Kiro hook, MCP server, Crew or power.

The Reading view work on November 16 went through a Kiro spec. A second custom agent, `spec-build`, ran headless in Kiro CLI with file read and write tools and no shell. It loaded two steering documents, `product.md` and a new `tech.md` that states the limits, the accessibility rules and the test command, and wrote `requirements.md`, `design.md` and `tasks.md` under `.kiro/specs/reading-view/`. It then implemented the tasks in separate sessions. A `postToolUse` hook on the write tool ran `npm test` after every write and saved the result to a file that the agent was told to read.

Review of that work found three defects its tests had missed: focus was sent to a heading that could not receive it, the notice position was wrong for a bulletin stored out of page order, and the Teletext status line had lost the subpage. Claude Code wrote eight failing tests for them and gave the fix back to Kiro; the hook log records seven failing runs and then a pass. Kiro wrote the three spec files, `src/reading.js`, its first tests and the changes to `src/ui.js` and `sw.js`. Claude Code wrote the feature brief, `tech.md`, the agent file, the hook script and the eight review tests. MCP, the interactive spec mode, Kiro Crew and powers were not used. The run record is in `.kiro/specs/reading-view/run-record.md`.

The application uses plain JavaScript, HTML and CSS with browser APIs. There is no build step or runtime dependency. The Kiro specifications, implementation decisions, steering documents, agent files and hook script are public under `.kiro/`.

## Challenges and checks

Wrapping Unicode into a fixed-width grid can split a visible character or confuse layout spaces with source spaces. Aftertext segments grapheme clusters and records original title and body text separately from padded grid rows. Its display-width calculation is an approximation; reading view handles ordinary font shaping without the grid constraint.

Twenty-four Node tests cover calendar validation, malformed imports, URL restrictions, file limits, source reconstruction, 150 deterministic mixed-text cases, the status line, the focus rules and a syntax check of every source file. Browser checks cover editing, a real download, import into a fresh browser context, phone layout and offline reload with the ordinary HTTP cache cleared. Review found a missing validator in the service-worker asset list. It was added, and the offline check was strengthened to prevent the ordinary browser cache from masking that error.

The demo is a narrated recording of actual browser interactions, including a disconnected reload. The displayed notices are sample data. Reading view was checked in Chromium from the keyboard alone: the focus target after each move, the status line, the accessibility tree, widths of 320 and 375 pixels, and a reload with the server stopped. No screen reader was run, so speech output is unverified. The application has not yet been tested with a community group.

## What comes next

The next useful step is a small usability study with bulletin authors and readers, followed by testing in other browser engines and with screen readers. Updates currently travel as files, so a reader's saved copy does not change when an author revises a notice. Aftertext exposes the issue date and leaves that distribution choice explicit.
