---
title: Get Started
description: Try Carve in 30 seconds, then render it in your own project.
---

# Get Started

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

## Build your own parser

Carve's grammar is small and unambiguous. To implement it in another language, start from **[Build Your Own Implementation](/implementing-carve)** and the **[Formal Grammar](/grammar)**.

**File extension:** `.crv`
