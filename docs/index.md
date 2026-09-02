---
layout: home

hero:
  name: Carve
  text: A markup language for documents
  tagline: Syntax for headings, tables, captions, references, math, and optional extensions.
  image:
    src: /logo.svg
    alt: Carve logo
  actions:
    - theme: brand
      text: Open Playground
      link: /playground
    - theme: alt
      text: Install
      link: /get-started
    - theme: alt
      text: Full Cheat Sheet
      link: /cheatsheet

features:
  - title: Defined behavior
    details: A specification and shared input/output tests define how the language works.
  - title: Three implementations
    details: Carve parsers are available for JavaScript, PHP, and Rust.
  - title: Four output formats
    details: Convert a document to HTML, Markdown, plain text, or ANSI terminal text.
description: Carve syntax, installation, specification, and reference implementations.
---

## Syntax

```carve
# Release notes

This has /italic/, *bold*, _underline_, ~strikethrough~, and =highlight=.

- [x] Publish the release
- [ ] Update the package

|= Package |= Version |
| carve-js | 0.1 |
^ Published packages

::: note
Containers can represent admonitions and application-defined blocks.
:::
```

| Construct | Syntax |
|---|---|
| Heading | `# Heading` |
| Link | `[text](https://example.com)` |
| Image | `![alt](image.jpg)` |
| Cross-reference | `</#heading-id>` |
| Footnote | `[^note]` |
| Inline math | `` $`x + y` `` |
| Attributes | `{#id .class key=value}` |
| Extension | `:name[content]` |

The [cheat sheet](./cheatsheet) lists every construct. [Examples](./examples)
show Carve source beside its HTML output.

## Why Carve

- Cross-references and numbered captions keep labels and link text in sync.
- Tables support captions, alignment, rowspan, colspan, and multiline cells
  without HTML.
- JavaScript, PHP, and Rust are tested with the same Carve inputs and expected
  HTML outputs.
- A document can be rendered as HTML, Markdown, plain text, or ANSI terminal
  text. Rendering methods can warn when an output format omits content.
- If an application does not recognize an extension, its content remains in an
  ordinary span or div.
- Bare HTML is literal text. Explicit `=html` passthrough can be disabled for
  untrusted input.

## Install

```bash
npm install @markup-carve/carve
composer require markup-carve/carve-php
cargo install carve-lang
```

```ts
import { carveToHtml } from '@markup-carve/carve'

const html = carveToHtml('/italic/ and *bold*')
```

See [Get Started](./get-started) for PHP, the Rust CLI, WebAssembly, and language
bindings.

## Scope

Carve is a separate language, not a Markdown extension. Use a Carve parser for
`.crv` files. The [Markdown migration guide](./migrate-from-markdown) lists
syntax differences and [Format conversion](./format-bridges) describes which
content can be preserved.

Core syntax is always available. Some features, including citations, automatic
URL linking, and diagrams, must be enabled separately. The [optional features
table](./extensions#feature-tiers-quick-reference) lists their availability.

## Reference

- [Formal grammar](./grammar)
- [Extensions](./extensions)
- [Security](./security)
- [Implementation comparison](./implementation-comparison)
- [Ecosystem](./ecosystem)
- [Terms used in this documentation](./terms)

Carve 0.1 is specified. Minor releases may change the grammar before 1.0; see
[Versioning](./versioning).
