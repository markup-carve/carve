# Native Features Analysis

Comparing djot-php extensions with Carve's design to determine what should be native syntax vs. implementation extensions.

## Criteria for Native Features

A feature should be **native** (part of Carve syntax) if:
1. It affects document semantics, not just rendering
2. It's universally useful across contexts
3. It has clear, unambiguous syntax
4. It follows Carve's visual mnemonic principles

A feature should remain an **extension** if:
1. It's implementation/output-specific (HTML attributes, etc.)
2. It's context-dependent (wiki links depend on wiki software)
3. It integrates third-party tools (Mermaid, etc.)
4. It's a rendering concern (permalinks, ToC generation)

---

## Native Features (Core Carve Syntax)

### Already in Carve Spec

| Feature | Carve Syntax | Status |
|---------|-------------|--------|
| Smart typography | `--`, `---`, `...`, quotes | ✅ In spec (4.18) |
| @mentions | `@username` | ✅ In spec (4.19) |
| #tags | `#tagname` | ✅ In spec (4.19) |
| Admonitions | `::: note`, `::: warning` | ✅ In spec (4.12) |
| Frontmatter | `---` YAML block | ✅ In spec (4.21) |
| Footnotes | `[^ref]` | ✅ In spec (4.11) |
| Definition lists | `:: term` / `:  definition` | ✅ In spec (4.5) |
| Task lists | `- [ ]`, `- [x]` | ✅ In spec (4.5) |
| Profiles | Feature restriction | ✅ In spec (4.20) |
| Attributes | `{#id .class key=value}` | ✅ In spec (4.10) |
| Extensions | `:type[content]{attrs}` | ✅ In spec (4.19) |

### Should Add to Carve Spec

| Feature | djot-php Syntax | Proposed Carve Syntax | Rationale |
|---------|-----------------|---------------------|-----------|
| **Captions** | `^ caption` after block | `^ caption` | Already in _djot-extra.md. Universally useful. |
| **Abbreviations** | `*[ABBR]: expansion` | `*[ABBR]: expansion` | Essential for technical docs. |
| **Semantic spans** | `[text]{.kbd}` → `<kbd>` | `:kbd[text]` | Use extension syntax for consistency. |
| **Autolinks** | `<url>` / `<email>` | Angle-bracket autolinks only | Bare URLs are *not* auto-linked (djot-aligned, §4.3). |
| **Inline footnotes** | `[content]{.fn}` | `[^inline content]` | Already in spec, confirm syntax. |
| **Table alignment** | `:--`, `--:`, `:--:` | `\|=<` / `\|=>` / `\|=~` markers | Already in spec (4.8). |
| **Rowspan/colspan** | `^` and `<` markers | `^` and `<` markers | Already in _multiline-table-proposal.md. |
| **Multi-line cells** | `+` continuation | `+` continuation | Already in _multiline-table-proposal.md. |

---

## Implementation Extensions (Not Native)

These should remain implementation-specific, not part of Carve syntax:

| djot-php Extension | Why Not Native |
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

## Proposed Additions to Carve Spec

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
- Images/blockquotes → `<figure>` + `<figcaption>`
- Tables → `<caption>` element

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

Use the extension syntax for semantic elements:

```carve
Press :kbd[Ctrl+C] to copy.
The term :dfn[markup] means...
:abbr[HTML]{title="HyperText Markup Language"} is a standard.
```

This fits the `:type[content]{attrs}` pattern already in the spec.

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

## Summary

**Add to Carve native syntax:**
1. Captions (`^`)
2. Abbreviations (`*[ABBR]: ...`)
3. Table multi-line (`+`), rowspan (`^`), colspan (`<`)

**Already native, confirm in spec:**
1. Semantic elements via `:type[content]` extension syntax
2. Angle-bracket autolinks (`<url>` / `<email>`) — bare URLs stay literal

**Keep as implementation extensions:**
- External link attributes
- Heading permalinks
- Table of contents generation
- Mermaid/diagram support
- Tabbed UI components
- Wiki-style links (context-dependent)

---

## Conformance Core (what every implementation MUST produce)

The native/extension split above answers "what belongs in the language."
This answers the question a *second* implementer (e.g. carve-php) needs:
**what must I produce to be conformant, and what is optional?** Byte-level
output rules live in `resources/grammar.ebnf` PART 10; this is the
feature-level boundary.

### MUST (core) — pinned by the corpus, identical across implementations

- **Blocks:** headings (+ `<section>` wrapping, §13), paragraphs,
  thematic breaks, fenced code, blockquotes, lists (ordered digits-only,
  unordered, task; tight/loose §17), tables (`|=` headers, alignment,
  rowspan/colspan/multi-line), the two-tier `:::` model (canonical
  `<aside class="admonition …">` / custom `<div class="…">`, §12),
  figures/captions, abbreviation definitions, raw blocks, comments.
- **Inline:** emphasis family (`/ * _ ~ ^ ,, ==` + `/* */`, §9), code
  spans, links (inline / reference / collapsed), angle-bracket autolinks
  (`<url>` / `<email>`), images, spans (§14), math (djot form, §18), footnotes
  (reference form, §16), abbreviations, editorial markup, crossrefs
  (`</#id>`, markup-preserving §19), hard/soft breaks.
- **Semantics:** automatic heading ids (ASCII slug), id de-duplication,
  order-independent reference/abbreviation/footnote resolution.

### SHOULD / configurable (on by default, a processor MAY disable)

- `@mention` and `#tag` shorthands, smart typography (§19).

### MAY / out of core (processor-level)

- Includes (`{{ … }}`, §19, with the security requirements there).
- The `:type[content]` extension *registry* beyond the generic fallback.
- Everything under "Keep as implementation extensions" above.

### Deferred (reserved syntax, not yet implemented)

- Inline footnotes (`[^content]`) and sidenotes (`[>content]`).
- Ordered-list letter/roman dialects and the `)` delimiter.
- Setext (underline) headings — intentionally excluded (matches djot).
