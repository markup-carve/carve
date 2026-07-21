# Carve extensions contract (NORMATIVE)

This document is normative. The conformance corpus (`tests/corpus`) remains the
authority for Tier-1 output; the optional Tier-2 corpus
(`tests/corpus-optional`) pins configuration-dependent outputs per feature id.
This document defines the feature taxonomy and the extension mechanism every
implementation realizes.

::: tip Hands-on
For a worked, end-to-end walkthrough of building a Tier-3 extension (a `qr`
fenced block, in both carve-js and carve-php), see
[Writing an extension: a QR-code case study](./extension-tutorial).
:::

## 1. Feature taxonomy

| Tier | Definition | Default | Conformance |
|------|------------|---------|-------------|
| 1&nbsp;·&nbsp;<Badge type="tip" text="core" /> | Normative syntax in `resources/grammar.ebnf` + the corpus; identical output everywhere. | Always on | Mandatory (corpus) |
| 2&nbsp;·&nbsp;<Badge type="info" text="standard" /> | Spec-listed behaviors every impl SHOULD offer but ship off/passthrough ("standard-recommended"). | Off / passthrough | Optional corpus when enabled |
| 3&nbsp;·&nbsp;<Badge type="warning" text="extension" /> | Not in the spec, not conformance-tested, may exist in one impl only (app extension). | Off | Never |

Invariant: a feature's tier is identical in every language; a Tier-1 feature is
core-and-default-on everywhere and its default output is corpus-pinned.

> The same split is described as MUST / SHOULD / MAY in
> [`native-features-analysis.md`](./native-features-analysis): **MUST** = Tier-1
> core (not disableable); **SHOULD** = Tier-1 default-on but a processor MAY
> turn it off (the four shorthands below); **MAY** = Tier-2 / Tier-3. Same model,
> two vocabularies.

### Feature tiers (quick reference)

The one place to answer "is feature X core or an extension?". "Disable?" is
whether a conformant processor may turn a default-on feature off (grammar
PART 9 §19); Tier-2 / Tier-3 are off until enabled.

| Feature | Tier | Default | Disable? |
|---|---|---|---|
| Headings, paragraphs, lists, task lists, blockquotes, thematic breaks | <Badge type="tip" text="core" /> | on | no |
| Tables (incl. rowspan/colspan/alignment), fenced code, inline code | <Badge type="tip" text="core" /> | on | no |
| Emphasis family (bare `/` `*` `_` `~` `=`; sup/sub braced-only `{^ ^}` / `{, ,}`), links, images, `<…>` autolinks | <Badge type="tip" text="core" /> | on | no |
| Attributes `{.class #id k=v}`, generic divs / spans, captions / figures | <Badge type="tip" text="core" /> | on | no |
| Admonitions (8 canonical types), definition lists, verse `::: \|` | <Badge type="tip" text="core" /> | on | no |
| Math `$…$` / `$$…$$`, footnotes `[^id]` + inline `^[…]`, abbreviations | <Badge type="tip" text="core" /> | on | no |
| Cross-references `</#id>` + numbered cross-refs, editorial / critic markup | <Badge type="tip" text="core" /> | on | no |
| Frontmatter, comments, raw blocks / inline `=format` | <Badge type="tip" text="core" /> | on | no |
| The extension **syntax** `:name[…]` (inline) and `::: name` (block) | <Badge type="tip" text="core" /> | on | no — the *handlers* are Tier-2/3 |
| Smart typography, `@mention`, `#tag`, `:symbol:` parsing | <Badge type="tip" text="core" /> | on | **yes** (§19) |
| Citations `[@key]`, bare-URL autolinking, code callouts `<n>` | <Badge type="info" text="standard" /> | off | — |
| Mention/tag → URL templates, symbol map (e.g. emoji glyphs), locale smart-quote sets | <Badge type="info" text="standard" /> | off | — |
| Mermaid / FencedRender, MathBlock, ListTable, Bibliography, Glossary, Index, HeadingNumbers, Details, Spoiler, Tabs, CodeGroup | <Badge type="warning" text="extension" /> | off | — |
| TableOfContents, HeadingPermalinks / LevelShift, ExternalLinks, Wikilinks, SemanticSpan, ColorSwatch, Lowercase/AsciiHeadingIds | <Badge type="warning" text="extension" /> | off | — |

A `:name[…]` / `::: name` whose word has no registered handler renders via the
generic fallback (`<span>` / `<div class="name">`), so a document using an
unknown extension word still parses and stays readable — only its *rendering*
differs by processor. The narrative below details each tier.

- Tier 1: corpus categories 01–88 (admonitions, footnotes, cross-references,
  list-item attributes, `::: |` verse, `<…>` autolinks, the
  `:name[…]` / `::: name` extension syntax). Recognized `:::` type words
  (the eight admonitions + `line-block`) are catalogued in [`examples/extensions.md`](/examples/extensions). Smart
  typography and `@mention` / `#tag` / `:symbol:` parsing are also default-on and
  corpus-pinned, but per grammar PART 9 §19 a processor MAY disable them.
