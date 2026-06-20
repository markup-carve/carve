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
- Tier 3 (non-exhaustive): Mermaid, MathBlock (a ` ```math ` fenced block →
  `<div class="math display">`, the GFM-style block form of Carve's `$…$`
  math), Tabs, CodeGroup, Details, TableOfContents, HeadingPermalinks,
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

  `MathBlock` renders a ` ```math ` fence as a fixed
  `<div class="math display">\[ … \]</div>` (body HTML-escaped). It
  deliberately drops **all** author attributes - neither a fence info-string
  nor a preceding `{#id .class}` block-attribute line is copied onto the div.
  The extension emits raw HTML directly, bypassing the core safe-mode attribute
  sanitizer, so copying attributes would let `{onclick="…"}` through unfiltered
  on untrusted input. This differs from `Mermaid`, which carries a block-attr
  line onto its `<pre>`. Attribute-bearing math is the job of the **core**
  inline `$…$` / display `$$…$$` forms: those run through the core renderer,
  where attributes attach to the `<span>` and safe mode filters dangerous
  handlers while keeping classes and id.

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
