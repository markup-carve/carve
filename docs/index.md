---
layout: home

hero:
  name: Carve
  text: A post-Markdown markup language
  tagline: Visual mnemonics, human-centered design — markup you can feel.
  image:
    src: /logo.svg
    alt: Carve logo
  actions:
    - theme: brand
      text: Try Carve →
      link: /playground
    - theme: alt
      text: Get Started
      link: /get-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/markup-carve

features:
  - title: Visual Mnemonics
    details: "/italic/ slashes lean, *bold* asterisks are heavy, _underline_ sits below, ~strikethrough~ runs through. Syntax that looks like its output."
  - title: Linear-Time Rigor
    details: "Djot-style linear-time parsing with no backtracking and unambiguous rules (Djot is the markup Carve builds on), extended with captions, abbreviations, and social conventions."
  - title: Ten-Second Rule
    details: Learnable in 10 seconds for basic use. Memorable after 10 days without practice. Unambiguous within 10 characters of context.
  - title: Interactive Online, Readable Offline
    details: "Built for the interactive web first — diagrams, math, charts and tabs hydrate into rich output online. With no JavaScript every block degrades to clean semantic HTML: a Mermaid fence still shows its source, <details> stays native, tables stay tables."
  - title: Captions Everywhere
    details: One ^ prefix adds captions to images, blockquotes, and tables — emitting semantic figure / figcaption / caption HTML.
  - title: Friendly Tables
    details: "|= for headers, ^ for rowspan, < for colspan, + for multi-line cells. No separator row required."
  - title: Built-in Extensions
    details: ":type[content]{attrs} for keyboard hints, semantic spans, video embeds. @mentions and #tags as you'd expect from social platforms."
  - title: Safe With Untrusted Input
    details: "Always-on URL-scheme and attribute hardening, Trojan-Source stripping, and linear-time DoS limits neutralize the common Markdown attack classes with no separate sanitizer. Raw HTML is gated behind one switch (with a built-in safe mode), and Carve never executes embedded code (unlike MDX)."
---

## Quick Reference

### Frontmatter

```carve
---
title: My Document
tags: [carve, markup]
---
```

A leading `---` fenced block holds document metadata. Add a format token to the opening fence for non-YAML metadata (`---toml`, `---json`, or any label); a bare `---` uses the configurable default format (`yaml` unless the host sets `defaultFrontmatterFormat`):

```carve
---toml
title = "My Document"
---
```

Carve holds the content **raw** - the verbatim text plus the format label - and does not parse it; your application interprets the declared format. The block is leading-only and never rendered as body content.

### Emphasis

```carve
/italic/   *bold*   /*bold italic*/
_underline_   ~strikethrough~
=highlight=   {^super^}   {,sub,}
```

### Headings

```carve
# H1
## H2
### H3
#### H4
```

### Links & images

```carve
[link text](https://url.com)
[Page Name][]              (wiki-style)
![alt text](image.jpg)
```

### Captions (images, quotes, tables)

```carve
![Photo](img.jpg)
^ Figure 1: Caption text
```

### Lists

```carve
- unordered item
1. ordered item
- [ ] task
- [x] done
```

### Code

````carve
`inline code`

```language
code block
```
````

### Math

```carve
Inline: $`e^{i\pi} + 1 = 0`
Display: $$`\int_0^1 x \, dx`
```

### Quotes & admonitions

```carve
> quoted text
^ Attribution

::: note
admonition content
:::
```

### Tables

```carve
|= Header |= Header |      (|= for headers)
| Cell    | Cell    |
|= Row    | Cell    |      (|= in a body row = row header)
^ Table caption

| ^       | spanned |      (^ rowspan)
| Header  | <       |      (< colspan)
+ continuation cell  |     (+ multiline)
```

### Abbreviations

```carve
*[HTML]: HyperText Markup Language
```

### Attributes

```carve
{#id .class key=value}
```

### Extensions, mentions, tags

```carve
@username   #tagname
:youtube[VIDEO_ID]
```

`:name[content]{attrs}` is the generic inline-extension syntax; a specific embed
like `:youtube[…]` is produced by a **registered extension** (built-in where
shipped, otherwise a small custom one). `@mentions` and `#tags` render as inert
spans until you supply URL templates.

### Comments

```carve
%% whole-line comment
text %% trailing comment
%%%
block comment
%%%
```

## Status

**Carve 0.1 is specified and shipping.** Tier-1 core and Tier-2 standard
extensions are normative and stable; Tier-3 app-level extensions ship but evolve
(see [Versioning](./versioning)). Conformance is pinned by 559 corpus examples
with exact HTML output, and the three reference engines - carve-js (TypeScript),
carve-php, and carve-rs - all run the same corpus with no HTML divergences.
Pre-1.0, a minor release may still change the grammar.

Reference material covers the normative [grammar](./grammar) and
[extensions contract](./extensions), the [security model](./security), the
[technical rationale](./technical-rationale), [parsing edge cases](./edge-cases),
[native features](./native-features-analysis), and the
[broader markup landscape](./markup-languages). The [Case Study](./case-study/)
records the original design research the language grew out of; it is history,
not the normative spec.

Looking for a parser, editor plugin, or framework integration? See the [Ecosystem](./ecosystem). Want to write your own? Start with [Build Your Own Implementation](./implementing-carve).

**File extension:** `.crv`

## Influences

- **[Djot](https://djot.net/)** (John MacFarlane) — rigorous parsing, attributes, foundation
- **Org-mode** — `/italic/` syntax, TODO states
- **Creole** — `|=` table headers
- **AsciiDoc** — admonitions, document structure
- **CriticMarkup** — editorial annotations
