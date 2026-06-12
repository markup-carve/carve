---
title: Cheat Sheet
description: Every Carve construct on one scannable page.
---

# Cheat Sheet

The whole syntax, one page. Carve's mnemonic: **the markup looks like its output**.

## Inline

| Write | Get | Mnemonic |
|-------|-----|----------|
| `/italic/` | *italic* | slashes lean like italics |
| `*bold*` | **bold** | asterisks are heavy |
| `/*bold italic*/` | ***both*** | combined |
| `_underline_` | underline | the line sits below |
| `~strike~` | ~~strike~~ | tilde runs through |
| `^super^` | super­script | caret points up |
| `,sub,` | sub­script | commas pull down |
| `=highlight=` | highlight | like a highlighter pen |
| `` `code` `` | `code` | backticks |
| `[text](url)` | link | |
| `[Page Name][]` | wiki-style link | |
| `![alt](img.jpg)` | image | |
| `:youtube[ID]` | extension | `:type[content]{attrs}` |
| `@user` `#tag` | mention / tag | social conventions |

Bare delimiters work only at word boundaries; force one intraword with the brace form, e.g. `H{,2,}O`, `mc{^2^}`.

## Blocks

````carve
# H1   ## H2   ### H3        (ATX headings)

- unordered      1. ordered
- [ ] task        - [x] done

> blockquote
^ Attribution                (caption / attribution: ^ prefix)

```language
code block
```

::: note                     (admonition: note tip warning danger
body                          info success example quote)
:::

::: |                        (preserves per-line layout)
Roses are red,
  Violets are blue.
:::
````

## Tables

```carve
|= Header |= Header |        (|= marks a header cell)
| Cell    | Cell    |
^ Table caption

| ^      | spanned |         (^ = rowspan)
| Header | <       |         (< = colspan)
+ continuation cell |        (+ = multi-line cell)
```

## Captions (images, quotes, tables, code listings, equations)

```carve
![Photo](img.jpg)
^ Figure 1: Caption text      (one ^ adds a semantic <figcaption>)
```

A `^` caption after a fenced code block makes a numbered *listing*; after a
standalone `$$`-math block, a numbered *equation*.

## Attributes & metadata

```carve
{#id .class key=value}        (attach to the preceding/following element)

*[HTML]: HyperText Markup Language   (abbreviation definition)

---
title: My Document            (frontmatter: leading --- block,
tags: [carve, markup]          held raw; add ---toml / ---json for
---                            other formats)
```

## Math, comments, editorial

```carve
Inline $`e^{i\pi}+1=0`        Display $$`\int_0^1 x\,dx`

%% line comment
text %% trailing comment
%%%
block comment
%%%

{+inserted+}  {-deleted-}  {~old~>new~}   (CriticMarkup)
```

## Next

- **[Examples](/examples)** — each construct next to its rendered HTML.
- **[Get Started](/get-started)** — render Carve in your own project.
- **[Formal Grammar](/grammar)** — the normative spec.
