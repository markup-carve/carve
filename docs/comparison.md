---
description: A feature-by-feature comparison against Markdown, Djot and MDX, for choosing between them.
---

# Carve, Markdown, Djot, and MDX

This page compares the syntax and implementation characteristics of Carve 0.2 as specified on `main` with Markdown, Djot and MDX. Carve 0.2 is a freeze candidate, not a released standard; its development status is recorded in the specification's status document. For conversion instructions, see [Coming from Markdown](./migrate-from-markdown). For parser differences, see [Divergence from Djot](./divergence-from-djot). For 0.1 documents, use [Upgrading from 0.1](./upgrade-0-2).

The table is maintained by the Carve project. See [Markup languages](./markup-languages) for AsciiDoc, reStructuredText, Textile and other languages.

::: tip Legend
✅ native &nbsp;·&nbsp; 🧩 plugin or extension needed &nbsp;·&nbsp; ⚠️ partial or by convention &nbsp;·&nbsp; ❌ not available
:::

## At a glance

| | Markdown (CommonMark) | Djot | MDX | **Carve 0.2** |
|---|:---:|:---:|:---:|:---:|
| Published specification | ✅ prose specification with examples | ✅ | ❌ (Markdown plus JSX) | ✅ numbered clauses, data tables and a shared corpus |
| Consistent inline rules | ❌ | ✅ | ❌ | ✅ |
| No-backtracking parse guarantee | ❌ | ✅ | ❌ | ✅ \* |
| Markdown-familiar syntax | ✅ | ⚠️ | ✅ | ⚠️ |
| Paragraph interruption (no blank line) | ✅ | ❌ | ✅ | ⚠️ \*\* |

\* At the block level the role of a line depends only on that line and the blocks open above it. A code, raw or `:::` fence opens without looking for its closer and may run to the end of its container. Inline parsing uses a delimiter stack; a code span, math span or literal-text span opens only when its closing run is in the same paragraph or cell, and otherwise its backticks are text. See [Technical rationale](./technical-rationale).

\*\* Only lines that cannot be prose end a paragraph: a fence line, a table row and `***`. A list marker or description mark that continues an open list, and a caption under a lone image or display math line, also do. A heading, a quote or a list marker directly under a paragraph line is text of the paragraph and needs a blank line before it. Carve 0.1 let headings and quotes interrupt as Markdown does; 0.2 dropped that.

### Paragraph interruption, by rule count

Approximate number of rules that decide whether a new block can start without a blank line before it. These are summaries for authors, not counts of grammar productions.

| Model | Interruption rules |
|---|---|
| Markdown (CommonMark) | about 8 to 10, irregular: a setext underline, an ordered list only if it starts with `1`, indented code *cannot* interrupt, HTML block type 7 *cannot*, a bullet only if the first item is not empty, and more |
| MDX | inherits Markdown's, plus JSX block handling |
| Djot | **1**: nothing interrupts; a blank line comes before every block |
| **Carve 0.2** | **6**, in two groups: lines with no reading as prose (a fence line, a table row, `***`), and lines that continue an open structure (a list marker at an open list's column, a description or term mark at an open description list's column, a caption under a lone image or display math line). Everything else, headings and quotes included, is a lazy line of the paragraph |

## Authoring features

| | Markdown | Djot | MDX | **Carve 0.2** |
|---|:---:|:---:|:---:|:---:|
| Tables | 🧩 GFM | ✅ | 🧩 GFM | ✅ `\|=` header cells |
| Table rowspan and colspan | ❌ | ❌ | ❌ | ✅ |
| Captions on figures, tables, code, quotes | 🧩 Pandoc, images only | ⚠️ tables only | 🧩 component | ✅ one `^ ` line under an image, table, code block, quote, math block or figure group |
| A lone image is a block | ❌ wrapped in `<p>` | ❌ wrapped in `<p>` | ❌ | ✅ bare `<img>`, so a caption has a host |
| Footnotes | 🧩 | ✅ | 🧩 | ✅ reference and inline `^[...]` |
| Math | 🧩 | ✅ | 🧩 | ✅ |
| Definition lists | 🧩 | ✅ | 🧩 | ✅ `::` term, `:` description |
| Admonitions and callouts | 🧩 | ⚠️ through a div | 🧩 component | ✅ native `<aside>` |
| Attributes `{.class #id}` | 🧩 (Pandoc, markdown-it-attrs) | ✅ | ⚠️ JSX props | ✅ |
| Generic divs and spans | 🧩 (Pandoc fenced divs and spans) | ✅ | ⚠️ components | ✅ |
| Smart typography | 🧩 | ✅ | 🧩 | ✅ |
| Editorial and critic marks | ❌ | ⚠️ insert, delete, mark | ❌ | ✅ insert, delete, mark, comment, with author and date |
| Frontmatter | ⚠️ tooling | ❌ | 🧩 | ✅ on line 1, plus typed metadata blocks later |
| Reusable snippets | ❌ | ❌ | ⚠️ components | ✅ `{$name}: value` |
| Symbols and emoji shortcodes | 🧩 | ✅ symbols, mapped by filters | 🧩 | ✅ `:name:` symbols, mapped by the host |

