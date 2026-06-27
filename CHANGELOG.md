# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - YYYY-MM-DD

First normative grammar and corpus snapshot. This release locks the Carve
specification at its initial stable version: the grammar (`resources/grammar.ebnf`),
the conformance corpus (`tests/corpus`), and the optional extension corpus
(`tests/corpus-optional`) are all considered normative from this point.
All four core implementations (carve-js, carve-rs, carve-php, carve spec)
advance to `0.1.0` together as the first lockstep minor release.

### Added

#### Tier-1 core (always-on, corpus-pinned)

- **Inline emphasis** - `/italic/`, `*bold*`, `_underline_`, `~strikethrough~`,
  `^superscript^`, `,subscript,`, `=highlight=`, `/*bold italic*/`; strict
  word-boundary rules (no intraword bare delimiters); doubled delimiter is always
  literal; forced `{X...X}` family for deliberate intraword emphasis
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
  (`note`, `tip`, `info`, `warning`, `caution`, `details`, `spoiler`,
  `line-block`) render to `<aside class="type">`; custom type words render to
  `<div class="type">`
- **Generic divs and spans** - bare `:::` / `::: {attrs}` for plain `<div>`;
  `[text]{attrs}` inline span; `:::` nesting with matching closer length rule
- **Attributes** - `{#id .class key=value}` on any block or inline element;
  boolean attributes `{disabled}` (renders as `name=""`); strict identifier
  rule (digit-first or non-identifier chars make the whole block literal)
- **Editorial / critic markup** - `{+ +}` insert, `{- -}` delete,
  `{~ old~> new ~}` substitute, `{= =}` comment, `{# #}` highlight
- **Frontmatter** - YAML frontmatter block at document start; safe loader
  (no arbitrary object instantiation)
- **Comments** - `%%` whole-line, `text %% trailing`, `%%%` block comment
- **Raw blocks and inline** - ` ```=format ` raw block, `` `code`{=format} ``
  raw inline; safe-passthrough mode required for untrusted input
- **Includes** - `{{ path/to/file }}` file inclusion
- **Abbreviations** - `*[ABBR]: expansion` for automatic `<abbr>` tags
- **Smart typography** - straight quotes to curly quotes, `--` en-dash,
  `---` em-dash, `...` ellipsis; locale-aware quote sets (Tier-2 when configured)
- **Mentions and tags** - `@user` mention, `#tag` tag; rendered as non-link
  spans by default; URL templates configurable at render time (Tier-2)
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
- **Bibliography block** - `::: references` placeholder populated from
  resolved citation keys with mandated numeric output and back-links
- **Glossary** - `::: glossary` definition list whose terms become
  `<dt id="gloss-{slug}">` entries; `:term[word]` inline links to the entry
- **Index** - invisible `:index[term]` markers collected into a sorted
  `::: index` block with back-links to every occurrence
- **Heading numbers** - opt-in section auto-numbering (`<span class="section-number">`)
  on each heading; numbered `</#id>` cross-references rewritten to "Section 1.2 - Title"
- **Mention / tag URL templates** - configurable URL templates for `@mention`
  and `#tag` routing
- **Emoji glyph map** - `:emoji:` shortcode to glyph mapping
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

[0.1.0]: https://github.com/markup-carve/carve/releases/tag/v0.1.0
