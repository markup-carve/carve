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
| @mentions | `@username` | ✅ In spec (4.20) |
| #tags | `#tagname` | ✅ In spec (4.20) |
| Admonitions | `::: note`, `::: warning` | ✅ In spec (4.12) |
| Frontmatter | `---` YAML block | ✅ In spec (4.23) |
| Footnotes | `[^ref]` | ✅ In spec (4.11) |
| Definition lists | `:: term` / `:  definition` | ✅ In spec (4.5) |
| Task lists | `- [ ]`, `- [x]` | ✅ In spec (4.5) |
| Profiles | Feature restriction | ✅ In spec (4.21) |
| Attributes | `{#id .class key=value}` | ✅ In spec (4.10) |
| Extensions | `:type[content]{attrs}` | ✅ In spec (4.20) |

### Added to Carve Spec

These were proposed during this analysis and have since landed in the spec.
Grammar references point at `resources/grammar.ebnf`.

| Feature | djot-php Syntax | Carve Syntax | Status |
|---------|-----------------|-------------|--------|
| **Captions** | `^ caption` after block | `^ caption` | ✅ In grammar (caption rule; image/blockquote/table placement). |
| **Abbreviations** | `*[ABBR]: expansion` | `*[ABBR]: expansion` | ✅ In grammar (PART 5: Abbreviations). |
| **Semantic spans** | `[text]{.kbd}` → `<kbd>` | `:kbd[text]` | ✅ Via `:type[content]` extension syntax (4.20). |
| **Autolinks** | `<url>` / `<email>` | Angle-bracket autolinks only | ✅ In spec (4.3). Bare URLs are *not* auto-linked (djot-aligned). |
| **Inline footnotes** | `[content]{.fn}` | `^[content]` | ✅ In grammar (§16). A carve extension beyond djot; pandoc-style `^[content]`, numbered into the shared endnotes. |
| **Table alignment** | `:--`, `--:`, `:--:` | `\|=<` / `\|=>` / `\|=~` markers | ✅ In spec (4.8). |
| **Rowspan/colspan** | `^` and `<` markers | `^` and `<` markers | ✅ In grammar (span_cell / rowspan_marker / colspan_marker). |
| **Multi-line cells** | `+` continuation | `+` continuation | ✅ In grammar (table multi-line cells). |

---

## Native Additions (in spec)

The features below were the concrete proposals from this analysis. All are now
part of Carve syntax; the examples remain as a feature-level reference.

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

## Summary

**Added to Carve native syntax:**
1. Captions (`^`)
2. Abbreviations (`*[ABBR]: ...`)
3. Table multi-line (`+`), rowspan (`^`), colspan (`<`)

**Native, confirmed in spec:**
1. Semantic elements via `:type[content]` extension syntax
2. Angle-bracket autolinks (`<url>` / `<email>`) - bare URLs stay literal

**Keep as implementation extensions:**
- External link attributes
- Heading permalinks
- Table of contents generation
- Mermaid/diagram support
- Tabbed UI components
- Wiki-style links (context-dependent)

---

## Disabling / Restricting Features

Can a processor turn native features off? It depends on the tier (see
Conformance Core below for the full split):

| Tier | Features | Disableable? |
|------|----------|--------------|
| **Core (MUST)** | captions, abbreviations, tables (rowspan/colspan/multi-line), autolinks, emphasis family, links, math, footnotes, crossrefs, the `:type[content]` extension *syntax* | **No.** Corpus-pinned; identical across implementations. Disabling one means the processor is no longer Carve-conformant. |
| **Default-on (SHOULD)** | `@mention`, `#tag`, smart typography | **Yes.** On by default in the conformant core; a processor MAY disable them. Normative: `resources/grammar.ebnf` PART 19. |
| **Out of core (MAY)** | includes (<code v-pre>{{ … }}</code>), the extension *registry* beyond the generic fallback, all "implementation extensions" above | **Yes / opt-in.** Processor-level; a conformant core MAY omit them entirely (e.g. leave <code v-pre>{{ … }}</code> literal). |

Separately, **Profiles** (case-study spec §4.21) restrict which features are
*allowed* in a given context rather than disabling output globally. A profile
(`Profile::comment()`, `Profile::article()`, …) marks node types as
disallowed and applies a `STRIP` / `TO_TEXT` / `ERROR` action. This is a
processor-level mechanism; it is not encoded in `resources/grammar.ebnf`.

---

## Conformance Core (what every implementation MUST produce)

The native/extension split above answers "what belongs in the language."
This answers the question a *second* implementer (e.g. carve-php) needs:
**what must I produce to be conformant, and what is optional?** Byte-level
output rules live in `resources/grammar.ebnf` PART 10; this is the
feature-level boundary.

### MUST (core) — pinned by the corpus, identical across implementations

- **Blocks:** headings (+ `<section>` wrapping, §13), paragraphs,
  thematic breaks, fenced code, blockquotes, lists (ordered
  decimal/alpha/roman with `.` and `)` delimiters + `start`, §10/§11;
  unordered, task; tight/loose §17), tables (`|=` headers, alignment,
  rowspan/colspan/multi-line), the two-tier `:::` model (canonical
  `<aside class="admonition …">` / custom `<div class="…">`, §12),
  figures/captions, abbreviation definitions, raw blocks, comments.
- **Inline:** emphasis family (`/ * _ ~ ^ ,, ==` + `/* */`, §9), code
  spans, raw inline (`` `…`{=format} `` passthrough, §20), links
  (inline / reference / collapsed), angle-bracket autolinks
  (`<url>` / `<email>`), images, spans (§14), math (djot form, §18), footnotes
  (reference form, §16), abbreviations, editorial markup, crossrefs
  (`</#id>`, markup-preserving §19), hard/soft breaks.
- **Semantics:** automatic heading ids (jgm/djot#393 run-replacement, lowercased, non-ASCII preserved; opt-in ASCII fold), id de-duplication,
  order-independent reference/abbreviation/footnote resolution.

### SHOULD / configurable (on by default, a processor MAY disable)

- `@mention` and `#tag` shorthands, smart typography (grammar PART 19).

### MAY / out of core (processor-level)

- Includes (<code v-pre>{{ … }}</code>, §19, with the security requirements there).
- The `:type[content]` extension *registry* beyond the generic fallback.
- Everything under "Keep as implementation extensions" above.

### Deferred (reserved syntax, not yet implemented)

- Sidenotes (`[>content]`). (Inline footnotes `^[content]` are now implemented — §16.)
- Setext (underline) headings — intentionally excluded (matches djot).

### Deliberate gaps (will not implement)

- Djot's both-parens ordered-list delimiter `(1)` / `(a)` / `(i)`. Carve
  supports the decimal/alpha/roman dialects and the `.` and `)` delimiters,
  which cover the practical need. The `(1)` form is the most prose-ambiguous
  marker (a wrapped line beginning `(1) …` reads as a parenthetical aside),
  and supporting it adds leading-paren marker detection for no real gain.
  The rendered paren glyph is a CSS `list-style` concern.
