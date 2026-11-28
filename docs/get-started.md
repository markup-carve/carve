---
title: Get Started
description: Try Carve in the playground, then render it in your own project.
---

# Get Started

Carve 0.2 is in development on the `main` branches of the engines. The released packages on npm, Packagist and crates.io are the 0.1 line, which reads different syntax. This page shows how to try 0.2 now and where each engine stands.

## Try Carve

Open the [Playground](./playground) to edit and preview Carve without installing anything. It runs the same 0.2 reference engine that renders this site. To keep your changes, save the source as a `.crv` file.

See the [Cheat Sheet](./cheatsheet) for syntax and [Coming from Markdown](./migrate-from-markdown) for the main differences from Markdown.

## Write a first document

Save this as `hello.crv`:

::: compare
```crv
= Hello

A paragraph with /emphasis/, *strong text* and a [link](https://example.com).

- First item
- Second item

|= Name |={>} Qty |
| Apples | 3 |
| Pears | 12 |
^ Fruit on hand
```

```html
<section id="Hello">
  <h1>Hello</h1>
  <p>A paragraph with <em>emphasis</em>, <strong>strong text</strong> and a <a href="https://example.com">link</a>.</p>
  <ul>
    <li>First item</li>
    <li>Second item</li>
  </ul>
  <table>
    <caption>Fruit on hand</caption>
    <thead>
      <tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Qty</th></tr>
    </thead>
    <tbody>
      <tr><td>Apples</td><td style="text-align: right;">3</td></tr>
      <tr><td>Pears</td><td style="text-align: right;">12</td></tr>
    </tbody>
  </table>
</section>
```
:::

The Rendered tab shows the HTML the engine writes, styled by this site. Headings start with `=`, emphasis uses slashes, strong uses single asterisks, and `|=` marks a table header cell.

## Render it

The reference engine is `carve-js`. Its command is `carve`:

```sh
carve render hello.crv > hello.html
carve fmt --check hello.crv
carve lint hello.crv
```

`render` writes HTML to standard output. `fmt --check` reports the first line that is not in the canonical form without changing the file, and `fmt --write` rewrites it. `lint` reports likely mistakes, such as Markdown habits that Carve reads as text. Every command also reads standard input when no file is given; `carve --help` lists the commands of your build.

If you have Carve 0.1 documents, `carve upgrade` rewrites them for 0.2. See [Upgrading from 0.1](./upgrade-0-2).

## Install a renderer

The JavaScript, PHP and Rust engines are tested against the same Carve documents and expected output. Until 0.2.0 is released, install them from their `main` branches as shown below; a plain registry install gives you 0.1.

### JavaScript and TypeScript: [carve-js](https://github.com/markup-carve/carve-js)

```sh
npm install github:markup-carve/carve-js#main
```

```js
import { format, lint, parse, render } from '@markup-carve/carve'

const html = render('= Hello\n\nSome /emphasis/ and *strong* text.\n')
```

The package root runs in browsers, Node, Deno and bundlers. It exports `parse`, `render`, `format` and `lint`. Separate entries hold the importers (`@markup-carve/carve/import`), the optional extensions (`@markup-carve/carve/extensions`), the 0.1 upgrade (`@markup-carve/carve/upgrade`) and a Prettier plugin (`@markup-carve/carve/prettier`). The package's `carve` command is the CLI shown above.

### PHP: [carve-php](https://github.com/markup-carve/carve-php)

```sh
composer require markup-carve/carve-php:dev-main
```

```php
use MarkupCarve\Carve\Carve;

$html = Carve::render("= Hello\n\nSome /emphasis/ and *strong* text.\n");
```

Every entry point is a static method on `MarkupCarve\Carve\Carve` that takes one options array. PHP 8.2 or later is required. The command line is `vendor/bin/carve`.

### Rust: [carve-rs](https://github.com/markup-carve/carve-rs)

```toml
[dependencies]
carve = { package = "carve-lang", git = "https://github.com/markup-carve/carve-rs" }
```

```rust
use carve::api::{self, Options};

let html = api::render("= Hello\n\nSome /emphasis/ and *strong* text.\n", &Options::default())?;
```

The crate is published as `carve-lang` and imported as `carve`; its 0.2 calls live in `carve::api`. The crate also builds the `carve` command: `cargo install --git https://github.com/markup-carve/carve-rs carve-lang`.

### Browser and Node through WebAssembly: [carve-wasm](https://github.com/markup-carve/carve-wasm)

`carve-wasm` wraps `carve-rs`. See its repository for the engine it bundles and its browser and server APIs.

