# Aftertext Specification

## Overview

Aftertext is an offline-friendly community teletext application. A volunteer editor composes a dated bulletin in a form; the compiler produces real 40-column text pages with three-digit page numbers; the app exports a portable JSON bulletin and imports it on another device without a server or account. Readers navigate with numeric keys, an on-screen keypad, topic links, and previous/next buttons. A separate large-text reading mode provides semantic headings and ordinary wrapping for narrow phone screens.

The demo bulletin is visibly fictional, dated, and never presented as a live public advisory. No invented real users, response statistics, forecasts, transit alerts, or adoption claims are present anywhere in the application or specification.

---

## Requirements

### R1 — Functional Requirements

#### R1.1 Editor Mode

- A volunteer editor opens a form with labelled fields for bulletin name, issue date, and a list of articles.
- Each article entry has: page number (three-digit integer), category, title, body, and an optional source URL.
- The editor validates input before compilation and shows inline error messages for each field that fails validation.
- The editor produces a live preview of the compiled teletext page for the currently selected article, including a byte-size measurement of the serialized JSON payload.
- The editor can export the bulletin as a `.json` file via a download link.
- The editor can import a `.json` bulletin file via a file picker, replacing the current working bulletin.
- The editor is a separate mode from the reader. It does not overlay marketing sections or promotional content on the reader.

#### R1.2 Compiler

- The compiler is a pure, deterministic ES module function: `(bulletin) => CompiledBulletin`.
- Input: a validated bulletin object conforming to the data contract (see R1.5).
- Output: an index page (page 100) and one or more article pages per article, each page exactly 40 columns wide and at most 25 rows tall.
- Articles whose title or body exceeds a single page produce subpages. Text is paginated but never silently discarded.
- The compiler also produces an accessible full-text form of each article with semantic heading and paragraph elements, used by the large-text reading mode.
- The compiler is Unicode-aware: it counts code points (not UTF-16 code units), handles wide characters and combining marks per the width policy (see D3), and documents known limitations.
- The compiler is lossless across subpages: concatenating the text of all subpages for an article reconstructs the original title and body text exactly.
- Page numbering is stable: the same input bulletin always produces the same page-to-content mapping.

#### R1.3 Reader Mode

- The reader displays compiled teletext pages in a fixed-width monospace text area of 40 columns by at most 25 rows.
- Navigation methods, all keyboard and touch operable:
  - Numeric key input (physical keyboard or on-screen keypad) to jump to a page by three-digit number.
  - Topic links within the index page and cross-references to navigate between articles.
  - Previous/next buttons to step through pages sequentially.
- A page navigator and keyboard legend sit outside the text area, not inside it.
- The reader shows the saved content's actual age (time since `issuedAt`) and labels it as cached or imported, never as live.
- On mobile, the reader defaults to the large-text reading mode. A visible control toggles to the historical 40-column grid view.
- The reader handles empty state (no bulletin loaded) with a labelled status message and a link to import one.

#### R1.4 Large-Text Reading Mode

- Renders article title as a semantic heading (`<h2>` or equivalent) and body as paragraphs with ordinary CSS wrapping.
- Text is not constrained to 40 columns; it fills the available screen width.
- Page navigation still works; the current page or article indicator is visible.
- This mode is the default on viewports narrower than a defined breakpoint (e.g., 768px).
- The historical 40-column grid view is available via a toggle button.

#### R1.5 Data Contract

Bulletin object:

```
{
  schemaVersion: number,   // integer, must be 1
  name: string,             // 1..100 code points
  issuedAt: string,         // RFC 3339 timestamp with timezone, e.g. "2026-11-02T09:00:00+09:00"
  articles: Article[]       // 1..32 articles
}
```

Article object:

```
{
  page: number,             // integer 101..899, unique within bulletin
  category: string,         // 1..80 code points
  title: string,            // 1..80 code points
  body: string,             // 1..6000 code points
  sourceUrl: string | undefined  // optional, must be http(s) if present
}
```