- Tier 2: configuration over Tier-1 syntax — mention/tag→URL, symbol map (e.g. emoji glyphs),
  locale smart-quote sets, bare-URL autolinking, citations (§4), and code
  callouts (`<n>` markers inside fenced code + a bound explanation list; §10).
- Tier 3 (non-exhaustive): FencedRender (a generic fenced-code-block factory
  with Mermaid, D2, Graphviz, WaveDrom, ABC, Vega-Lite and Chart.js presets),
  MathBlock (a ` ```math ` fenced block →
  `<div class="math display">`, the GFM-style block form of Carve's `$…$`
  math), ListTable (a `::: list-table` div whose nested list renders as a real
  HTML `<table>`, so cells can hold block content the pipe-table syntax cannot;
  `{header-rows}` / `{header-cols}` take a count or the boolean first-row/column
  form, and `^` / `<` give pipe-table-parity rowspan / colspan; in carve-php,
  carve-js and carve-rs), Bibliography (a reference list rendered from citation
  keys (§4) resolved against an external CSL-JSON source named in front-matter,
  reusing the `::: references` placeholder with mandated numeric output and
  back-links; §6), Glossary (a `::: glossary` definition list whose terms become
  `<dt id="gloss-{slug}">` entries that `:term[word]` links to; §7), Index
  (invisible `:index[term]` markers collected into a sorted `::: index` list
  with back-links to every occurrence; §8), Spoiler (the standard hidden-content role - inline
  `:spoiler[text]` → `<span class="spoiler">` and block `::: spoiler` →
  `<details class="spoiler">` disclosure; in carve-php, carve-js and carve-rs),
  Tabs, CodeGroup, Details, TableOfContents,
  HeadingPermalinks,
  HeadingNumbers (auto-number sections - `<span class="section-number">1.2</span>`
  on each heading - and rewrite auto-filled `</#id>` cross-references to
  "Section 1.2 - Title"; opt-in, no new syntax; §9),
  HeadingLevelShift, ExternalLinks, DefaultAttributes, Wikilinks, SemanticSpan,
  ColorSwatch (inline `:color[value]` -> a validated color chip; carve-php,
  carve-js and carve-rs — see the [extension tutorial](./extension-tutorial)),
  and the opt-in heading-id transforms (LowercaseHeadingIds, AsciiHeadingIds).

  `Details` is a pure renderer extension over the existing `:::details`
  admonition (no new syntax): it emits the HTML5 `<details>/<summary>`
  disclosure widget instead of the default `<div class="details">`. The
  **quoted** title becomes the `<summary>` (a title-less block falls back to
  `<summary>Details</summary>`); `{open}` on the opener carries through as the
  `open` attribute (`<details open="">` interactive, `<details open>` static).
  Disabled, the block renders as the ordinary admonition
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

  Note: json mode emits a `<script type="application/json">`. Because an HTML
  parser ends *script data* on the literal `</script>` regardless of the
  script's MIME type, a json-mode renderer **MUST** neutralize script-data
  terminators in the body (rewrite `</` so `</script>`, `<!--`, and `<script`
  cannot break out) before emitting -- a Tier-3 requirement mirroring the core
  attribute hardening (grammar PART 9 §25). Even then, an HTML
  sanitizer run *after* conversion usually strips the whole element. Every json-mode type has a
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

Footnotes are **not** Tier 3. Reference footnotes `[^id]` and inline footnotes
`^[content]` are both implemented Tier-1 core (`resources/grammar.ebnf` PART 9
§16), and they are the only note forms. The once-proposed **sidenote** form
`[>content]` was dismissed rather than deferred: margin placement is CSS over
the existing footnote output, so `[>` stays unclaimed and `[>foo]` is literal
text (see [dismissed syntax](./dismissed-syntax)). The djot-php
`[…]{.fn}` form maps onto carve's inline `^[content]`; see
`native-features-analysis.md`.

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

### 2.5 Static rendering mode (`renderStatic`)

A render carries a **mode** - a render option, not document syntax:

- `"interactive"` (default) - online HTML; extensions render their interactive
  form (live tabs, mermaid via a client script, KaTeX).
- `"static"` - HTML for a medium that cannot interact or run client scripts
  (print, PDF source, archival HTML). The Markdown, plain-text, and ANSI
  renderers force `"static"` and the caller cannot override it.

`"print"`, `"email"`, and similar names are **reserved** for future named
presets; an implementation MUST reject an unknown mode value rather than guess.
Omitting the mode means `"interactive"`, so existing callers are unaffected.

In `"static"` HTML an extension renders through an optional
`renderStatic(node, ctx)` hook. Per node, the resolution order is:

1. the extension's `renderStatic`, if defined;
2. else the extension's ordinary renderer (correct for extensions that are
   already static - list-table, citations, heading-permalinks - which need no
   `renderStatic`);
3. else, for a container whose grouping `[label]` no extension consumed, the
   core caption floor (see [Graceful Degradation](/graceful-degradation)).

No construct falls through to "dropped": every authored token reaches at least
the floor. `renderStatic` MUST preserve all content and MAY drop only
interaction.