Djot already spells a table caption `^ Caption`. Carve keeps that spelling and lets it attach to any captionable block. The two rules work together: a lone image is a block rather than paragraph text, which gives the caption line something to attach to, and the pair renders as `<figure>` with a `<figcaption>`. Markdown and Djot wrap the same image in a paragraph, so the caption has to be written as raw HTML.

::: compare
```crv
![A red bicycle](bike.png)
^ The bicycle in 2024
```
```html
<figure>
  <img src="bike.png" alt="A red bicycle">
  <figcaption>The bicycle in 2024</figcaption>
</figure>
```
:::

## Docs and cross-referencing

| | Markdown | Djot | MDX | **Carve 0.2** |
|---|:---:|:---:|:---:|:---:|
| Automatic heading ids | ⚠️ tooling | ✅ | 🧩 | ✅ case-preserving, exact references |
| Cross-references `</#id>` | ❌ | ❌ | ❌ | ✅ |
| Heading references `[Heading][]` | 🧩 (Obsidian uses `[[...]]`) | ❌ | ❌ | ✅ |
| Shortcut references `[text]` | ✅ | ❌ | ✅ | ✅ when a definition `[text]:` exists |
| Includes | ❌ | ❌ | ⚠️ imports | ✅ when the host enables a resolver |

::: compare
```crv
= Getting started

See </#Getting-started> or [the intro][Getting started].
```
```html
<section id="Getting-started">
  <h1>Getting started</h1>
  <p>See <a href="#Getting-started">Getting started</a> or <a href="#Getting-started">the intro</a>.</p>
</section>
```
:::

## Safety and ecosystem

| | Markdown | Djot | MDX | **Carve 0.2** |
|---|:---:|:---:|:---:|:---:|
| Built-in safety requirements | ❌ left to the consumer | ❌ left to the consumer | n/a | ✅ URL, attribute, Unicode and resource rules |
| URL, attribute and DoS hardening by default | ❌ | ❌ | ❌ | ✅ always on |
| Raw HTML default | ⚠️ on (libraries vary) | ⚠️ on | runs JS | ✅ off; the host turns it on with `rawHtml` |
| Embeds live components or JS | ❌ | ❌ | ✅ (its purpose) | ❌ by design |
| Independent implementations | many, divergent | several (js, lua, rust, go) | JS only | **php, js and rs, tested against one corpus** |
| Implementations share expected results | ⚠️ | ⚠️ | ❌ | ✅ |
| One command line in every engine | ❌ | ❌ | ❌ | ✅ same flags, exit codes and reports |

See [Security: How Carve compares on security](./security#how-carve-compares-on-security) for the detailed breakdown and caveats.

## When to pick which

- **Markdown:** broad parser and platform support; advanced document features depend on the selected Markdown variant or plugins.
- **Djot:** specified parsing rules, attributes, tables and footnotes with a smaller implementation ecosystem.
- **MDX:** Markdown combined with JavaScript components; suitable when the document source is also application code and authored components are the central workflow.
- **Carve:** built-in cross-references, captions, table spans, a specified HTML output and a defined document tree (AST 2.0), with separate JavaScript, PHP and Rust implementations. A host can register extensions, and core source stays readable without them.

See [Technical rationale](./technical-rationale) for parsing decisions and [Divergence from Djot](./divergence-from-djot) for syntax changes.

**Specification (external):** [Status](https://github.com/markup-carve/carve/blob/main/spec/0.2/STATUS.md), [Block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md) (C2-B-001, C2-B-013 to C2-B-024, C2-B-146 to C2-B-149, C2-B-200), [Inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (C2-I-004, C2-I-017), [HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md) (C2-H-050 to C2-H-054), [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md).