Constraints:
- Page 100 is reserved for the compiler-generated index page. Articles may not claim page 100.
- `schemaVersion` must be exactly `1`.
- `name`, `category`, `title`, and `body` must contain at least one code point after trimming leading/trailing whitespace.
- `body` may contain newlines (`\n`) to indicate paragraph breaks. All other control characters (U+0000..U+001F except U+000A, and U+007F) are rejected.
- `sourceUrl`, if present, must start with `http://` or `https://` and must not contain script: or data: schemes in any part.
- The serialized JSON file must not exceed 250 KB (256,000 bytes).
- JSON serialization must round-trip article text without changes. The compiler and serializer must not normalize, transform, or re-encode text content.

#### R1.6 Offline Persistence

- The app stores the last imported or edited bulletin in `localStorage`.
- On reload, the app restores the stored bulletin without any network request.
- The app displays the bulletin's `issuedAt` and computes its age relative to the current time.
- The app never labels a cached or imported bulletin as "live."
- The app functions with no network connectivity: no external fonts, scripts, analytics, or trackers are loaded at runtime.

#### R1.7 Export and Import

- Export serializes the bulletin to a JSON string and triggers a file download with a `.json` extension.
- Import reads a `.json` file via a file picker (`<input type="file">`), parses it, validates it, and either loads it or shows a specific error message.
- Import validation is strict: malformed JSON, missing fields, out-of-range values, duplicate page numbers, invalid dates, oversized files, and malicious URL schemes are all rejected with specific, human-readable error messages.
- Error messages do not echo raw untrusted content into the DOM. Error messages reference field names and constraint descriptions, not raw input values.
- Imported data is only rendered through DOM text APIs (`textContent`, `innerText`, or equivalent). No `innerHTML` with untrusted content.

### R1.8 — Non-Functional Requirements

#### R1.8.1 Performance

- Compilation of a maximum-size bulletin (32 articles, 6000 code points body each) completes in under 1 second on a mainstream device.
- Page navigation renders in under 100 ms.
- No debouncing or lazy-loading infrastructure is required; the data size is bounded and small.

#### R1.8.2 Security

- No `innerHTML` assignment with untrusted data anywhere in the reader or editor.
- URL inputs are validated against an allowlist (`http:`, `https:`) before being rendered as link `href` attributes.
- No `eval`, `Function` constructor, or dynamic script injection.
- No outbound network requests at runtime.
- The app makes no app-level safe, verified, or security claims in its UI or documentation.

#### R1.8.3 Accessibility

- All controls are keyboard operable and touch operable.
- All interactive elements have visible focus styles.
- All form fields have associated `<label>` elements.
- Status messages, error messages, and empty states use ARIA live regions or equivalent.
- The large-text reading mode uses semantic headings (`<h1>`, `<h2>`) and paragraphs (`<p>`).
- Color is not the sole indicator of information; headings and links have text or structural distinction.
- Page navigation announces the current page number.

#### R1.8.4 Compatibility

- Runs in any browser supporting ES modules (Chrome 61+, Firefox 60+, Safari 10.1+).
- No transpilation or build step is required.
- Deployable as static files (HTML, CSS, JS) served from any static host.

#### R1.8.5 Visual Design

- Teletext masthead: saturated blue background.
- Screen background: dark.
- Body text: off-white.
- Useful headings: yellow.
- Links: cyan.
- Block typography: plain monospace font family (browser default monospace; no downloaded fonts).
- No CRT flicker, scanline overlays, animations, or decorative effects.
- No downloaded brand assets.
- The reader text area is visually distinct from the navigator and keyboard legend, which sit outside it.

---

## Design

### D1 — Module Structure

```
aftertext/
├── index.html              # Single entry point; loads reader and editor
├── styles/
│   ├── main.css            # Shared layout, colors, focus styles
│   ├── teletext.css        # 40-column grid view styles
│   └── large-text.css      # Large-text reading mode styles
├── src/
│   ├── main.js             # App entry; mode switching, persistence, event wiring
│   ├── compiler.js         # Pure compiler: bulletin → compiled pages (ES module, no DOM)
│   ├── width.js            # Pure Unicode width function (ES module, no DOM)
│   ├── validate.js         # Pure validation: raw object → valid bulletin or errors (ES module, no DOM)
│   ├── serialize.js        # Pure serialize/deserialize: bulletin ↔ JSON string (ES module, no DOM)
│   ├── reader.js           # Reader mode UI: page rendering, navigation, large-text mode
│   ├── editor.js           # Editor mode UI: form, preview, export, import
│   └── format.js           # Pure helpers: date formatting, byte formatting, age calculation
├── tests/
│   ├── compiler.test.js    # Node built-in test runner
│   ├── validate.test.js    # Node built-in test runner
│   ├── width.test.js       # Node built-in test runner
│   ├── serialize.test.js   # Node built-in test runner
│   └── cases/
│       ├── sample-bulletin.json   # Fictional demo bulletin
│       └── malformed/            # Out-of-sample validation cases (JSON files)
└── .kiro/
    └── specs/
        └── aftertext/
            └── spec.md      # This specification
```

