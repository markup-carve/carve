# Carve extensions contract (NORMATIVE)

This document is normative. The conformance corpus (`tests/corpus`) remains the
authority for Tier-1 output; the optional Tier-2 corpus
(`tests/corpus-optional`) pins configuration-dependent outputs per feature id.
This document defines the feature taxonomy and the extension mechanism every
implementation realizes.

## 1. Feature taxonomy

| Tier | Definition | Default | Conformance |
|------|------------|---------|-------------|
| 1 · Core | Normative syntax in `resources/grammar.ebnf` + the corpus; identical output everywhere. | Always on | Mandatory (corpus) |
| 2 · Standard-recommended | Spec-listed behaviors every impl SHOULD offer but ship off/passthrough. | Off / passthrough | Optional corpus when enabled |
| 3 · App extension | Not in the spec, not conformance-tested, may exist in one impl only. | Off | Never |

Invariant: a feature's tier is identical in every language; a Tier-1 feature is
core-and-default-on everywhere and its default output is corpus-pinned.

- Tier 1: corpus categories 01–88 (admonitions, footnotes, cross-references,
  list-item attributes, `::: |` verse, `<…>` autolinks, the
  `:name[…]` / `::: name` extension syntax). Recognized `:::` type words
  (the eight admonitions + `line-block`) are catalogued in `examples.md`. Smart
  typography and `@mention` / `#tag` / `:emoji:` parsing are also default-on and
  corpus-pinned, but per grammar PART 9 §19 a processor MAY disable them.
- Tier 2: configuration over Tier-1 syntax — mention/tag→URL, emoji glyph map,
  locale smart-quote sets, bare-URL autolinking, and citations (§4).
