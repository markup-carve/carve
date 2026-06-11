# Appendices

## Appendix A: Quick Reference Card

````
CARVE QUICK REFERENCE

EMPHASIS
  /italic/  *bold*  /*bold italic*/
  _underline_  ~strikethrough~
  ^super^  ,sub,  =highlight=

HEADINGS
  # H1  ## H2  ### H3  #### H4

LINKS & IMAGES
  [link text](https://url.com)
  [Page Name][]              (wiki-style)
  ![alt text](image.jpg)

CAPTIONS (for images, quotes, tables)
  ![Photo](img.jpg)
  ^ Figure 1: Caption text

  > Quote text
  ^ Attribution

LISTS
  - unordered item
  1. ordered item
  - [ ] task  - [x] done

CODE
  `inline code`
  ```language
  code block
  ```

QUOTES & ADMONITIONS
  > quoted text
  ::: note
  admonition content
  :::

TABLES
  |= Header |= Header |      (|= for headers)
  | Cell    | Cell    |
  ^ Table caption

  | ^       | Cell    |      (^ rowspan)
  | Cell    | <       |      (< colspan)
  + continuation row  |      (+ multiline)

ABBREVIATIONS
  *[HTML]: HyperText Markup Language

ATTRIBUTES
  {#id}  {.class}  {key=value}

EXTENSIONS
  :youtube[VIDEO_ID]         (inline)
  ::: youtube ID             (block)
  @username  #tagname        (mentions/tags)

FOOTNOTES
  text[^ref]    [^ref]: definition

COMMENTS
  %% line comment
  %%%
  block comment
  %%%

EDITORIAL (CriticMarkup)
  {+added+}  {-removed-}
  {~old~>new~}  {=highlight=}
  {# comment #}

---   (horizontal rule)
````

## Appendix B: Example Document

````carve
---
title: Carve Example Document
author: Jane Writer
date: 2024-03-15
---

# Welcome to Carve

This is a /simple/ demonstration of *Carve* markup.

## Features

Carve includes:

1. Visual emphasis with /italics/ and *bold*
2. Easy tables without separator rows
3. Standard [link syntax](https://example.com) with full tooling support

::: tip Getting Started
Just write naturally and let Carve handle the rest.
:::

### Sample Table

|= Feature        |= Status    |= Notes              |
| Visual syntax   | Done       | `/italic/` works    |
| Link syntax     | Done       | Natural order       |
| Tables          | Done       | Simpler than MD     |

### Sample Code

```python
def greet(name: str) -> str:
    """Greet someone with Carve."""
    return f"Hello, {name}!"
```

## Conclusion

> The best markup is the one you don't have to think about.
> -- Anonymous

For more info, see the [documentation](https://github.com/markup-carve).[^docs]

[^docs]: The full specification lives in the case study.
````

## Appendix C: Influences and Acknowledgments

Carve draws inspiration from:

- **Djot** (John MacFarlane) - Rigorous parsing, attributes
- **Org-mode** (Carsten Dominik) - `/italic/` syntax, TODO states
- **Creole** - `|=` table headers, `//italic//`
- **Textile** - `"text":url` link syntax
- **AsciiDoc** (Stuart Rackham) - Admonitions, includes
- **CriticMarkup** - Editorial annotations
- **Gemtext** - Radical simplicity principles
- **Typst** - Modern syntax thinking
- **CommonMark** - Specification rigor

And countless Markdown users whose struggles informed our design.