### D2 — Compiler Design

#### D2.1 Input

The compiler accepts a validated `Bulletin` object (see R1.5). Validation is a separate step; the compiler assumes valid input but may still fail gracefully if invariants are violated.

#### D2.2 Output Shape

```js
CompiledBulletin = {
  schemaVersion: 1,
  name: string,
  issuedAt: string,          // original, unmodified
  articles: CompiledArticle[],
  indexPage: TextPage,
  pages: TextPage[]           // all pages in order: index first, then articles in page-number order
}

CompiledArticle = {
  page: number,
  category: string,
  title: string,
  body: string,               // original, unmodified
  sourceUrl: string | undefined,
  subpages: TextPage[],       // paginated title + body
  fullText: FullTextArticle   // for large-text reading mode
}

TextPage = {
  pageNumber: number,         // three-digit, e.g. 100, 101, 102
  subpageIndex: number,        // 0-based; 0 for single-page articles
  rows: string[],             // array of exactly 40-character strings, length 1..25
  lines: number,              // count of non-blank rows
  links: PageLink[]           // cross-references and topic links within this page
}

PageLink = {
  label: string,             // link text, e.g. "WEATHER 200"
  targetPage: number,         // page to navigate to
  rowIndex: number,           // 0-based row position in the page
  startCol: number            // 0-based column position
}

FullTextArticle = {
  title: string,             // original title
  category: string,          // original category
  bodyParagraphs: string[],   // body split on \n, preserving order
  sourceUrl: string | undefined,
  pageNumber: number
}
```

#### D2.3 Pagination Algorithm

1. For each article, construct a text stream: a title line, a blank line, then body paragraphs separated by blank lines.
2. Word-wrap the text stream at 40 columns using the width function (D3). Words longer than 40 columns are broken at the column boundary.
3. Fill rows into pages of at most 25 rows. If the text exceeds 25 rows, start a new subpage. Subpages share the article's base page number; the `subpageIndex` distinguishes them.
4. The index page (page 100) lists all articles by page number and category, one per row, formatted as `[page] category`. If more than 24 articles exist, the index itself subpages at 25 rows.
5. No text is silently discarded. If an article would produce more subpages than can be represented (e.g., exceeding the page-number space), the compiler throws an error with the article page number and a message.

#### D2.4 Index Page Format

```
       AFTERTEXT INDEX
       [bulletin name]
       [issued date formatted]

 101  WEATHER             201
 102  COMMUNITY NOTES     202
 ...
```

The first rows are a header (bulletin name, issue date). Remaining rows list articles sorted by page number. Each row shows the page number, category, and a cross-reference link.

### D3 — Unicode Width Policy

The width function `measureWidth(string) => number` determines the visual column width of a string for 40-column layout.

#### D3.1 Behavior

- Count each Unicode code point. JavaScript's `string.length` counts UTF-16 code units and must not be used for width.
- Iterate using a code-point iterator (`for...of` or `Array.from` with code-point awareness).
- Characters with East Asian Wide (W) or Fullwidth (F) property in Unicode East Asian Width data count as 2 columns.
- Characters with East Asian Narrow (Na), Halfwidth (H), or Ambiguous (A) count as 1 column. Ambiguous characters are treated as 1 column; this is a deliberate simplification documented in the output.
- Combining marks (Unicode General Category `Mn` or `Me`) count as 0 columns. They modify the preceding base character's width; the combined grapheme cluster's width is the base character's width.
- Zero-width joiners (U+200D) and zero-width spaces (U+200B) count as 0 columns.
- Control characters (U+0000–U+001F except U+000A) are rejected during validation before reaching the compiler. U+000A (newline) is handled as a paragraph break, not a column unit.

