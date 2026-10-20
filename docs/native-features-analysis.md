---
description: Design history for what Carve includes in its language and what remains optional.
---

# Feature design notes

Current feature availability is listed in [Optional features and
extensions](./extensions). This page records the design decisions behind that
split and the syntax ideas Carve adopted or left to applications. For syntax
examples, use the [cheat sheet](/cheatsheet).

## Syntax choices

The table compares Carve spellings with djot-php, one of the projects Carve
originally drew experience from. These features are available today; grammar
references point at `resources/grammar.ebnf`. For current availability, see
[Optional features and extensions](./extensions).

| Feature | djot-php Syntax | Carve Syntax | Status |
|---------|-----------------|-------------|--------|
| **Captions** | `^ caption` after block | `^ caption` | ✅ In grammar (caption rule; image/blockquote/table placement). |
| **Abbreviations** | `*[ABBR]: expansion` | `*[ABBR]: expansion` | ✅ In grammar (PART 5: Abbreviations). |
| **Semantic spans** | `[text]{.kbd}` → `<kbd>` | `[text]{kbd}` | ✅ Core reserves three span attributes - `abbr`, `time`, `kbd` (PART 9 §9). `samp`, `var`, `cite`, `dfn` are the Tier-2 SemanticSpan extension's; `code` and `mark` are nobody's, since `` `x` `` and `=x=` already write those elements. The `:name[…]` spelling is soft-deprecated in the extension. |
| **Autolinks** | `<url>` / `<email>` | Angle-bracket autolinks only | ✅ In spec (4.3). Bare URLs are *not* auto-linked (djot-aligned). |
| **Inline footnotes** | `[content]{.fn}` | `^[content]` | ✅ Tier-1 core, in grammar (§16). A carve addition (not in djot); pandoc-style `^[content]`, numbered into the shared endnotes. |
| **Table alignment** | `:--`, `--:`, `:--:` | `\|=<` / `\|=>` / `\|=~` markers | ✅ In spec (4.8). |
| **Rowspan/colspan** | `^` and `<` markers | `^` and `<` markers | ✅ In grammar (span_cell / rowspan_marker / colspan_marker). |
| **Multi-line cells** | `+` continuation | `+` continuation | ✅ In grammar (table multi-line cells). |

---

## Features Carve adds

The features below are part of Carve syntax; the examples provide a quick
feature-level reference.

### 1. Captions (`^`)

```carve
![Photo](image.jpg)
^ Figure 1: A beautiful sunset

> To be or not to be
^ Shakespeare, Hamlet

|= Col 1 |= Col 2 |
| Data   | Data   |
^ Table 1: Sample data
```

Output varies by context:
- Images → `<figure>` + `<figcaption>`
- Tables → `<caption>` element
- Blockquotes → `<figure>` + `<figcaption>`, which is where the HTML Standard
  puts a quotation's attribution: outside the `<blockquote>`, never inside it

### 2. Abbreviations

```carve
The HTML spec defines WWW standards.

*[HTML]: HyperText Markup Language
*[WWW]: World Wide Web
```

- Definitions at document end (or anywhere, processed first pass)
- Word-boundary matching only
- Not applied inside code

### 3. Semantic Inline Elements

The attribute form names the element:

```carve
Press [Ctrl+C]{kbd} to copy.
The term [markup]{dfn} means...
[HTML]{abbr="HyperText Markup Language"} is a standard.
```

`abbr`, `time` and `kbd` are core; `dfn` (with `samp`, `var` and `cite`) needs
the SemanticSpan extension and is an ordinary attribute until it is enabled.

This shipped as an attribute rather than as the `:type[content]{attrs}` pattern
this document originally proposed: a consumed name renames the span, so the id
and classes an author wrote land on the produced element, and several names
combine on one span where the `:type[…]` form cannot nest.

### 4. Table Enhancements (from proposals)

**Multi-line cells:**
```carve
| Name   | Description        |
|--------|---------------------|
| Item 1 | A long description |
+        | that continues     |
```

**Rowspan (`^`) and Colspan (`<`):**
```carve
| Category | Item   | Price |
|----------|--------|-------|
| Fruits   | Apple  | $1.00 |
| ^        | Banana | $0.50 |
| ^        | Orange | $0.75 |
```

```carve
| Name  | Contact Info      | <     |
|-------|-------------------|-------|
| Alice | alice@example.com | x5234 |
```

---

## Why other features remain optional

These Djot/PHP extension examples informed Carve's split between document
syntax and application behavior. The [current availability
table](./extensions#feature-tiers-quick-reference) is the source for what a
processor provides today.

| djot-php extension | Why it stays outside core syntax |
|--------------------|----------------|
| **ExternalLinksExtension** | HTML attribute concern (`target`, `rel`) |
| **DefaultAttributesExtension** | Implementation convenience |
| **HeadingPermalinksExtension** | Rendering/UI concern |
| **TableOfContentsExtension** | Derived content, not source syntax |
| **MermaidExtension** | Third-party tool integration |
| **CodeGroupExtension** | UI/framework concern (tabs) |
| **TabsExtension** | UI/framework concern |
| **SmartQuotesExtension** | Locale config, not syntax |
| **WikilinksExtension** | Context-dependent (wiki software) |
| **HeadingReferenceExtension** | Implementation of `</#id>` resolution |

---

## Deliberate exclusions

### Not planned

- Sidenotes (`[>content]`), dismissed: a sidenote is footnote content placed
  in the margin by CSS, so it needs no syntax of its own. `[>` is unclaimed and
  `[>foo]` is literal text. See `dismissed-syntax.md`. (Both note forms that do
  exist, `[^label]` and inline `^[content]`, are implemented; see §16.)
- Setext (underline) headings: intentionally excluded (matches djot).

### Deliberate gaps (will not implement)

- Djot's both-parens ordered-list delimiter `(1)` / `(a)` / `(i)`. Carve
  supports the decimal/alpha/roman dialects and the `.` and `)` delimiters,
  which cover the practical need. The `(1)` form is the most prose-ambiguous
  marker (a wrapped line beginning `(1) …` reads as a parenthetical aside),
  and supporting it adds leading-paren marker detection for no real gain.
  The rendered paren glyph is a CSS `list-style` concern.