- Tier 3 (non-exhaustive): FencedRender (a generic fenced-code-block factory
  with Mermaid, D2, Graphviz, WaveDrom, ABC, Vega-Lite and Chart.js presets),
  MathBlock (a ` ```math ` fenced block →
  `<div class="math display">`, the GFM-style block form of Carve's `$…$`
  math), ListTable (a `::: list-table` div whose nested list renders as a real
  HTML `<table>`, so cells can hold block content the pipe-table syntax cannot;
  `{header-rows}` / `{header-cols}` take a count or the boolean first-row/column
  form, and `^` / `<` give pipe-table-parity rowspan / colspan; in carve-php,
  carve-js and carve-rs), Spoiler (the standard hidden-content role - inline
  `:spoiler[text]` → `<span class="spoiler">` and block `::: spoiler` →
  `<details class="spoiler">` disclosure; in carve-php, carve-js and carve-rs),
  Tabs, CodeGroup, Details, TableOfContents,
  HeadingPermalinks,
  HeadingLevelShift, ExternalLinks, DefaultAttributes, Wikilinks, SemanticSpan,
  and the opt-in heading-id transforms (LowercaseHeadingIds, AsciiHeadingIds).

  `Details` is a pure renderer extension over the existing `:::details`
  admonition (no new syntax): it emits the HTML5 `<details>/<summary>`
  disclosure widget instead of the default `<div class="details">`. The
  **quoted** title becomes the `<summary>` (a title-less block falls back to
  `<summary>Details</summary>`); `{open}` on the opener carries through as
  `<details open>`. Disabled, the block renders as the ordinary admonition
  div, so documents stay readable. See the per-impl `docs/extensions.md` in
  carve-js / carve-php / carve-rs.

  `FencedRender` is the generic form of the Mermaid pattern: one configurable
  renderer claims fenced code blocks by language word and emits a single
  client-hydration element. In **text** mode (Mermaid, D2, Graphviz, WaveDrom,
  ABC) the body is HTML-escaped inside `<pre class="lang">…</pre>`, with `&` and
  `<` escaped but `>` preserved so arrow syntax (`-->`) survives; in **json**
  mode (Vega-Lite, Chart.js) the body is emitted verbatim inside
  `<div class="lang"><script type="application/json">…</script></div>`. The seven
  named presets are one-liners, and any other client-rendered language needs no
  new code - just a new instance with its fence word. Carve only emits the
  marker element; loading the client library and hydrating it is the host's job.
  Mermaid is one preset of this shape. In carve-php / carve-js / carve-rs; see
  each impl's `docs/extensions.md` for the per-language client libraries.

  Note: json mode emits a `<script type="application/json">`, which an HTML
  sanitizer run *after* conversion usually strips. Every json-mode type has a
  non-script alternative: render that same language in **text mode** instead, so
  the config rides in a `<pre class="lang">` as escaped text and survives
  sanitizing (the host reads it from `textContent` rather than a script tag).
  So `vega-lite`, `chart`, etc. each work either way - json mode for a direct
  `<script>` config, or text mode for a sanitizer-safe `<pre>`. Consumers that
  keep json mode should whitelist `<script type="application/json">`.

  `MathBlock` renders a ` ```math ` fence as
  `<div class="math display">\[ … \]</div>` (body HTML-escaped). A preceding
  `{#id .class key=val}` block-attribute line merges onto the div exactly as
  core display `$$` math carries its attributes - the `math display` base class
  ahead of author classes, then id and other attributes. Those attributes get
  the same always-on hardening every element gets (event handlers `on*`,
  `srcdoc`, `formaction` stripped; dangerous URL / `expression()` values
  neutralized), so a `{onclick="…"}` on the fence can never reach the output.
  Because MathBlock mirrors each implementation's own core `$$` math, the
  attribute **order** follows core math per impl: carve-php and carve-rs emit
  the class first, carve-js emits attributes in author source order. (This is a
  pre-existing core-math divergence, not specific to MathBlock; the no-attribute
  output is identical everywhere.)

  `Spoiler` is the standard hidden-content role from the Extension Registry, with
  no new syntax. Inline `:spoiler[text]` → `<span class="spoiler">text</span>`;
  block `::: spoiler "Title"` → an HTML5 `<details class="spoiler">` disclosure
  (native, keyboard- and screen-reader-accessible), defaulting to
  `<summary>Spoiler</summary>` when title-less. Without the extension the inline
  form stays the generic `<span class="ext-spoiler">` and the block stays a
  plain `<div class="spoiler">`, so documents remain readable. Carve emits only
  the marker; the blur + reveal is the host's CSS. Author attributes merge onto
  the output element (the `spoiler` base class ahead of author classes) with the
  always-on attribute hardening. In carve-php / carve-js / carve-rs.

Inline and sidenote footnotes are **not** Tier 3. They are deferred core
reserved syntax (`[^…]` inline, `[>…]` sidenote; `resources/grammar.ebnf`
PART 9 §16), not an app extension. The djot-php `[…]{.fn}` form maps onto
carve's `[^…]`; see `native-features-analysis.md`.

## 2. Extension system

An extension is a named unit contributing any subset of four things, run as:

    parse (core + extension MATCHERS)
      → afterParse TRANSFORM → beforeRender TRANSFORM
      → render (core + extension RENDERERS)

### 2.1 Matchers (parse stage) — scanner-function contract

- inline: `(text, pos, ctx) -> { node, end } | null`
- block:  `(lines, ctx) -> { node, linesConsumed } | null`
- `ctx` exposes: definition tables (link/footnote/abbr); recursive
  `parseInlines(text)` / `parseBlocks(lines)`; the extension's config.
- Precedence: core matchers run first at each position; extension matchers are
  tried only where core does not consume (extensions add syntax, never hijack
  core). Extension matchers run in registration order; optional integer priority
  is the escape hatch.

### 2.2 Transforms

- afterParse `(Document) -> Document` (collection/inspection)
- beforeRender `(Document) -> Document` (mutation)
- Every extension's afterParse runs before any extension's beforeRender; within a
  phase, registration order.

### 2.3 Renderers

- Registered per node type / extension name; receive the node, emit
  implementation-specific output. Renderers are the impl-idiomatic half; matchers
  and transforms are the portable contract.

### 2.4 Registration & config

- Impl-idiomatic (PHP `addExtension`/ctor; JS `extensions: [...]` option),
  declaring the same lifecycle contributions.

## 3. Home, conformance, per-impl

- This document is the normative home for the taxonomy + contract.
- syntax.md §4.20 is the non-normative narrative.
- Conformance: Tier-1 = existing corpus (mandatory); Tier-2 =
  `tests/corpus-optional` + `manifest.json`, run per enabled feature; Tier-3 =
  never in any corpus.

## 4. Citations (Tier-2)

Bibliographic references (issue #90). Off by default; enable per processor.
Grammar: `resources/grammar.ebnf` PART 9 §22. Narrative: `case-study/syntax.md`.

### 4.1 Syntax

- A tail-less `[...]` whose content contains a `@key` is a citation group. A
  bare `@key` stays a core mention; `\@` is literal.
- Disambiguation against the inline grammar is by the character after `]`:
  `(` is a link, `[` a reference link, `{` a span. Only a bracket with none of
  those tails is claimed. This is exactly the gap core leaves (core declines
  tail-less brackets), so citations never hijack core syntax.
- Items are `;`-separated; each is `[prefix] [-] @key [, locator]`. The leading
  `-` suppresses the author in author-date mode.
- Definitions are in-document, one per line, footnote-style:
  `[@key]: {author= year=}? entry`. The optional `{author= year=}` feeds
  author-date output; its quotes may be straight or smart (the typographic
  pass runs over entry prose). A leading `@` label is reserved from reference
  definitions in core (parallels `[^...]:` precedence).

### 4.2 Lifecycle

- **Matcher** (inline): claims `[...@key...]` per the rule above, producing a
  `citation-group` node carrying its verbatim `raw` source.
- **afterParse**: collects and removes `[@key]:` definition lines; resets
  per-document state so a reused extension instance does not leak across runs.
- **beforeRender**: numbers cited+defined keys in first-citation order and
  places the references list - into an explicit `::: references` div/admonition
  if present, else appended at document end.
- **Renderers**: an inline renderer for `citation-group` (numbered `[1]` or
  author-date `(Author Year)`) and a block renderer that emits the references
  list (`<ol class="references">` numbered, sorted `<ul class="references">`
  author-date).

### 4.3 Conformance (pinned in `tests/corpus-optional`)

- `citations-numbered`, `citations-author-date`: the five forms, the references
  list, and the `{author= year=}` author-date path.
- Failure modes are pinned too: a group with any undefined key renders verbatim;
  `[@k]{...}` is a span, not a citation; a `;` inside a locator falls back to
  literal text.

### 4.4 Undefined (impls MAY differ; NOT corpus-pinned)

- Same-author-year disambiguation letters (`2020a` / `2020b`) are out of scope
  for v1; the bare year is emitted.
- An uncited-but-defined entry is dropped from the references list (no
  `nocite`-style force-include).
- External bibliographies (`.bib` / CSL-JSON) and narrative form are future
  issues, not part of this contract.

## 5. ListTable (Tier-3)

Tables whose cells hold block content (multiple paragraphs, lists, code), which
pipe tables cannot express (issue #162). A `::: list-table` div whose body is a
nested list renders as a real HTML `<table>`. Shipped in carve-js, carve-php,
and carve-rs; off by default, enable per processor.

### 5.1 Syntax

- The block type word is `list-table`. A quoted title on the opener
  (`::: list-table "Quarterly"`) becomes the `<caption>` (the same title parse
  admonitions use; a bare unquoted title is invalid, per the strict `:::` rule).
- The body is a single nested list: each outer item is a row, each inner item is
  a cell, left to right. Because cells are list items, they hold full block
  content for free.
- `{header-rows=N}` / `{header-cols=N}` on the preceding attribute line promote
  the first N rows to `<thead>`/`<th>` and the first N cells of every row to
  row-header `<th>` (default 0).
- Spans reuse the pipe-table span markers: a cell whose sole content is a lone
  `^` merges with the cell above (rowspan); a lone `<` merges with the cell to
  the left (colspan); continuation-style (`colspan=3` is two `<`, `rowspan=N` is
  N-1 `^`). A cell carrying its own attributes, or an escaped marker (`\^`), is
  literal and never a span marker.

### 5.2 Rendering

- A single-paragraph cell collapses to inline content (`<td>text</td>`); a
  multi-block cell keeps its `<p>`/`<ul>`/... wrappers.
- Ragged rows pad with empty `<td>` to the widest effective row (spans counted).
- A rowspan is clamped at the `<thead>`/`<tbody>` boundary - a header-row span
  does not reach into the body (HTML cannot reliably span across row groups).
- A cell's own list-item attributes carry onto its `<td>`/`<th>`; a computed
  `rowspan`/`colspan` wins over an author-written one.
- The `<table>` output matches the equivalent pipe table's span markup.

### 5.3 Degradation

When the extension is not enabled, or the block is malformed (any row yields no
cells), it renders as its ordinary `<div class="list-table">` containing the
literal nested list - no content is ever dropped, and the deferred output is
byte-identical to the plain div.

### 5.4 Conformance (NOT corpus-pinned)

Tier-3, so not in the mandatory corpus. The contract is cross-impl parity: for a
given input the three implementations produce the same `<table>`, and spans match
the equivalent pipe table. Each implementation pins this in its own test suite
(block cells, caption, header rows/cols, spans, escape, ragged padding, the
no-cell-row defer, and the thead/tbody rowspan clamp).

### 5.5 Out of scope (impls MAY differ)

- Per-column alignment (an `aligns=`-style attribute) is a future follow-up;
  there is no alignment marker today.
- Deeply ambiguous overlapping-span soup (a marker glued to another, or a `^`
  inside the interior of an existing merged rectangle) resolves however the
  native pipe-table grid walk resolves it; not pinned.