#### D3.2 Documented Limitations

- Grapheme cluster boundaries (e.g., emoji with skin-tone modifiers or ZWJ sequences) are not fully resolved. A family emoji (U+1F468 U+200D U+1F469 U+200D U+1F466) will be counted as the sum of its non-ZWJ code points, which overestimates width. This is acceptable for a community noticeboard and is documented in the compiler output metadata.
- The width table is embedded as a compact data structure in `width.js`. It is not downloaded at runtime. It covers the BMP and common supplementary-plane wide ranges. If a code point is not in the table, it defaults to 1 column.

#### D3.3 Word-Wrap Algorithm

```
function wrapLine(text, maxCols):
  words = split text on spaces (preserve single spaces; do not collapse)
  row = ""
  rows = []
  for each word in words:
    wordWidth = measureWidth(word)
    if wordWidth > maxCols:
      // hard-break long words
      if row is not empty:
        rows.push(row)
        row = ""
      while wordWidth > maxCols:
        chunk = take chars from word until measureWidth(chunk) == maxCols
        rows.push(chunk)
        word = remaining chars
        wordWidth = measureWidth(word)
      row = word
    else if measureWidth(row) + wordWidth + (row ? 1 : 0) <= maxCols:
      row = row ? row + " " + word : word
    else:
      rows.push(row)
      row = word
  if row:
    rows.push(row)
  return rows
```

Each row is padded to exactly 40 characters with spaces. Rows shorter than 40 after wrapping are right-padded.

### D4 — Validation Design

#### D4.1 Validation Function

```js
validateBulletin(raw) => { ok: true, bulletin: Bulletin } | { ok: false, errors: FieldError[] }

FieldError = {
  field: string,        // dot-path, e.g. "articles[0].title"
  message: string       // human-readable, no raw input echoed
}
```

#### D4.2 Validation Steps (in order)

1. Check that `raw` is a plain object (not an array, null, or primitive).
2. Check `schemaVersion` is exactly `1`.
3. Check `name` is a string, 1..100 code points after trim.
4. Check `issuedAt` is a string matching RFC 3339 with timezone. Reject if it cannot be parsed by `new Date()` and does not contain a timezone offset (`Z`, `+HH:MM`, or `-HH:MM`).
5. Check `articles` is an array of 1..32 elements.
6. For each article:
   - `page`: integer, 101..899, not 100, not duplicate within bulletin.
   - `category`: string, 1..80 code points after trim.
   - `title`: string, 1..80 code points after trim.
   - `body`: string, 1..6000 code points after trim. Newlines (`\n`) allowed; all other control characters rejected.
   - `sourceUrl`: if present, string starting with `http://` or `https://`. Reject any URL whose scheme is not http or https. Use `new URL()` to parse and check `protocol`.
7. Check total JSON byte length does not exceed 250 KB (checked during serialization/import, not on the object directly).

#### D4.3 Error Messages

Error messages are templated and do not include raw input values:

- `"Bulletin name must be 1 to 100 characters."`
- `"Issue date must be an RFC 3339 timestamp with timezone."`
- `"Article page must be an integer from 101 to 899."`
- `"Article page [N] is duplicated."` (the number N is the page number, not untrusted text)
- `"Article body must be 1 to 6000 characters."`
- `"Article body contains unsupported control characters."`
- `"Source URL must use http or https."`
- `"File exceeds 250 KB limit."`

### D5 — Serialization Design

#### D5.1 Serialize

```js
serializeBulletin(bulletin) => string
```

Produces a JSON string with stable key ordering: `schemaVersion`, `name`, `issuedAt`, `articles`. Each article is ordered: `page`, `category`, `title`, `body`, `sourceUrl` (omitted if undefined). Uses `JSON.stringify` with a replacer or post-processing to ensure key order. No pretty-printing by default (minimizes size); the editor may offer a pretty-print toggle.

#### D5.2 Deserialize

```js
deserializeBulletin(jsonString) => { ok: true, bulletin: Bulletin } | { ok: false, errors: FieldError[] }
```

