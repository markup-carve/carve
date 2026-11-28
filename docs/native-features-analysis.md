---
description: The design choices behind Carve 0.2's native syntax and optional behavior.
---

# Feature design notes

Current feature availability is listed in [Optional features and
extensions](./extensions.md). This page records the design decisions behind
that split and the syntax ideas Carve adopted or left to applications. For
syntax examples, use the [cheat sheet](./cheatsheet.md).

## Syntax choices

The table compares Carve spellings with djot-php, one of the projects Carve
originally drew experience from. Every Carve spelling in it is core 0.2 syntax
unless the row says otherwise.

| Feature | djot-php syntax | Carve syntax | Status in 0.2 |
| --- | --- | --- | --- |
| **Captions** | `^ caption` after a block | `^ caption` | Core: image, quote, table, code block and math block captions. |
| **Abbreviations** | `*[ABBR]: expansion` | `*[ABBR]: expansion` | Core. |
| **Semantic spans** | `[text]{.kbd}` gives `<kbd>` | `[text]{kbd}` | Core reserves three span keys: `abbr`, `time` and `kbd`. `samp`, `var`, `cite` and `dfn` belong to the `carve.semanticSpan` extension and are ordinary attributes without it. |
| **Autolinks** | `<url>` / `<email>` | angle-bracket autolinks only | Core. Bare URLs are not linked; the `carve.autolink` extension links them. |
| **Inline footnotes** | `[content]{.fn}` | `^[content]` | Core, a Carve addition (not in Djot): numbered into the same endnotes as `[^label]`. |
| **Table alignment** | `:--`, `--:`, `:--:` | `\|={<}`, `\|={>}`, `\|={~}` cells | Core. A GFM separator row is an ordinary row in 0.2. |
| **Rowspan / colspan** | `^` and `<` markers | `^` and `<` markers | Core. |
| **Multi-line cells** | `+` continuation | `+` continuation | Core. |

One row changed meaning in 0.2: underline, strike and highlight no longer use
bare `_text_`, `~text~` and `=text=`. They are braced, `{_text_}`, `{~text~}`
and `{=text=}`, while `*strong*` and `/emphasis/` keep the two familiar roles.
See the [upgrade guide](./upgrade-0-2.md).

***

## Features Carve adds

The features below are part of Carve syntax; the examples are a quick
feature-level reference, each with the HTML the 0.2 renderer writes.

### 1. Captions (`^`)

::: compare
```crv
![Photo](examples/sun.jpg)
^ Figure 1: A beautiful sunset

> To be or not to be
^ Shakespeare, Hamlet

|= Col 1 |= Col 2 |
| Data | Data |
^ Table 1: Sample data
```
```html
<figure>
  <img src="examples/sun.jpg" alt="Photo">
  <figcaption>Figure 1: A beautiful sunset</figcaption>
</figure>
<figure>
  <blockquote><p>To be or not to be</p></blockquote>
  <figcaption>Shakespeare, Hamlet</figcaption>
</figure>
<table>
  <caption>Table 1: Sample data</caption>
  <thead>
    <tr><th scope="col">Col 1</th><th scope="col">Col 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Data</td><td>Data</td></tr>
  </tbody>
</table>
```
:::

Output varies by context:

- Images: `<figure>` with `<figcaption>`.
- Tables: a `<caption>` element.
- Quotes: `<figure>` with `<figcaption>`, which is where the HTML Standard puts
  a quotation's attribution: outside the `<blockquote>`, never inside it.

The tree stores the caption on the block it follows; only the HTML wraps it in
a figure.

### 2. Abbreviations

::: compare
```crv
The HTML spec defines WWW standards.

*[HTML]: HyperText Markup Language

*[WWW]: World Wide Web
```
```html
<p>The <abbr title="HyperText Markup Language">HTML</abbr> spec defines <abbr title="World Wide Web">WWW</abbr> standards.</p>
```
:::

- A definition can stand anywhere in the document; it applies to the whole
  document, also to text above it.
- Matching is by whole word: `XHTML` does not match `HTML`.
- Abbreviations are not applied inside code:

::: compare
```crv
HTML and `HTML` and XHTML.

*[HTML]: HyperText Markup Language
```
```html
<p><abbr title="HyperText Markup Language">HTML</abbr> and <code>HTML</code> and XHTML.</p>
```
:::

### 3. Semantic inline elements

The attribute form names the element:

::: compare
```crv
Press [Ctrl+C]{kbd} to copy.
The term [markup]{dfn} means a system of tags.
[HTML]{abbr="HyperText Markup Language"} is a standard.
```
```html
<p>Press <kbd>Ctrl+C</kbd> to copy.
The term <span dfn="">markup</span> means a system of tags.
<abbr title="HyperText Markup Language">HTML</abbr> is a standard.</p>
```
:::

`abbr`, `time` and `kbd` are core. `dfn` (with `samp`, `var` and `cite`)
needs the `carve.semanticSpan` extension and is an ordinary attribute until it
is enabled, as the `<span dfn="">` above shows. With
`carve render --extensions '["carve.semanticSpan"]'` the same source writes:

```html
<p>Press <kbd>Ctrl+C</kbd> to copy.
The term <dfn>markup</dfn> means a system of tags.
<abbr title="HyperText Markup Language">HTML</abbr> is a standard.</p>
```

This shipped as an attribute rather than as a `:type[content]{attrs}` pattern:
a consumed key renames the span, so the id and classes an author wrote land on
the produced element, and several keys combine on one span where the
`:type[...]` form cannot nest. In 0.2 `:dfn[markup]` is just an unregistered
inline extension and writes `<span class="ext-dfn">markup</span>`.

