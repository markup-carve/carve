---
title: Get Started
description: Try Carve in 30 seconds, then render it in your own project.
---

# Get Started

Use the [Playground](/playground) without installing anything. The [Cheat
Sheet](/cheatsheet) lists the syntax.

## Install a renderer

The JavaScript, PHP, and Rust implementations use the same core conformance
corpus.

### JavaScript / TypeScript — [`carve-js`](https://github.com/markup-carve/carve-js)

```bash
npm install @markup-carve/carve
```

```ts
import { carveToHtml } from '@markup-carve/carve'

const html = carveToHtml('/italic/, *bold*, and a heading')
```

The package also exposes `parse` and Markdown, plain-text, and ANSI renderers.

### Rust — [`carve-rs`](https://github.com/markup-carve/carve-rs)

```bash
cargo install carve-lang
```

```bash
# CLI: convert a .crv file to HTML
carve input.crv
```

### Browser / Node via WebAssembly — [`carve-wasm`](https://github.com/markup-carve/carve-wasm)

`carve-wasm` wraps `carve-rs`. See its repository for the current browser and
server-side JavaScript APIs.

### PHP — [`carve-php`](https://github.com/markup-carve/carve-php)

```bash
composer require markup-carve/carve-php
```

```php
use MarkupCarve\Carve\CarveConverter;

$html = (new CarveConverter())->convert('/italic/, *bold*, and a heading');
```

`CarveConverter::convert()` returns HTML. The package also provides `parse`,
other output formats, and format converters.

### Language bindings

These bindings use `carve-rs`:

| Language | Project | Install |
|---|---|---|
| Python | [carve-py](https://github.com/markup-carve/carve-py) | from Git (PyPI pending) |
| Ruby | [carve-rb](https://github.com/markup-carve/carve-rb) | `gem install carve-lang` |
| Go | [carve-go](https://github.com/markup-carve/carve-go) | `go get github.com/markup-carve/carve-go` |

Editor and framework integrations are listed in the [Ecosystem](/ecosystem).

## Read the reference

- [Cheat Sheet](/cheatsheet): syntax reference.
- [Examples](/examples): Carve source and HTML output.
- [Formal Grammar](/grammar): normative block and inline grammar.
- [Migration from Markdown](/migrate-from-markdown): incompatible syntax and conversion.

## Core and extensions

Core includes headings, lists, tables, links, code, math, footnotes,
admonitions, and attributes. It is enabled by default.

A few things are **opt-in**:

- **Tier-2** — specified but off by default, for example citations `[@key]`,
  bare-URL autolinking, mention/tag → URL templates, a collapsible `details`
  widget, `list-table`. Enable them in your processor.
- **Tier-3** — implementation-specific extensions, for example Mermaid diagrams, a
  table of contents, heading permalinks. Register the ones you want.

The `:name[…]` inline form and `::: name` block form are core syntax. A named
handler may change how they render. Unknown names render as a span or div. See
the [feature tier table](/extensions#feature-tiers-quick-reference).

## Build your own parser

Start with [Build Your Own Implementation](/implementing-carve) and the [Formal
Grammar](/grammar).

**File extension:** `.crv`
