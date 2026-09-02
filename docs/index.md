---
layout: home

hero:
  name: Carve
  text: A markup language for documents
  tagline: Headings, tables, captions, references, math, and extensions in .crv files.
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
  - title: Specification
    details: A formal grammar and shared conformance corpus define the language.
  - title: Implementations
    details: Reference implementations are available for JavaScript, PHP, and Rust.
  - title: Output
    details: Render to HTML, Markdown, plain text, or ANSI. Checked APIs report dropped content.
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
- Core behavior is pinned by 1545 corpus examples shared by the JavaScript,
  PHP, and Rust implementations.
- One AST renders to HTML, Markdown, plain text, and ANSI; checked APIs report
  lossy output.
- Unknown extensions remain ordinary spans or divs.
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
syntax differences and the [format bridges](./format-bridges) describe
conversion limits.

Core syntax is enabled by default. Some features, including citations,
automatic URL linking, and diagrams, are opt-in. Check the [feature tier
table](./extensions#feature-tiers-quick-reference) before depending on an
extension.

## Reference

- [Formal grammar](./grammar)
- [Extensions](./extensions)
- [Security](./security)
- [Implementation comparison](./implementation-comparison)
- [Ecosystem](./ecosystem)

Carve 0.1 is specified. Minor releases may change the grammar before 1.0; see
[Versioning](./versioning).
