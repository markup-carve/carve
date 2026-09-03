---
description: A feature-by-feature comparison against Markdown, Djot and MDX, for choosing between them.
---

# Carve vs Markdown, Djot & MDX

This page compares syntax and implementation characteristics. For conversion
instructions, see [Coming from Markdown](/migrate-from-markdown). For parser
differences, see [Differences from Djot](/divergence-from-djot).

The table is maintained by the Carve project. See [Markup language
comparison](./markup-languages) for AsciiDoc, reStructuredText, Textile, and
other languages.

::: tip Legend
✅ native &nbsp;·&nbsp; 🧩 plugin / extension needed &nbsp;·&nbsp; ⚠️ partial / convention &nbsp;·&nbsp; ❌ not available
:::

## At a glance

|                                 | Markdown (CommonMark) | Djot | MDX | **Carve** |
|---------------------------------|:---:|:----:|:---:|:---:|
| Published grammar               | ⚠️ specification plus prose rules | ✅ | ❌ (Markdown + JSX) | ✅ EBNF |
| Consistent inline rules         | ❌ |  ✅   | ❌ | ✅ |
| No-backtracking parse guarantee | ❌ |  ✅   | ❌ | ✅ \* |
| Markdown-familiar syntax        | ✅ |  ⚠️  | ✅ | ⚠️ |
| Paragraph interruption (no blank line) | ✅ | ❌ | ✅ | ✅ \*\* |

\* Inline parsing is single-pass with a delimiter stack; at the block level a
code or raw fence uses a bounded forward scan for a matching closer. A `:::`
container opens without that lookahead and may close at end of input. See
[Technical Rationale](/technical-rationale).
\*\* Like Markdown for quotes, headings, tables and closed fences; list markers
(both bullet and ordered) deliberately never interrupt a paragraph - a list
needs a blank line (no CommonMark `1.`-only heuristic).

### Paragraph interruption, by rule count

Approximate number of rules that determine whether a new block can start
without a preceding blank line. These are summaries for authors, not grammar
production counts.

| Model | Interruption rules |
|---|---|
| Markdown (CommonMark) | ~8–10, irregular - setext underline, ordered list only if it starts with `1`, indented code *can't* interrupt, HTML-block type 7 *can't*, bullet only if the first item is non-empty, … |
| MDX | inherits Markdown's (~8–10), plus JSX block handling |
| Djot | **1** - nothing interrupts; a blank line precedes every block |
| **Carve** | **3** - visible block-openers interrupt (heading, quote, table row, open fence, thematic break); list markers fold (never interrupt); fence / `:::` closers and bare images don't interrupt |

Carve uses three rule groups: block markers that start a new block, list markers
that remain in the paragraph, and closing markers that do not start a block.

## Authoring features

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Tables | 🧩 GFM | ✅ | 🧩 GFM | ✅ |
| Table rowspan / colspan | ❌ | ❌ | ❌ | ✅ |
| Footnotes | 🧩 | ✅ | 🧩 | ✅ |
| Math | 🧩 | ✅ | 🧩 | ✅ |
| Definition lists | 🧩 | ✅ | 🧩 | ✅ |
| Admonitions / callouts | 🧩 | ⚠️ via div | 🧩 component | ✅ native |
| Attributes `{.class #id}` | 🧩 (Pandoc, markdown-it-attrs) | ✅ | ⚠️ JSX props | ✅ |
| Generic divs / spans | 🧩 (Pandoc fenced divs / spans) | ✅ | ⚠️ components | ✅ |
| Smart typography | 🧩 | ✅ | 🧩 | ✅ |
| Editorial / critic markup | ❌ | ❌ | ❌ | ✅ |
| Frontmatter | ⚠️ tooling | ❌ | 🧩 | ✅ |
| Symbols / emoji shortcodes | 🧩 | ✅ symbols, mapped via filters | 🧩 | ✅ `:name:` symbols, mapped via config |

## Docs & cross-referencing

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Automatic heading ids | ⚠️ tooling | ✅ | 🧩 | ✅ case-preserving, case-insensitive refs |
| Cross-references `</#id>` | ❌ | ❌ | ❌ | ✅ |
| Implicit heading refs `[Heading][]` | 🧩 (Obsidian uses `[[…]]`) | ❌ | ❌ | ✅ |

## Safety & ecosystem

| | Markdown | Djot | MDX | **Carve** |
|---|:---:|:---:|:---:|:---:|
| Built-in safety requirements | ❌ consumer's job | ❌ consumer's job | n/a | ✅ URL, attribute, Unicode, and resource protections |
| URL / attribute / DoS hardening by default | ❌ | ❌ | ❌ | ✅ always on |
| Raw HTML default | ⚠️ on (libs vary) | ⚠️ on | runs JS | ⚠️ on, one-flag opt-out / safe mode |
| Embeds live components / JS | ❌ | ❌ | ✅ (its purpose) | ❌ by design |
| Independent implementations | many, divergent | several (js, lua, rust, go) | JS-only | **php · js · rs, conformance-tested** |
| Implementations share expected results | ⚠️ | ⚠️ | ❌ | ✅ |

See [Security → How Carve compares on security](/security#how-carve-compares-on-security)
for the detailed breakdown and caveats.

## When to pick which

- **Markdown:** broad parser and platform support; advanced document features
  depend on the selected Markdown variant or plugins.
- **Djot:** specified parsing rules, attributes, tables, and footnotes with a
  smaller implementation ecosystem.
- **MDX:** Markdown combined with JavaScript components; suitable when document
  source is also application code.
- **Carve:** built-in cross-references, captions, table spans, and multiple
  output formats, with separate JavaScript, PHP, and Rust implementations.

See [Technical rationale](/technical-rationale) for parsing decisions and
[Differences from Djot](/divergence-from-djot) for syntax changes.