### 4. Inline footnotes and autolinks

::: compare
```crv
A fact.^[An inline note.] See https://example.com and <https://example.com>.
```
```html
<p>A fact.<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> See https://example.com and <a href="https://example.com">https://example.com</a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>An inline note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```
:::

The bare URL stays text; the angle-bracket form is a link. The inline note is
numbered with the other footnotes.

### 5. Table enhancements

**Alignment** goes on the header cell and applies to the column:

::: compare
```crv
|= Item |={>} Price |
| Apple | 1.00 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Item</th><th scope="col" style="text-align: right;">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>Apple</td><td style="text-align: right;">1.00</td></tr>
  </tbody>
</table>
```
:::

**Multi-line cells:**

::: compare
```crv
|= Name |= Description |
| Item 1 | A long description |
+ | that continues |
```
```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Description</th></tr>
  </thead>
  <tbody>
    <tr><td>Item 1</td><td>A long description that continues</td></tr>
  </tbody>
</table>
```
:::

**Rowspan (`^`) and colspan (`<`):**

::: compare
```crv
|= Category |= Item |= Price |
| Fruits | Apple | $1.00 |
| ^ | Banana | $0.50 |
| ^ | Orange | $0.75 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Category</th><th scope="col">Item</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td rowspan="3">Fruits</td><td>Apple</td><td>$1.00</td></tr>
    <tr><td>Banana</td><td>$0.50</td></tr>
    <tr><td>Orange</td><td>$0.75</td></tr>
  </tbody>
</table>
```
:::

::: compare
```crv
|= Name |= Contact Info |= < |
| Alice | alice@example.com | x5234 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th colspan="2" scope="col">Contact Info</th></tr>
  </thead>
  <tbody>
    <tr><td>Alice</td><td>alice@example.com</td><td>x5234</td></tr>
  </tbody>
</table>
```
:::

***

## Why other features remain optional

These djot-php extensions informed Carve's split between document syntax and
application behavior. Most of them now have a counterpart in the provisional
0.2 standard catalog: an extension a host registers, whose source stays
readable core Carve for a reader without it. The [extensions
page](./extensions.md) lists what a processor provides today.

| djot-php extension | Why it stays outside core syntax | 0.2 standard extension |
| --- | --- | --- |
| **ExternalLinksExtension** | HTML attribute concern (`target`, `rel`) | `carve.externalLinks` |
| **DefaultAttributesExtension** | implementation convenience | none in the catalog; carve-js ships `defaultAttributes()` |
| **HeadingPermalinksExtension** | rendering and UI concern | `carve.headingPermalinks` |
| **TableOfContentsExtension** | derived content, not source syntax | `carve.toc`, `carve.tocPlacement` |
| **MermaidExtension** | third-party tool integration | `carve.fencedRender.mermaid` and the other diagram fences |
| **CodeGroupExtension** | UI and framework concern (tabs) | `carve.codeGroup` |
| **TabsExtension** | UI and framework concern | `carve.tabs` |
| **SmartQuotesExtension** | locale configuration, not syntax | the core `smartTypography` option, with `carve.smartQuotes` for locale glyphs |
| **WikilinksExtension** | depends on the wiki software | `carve.wiki` (`:wiki[Page]`) |
| **HeadingReferenceExtension** | implements `</#id>` resolution | core resolves `</#id>`; `carve.headingReference` adds a class |

An extension claims a core node and gives it a richer tree form, but the core
source and its fallback stay meaningful to a reader without that extension.
Applications can register their own behavior the same way, without adding a
core sigil. [Output without JavaScript](./graceful-degradation.md) shows what
each fallback looks like.

***

## Deliberate exclusions

### Not planned

- Sidenotes (`[>content]`) were dismissed: a sidenote is footnote content
  placed in the margin by CSS, so it needs no syntax of its own. `[>` is
  unclaimed and `[>foo]` is literal text. Both note forms that do exist,
  `[^label]` and inline `^[content]`, are core. See [dismissed
  syntax](./dismissed-syntax.md).
- Setext (underline) headings are excluded, as in Djot. Lint reports an
  underline that looks like one:

<!-- carve-sample {"lint":"setext-heading-underline: the underline is text"} -->
::: compare
```crv
Title
=====
```
```html
<p>Title
=====</p>
```
:::

### Deliberate gaps (will not implement)

- Djot's both-parens ordered-list delimiter `(1)` / `(a)` / `(i)`. Carve
  supports the decimal, alphabetic and roman dialects with the `.` and `)`
  delimiters, which cover the practical need. The `(1)` form is the most
  prose-ambiguous marker (a wrapped line beginning `(1) ...` reads as a
  parenthetical aside), and supporting it adds leading-paren marker detection
  for no real gain. The rendered paren glyph is a CSS `list-style` concern.

::: compare
```crv
A [>side note] here.

(1) first
(2) second
```
```html
<p>A [&gt;side note] here.</p>
<p>(1) first
(2) second</p>
```
:::

These choices reflect a preference for source an author can identify locally
and for an AST that preserves meaning across implementations. The [0.2
conformance corpus](./conformance.md) supplies concrete expected results.

**Specification (external):** [block syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-blocks.md), [inline syntax](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md) (braced delimiters: [inline syntax, braced delimiters](https://github.com/markup-carve/carve/blob/main/spec/0.2/syntax-inline.md#braced-delimiters)), [HTML tables](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#tables) and [captions and figures](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#captions-and-figures), [extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md) (C2-X-066, C2-X-071 to C2-X-073) and the catalog [`data/extensions.json`](https://github.com/markup-carve/carve/blob/main/spec/0.2/data/extensions.json), [upgrading from 0.1](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md).