An extension whose **interactive output depends on a client script** (tabs,
code-group, spoiler, fenced-render, math, and any future carousel/embed) MUST
implement `renderStatic` - otherwise step 2 falls back to its script-dependent
interactive output, which is silently broken in a `static` render. An engine
SHOULD warn when such an extension is registered without a `renderStatic`, and
`carve lint` MAY flag it. (Extensions whose ordinary output is already static -
list-table, citations, heading-permalinks - are exempt; they have no script to
lose.)

Expected static output per interactive extension:

| Extension | `renderStatic` output |
| --- | --- |
| tabs / code-group | each panel as a `<section>` headed by its `[label]` |
| details | not a `renderStatic` case - emits a native `<details open>` in static (see [Graceful Degradation](/graceful-degradation)); interactive without scripts, so never flattened |
| spoiler | the revealed content (no blur) |
| fenced-render (mermaid, chart, graphviz, plantuml, custom) | a build-rendered image if a renderer keyed by the fence's css class is supplied, else the source as a code block |
| math (display / inline) | server-side output (MathML/HTML) if a renderer is supplied, else the source |

Client-script extensions cannot produce their image inside the engine. A
`"static"` render therefore accepts a **renderers** map. The map is **open**: a
diagram renderer is keyed by the **fence's css class** - `mermaid`, `chart`,
`graphviz`, `plantuml`, or any custom fence word - so a custom `FencedRender`
instance is static-capable with no change to the engine, no spec edit, and no
lockstep. `math` is the one distinct key (its renderer also takes a display
flag). Implementations MUST consult the renderer by css class and MUST fall back
to source when the needed renderer is absent - never blank.

> [!NOTE]
> The map was **closed** in earlier drafts (a fixed `{mermaid, chart, graphviz,
> plantuml, math}` set); it is now **open** so third-party diagram libraries are
> first-class. A custom fence word (`fencedRender({ language: 'myuml' })` +
> `renderers: { myuml: … }`) renders statically in every engine with the same
> config, exactly like a canonical preset - the portability the canonical set
> alone could not give. Canonical presets are just the pre-named css classes;
> they carry no privilege the map withholds from a custom one.

Renderers are **synchronous** (`source -> string`; `math` also takes a
display flag): an async tool (mmdc, an HTTP service) must be run in a build step
and supplied as a pre-resolved lookup, not awaited inside the render. Renderers
apply to the **static HTML** path only - the Markdown/plain/ANSI renderers keep
client-script blocks as source regardless.
A renderer typically returns a self-contained `data:` image URI; if you sanitize
the static HTML afterwards, **allow the `data:` scheme for images** or the image
is silently stripped. Concrete, tested renderer recipes (graphviz/mermaid/math,
per engine) are in [Static Rendering Recipes](/static-rendering-recipes).

`renderStatic` is the HTML-static path only. The Markdown, plain-text, and ANSI
renderers reach the same end by flattening containers and keeping client-script
blocks as source; they do not call `renderStatic`.

Parity: for a given `(input, mode, renderers)` the implementations MUST produce
the same output - a static-mode parity battery, mirroring the profile fixtures.

### 2.6 Generated ids share the document id namespace

