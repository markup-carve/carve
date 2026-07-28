# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `scripts/compare-impls.mjs` now compares every render target, not just HTML.
  `--targets=all` (the new default) covers `html`, `markdown`, `plain`, `carve`
  and `ansi`; only `html` has expected-output fixtures, so the other four are
  compared implementation-against-implementation (trailing-newline-insensitively,
  as elsewhere in the project). Identical output across the three engines was an
  invariant that four of five targets had nothing checking it.

### Added

- **Corpus pin for the compact sub-list rule with a following sibling**
  (85-compact-list-blocks-2). §17 L2 keeps an item tight when a blank line
  precedes its sub-block, and the existing pin used a block quote with no
  sibling after it. The sub-list variant with a following item was unpinned, and
  carve-rs got it wrong: the blank leaked past the sub-list and the sibling
  marker read it as a blank between items, rendering the whole list loose
  (carve-rs#286). Because the canonical writer emits exactly this shape for
  ordinary nested lists, carve-rs was also breaking
  `to_html(fmt(x)) == to_html(x)` on a plain two-level list.

- **The canonical source writer is now specified** (new PART 11). `carve fmt`
  and the `carve` render target had no normative text at all, so their behavior
  was defined only by three implementations happening to agree. PART 11 pins the
  invariants (`parse(fmt(x)) == parse(x)` and idempotence), states the escaping
  rule - a character is escaped if and only if omitting the escape would change
  the re-parsed AST - and records why a static per-character table cannot
  implement it: `[` is literal alone but an opener in `[a](b)`, `^` is literal
  at column 0 but an opener in `^[note]`. The conformant strategy pins the
  output while leaving the computation free: build the minimal form, re-parse
  it, and fall back to escaping the whole line only when the re-parse differs.
  A new `tests/corpus-roundtrip/` corpus pins Carve-source-in, Carve-source-out
  pairs; the invariant assertions run today, the byte assertions are skipped
  until an engine implements minimal escaping.

- Smart typography now has a normative AST representation (PART 9 §8): a
  recognized substitution is a `smart_punctuation` inline node carrying both the
  resolved kind and the author's source run. Presentation renderers emit the
  glyph; the canonical Carve writer emits the source run, so `fmt` reproduces
  the document instead of normalizing its punctuation. Writing the glyph
  straight into the text buffer is no longer conformant. The eighteen kind names
  are spec surface, a quote node also records its resolved (locale-dependent)
  glyph, and a dash run partitions into one node per glyph so `----` round-trips
  to four hyphens. For profiles the node is classified as `text`.

- Smart typography is now specified as unconditional by default (PART 9 §8): a
  conformant implementation performs the substitution with no extension
  registered, and a locale/glyph extension selects which characters are emitted
  rather than whether the transform runs. Hosts may offer one document-global
  `smartTypography` switch (default `true`); with the node representation above
  it is a rendering decision, so parsing is unchanged and the presentation
  renderers emit each node's source run instead of its glyph. Per-target
  defaults are non-conformant. Escapes, `:name:` symbols and heading ids are
  unaffected in either mode. Pinned by the optional corpus feature
  `smart-typography-off`, and explained in `docs/divergence-from-djot.md`
  section 12, which also records why Carve uses one leaf node where Djot uses
  two container types plus a leaf.

## [0.1.1] - 2026-07-27

### Fixed

- The executable-spec oracle's hyphen-run smart typography now uses the canonical
  allocateDashes decomposition (all em when divisible by 3, all en when even,
  otherwise the most em-dashes with the remainder as en, trading one em-dash for
  two en-dashes when the remainder is 1). It previously emitted a single em-dash
  for every odd non-multiple-of-3 run, diverging from carve-js and carve-php at
  runs of 11 and 13 hyphens.

- The executable-spec oracle now applies the lenient definition-list rule (PART 9
  §24 C3): a `:  def` line attaches as a `<dd>` to its open `:: term` at or below
  the term's column (even under the item content column), and an over-indented
  definition folds into the term while preserving its whitespace. Aligns the
  oracle with carve-js / carve-php / carve-rs across the definition-column family.

- Static diagram output now uses a uniform wrapper across engines: a supplied
  renderer's output is wrapped in a `<div class="{cssClass}">` carrying the
  fence's merged attributes. Previously carve-js emitted `<pre>`, carve-php a
  `<div>`, and carve-rs bare output that dropped the css class (carve#302).

### Added

- **Corpus pins for three converged edge cases** confirmed across carve-js,
  carve-php, carve-rs and the oracle: a longer hyphen-run ladder (7, 8, 10, 11,
  13) extending the smart-typography dashes example so the allocation is pinned
  with no leftover literal hyphen; an unresolved `[^a]` footnote reference with a
  trailing `{...}` attribute stays literal text and does not become an attributed
  span (161); and a tight list item keeps trailing text after a closed block (a
  fenced code block, div, or admonition) bare, wrapping it in a `<p>` only when a
  blank line makes the item loose (162).

- **Corpus pins for the strict column-0 rule and one list-looseness fix** now
  confirmed converged across carve-js, carve-php, carve-rs and the oracle
  (155-160). A top-level block opener only fires at column 0: indented by even a
  single space it stays literal paragraph text. Pinned across the construct
  families - an indented attribute line before a paragraph or list (155), an
  indented image with a `^ ` caption, alone or under an indented attribute brace
  (156), an indented reference-link or footnote definition, which then registers
  nothing (157), and an indented `:::` div, `::: |` line block, or `::: note`
  admonition (158). Each of 155, 156, and 158 also pins a flush-left control
  proving the column-0 form still fires (attribute attaches, figure forms, div
  opens). Inside a list item the openers key on the content column: a `::: note`
  whose body sits below it folds as literal text (159). Finally, an outer list
  item carrying its own internal blank before a block attached under its nested
  list is loose, wrapping its lead text in a `<p>` (160, the list-looseness fix).
- **Corpus pin for a newly-aligned definition-term wrapping behavior** (154). A
  `:: term` continued by a wrapped line that sits below the item content column
  is a lazy continuation, so its leading whitespace is stripped before it folds
  into the `<dt>` - matching a lazy paragraph continuation. carve-js previously
  kept the stray space; it now strips (carve-js#385), so all four producers
  (carve-js, carve-php, carve-rs, oracle) agree byte-for-byte. The pin covers
  continuation columns 0 and 1.
- **Corpus pins for five previously unpinned cross-engine behaviors** now
  confirmed converged across carve-js, carve-php, carve-rs and the oracle: a
  block opener dedented below an indented marker's content column folds as lazy
  text (149); a leading unattached `{…}` brace before an inline span stays
  literal (150); a `{…}` after an inert mention/tag stays literal (151); the
  lenient definition-list rule where a `:  def` attaches at or below the term's
  column and folds only when over-indented (152); and the image trailing-attribute
  glue rule where a spaced `{…}` stays literal while a glued one attaches (153).
- **Protection for byte-exact corpus fixtures.** Several pairs assert the
  handling of characters an editor or formatter would "clean up": a trailing
  no-break space, a trailing ASCII space, and the zero-width / bidi controls in
  the Trojan-Source pairs. An `.editorconfig` and `.gitattributes` now stop
  those bytes being normalized away, and a `tests/fixture-bytes.test.mjs` guard
  fails loudly if one goes missing. The guard is not redundant with the corpus
  test: where the same invisible character appears raw on BOTH sides of a pair
  (the Trojan-Source zero-width case), stripping it from both keeps them in
  sync, so the corpus test stays green while no longer testing anything.
- **Corpus coverage for trailing-whitespace boundaries.** The trailing-whitespace
  strip applies to the paragraph's SOURCE line, so it never touches spaces a
  construct produces while rendering: a paragraph whose entire content is an
  all-space verbatim span keeps them. The existing all-space pairs only covered
  the mid-sentence form, so the lone case - the one that actually diverged
  between implementations - was unpinned. A trailing no-break space is likewise
  pinned as content, not whitespace; only ASCII whitespace is stripped.
- **Corpus coverage for all-space verbatim content.** The single-space strip on
  a verbatim span drops one leading and one trailing space, but not when the
  content is entirely spaces - those spans keep every space. No corpus pair
  exercised this, which is why a formatter round-trip bug (spans growing by two
  spaces per pass, and all-space content collapsing to an unwritable empty span)
  shipped in all three engines undetected. Pinned for code spans, the inline
  literal and math.
- **Inline literal** (`` !`…` ``, PART 9 §27): a `!` prefix on a verbatim code
  span, mirroring the `$`-math prefix. Content is captured verbatim and
  HTML-escaped, emitted by every renderer, but rendered as prose with the
  `<code>` wrapper dropped - so notation that collides with the bare emphasis
  delimiters (phonemic `/kaet/`, glob patterns, paths) needs no per-character
  escaping. A trailing `{…}` is the ordinary inline attribute block. Chosen
  over the earlier trailing-`{!}` sigil for family fit with math and image
  (carve#280).
- Diagram documentation: a dedicated Diagrams & Charts page and a cheatsheet
  section covering the `FencedRender` presets, which were previously described
  only in capability tables.
- **PlantUML preset** (`plantuml`, claims `plantuml` and `puml`), covering the
  UML diagram types Mermaid does not (use case, component, deployment, timing),
  renderable client-side offline via `@plantuml/core`.
- `plantuml` added to the static-render **renderers** key set, so a build-time
  PlantUML renderer can bake diagrams into no-JS static HTML.
- **Open static renderers map.** The `renderers` map is now keyed by the fence's
  css class rather than a closed canonical set, so a custom `FencedRender` fence
  word (`fencedRender({ language: 'myuml' })` + `renderers: { myuml: … }`) is
  static-capable in every engine with the same config - no spec edit, no
  lockstep. Canonical presets are just the pre-named classes. This supersedes
  the closed-key-set design.
- **SVG `img` fence** (Tier-3, off by default): a `` ```img `` block renders a
  sanitized SVG, sandboxed by default (a `data:image/svg+xml` `<img>`), with an
  opt-in inline mode for theming (#311).

First normative grammar and corpus snapshot. This release locks the Carve
specification at its initial stable version: the grammar (`resources/grammar.ebnf`),
the conformance corpus (`tests/corpus`), and the optional extension corpus
(`tests/corpus-optional`) are all considered normative from this point.
All four core implementations (carve-js, carve-rs, carve-php, carve spec)
advance to `0.1.0` together as the first lockstep minor release.

### Added

#### Tier-1 core (always-on, corpus-pinned)

- **Inline emphasis** - `/italic/`, `*bold*`, `_underline_`, `~strikethrough~`,
  `=highlight=`, `/*bold italic*/`; strict word-boundary rules (no intraword bare
  delimiters); doubled delimiter is always literal; forced `{X...X}` family for
  deliberate intraword emphasis
- **Superscript and subscript** - braced-only `{^text^}` / `{,text,}`. There is no
  bare `^text^` / `,text,` form: sub/sup attach to characters, not words, so the
  dominant uses (`H{,2,}O`, `mc{^2^}`) are intraword, which a word-boundary bare
  delimiter could never express - and a bare comma or caret collides with prose
  punctuation. The bare emphasis delimiter set is therefore `/ * _ ~ =`.
- **Headings** - `#` through `######`; each heading wrapped in a
  `<section id="...">` element; heading ids are Unicode-preserving and
  case-preserving by default, with opt-in lowercase and ASCII-fold transforms
- **Links and images** - `[text](url)`, `![alt](url)`, wiki-style `[Page Name][]`
  (auto-resolves to a heading without a separate definition),
  `<url>` autolinks, `<mailto:>` autolinks
- **Cross-references** - `</#id>` auto-fills its link text from the target
  heading; numbered cross-references with `#` placeholder in captions
  (e.g. `^ Figure #: ...`) auto-number figures, tables, listings, and equations;
  `</#id>` to a numbered caption fills in "Figure 1" etc.
- **Lists** - unordered (`-` or `*`), ordered (decimal/alpha/roman with `.` or
  `)` delimiter), task lists (`- [ ]` / `- [x]`); list continuation marker (`+`
  on its own line) attaches the next flush-left block to the current item;
  list-item attributes
- **Definition lists** - `:: term` / `:  definition` two-character prefix
- **Tables** - `|=` header prefix (no separator row required), headerless tables,
  per-column alignment (`|=<` left, `|=>` right, `|=~` center), per-cell
  alignment; `^` rowspan marker, `<` colspan marker, `+` multi-line cell
  continuation; `^ caption` for table captions; GFM `|---|` delimiter row
  accepted as an alternative header marker
- **Fenced and inline code** - `` `inline` ``, ` ``` lang ` fenced blocks;
  code callout markers (`<n>`) in fenced code with a bound explanation list
  (Tier-2 when enabled)
- **Blockquotes** - `>` prefix; `^ Attribution` caption
- **Footnotes** - `[^id]` reference, `[^id]: definition` definition block,
  inline `^[...]` footnote
- **Math** - `` $`...` `` inline math, `` $$`...` `` display math (djot form)
- **Admonitions** - `::: type` two-tier fenced divs: eight canonical types
  (`note`, `tip`, `info`, `warning`, `danger`, `success`, `example`, `quote`)
  render to `<aside class="admonition type">`; any other type word renders to a
  generic `<div class="type">`
- **Generic divs and spans** - bare `:::` / `::: {attrs}` for plain `<div>`;
  `[text]{attrs}` inline span; `:::` nesting with matching closer length rule
- **Attributes** - `{#id .class key=value}` on any block or inline element;
  boolean attributes `{disabled}` (renders as `name=""`); strict identifier
  rule (digit-first or non-identifier chars make the whole block literal)
- **Editorial / critic markup** - `{+ +}` insert, `{- -}` delete,
  `{~ old~>new ~}` substitute, `{= =}` highlight, `{# #}` comment
- **Frontmatter** - YAML frontmatter block at document start; safe loader
  (no arbitrary object instantiation)
- **Comments** - `%%` whole-line, `text %% trailing`, `%%%` block comment
- **Raw blocks and inline** - ` ```=format ` raw block, `` `code`{=format} ``
  raw inline; safe-passthrough mode required for untrusted input
- **Abbreviations** - `*[ABBR]: expansion` for automatic `<abbr>` tags
- **Smart typography** - straight quotes to curly quotes, `--` en-dash,
  `---` em-dash, `...` ellipsis; locale-aware quote sets (Tier-2 when configured)
- **Mentions, tags and symbols** - `@user` mention, `#tag` tag, `:name:` symbol;
  all three share one left-boundary rule (open only at start of line or after
  whitespace or an opening punctuation character) and render as non-link spans by
  default. Symbol names allow `+` / `-` as the first character; unmapped symbols
  render literally. URL templates (mention/tag) and the symbol map are Tier-2
  configuration over this Tier-1 syntax.
- **Extension syntax** - `:name[content]{attrs}` inline extension,
  `::: name` block extension; unknown words fall through to generic
  `<span>` / `<div class="name">` without error
- **Captions and figures** - `^` prefix line attaches captions to images,
  blockquotes, tables, fenced code blocks, and display math; captioned blocks
  are wrapped in `<figure>` with `<figcaption>`
- **Thematic breaks** - `---` / `***` / `___`
- **Hard line breaks** - end-of-line `\` (visible, no trailing-space tricks)
- **Tab indentation** - tab-stop-aware list nesting (4-space tab stops)
- **Paragraph interruption** - a block opener on a new line starts a block
  without requiring a blank line (Markdown-style; stricter than Djot)
- **Target-aware rendering** - one parsed document can be emitted to HTML,
  ANSI terminal, Markdown, or plain text by swapping the renderer

#### Tier-2 standard extensions (off by default, corpus-pinned when enabled)

- **Citations** - `[@key]` inline citation with typed locators
  (`[@key, p. 12]`) and integral markers (`[@key]!`); resolved against a
  CSL-JSON bibliography source named in frontmatter
- **Code callouts** - `<n>` markers inside fenced code blocks bound to an
  explanation list below the block
- **Bibliography** - supplying a CSL-JSON pool to the citations extension
  renders a cite-ordered reference list with mandated numeric output and
  back-links (no separate block construct; driven by the citations pool)
- **Glossary** - `::: glossary` definition list whose terms become
  `<dt id="gloss-{slug}">` entries; `:term[word]` inline links to the entry
- **Index** - invisible `:index[term]` markers collected into a sorted
  `::: index` block with back-links to every occurrence
- **Heading numbers** - opt-in section auto-numbering (`<span class="section-number">`)
  on each heading; numbered `</#id>` cross-references rewritten to "Section 1.2 - Title"
- **Mention / tag URL templates** - configurable URL templates for `@mention`
  and `#tag` routing
- **Symbol map** - `:name:` symbol to replacement mapping (e.g. an emoji glyph
  map); a symbol carrying attributes renders as a `<span>`
- **Locale smart-quote sets** - per-locale opening/closing quote pairs
- **Bare-URL autolinking** - plain URLs in prose auto-linked without angle brackets

#### Security model (normative, always enforced - grammar PART 9)

- **URL-scheme denylist (§25)** - `javascript:`, `vbscript:`, `data:`, `file:`,
  and OS protocol-handler schemes (`ms-msdt`, `ms-office`, `shell`, `vscode`,
  and related) blanked on all link/image/autolink sinks; scheme detection strips
  leading ASCII control characters and all Unicode whitespace before matching
- **Attribute hardening (§25)** - `on*` event-handler attributes and `srcdoc` /
  `formaction` dropped on every rendered element; `javascript:`/`vbscript:`/
  `data:`/`file:` values in any attribute blanked; `style` values containing
  `expression(`, `url(`, `@import`, `behavior:`, or `-moz-binding` blanked
- **Safe raw passthrough (§25)** - implementations must provide a mode where raw
  blocks and raw inline emit as escaped literal text rather than verbatim HTML
- **Resource bounds / DoS protection (§25)** - parse and render must be linear
  in input size; MAX_NESTING_DEPTH = 200 cap applied uniformly to all container
  kinds; abbreviation, reference, footnote, and crossref expansion bounded to
  O(n) total work
- **Non-HTML injection prevention (§25)** - Markdown, plain-text, and ANSI
  renderers must strip control characters from text/code/math/URL values before
  emission
- **Trojan-Source / invisible-Unicode hardening (§26)** - heading ids NFC-normalized
  and stripped of bidi-override/isolate controls (U+202A-U+202E, U+2066-U+2069)
  and zero-width characters before slugging; rendered text and code-span/code-block
  content strip bidi-override/isolate controls (removed, not entity-escaped, to
  prevent round-trip reintroduction)

[0.1.0]: https://github.com/markup-carve/carve/releases/tag/0.1.0
