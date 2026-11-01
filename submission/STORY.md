## Inspiration

A community notice should be easy to find and keep. Aftertext uses teletext's numbered pages and limited-width screen for a bulletin that someone can edit, export and read offline. A reading-room timetable, a book swap and a repair morning all fit in one small file.

The Resurrection entry is the numbered text service itself: a 40-column page view, subpages and remote-style navigation, rebuilt around browser storage and portable files. The example village and its notices are fictional.

## What it does

Open a notice from the contents or type its three-digit page number. Long notices continue across subpages. Reading view shows the full text with ordinary wrapping and opens by default at phone width.

The editor previews each page while the author works. Saving keeps the bulletin on that device; exporting downloads a JSON file that another Aftertext session can open. After the first successful load, a service worker keeps the app available offline. The issue date remains visible so readers can judge the age of their copy.

The app supports up to 32 notices and a 256,000-byte file. It needs no account or runtime AI service. There is no server-side publishing or automatic synchronization: the person sharing a bulletin chooses how to pass its file to others.

## How it was built with Kiro

Kiro CLI produced the initial specification using a local custom agent named `spec`. That agent had no external tools and was instructed to use only the supplied brief, produce testable requirements and avoid inventing results. Its configuration and original output are included in the root `.kiro` directory.

Codex reviewed that specification before implementing it. The review separated display padding from original text and added an app-shell cache: saving bulletin data alone would not make the application reload offline. Those decisions are recorded beside the retained specification.

Kiro CLI also generated the initial input validator. Its automatic model route timed out twice without output; an available free-tier model selected directly returned the module. Codex corrected syntax defects in its URL helper and a missing whitespace-only check, then implemented the compiler, editor, reader and tests. The README identifies each tool's contribution. Kiro hooks, MCP, Crew and powers were not used.

The application uses plain JavaScript, HTML and CSS with browser APIs. There is no build step or runtime dependency. The original Kiro specification, implementation decisions and product steering document are public under `.kiro/`.

## Challenges and checks

Wrapping Unicode into a fixed-width grid can split a visible character or confuse layout spaces with source spaces. Aftertext segments grapheme clusters and records original title and body text separately from padded grid rows. Its display-width calculation is an approximation; reading view handles ordinary font shaping without the grid constraint.

Nine pure-module tests cover calendar validation, malformed imports, URL restrictions, file limits, source reconstruction and 150 deterministic mixed-text cases. Browser checks cover editing, a real download, import into a fresh browser context, phone layout and offline reload with the ordinary HTTP cache cleared. Review found a missing validator in the service-worker asset list. It was added, and the offline check was strengthened to prevent the ordinary browser cache from masking that error.

The demo is a silent recording of actual browser interactions, including a disconnected reload. The displayed notices are sample data. The application has not yet been tested with a community group or a screen reader.

## What comes next

The next useful step is a small usability study with bulletin authors and readers, followed by testing in other browser engines and with screen readers. Updates currently travel as files, so a reader's saved copy does not change when an author revises a notice. Aftertext exposes the issue date and leaves that distribution choice explicit.