Extensions that mint DOM ids - tabs (`tabset-N`, `tabset-N-tab-M`,
`tabset-N-panel-M`), code groups (the `codegroup-N` family), citations
(`cite-{key}-{n}` back-link anchors, `ref-{key}` entries), and any future
generator - MUST reserve those ids in the same document id namespace as
explicit `{#id}` attributes and generated heading ids, and MUST deduplicate
against it with the mechanism headings use: the first use keeps the base name,
each collision takes the next free numeric suffix (`base-2`, `base-3`),
skipping candidates that are already reserved
([syntax.md 4.1, identifier step 7](/case-study/syntax#_4-1-document-structure);
`grammar.ebnf` PART 9 §13).

Both collision directions are covered: an explicit `{#tabset-1}` anywhere in
the document reserves the name before generation (the first tab set is bumped),
and a heading such as `# tabset 1` or `# cite foo 1` competes in document order
like any other generated id. Without this rule a duplicate DOM id is invalid
HTML and `label for=` / `getElementById` / anchor navigation silently resolve
to the first occurrence, breaking either the anchor or the widget wiring.
Implementations MUST agree here or cross-implementation anchors drift.

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
  `-` suppresses the author in author-date mode (per item).
- A single leading `+` immediately after `[` marks the whole cluster as
  **integral** (author-in-text): `[+@smith2020]`, `[+see @smith2020, p. 12]`.
  Mode is a group property - there is no per-item integral flag. Vocabulary
  matches CSL / Citum `CitationMode` (`integral` / `non-integral`).
- Definitions are in-document, one per line, footnote-style:
  `[@key]: {author= year=}? entry`. The optional `{author= year=}` feeds
  author-date output; its quotes may be straight or smart (the typographic
  pass runs over entry prose). A leading `@` label is reserved from reference
  definitions in core (parallels `[^...]:` precedence).

### 4.2 Typed Locators

The locator text after the first `,` in an item is parsed into a structured
`{label, value}` pair plus a trailing suffix, so a host CSL processor receives
the same data it would from Pandoc.

**Matching rules:**

- Canonical labels (longest-match, boundary rule - a term matches only when
  followed by end-of-locator, whitespace, a digit, `§`, or `¶`):

  | Label | Abbreviations |
  |---|---|
  | book | bk. |
  | chapter | chap., chaps. |
  | column | |
  | figure | |
  | folio | |
  | issue | no. |
  | line | l., ll. |
  | note | n., nn. |
  | opus | |
  | page | p., pp. |
  | paragraph | para., ¶ |
  | part | |
  | section | sec., § |
  | sub verbo | s.v. |
  | verse | v., vv. |
  | volume | vol. |

- A leading digit with no preceding label defaults to `page`.
- The value runs to end-of-locator or the next `;`; trailing `,`, `&`, `-`,
  `.` are trimmed. The remainder (after the value) is the **suffix**.
- An unrecognized locator string is emitted as-is (no label, no value split).

### 4.3 Lifecycle

- **Matcher** (inline): claims `[...@key...]` per the rule above, producing a
  `citation-group` node carrying its verbatim `raw` source and the parsed
  integral flag, suppress-author flags, prefixes, locator labels/values, and
  suffixes.
- **afterParse**: collects and removes `[@key]:` definition lines; resets
  per-document state so a reused extension instance does not leak across runs.
- **beforeRender**: numbers cited+defined keys in first-citation order and
  places the references list - into an explicit `::: references` div/admonition
  if present, else appended at document end.
- **Renderers**: an inline renderer for `citation-group` (numbered `[1]` or
  author-date `(Author Year)`) and a block renderer that emits the references
  list (`<ol class="references">` numbered, sorted `<ul class="references">`
  author-date).

### 4.4 HTML data-\* contract

Each rendered citation anchor carries the following `data-*` attributes, in
canonical order, emitting only the attributes that apply for the item:

| Attribute | Value |
|---|---|
| `data-cite-key` | the citation key |
| `data-suppress-author` | `"true"` when `-` was present |
| `data-cite-prefix` | flattened plain-text prefix (when present) |
| `data-locator-label` | parsed label name (when a label was matched) |
| `data-locator` | parsed locator value (when present) |
| `data-suffix` | flattened plain-text suffix (when present) |

An integral cluster wraps all its items in:

```html
<span class="citation" data-cite-mode="integral">…</span>
```

### 4.5 Conformance (pinned in `tests/corpus-optional`)

- `citations-numbered`, `citations-author-date`: the base forms, the references
  list, and the `{author= year=}` author-date path (corpus cases 05-06).
- Failure modes are pinned too: a group with any undefined key renders verbatim;
  `[@k]{...}` is a span, not a citation; a `;` inside a locator falls back to
  literal text (cases 07-09).
- **Enrichment** (cases 13-24): typed locators (label match, boundary rule,
  default-page, value trim, suffix), integral cluster marker (`[+@key]`),
  per-item suppress-author, group-marker disambiguation vs. per-item flags,
  and trailing-comma edge case.

### 4.6 Undefined (impls MAY differ; NOT corpus-pinned)

- Same-author-year disambiguation letters (`2020a` / `2020b`) are out of scope
  for v1; the bare year is emitted.
- An uncited-but-defined entry is dropped from the references list (no
  `nocite`-style force-include).
- External bibliographies are handled by the Bibliography extension (§6, CSL-JSON
  via front-matter); `.bib` ingestion and narrative form remain out of scope.

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

## 6. Bibliography (Tier-3)

Render a reference list from citation keys resolved against an external
CSL-JSON source (issue #199). This is the external-data follow-up the Citations
extension (§4) explicitly deferred (§4.6): §4 resolves `@key` against in-document
`[@key]:` definitions only; this extension adds a document-level bibliography
pool. Off by default; enable per processor. Depends on Citations (§4) being
enabled - it reuses the same `citation-group` nodes, numbering, and
`::: references` placeholder, so it is a data-source layer, not new syntax.

### 6.1 Data source

- A front-matter key names the source: `bibliography: refs.json` (a single
  string, or a list of strings). When several files are listed, the **host**
  merges them left to right and resolves duplicate `id`s (earlier file wins)
  before handing the extension a single pool - the extension never sees file
  boundaries (see the loader note below), so merge order is a host convention,
  not part of the extension's cross-impl contract.
- The format is **CSL-JSON only** - an array of entry objects, each with a
  string `id` matching a citation `@key`. One parser per implementation keeps
  cross-impl parity tractable. BibTeX is out of scope (convert to CSL-JSON
  upstream).
- **The extension does not perform file I/O.** Carve implementations are not all
  filesystem-capable (browser, WASM, sandboxed hosts), so mandating `fopen`
  would break parity. Instead the host resolves the front-matter path and passes
  the parsed CSL-JSON array in as a processor option (e.g. `bibliography:
  [...entries]`); the front-matter key is the **authoring convention** that
  filesystem-capable hosts follow to populate that option. The contract this
  spec pins is the data shape and the resolution rules below, not the loader.

### 6.2 Resolution

- A cited `@key` resolves against, in order: (a) an in-document `[@key]:`
  definition (§4), then (b) the CSL-JSON pool. An in-document definition wins on
  collision, so a document can override or supplement an external entry locally.
- Only **cited** keys enter the reference list (the §4.6 rule holds: no
  `nocite`-style force-include of uncited entries).
- Numbering is unchanged from §4: cited+resolved keys are numbered in
  first-citation order.

### 6.3 Rendering

- The list renders into an explicit `::: references` div if present, else is
  appended at document end - identical placement to §4.
- **Numeric is the mandated default**: `<ol class="references">`, in-text
  citations rendered `[1]`. When author-date mode (§4) is enabled, its sorted
  `<ul class="references">` form is reused; the CSL-JSON `author` / `issued`
  fields feed the author-date label.
- **Entry text from CSL-JSON** uses one fixed minimal template (full styling is
  the renderer-plugin point below). Build from three fields, omitting any absent
  field together with its separator, then append a trailing period if the result
  is non-empty:
  - `author`: the CSL array; each name renders `Family, Given` (just `Family`
    when `given` is absent, or the `literal` field verbatim when present),
    multiple authors joined with `; `.
  - year: `issued.date-parts[0][0]`, else `issued.literal`, wrapped in parens.
  - `title`: emitted verbatim.
  - Assembly: `"{authors} ({year})"` (a single space between the two), then the
    title joined with `. `, then a trailing `.`. Example:
    `Smith, John (2020). A Study.` The entry is **plain text, HTML-escaped** -
    CSL-JSON is external data, not Carve markup, so it is never re-parsed.
- **Back-links are mandated.** The in-text marker for each resolved key is
  `<a id="cite-{key}-{n}" href="#ref-{key}">{number}</a>` - the existing §4
  forward link gains a per-use `id`. The anchor sits on the **per-key rendered
  item**, not on the `citation-group` element, so a multi-key group such as
  `[@a; @b]` carries one anchor per key (`cite-a-1`, `cite-b-1`) rather than
  colliding on a single element `id`. `{n}` counts that key's use sites
  document-wide, independent of which group each use appears in. Each reference
  entry is then `<li id="ref-{key}">{entry} <a href="#cite-{key}-{m}"
  class="ref-backref">↩</a> …</li>`, one back-link per use site `m = 1 … n`.
  A group that renders verbatim (some key unresolved, §6.4) is not a use site and
  contributes no anchors. Back-links appear **only when a bibliography pool is
  supplied**; pure §4 in-document citations (no pool) render exactly as before,
  so the Tier-2 citation corpus is unchanged.
- Full CSL **style** resolution (rendering an arbitrary `.csl` style) is an
  explicit **renderer-plugin extension point**, not part of this contract and
  not corpus-pinned. The baseline this spec pins is numeric + the §4 author-date
  form from the CSL-JSON fields.

### 6.4 Degradation

Matches the §4 verbatim rule - no content is ever dropped:

- A citation group with any key that resolves in neither source renders its
  verbatim `[@key]` source. The whole group is then literal text, so **none** of
  its keys are cited - a key that appears only inside a verbatim group is not
  numbered, not added to the reference list, and is not a back-link use site
  (no orphan entry with a dangling back-ref). A key cited elsewhere in a
  fully-resolved group is unaffected.
- A `::: references` placeholder with no resolvable data (extension off, no
  bibliography option supplied, or every key unresolved) stays a plain
  `<div class="references">` containing whatever it literally held.
- An unreadable or malformed CSL-JSON source resolves to an empty pool; keys
  then fall back to in-document defs, and otherwise degrade per the verbatim
  rule above. A host MAY surface a load warning out of band, but the rendered
  output never changes shape on a missing source.

### 6.5 Conformance (NOT corpus-pinned)

Tier-3, so not in the mandatory corpus. The contract is cross-impl parity: for
the same document and the same CSL-JSON pool, the three implementations produce
the same numbered list, the same back-link anchors, and the same degradation.
Each implementation pins this in its own suite (external resolution from a
supplied pool, in-doc override precedence, back-links across multiple use sites,
the cited-only rule, and the missing-source / unresolved-key defer). Multi-file
merge is a host concern, not pinned here.

### 6.6 Out of scope (impls MAY differ)

- BibTeX (`.bib`) ingestion - convert to CSL-JSON upstream.
- Arbitrary `.csl` style rendering (the renderer-plugin point above).
- Same-author-year disambiguation letters (`2020a` / `2020b`), inherited from
  §4.6 - the bare year is emitted.

## 7. Glossary (Tier-3)

Defined terms with descriptions, linked from their in-text uses to a generated
glossary section (issue #91). Lower universality than citations, and the
glossary section is derived content (like the table of contents or heading
permalinks), so this is Tier-3: off by default, never in any corpus. It reuses
existing syntax - the definition list and the `:name[…]` inline extension form -
rather than adding a primitive.

### 7.1 Syntax

- A `::: glossary` block whose body is a definition list (`:: term` / `:  def`)
  declares the glossary. Each term is one entry.
- `:term[word]` (the core inline extension form) references a term. The link
  target is derived from the *bracket text*, not a separate key.

### 7.2 Slug

- A term's id is `gloss-{slug}`, where `slug` is the heading-id slug of the
  term's plain text with lowercasing on and ASCII folding off
  (`slugify(text, {lowercase: true})` - the same routine §-cross-references use,
  so `:term[HTTP]` and a `:: HTTP` entry agree on `gloss-http`). `:term[word]`
  slugs its own bracket text the same way, so the two sides meet without an
  explicit key.

### 7.3 Rendering

- The `::: glossary` block renders `<dl class="glossary">`; each term becomes
  `<dt id="gloss-{slug}">{term}</dt>` and each definition `<dd>{def}</dd>`,
  preserving the definition-list grouping (terms sharing one definition each get
  their own `<dt>`). Entries render in **source order** - no sort, so the output
  is trivially identical across implementations (alphabetizing is the author's
  job). On a duplicate slug the first entry wins the id; later duplicates still
  render their `<dt>`/`<dd>` but without the id.
- `:term[word]` renders `<a href="#gloss-{slug}" class="term">{word}</a>` when
  `slug` matches a defined term. When it matches none (resolved, but the term is
  not in any `::: glossary`), it degrades to `<span class="term">{word}</span>` -
  no link, nothing dropped.

### 7.4 Degradation

When the extension is off, `:term[word]` is the generic inline fallback
`<span class="ext-term">word</span>` and `::: glossary` is a plain
`<div class="glossary">` holding its literal definition list - readable either
way, no content lost.

### 7.5 Conformance (NOT corpus-pinned)

Tier-3, so not in the mandatory corpus. The contract is cross-impl parity: for
the same document the implementations produce the same `<dl>`, the same
`gloss-{slug}` ids, and the same `:term` resolution / degradation. Each
implementation pins this in its own suite.

## 8. Index (Tier-3)

Back-of-book index terms: mark occurrences in the text, collect them into a
generated, sorted index with back-links to every occurrence (issue #91).
Derived content like the glossary, so Tier-3, off by default, never in any
corpus. Pairs with but is independent of the Glossary extension (§7) - enable
either alone.

### 8.1 Syntax

- `:index[term]` (the core inline extension form) marks an index occurrence at
  that point. It is an **invisible marker**: it emits no visible text, only an
  empty `<span>` anchor target that the generated index links back to. A span
  (not an `<a>`) is used deliberately so a marker placed inside a link label
  never nests one anchor inside another.
- A `::: index` block marks where the index renders (its body is normally
  empty, like `::: references`).

### 8.2 Rendering

- Each `:index[term]` in the document body emits
  `<span id="idx-{slug}-{n}" class="index-term"></span>`, where `slug` is the
  §7.2 slug of the term and `n` is that slug's 1-based occurrence count in
  document order. The element is empty, so nothing shows inline.
- Only body occurrences are indexed. A marker inside deferred content - a
  footnote definition, which the renderer may drop (unreferenced) or reorder -
  renders **inert** (`<span class="index-term"></span>`, no id) and is not
  listed, so a generated back-link never points at an anchor that was dropped.
- `::: index` renders `<ul class="index">` with one `<li>` per distinct slug,
  the list **sorted by slug in ascending Unicode-codepoint order** (equivalently
  UTF-8 byte order - a fixed, locale-independent sort, so all implementations
  agree). Each item is `{display} <a href="#idx-{slug}-1"
  class="index-backref">↩</a> …`, one back-link per occurrence `1 … n`. The
  `{display}` text is the first occurrence's literal term text (HTML-escaped).
- If no `:index[…]` marker exists, `::: index` stays a plain
  `<div class="index">` (nothing to collect), matching the §6.4 empty-section
  rule.

### 8.3 Degradation

When the extension is off, `:index[term]` is the generic inline fallback
`<span class="ext-index">term</span>` (the term text becomes visible - the
marker cannot hide without its handler) and `::: index` is a plain
`<div class="index">`. No content is dropped.

### 8.4 Conformance (NOT corpus-pinned)

Tier-3, not corpus-pinned. The contract is cross-impl parity: the same document
yields the same `idx-{slug}-{n}` anchors, the same sorted `<ul>`, and the same
back-links. Each implementation pins this in its own suite (occurrence
anchoring, the codepoint sort, multi-occurrence back-links, and the
no-marker / extension-off degradation).

## 8b. Placement directives: TOC & footnotes (Tier-3)

Two directives let the author control *where* a piece of derived content
renders, extending the same collect-then-emit family as Glossary (§7) and
Index (§8).

### 8b.1 `::: toc` — table of contents

A `::: toc` block renders a `<nav class="toc">` of the document's headings at
that spot (rather than the top/bottom injection of the standalone TOC
extension). Opt-in, off by default. The level window is set with attributes on
the line **before** the opener (Carve attaches `:::`-block attributes on a
preceding attribute line, never inline on the opener):

```
::: toc              (all levels, 1-6)
:::

{depth=2}            (levels 1-2)
::: toc
:::

{from=2 to=4}        (levels 2-4)
::: toc
:::
```

- `{depth=N}` includes levels `1..N`; `{from=X to=Y}` is an explicit window
  (swapped if inverted). Both clamp to 1-6; a non-numeric value falls back.
- The author's `{#id .class}` is carried onto the `<nav>`; the directive-only
  `depth`/`from`/`to` keys are stripped from the output.
- Entries link to each heading's resolved, dedup-aware id (so links match the
  emitted heading anchors). **Every heading is included in document order**,
  recursing into containers (`::: note`, blockquotes, divs) — those headings
  render with id anchors, so they belong in the TOC. Footnote-definition
  headings get no id and are excluded. (A heading inside a list item is subject
  to the core list-interruption rules, which currently differ across engines;
  the TOC faithfully reflects each engine's parse.)
- The nested `<ul>` HTML is byte-identical to the standalone TOC extension
  (one tag per line).

### 8b.2 `::: footnotes` — endnotes placement

A `::: footnotes` block relocates the endnotes section to that spot instead of
the document end. This is **core** (no extension needed) — the marker itself is
the opt-in.

- All footnotes are flushed at the marker, including those referenced *after*
  it in the document.
- Only the **first** `::: footnotes` places; a second one degrades to an empty
  `<div class="footnotes"></div>` placeholder (no duplicate section).
- A document with **no** `::: footnotes` marker is **byte-identical** to the
  default end-of-document rendering.
- A marker in a document with no footnotes, or a `::: footnotes` nested inside a
  footnote definition, degrades to an ordinary `<div class="footnotes">` and
  never relocates.

### 8b.3 Degradation & conformance

Both degrade gracefully (a labeled `<div>` floor).

- **`::: footnotes`** is core and its full output is byte-identical across
  implementations, so it is **corpus-pinned** in the main corpus
  (`120-footnotes-placement`).
- **`::: toc`** is a Tier-3 extension whose embedded output carries
  per-implementation block indentation (like Glossary and Index), so it is
  **not** corpus-pinned; the cross-impl contract is the byte-identical `<nav>`
  list fragment, and each implementation pins the window selection, id
  resolution, and degradation in its own suite.

## 9. HeadingNumbers (Tier-3)

Auto-number sections and render numbered cross-references - "Section 1.2" or
"Section 1.2 - Title" instead of the bare heading title (issue #198). Carve
already auto-numbers figures/tables/equations via captions; this is the section
equivalent. Numbering is a **rendering policy, not source semantics**, so it is
Tier-3: off by default, never corpus-pinned, and adds **no new syntax** (it only
reads existing headings and the `{.unnumbered}` class). It runs as a
render-stage transform.

### 9.1 Numbering

- Walk every heading in document order, descending into containers (list items,
  divs/admonitions, definition lists) exactly as id assignment does, but **skip
  headings inside a blockquote** (quoted content is not the document's own
  sections - matching how heading-id assignment declines blockquote headings as
  implicit-reference targets).
- Headings inside a footnote definition are **not** numbered (the walk covers
  the document body only); a `</#id>` to such a heading keeps its plain title.
- Number gap-free with a small stack: track the current dotted number and the
  heading level of each part. For a heading at level `L >= minLevel`, pop parts
  deeper than `L`; if the top part is at level `L` increment it, otherwise push a
  new `1`; the number is the parts joined with `.`. Headings shallower than
  `minLevel` are not numbered and do not affect the stack. A skipped structural
  level (a jump from `##` straight to `####`) therefore produces `1.1`, **not**
  an empty `1.0.1` segment - the dotted number reflects the *nesting of numbered
  headings*, not absolute levels.
- `minLevel` (option, default `1`) sets the top numbered level. A document whose
  `# Title` is the doc title sets `minLevel: 2` so the first `##` is `1`.
- A heading carrying the `unnumbered` class is skipped: it gets no number and
  **does not advance the stack**. Deeper headings continue from the surrounding
  state. The class comes from a **preceding** attribute line (trailing `{…}` on a
  heading is literal text in Carve, not an attribute):

  ```carve
  {.unnumbered}
  ## Changelog
  ```
- On a duplicate (explicit) heading id, the **first** heading wins the number /
  title used for `</#id>` rewrites, matching how id assignment picks the
  `</#id>` target - so a rewritten label and its link destination always agree.
  (A quoted or unnumbered first heading still wins the id though it carries no
  number.)
- A strictly-nested hierarchy numbers unambiguously. A *non-monotonic* one that
  returns to a previously **skipped** level (`#` → `###` → `##`) is inherently
  ambiguous and may reuse a number; the rule above stays deterministic, but
  authors should nest heading levels without skips for clean numbering.

### 9.2 Heading rendering

- A numbered heading prepends a number span inside the `<h*>`, one space before
  the title. The id stays where Carve already puts it - on the `<section>`
  wrapper for a top-level heading, on the `<h*>` itself for a heading nested in a
  list/div - and is unchanged; only the span is added:

  ```html
  <section id="parsing">
    <h2><span class="section-number">1.2</span> Parsing</h2>
  </section>
  ```

  The span is separate so a host can restyle or hide it in CSS.

### 9.3 Numbered cross-references

- Only **`</#id>` cross-references** are rewritten, identified by provenance:
  `resolve()` converts a `</#id>` crossref into a title-cloned link and tags it
  with a **non-rendered `fromCrossref` flag** (metadata every renderer ignores -
  it never appears in HTML). HeadingNumbers rewrites only flagged links.
  Ordinary `[text](#id)` links and implicit `[label][]` references are **not**
  tagged, so they always keep their text - including the case where that text
  happens to equal the heading title (`[Parsing](#parsing)`). This makes the
  "explicit text overrides" rule exact.
- This is the one small core touch the extension needs: a flag set at resolve
  time. It changes no rendered output, so the core conformance corpus is
  unaffected; it only lets a render-stage extension tell an auto-filled
  cross-reference from a hand-written link.
- The rewrite is controlled by the `crossref` option:
  - `number-title` (default): text becomes `{label} {N} - {title}` →
    `Section 1.2 - Parsing`.
  - `number`: text becomes `{label} {N}` → `Section 1.2`.
  - `title`: cross-references are left untouched (numbering appears only on the
    headings).
- `label` (option, default `Section`) is the prefix word; set it to `§`, a
  localized word, etc. The `href` is never changed.

### 9.4 Interaction with HeadingLevelShift

Numbering keys off the heading level present when it runs. To number by the
**final** (post-shift) levels, register `headingNumbers` **after**
`headingLevelShift` so its render-stage pass runs later. Registered before, it
numbers by the pre-shift levels.

### 9.5 Degradation

When the extension is off, headings render with no number span and
cross-references keep their title-cloned text - exactly today's behavior, so a
document is unchanged and never broken by disabling the policy.

### 9.6 Conformance (NOT corpus-pinned)

Tier-3, not corpus-pinned. The contract is cross-impl parity: the same document
and options yield the same `section-number` strings on the same headings and the
same rewritten cross-reference text. Each implementation pins this in its own
suite (the dotted counter incl. the level-skip and `{.unnumbered}` rules,
`minLevel`, the three `crossref` styles, the auto-vs-explicit reference
distinction, and extension-off degradation).

### 9.7 Out of scope (impls MAY differ / future)

- Appendix lettering (`A`, `B`, `A.1`) and front-matter/body or per-section
  restart need a section-grouping marker; deferred to a follow-up.
- Numbering figures/tables relative to sections (`Figure 2-3`) is a caption
  concern, not this extension.

## 10. CodeCallouts (Tier-2)

Mark points inside a fenced code block with `<n>` and attach an explanation
list (issue #88), the way AsciiDoc callouts work. Tier-2 (standard-recommended):
a spec-defined cross-impl syntax that every implementation SHOULD offer but
ships **off / passthrough** by default; its output is pinned in the optional
corpus (`tests/corpus-optional`) when enabled. Collision risk is low because the
markers are recognized **only inside fenced code**.

### 10.1 Syntax

- Inside a fenced code block, a `<n>` token (`n` = one or more ASCII digits)
  that is the **last non-whitespace content on its line** is a callout marker.
  Whitespace before it is ordinary code indentation and is preserved.
  In-code markers render whenever the extension is enabled, independently of
  whether an explanation list follows (a marked line with no bound list still
  shows its bubble - the author placed the marker).
- Immediately after the code block, a **callout list** binds the explanations: a
  paragraph whose every soft-break line has the form `<n> text` (a marker, a
  single space, then inline prose). The list binds only when (a) the code block
  contains at least one marker and (b) every line of that following paragraph is
  a `<n> text` item; otherwise that paragraph is ordinary content (the list does
  not bind) - the in-code markers still render as bubbles per the rule above.

### 10.2 Rendering

- An in-code marker renders as `<b class="callout" data-callout="n">n</b>` -
  the only part of the code line that is **not** HTML-escaped; the rest of the
  content escapes as usual. The marker is a styleable element the host hides from
  copy-to-clipboard with CSS (`user-select: none`), so Carve emits it and the
  host styles it - no script required.
- The callout list renders as `<ol class="callouts">`, one `<li value="n">` per
  `<n> text` item in source order (its inline prose parsed normally). The
  explicit `value="n"` is the item's marker number, so the displayed ordinal
  always equals the in-code bubble even when numbers are non-sequential or do
  not start at 1 (`<3>` ↔ `<li value="3">`); alignment is by number, not list
  position.

### 10.3 Degradation

- **Non-HTML targets** (Markdown, plain text, ANSI): the extension contributes
  HTML renderers only, so non-HTML output keeps the `<n>` markers literal in the
  code and the callout list as its ordinary `<n> text` lines. Nothing is dropped
  and the marker↔note correspondence survives as the literal numbers - it is the
  source-faithful, copy-paste-able form. (A `(n)`-style rewrite in non-HTML
  targets would need non-HTML extension render hooks; out of scope for v1.)
- **Extension off**: identical to the above - the `<n>` tokens stay literal in
  the code and the following lines are an ordinary paragraph; nothing is
  reinterpreted.

### 10.4 Conformance (`tests/corpus-optional`)

Tier-2, so pinned in the optional corpus when enabled, with a `manifest.json`
entry. Cases pin: in-code marker rendering (escaping around the `<b>`), the
`<ol class="callouts">` binding, the marker/list alignment, and the failure
modes (a code block with no marker, and a following paragraph with a non-`<n>`
line, both leave the `<n>` literal).

### 10.5 Out of scope (impls MAY differ / future)

- Comment-anchored markers (`// <1>`) - bare `<n>` only for v1.
- Linking a marker to its list item (anchor/back-ref) - the marker is a
  styleable bubble, not a link, in v1.
