# Adopted implementation decisions

2026-11-02: Kiro generated `kiro-spec.md` through the native CLI with the local `spec` agent. Codex reviewed it before implementation. The original response is preserved. These corrections govern implementation:

- Grid rows are 40 **display columns**, not 40 JavaScript characters. Grapheme clusters stay intact. Width is an explicit approximation; the full-text reading mode preserves all original text and handles font-dependent shaping. Preserve source text in row metadata so layout padding and inserted wrapping never masquerade as original characters.
- Keep original strings and spaces exactly. Reject invalid input rather than trimming or silently normalizing it. The JSON round trip is lossless; source row records also reconstruct the title and body. Index pages may have subpages too.
- Validate actual calendar dates and timezone ranges, not just `Date.parse`, which accepts impossible dates. Require explicit timezone. Check file bytes before parsing. Reject unknown fields, non-plain objects, controls, unpaired surrogates, bidi controls and non-http(s) URLs. Do not reject an ordinary URL just because its path contains the word `script`.
- Offline reload requires a service worker that caches the app shell. Local storage alone only saves data. Distinguish app-cached state from saved bulletin state, and handle unavailable storage without falsely reporting a save.
- The app may fetch its own static files on first load. No cross-origin API, font, analytics, model or advertising requests. Optional source links open only after an explicit click.
- Target current browsers with ES modules, `Intl.Segmenter`, service workers and local storage. The broad old-browser version claim in the generated draft is untested and is not adopted.
- The sample has fictional community notices only, dated 2026-11-02, and no emergency, health or weather claims. No invented source URL. A future issue date is labelled as future, not as fresh.
- The index is useful immediately on first load via a visibly labelled sample bulletin. Editing begins from the active bulletin. Imported bulletins may be cleared only by an explicit reset confirmation; export is available first.
- A broadcast-blue masthead, readable white-on-dark text, yellow headings and cyan page links communicate the revived medium. The normal reading mode is default below 768px. Controls outside the grid stay ordinary, large and labelled.
- No claim of user adoption, competitive score, eligibility approval, accessibility certification or live official information.

Implementation is ordinary software construction and deterministic verification, with no model training, leaderboard tuning, competition-data evaluation or prize-score experiment. Native Kiro use is capped at 10 free credits for this first prototype; cash budget is zero.