1. Parse JSON. If parse fails, return `{ ok: false, errors: [{ field: "root", message: "File is not valid JSON." }] }`.
2. Check byte length of the input string against the 250 KB cap.
3. Pass the parsed object through `validateBulletin`.
4. Return the result.

#### D5.3 Round-Trip Guarantee

For any valid bulletin `B`: `deserializeBulletin(serializeBulletin(B))` produces an object deep-equal to `B`. Text content is not normalized, trimmed, or re-encoded during serialization or deserialization. Whitespace within string values is preserved exactly.

### D6 — Reader UI Design

#### D6.1 Layout

```
+----------------------------------------------------+
| [masthead: saturated blue bar with "AFTERTEXT"]    |
+----------------------------------------------------+
| [status bar: bulletin name | issued date | age]   |
+----------------------------------------------------+
| [page navigator: < prev | page input | next >]    |
| [keyboard legend: 0-9 enter page, ←→ navigate]      |
+----------------------------------------------------+
|                                                    |
|  [teletext text area or large-text area]           |
|                                                    |
+----------------------------------------------------+
| [mode toggle: Grid | Large Text]                   |
+----------------------------------------------------+
```

#### D6.2 Navigation

- Numeric keys (0–9): accumulate up to 3 digits; on the 3rd digit or Enter, navigate to that page. Backspace removes the last digit. Esc clears the buffer.
- On-screen keypad: buttons 0–9, Enter, Backspace, Esc; same logic as physical keys.
- Previous/Next buttons: step through `pages` array order (index first, then articles in page order, including subpages).
- Topic links: rendered in the text area as cyan-colored, clickable text. Clicking navigates to the target page.
- All navigation updates an ARIA live region announcing the current page number.

#### D6.3 Page Rendering

- Teletext grid mode: render each row of `TextPage.rows` as a line in a `<pre>` or `<div>` with `white-space: pre` and `font-family: monospace`. Links are rendered as `<a>` elements with `href` set to `#page-NNN` or a JS click handler.
- Large-text mode: render the `FullTextArticle` as semantic HTML: `<h2>` for title, `<p>` for each body paragraph. Category shown as a subtitle or badge. Source URL rendered as a `<a>` link if present.
- No `innerHTML` with untrusted data. All text is set via `textContent` or DOM API. Links are created with `document.createElement('a')` and `textContent`.

#### D6.4 Age Display