### Language bindings

These bindings use `carve-rs`. Check each project for the engine version it bundles before you use it with 0.2 documents:

| Language | Project | Install |
| --- | --- | --- |
| Python | [carve-py](https://github.com/markup-carve/carve-py) | `pip install carve-lang` |
| Ruby | [carve-rb](https://github.com/markup-carve/carve-rb) | `gem install carve-lang` |
| Go | [carve-go](https://github.com/markup-carve/carve-go) | `go get github.com/markup-carve/carve-go` |

## Choose a workflow

| What you want to do | Start here | Boundary to check |
| --- | --- | --- |
| Write a documentation site | [MkDocs plugin](https://github.com/markup-carve/mkdocs-carve): `pip install mkdocs-carve` | Add `carve` under `plugins` in `mkdocs.yml` and list `.crv` source paths in `nav`. |
| Edit content in WordPress | [Carve Markup on WordPress.org](https://wordpress.org/plugins/carve-markup/) | Test the editor and theme on your site before migrating existing posts. |
| Extract a PDF to editable Carve | [PDF to Carve](https://github.com/markup-carve/pdf-to-carve): `pip install pdf-to-carve` | Review extracted text, tables and reading order against the PDF. |
| Export a report to DOCX, EPUB or Typst | [Pandoc bridge](https://github.com/markup-carve/pandoc-carve): `npm install @markup-carve/pandoc-carve`, then `npx pandoc-carve` | Install Pandoc 3.x separately. Use `--diagnostics report.json` to inspect conversion losses. |
| Add Carve tools to an MCP client | [Carve MCP](https://github.com/markup-carve/carve-mcp): `npx -y @markup-carve/carve-mcp` | Node.js 20 or newer. Filesystem access needs an explicit workspace root. |

These integrations run a released engine, which is the 0.1 line today. Check the engine version each one documents before you feed it 0.2 source. The [Ecosystem](./ecosystem) lists other editors, site generators and output paths. The packages above solve different tasks and do not need to be installed together.

## Editor support

Syntax highlighting and language servers exist for most editors:

- [vscode-carve](https://github.com/markup-carve/vscode-carve) for Visual Studio Code: highlighting, a preview that draws the standard extensions, import and export, and a bundled language server. Its `main` branch pins the 0.2 engine.
- [carve-lsp](https://github.com/markup-carve/carve-lsp), a language server for any editor with LSP support: diagnostics, completion, navigation, rename, formatting and quick fixes, on the 0.2 engine.
- [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) and grammars and plugins for Emacs, Vim, Sublime Text, Helix, Zed and JetBrains IDEs, listed in the [Ecosystem](./ecosystem#editor-support).
- [The Prettier plugin](https://github.com/markup-carve/carve-js/blob/main/docs/api.md#prettier) in carve-js, which formats `.crv` files as `carve fmt` does.

Some editor tooling still recognizes only 0.1 spellings; 0.2 changes headings and several inline forms. Check what a plugin's grammar or bundled engine reads, and when the highlighting and the rendered output disagree, the engine decides.

## Core and optional features

Headings, lists, tables, links, code, math, footnotes, admonitions, captions and attributes work without configuration.

Other features are extensions that the host turns on, for example:

- Diagrams and charts from `mermaid`, `chart` and other fences: [Diagrams and Charts](./diagrams).
- SVG images from an `img` fence: [SVG Images](./svg-images).
- Details, spoilers, tabs, code groups, citations, bare URL autolinks, wiki links, heading permalinks and a table of contents.

The `:name[...]` inline form and the `::: name` block form are always recognized. A host can register an extension that changes the output for a name. Without one, the content renders as an ordinary span or div. See [Optional Features and Extensions](./extensions).

## Read next

- [Cheat Sheet](./cheatsheet): every construct on one page.
- [Examples](./examples): Carve source and HTML output.
- [Blocks and Attributes](./blocks-and-attributes) for document structure, and [Include Files](./include-files) for reuse.
- [Styling Recipes](./recipes): trees, cards, columns and other layouts with CSS.
- [Upgrading from 0.1](./upgrade-0-2) for existing documents.

## Build your own parser

Start with [Build Your Own Implementation](./implementing-carve) and the [Formal Grammar](./grammar).

**File extension:** `.crv`. Carve source is UTF-8 text.

**Specification (external):** [Carve 0.2 specification](https://github.com/markup-carve/carve/blob/main/spec/0.2/README.md), with the [tooling chapter](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#commands) for the commands, flags and exit codes.
