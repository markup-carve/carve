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
      text: Read the Case Study
      link: /case-study/
    - theme: alt
      text: View on GitHub
      link: https://github.com/markup-carve

features:
  - title: Visual Mnemonics
    details: "/italic/ slashes lean, *bold* asterisks are heavy, _underline_ sits below, ~strikethrough~ runs through. Syntax that looks like its output."
  - title: Linear-Time Rigor
    details: Djot-style linear-time parsing with no backtracking, unambiguous rules — extended with captions, abbreviations, and social conventions.
  - title: Five-Second Rule
    details: Learnable in 5 seconds for basic use. Memorable after 5 days without practice. Unambiguous within 5 characters of context.
  - title: Captions Everywhere
    details: One ^ prefix adds captions to images, blockquotes, and tables — emitting semantic figure / figcaption / caption HTML.
  - title: Friendly Tables
    details: "|= for headers, ^ for rowspan, < for colspan, + for multi-line cells. No separator row required."
  - title: Built-in Extensions
    details: ":type[content]{attrs} for keyboard hints, semantic spans, video embeds. @mentions and #tags as you'd expect from social platforms."
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
^super^   ,,sub,,   ==highlight==
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
:youtube[VIDEO_ID]
@username   #tagname
```

### Comments

```carve
%% whole-line comment
text %% trailing comment
%%%
block comment
%%%
```

## Status

Carve is a design exploration. The specification lives in the [Case Study](./case-study/). Reference material covers the normative [extensions contract](./extensions), the [technical rationale](./technical-rationale), [parsing edge cases](./edge-cases), [native features](./native-features-analysis), and the [broader markup landscape](./markup-languages).

**File extension:** `.crv`

## Influences

- **[Djot](https://djot.net/)** (John MacFarlane) — rigorous parsing, attributes, foundation
- **Org-mode** — `/italic/` syntax, TODO states
- **Creole** — `|=` table headers
- **AsciiDoc** — admonitions, document structure
- **CriticMarkup** — editorial annotations
