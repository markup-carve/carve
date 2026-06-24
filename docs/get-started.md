---
title: Get Started
description: Try Carve in 30 seconds, then render it in your own project.
---

# Get Started

## Interactive online, readable offline

One of Carve's design principles: it targets the interactive web first. The [Playground](/playground), live preview, and hydration extensions (Mermaid, D2, Graphviz, Vega-Lite, Chart.js, math, tabs, details) render rich, interactive output when JavaScript is present. But interactivity is an enhancement, never a requirement — Carve only ever emits the marker element, and the client library hydrates it.

With no JavaScript — RSS readers, email, `curl`, archived pages, PDF, Markdown or terminal exports — every construct degrades to self-describing semantic HTML: a `mermaid` fence renders as `<pre class="mermaid">` showing its source, `:::details` is a native `<details>`, `list-table` is a real `<table>`, captions are `<figure>` / `<figcaption>`. The document is always whole; online just makes it richer.

## 1. Try it now — no install

The fastest path is the **[Playground](/playground)**: type Carve on the left, watch the HTML render live on the right. Nothing to set up.

Or skim the **[Cheat Sheet](/cheatsheet)** — the whole syntax fits on one page.

## 2. Render Carve in your project

There are two reference parsers. Both turn a Carve string into HTML.

::: warning Registry packages are in progress
The npm and Packagist releases are not published yet. For now, install the parsers straight from their Git repositories. The package names below are the ones the published releases will use.
:::

### JavaScript / TypeScript — [`carve-js`](https://github.com/markup-carve/carve-js)

```bash
npm install github:markup-carve/carve-js
```

```ts
import { carveToHtml } from '@markup-carve/carve'

const html = carveToHtml('/italic/, *bold*, and a heading')
```

`carveToHtml` is the one-call entry point; the package also exposes the AST (`parse`) and the Markdown / plain-text / ANSI renderers.

### PHP — [`carve-php`](https://github.com/markup-carve/carve-php)

```bash
composer require markup-carve/carve-php
```

```php
use Carve\CarveConverter;

$html = (new CarveConverter())->convert('/italic/, *bold*, and a heading');
```

`CarveConverter::convert()` returns HTML; the package also ships `parse()` plus Markdown / plain-text / ANSI renderers and HTML/Markdown/Djot converters.

## 3. Learn the syntax

- **[Cheat Sheet](/cheatsheet)** — every construct, one scannable page.
- **[Examples](/examples)** — Carve source next to the exact HTML it produces.
- **[Case Study](/case-study/)** — the full design rationale and normative spec.

## 4. Core vs extensions

Almost everything you write is **core** (Tier-1): headings, lists, tables,
links, code, math, footnotes, admonitions, attributes, and the rest of the
cheat sheet. Core is **on by default** and renders identically across every
implementation — no configuration, no plugins.

A few things are **opt-in**:

- **Tier-2** — spec-defined but off by default, e.g. citations `[@key]`,
  bare-URL autolinking, mention/tag → URL templates. Enable them in your
  processor.
- **Tier-3** — per-implementation extensions, e.g. Mermaid diagrams, a
  collapsible `details` widget, `list-table`. Register the ones you want.

The `:name[…]` (inline) and `::: name` (block) **syntax** is core, but whether a
given `name` does something special depends on whether a handler is registered;
an unknown one just renders as a plain span/div, so documents always stay
readable. The full **[feature → tier table](/extensions#feature-tiers-quick-reference)**
is the place to look up any feature.

## Build your own parser

Carve's grammar is small and unambiguous. To implement it in another language, start from **[Build Your Own Implementation](/implementing-carve)** and the **[Formal Grammar](/grammar)**.

**File extension:** `.crv`