- Compute age as the difference between `Date.now()` and `parsed `issuedAt`.
- Format as: "Issued 2 days ago", "Issued 3 hours ago", "Issued just now" (under 1 minute).
- Label: "Imported bulletin" or "Cached bulletin". Never "Live".

### D7 — Editor UI Design

#### D7.1 Layout

```
+----------------------------------------------------+
| [masthead: "AFTERTEXT — EDITOR"]                   |
+----------------------------------------------------+
| Bulletin Name:  [____________________]             |
| Issue Date:    [____________________]              |
+----------------------------------------------------+
| Articles:                                           |
| [+ Add Article]                                    |
|                                                    |
| Article 1:                                         |
|   Page:    [___]  Category: [__________]            |
|   Title:   [______________________________]         |
|   Body:    [________________________________]       |
|            [________________________________]       |
|   Source:  [____________________] (optional)        |
|   [Preview] [Delete]                               |
+----------------------------------------------------+
| [Compile & Preview All]  [Export JSON]             |
| [Import JSON]                                      |
+----------------------------------------------------+
| [Preview area: compiled teletext page]              |
| [Payload size: N bytes]                             |
+----------------------------------------------------+
```

#### D7.2 Form Behavior

- Fields validate on blur and on submit. Errors appear below the field with a red border and ARIA error text.
- "Preview" compiles the single article and shows the resulting teletext page(s) in the preview area.
- "Compile & Preview All" compiles the entire bulletin and shows the index page.
- "Export JSON" validates the full bulletin, serializes it, and triggers a download.
- "Import JSON" opens a file picker, reads the file, deserializes, validates, and populates the form.

#### D7.3 Byte Measurement

- Payload size is measured as `new TextEncoder().encode(jsonString).length`, displayed as "Payload: N bytes".
- The measurement is shown next to the export button and in the preview area.

### D8 — Persistence Design

- Storage key: `aftertext:bulletin`.
- On successful import or compile, serialize the bulletin to JSON and store in `localStorage`.
- On app load, read the stored JSON, deserialize, validate, and load into the reader.
- If storage is empty or invalid, show the empty state.
- `localStorage` failures (quota, disabled) are caught; the app continues to function without persistence and shows a status note: "Bulletin not saved (storage unavailable)."

### D9 — Demo Bulletin

The demo bulletin shipped with the project (`tests/cases/sample-bulletin.json`) is:

- Fictional. The name includes the word "FICTIONAL" or "SAMPLE".
- Dated. The `issuedAt` is a specific date.
- Contains 3–5 articles with fictional but plausible community notice content (e.g., a fictional village fete, a fictional library closure notice, a fictional weather summary).
- No real place names, real organization names, or claims of real events.
- Source URLs, if present, point to fictional URLs or are omitted.

---

## Acceptance Checks

### AC1 — Editor

- [ ] AC1.1: Opening the editor shows an empty form with labelled fields for bulletin name, issue date, and zero articles.
- [ ] AC1.2: Adding an article and filling all fields produces a live preview of the compiled 40-column page.
- [ ] AC1.3: Submitting a title exceeding 80 code points shows an inline error below the title field and prevents compilation.
- [ ] AC1.4: Entering a non-integer or out-of-range page number shows an inline error and prevents compilation.
- [ ] AC1.5: Entering two articles with the same page number shows a duplicate-page error.
- [ ] AC1.6: The payload byte size is displayed and updates when content changes.
- [ ] AC1.7: Export produces a `.json` file download whose contents match the serialized bulletin.

### AC2 — Compiler

- [ ] AC2.1: A bulletin with 3 articles produces an index page (100) and 3 article pages with correct page numbers.
- [ ] AC2.2: An article whose body exceeds 25 rows produces multiple subpages; concatenating subpage text reconstructs the original body.
- [ ] AC2.3: The same bulletin input always produces the same page output (deterministic).
- [ ] AC2.4: A title containing wide characters (e.g., CJK) is wrapped correctly at 40 columns, counting wide characters as 2 columns each.
- [ ] AC2.5: A body containing combining characters (e.g., "café" with combining acute) is measured by base character width, not inflated by combining marks.
- [ ] AC2.6: No text is silently discarded for a maximum-size article (80 title + 6000 body code points).
- [ ] AC2.7: The accessible full-text form contains the original title and body paragraphs in order.
- [ ] AC2.8: `JSON.parse(serializeBulletin(B))` round-trips all string fields without character changes.

### AC3 — Reader

- [ ] AC3.1: Typing "200" on the keyboard navigates to page 200 if it exists.
- [ ] AC3.2: Typing a non-existent page number shows a "Page not found" status and stays on the current page.
- [ ] AC3.3: Next/Previous buttons step through pages in order, including subpages.
- [ ] AC3.4: Topic links in the index page navigate to the target article page.
- [ ] AC3.5: The status bar shows the bulletin name, issue date, and age (e.g., "Issued 2 days ago").
- [ ] AC3.6: The status bar labels the bulletin as "Imported" or "Cached", never "Live".
- [ ] AC3.7: On a viewport narrower than 768px, the reader defaults to large-text mode.
- [ ] AC3.8: The mode toggle switches between grid and large-text views and persists for the session.
- [ ] AC3.9: All interactive elements show a visible focus outline when focused via keyboard.
- [ ] AC3.10: Page navigation announces the current page number via an ARIA live region.

### AC4 — Import/Export

- [ ] AC4.1: Exporting a bulletin and importing the resulting file on a fresh page loads the same bulletin content.
- [ ] AC4.2: Importing a file with malformed JSON shows "File is not valid JSON." and does not load partial data.
- [ ] AC4.3: Importing a file exceeding 250 KB shows "File exceeds 250 KB limit."
- [ ] AC4.4: Importing a file with a `data:` URL in `sourceUrl` shows a validation error and does not render the URL.
- [ ] AC4.5: Imported text renders through `textContent`, not `innerHTML`. Verified by inspecting the DOM after import.
- [ ] AC4.6: Error messages do not contain raw untrusted input values from the file.

### AC5 — Offline

- [ ] AC5.1: Loading `index.html` with no network connection renders the app and any cached bulletin.
- [ ] AC5.2: No network requests are made at runtime (verified by browser DevTools network tab with "Offline" checked).
- [ ] AC5.3: Reloading the page after importing a bulletin restores that bulletin from `localStorage`.

### AC6 — Demo Bulletin

- [ ] AC6.1: The demo bulletin's name contains "FICTIONAL" or "SAMPLE".
- [ ] AC6.2: The demo bulletin has a specific `issuedAt` date.
- [ ] AC6.3: The demo bulletin contains no real organization names, real place names, or claims of real events.
- [ ] AC6.4: No response statistics, forecasts, transit alerts, or adoption claims appear in the demo bulletin.

### AC7 — Accessibility

- [ ] AC7.1: Every form field has an associated `<label>`.
- [ ] AC7.2: Every interactive element is reachable via Tab key and operable via Enter/Space.
- [ ] AC7.3: Error messages are associated with their fields via `aria-describedby` or equivalent.
- [ ] AC7.4: The large-text reading mode uses `<h2>` for titles and `<p>` for paragraphs.
- [ ] AC7.5: Color is not the sole indicator: headings have distinct text size/weight, links are underlined.

### AC8 — Validation (Out-of-Sample Cases)

The following validation cases are defined as JSON files under `tests/cases/malformed/`. Each case is a standalone JSON file that must be rejected with a specific error. These cases are implemented as Node test assertions, not fabricated usage evidence.

- [ ] AC8.1: `missing-schemaVersion.json` — object without `schemaVersion` → error "Schema version must be 1."
- [ ] AC8.2: `wrong-schemaVersion.json` — `schemaVersion: 2` → error "Schema version must be 1."
- [ ] AC8.3: `empty-name.json` — `name: ""` → error about name length.
- [ ] AC8.4: `bad-date.json` — `issuedAt: "not-a-date"` → error about RFC 3339.
- [ ] AC8.5: `date-no-timezone.json` — `issuedAt: "2026-11-02T09:00:00"` → error about timezone.
- [ ] AC8.6: `zero-articles.json` — `articles: []` → error about article count.
- [ ] AC8.7: `too-many-articles.json` — 33 articles → error about article count.
- [ ] AC8.8: `page-100.json` — article with `page: 100` → error about reserved page.
- [ ] AC8.9: `page-out-of-range.json` — `page: 900` → error about page range.
- [ ] AC8.10: `duplicate-pages.json` — two articles with `page: 200` → error about duplicate.
- [ ] AC8.11: `title-too-long.json` — title with 81 code points → error about title length.
- [ ] AC8.12: `body-control-chars.json` — body containing U+0001 → error about control characters.
- [ ] AC8.13: `data-url.json` — `sourceUrl: "data:text/html,..."` → error about URL scheme.
- [ ] AC8.14: `oversized.json` — valid structure but > 250 KB → error about file size.
- [ ] AC8.15: `not-an-object.json` — JSON array at top level → error about root type.
- [ ] AC8.16: `truncated.json` — invalid JSON (truncated string) → parse error.

---

## Tasks

### Phase 1: Pure Modules (No DOM)

#### Task 1.1: `width.js` — Unicode Width Function

- Implement `measureWidth(string) => number` per D3.
- Embed a compact wide-character range table covering BMP CJK ranges and common supplementary-plane wide ranges.
- Handle combining marks (General Category Mn/Me) as 0 width.
- Handle ZWJ (U+200D) and ZWJ-adjacent code points as 0 width.
- Document limitations: grapheme clusters not fully resolved; ambiguous-width characters treated as 1 column.
- Export `measureWidth` and `splitByWidth(str, maxCols)` helper.

#### Task 1.2: `validate.js` — Bulletin Validation

- Implement `validateBulletin(raw) => { ok, bulletin } | { ok, errors }` per D4.
- Check all fields and bounds per R1.5.
- Return specific, human-readable errors without echoing raw input.
- Export `validateBulletin`.

#### Task 1.3: `serialize.js` — Serialization

- Implement `serializeBulletin(bulletin) => string` with stable key ordering per D5.
- Implement `deserializeBulletin(jsonString) => { ok, bulletin } | { ok, errors }` per D5.
- Check 250 KB cap during deserialization.
- Export both functions.

#### Task 1.4: `compiler.js` — Teletext Page Compiler

- Implement `compileBulletin(bulletin) => CompiledBulletin` per D2.
- Word-wrap at 40 columns using `measureWidth`.
- Paginate into subpages of at most 25 rows.
- Generate index page (100) with article listings and cross-reference links.
- Produce `FullTextArticle` for each article.
- Never silently discard text.
- Export `compileBulletin`.

#### Task 1.5: `format.js` — Formatting Helpers

- Implement `formatAge(issuedAt, now) => string` per D6.4.
- Implement `formatBytes(n) => string` (e.g., "1.2 KB", "340 bytes").
- Implement `formatDate(issuedAt) => string` (human-readable date with timezone).
- Export all three.

#### Task 1.6: Tests for Pure Modules

- Write `width.test.js`: test measureWidth with ASCII, CJK, combining marks, emoji, zero-width chars.
- Write `validate.test.js`: test all validation cases from AC8 (load JSON files from `tests/cases/malformed/`).
- Write `serialize.test.js`: test round-trip with sample bulletin, test oversized rejection, test malformed JSON rejection.
- Write `compiler.test.js`: test index generation, subpage pagination, wide-character wrapping, lossless text reconstruction, determinism (same input → same output).
- All tests use Node's built-in test runner (`node:test` and `node:assert`).

### Phase 2: Reader UI

#### Task 2.1: HTML Structure and CSS

- Create `index.html` with masthead, status bar, page navigator, text area, mode toggle, and keyboard legend per D6.1.
- Create `main.css`: shared layout, color palette (blue masthead, dark screen, off-white text, yellow headings, cyan links), focus styles.
- Create `teletext.css`: 40-column grid styles (`pre`/`div` with `white-space: pre`, monospace).
- Create `large-text.css`: semantic heading and paragraph styles, responsive breakpoint at 768px.
- No external fonts. Browser default monospace only.
- No CRT effects, scanlines, or animations.

#### Task 2.2: `reader.js` — Reader Logic

- Render teletext pages from `CompiledBulletin` into the text area using DOM text APIs.
- Render large-text mode from `FullTextArticle` with `<h2>` and `<p>` elements.
- Implement numeric key navigation (physical keyboard + on-screen keypad).
- Implement previous/next navigation through the pages array.
- Implement topic link click handling.
- Implement ARIA live region for page announcements.
- Implement mode toggle (grid ↔ large-text).
- Implement responsive default (large-text on viewport < 768px).
- Handle empty state (no bulletin loaded).

#### Task 2.3: `main.js` — App Entry and Persistence

- Wire mode switching (reader ↔ editor).
- Load cached bulletin from `localStorage` on startup.
- Save bulletin to `localStorage` on import or compile.
- Handle `localStorage` failures gracefully.
- Render status bar with bulletin name, issue date, age, and label (Imported/Cached).

### Phase 3: Editor UI

#### Task 3.1: `editor.js` — Editor Logic

- Render form with labelled fields per D7.
- Implement article add/delete.
- Implement per-field validation on blur and submit.
- Implement single-article preview.
- Implement full bulletin compile and index preview.
- Implement export (serialize → download).
- Implement import (file picker → deserialize → validate → populate form).
- Display payload byte size.

### Phase 4: Demo Content and Final Checks

#### Task 4.1: Demo Bulletin

- Create `tests/cases/sample-bulletin.json` per D9.
- 3–5 fictional articles with page numbers 101–105.
- Name includes "FICTIONAL" or "SAMPLE".
- No real names, places, or claims.

#### Task 4.2: Malformed Test Cases

- Create all 16 JSON files under `tests/cases/malformed/` per AC8.
- Each file is a standalone rejection case.

#### Task 4.3: End-to-End Verification

- Verify the core demonstration flow: edit fictional notice → preview compiled page + byte size → export → import on fresh load → browse different page → reload offline → bulletin retained.
- Verify no network requests at runtime.
- Verify all acceptance checks pass or document which are blocked and why.
