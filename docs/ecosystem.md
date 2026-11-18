---
description: Projects that work with Carve, with their version boundaries.
---

# Ecosystem

This directory links projects that parse, display, edit or convert Carve. Most existing integrations target released 0.1 engines. A link here does not claim 0.2 support. Check each project's branch and engine pin before using it with 0.2 documents. The 0.2 reference implementation is [carve-js on `next2`](https://github.com/markup-carve/carve-js/tree/next2/v2), and its portable contract is in the [0.2 specification](./grammar).

## Parsers

Engines and browser bindings. Released PHP, Rust and JavaScript packages remain on the 0.1 line unless their project documents a 0.2 build.

- [carve-js](https://github.com/markup-carve/carve-js)
- [carve-rs](https://github.com/markup-carve/carve-rs)
- [carve-php](https://github.com/markup-carve/carve-php)
- [carve-wasm](https://github.com/markup-carve/carve-wasm)

## Language bindings

Wrappers and UI packages depend on an engine. Their language support does not imply that their bundled engine reads 0.2.

- [carve-go](https://github.com/markup-carve/carve-go)
- [carve-py](https://github.com/markup-carve/carve-py)
- [carve-rb](https://github.com/markup-carve/carve-rb)
- [echo-carve](https://github.com/markup-carve/echo-carve)
- [carve-components](https://github.com/markup-carve/carve-components)
- [carve-wysiwyg](https://github.com/markup-carve/carve-wysiwyg)
- [carve-css](https://github.com/markup-carve/carve-css)

## Editor support

Highlighting, language servers and editor features may recognize only 0.1 spellings. In particular, 0.2 changes headings and some inline forms.

- [vscode-carve](https://github.com/markup-carve/vscode-carve)
- [emacs-carve](https://github.com/markup-carve/emacs-carve)
- [vim-carve](https://github.com/markup-carve/vim-carve)
- [sublime-carve](https://github.com/markup-carve/sublime-carve)
- [sublime-carve-lsp](https://github.com/markup-carve/sublime-carve-lsp)
- [helix-carve](https://github.com/markup-carve/helix-carve)
- [intellij-carve](https://github.com/markup-carve/intellij-carve)
- [zed-carve](https://github.com/markup-carve/zed-carve)
- [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve)
- [highlightjs-carve](https://github.com/markup-carve/highlightjs-carve)
- [pygments-carve](https://github.com/markup-carve/pygments-carve)
- [rouge-carve](https://github.com/markup-carve/rouge-carve)
- [tempest-highlight-carve](https://github.com/markup-carve/tempest-highlight-carve)
- [Prettier plugin](https://github.com/markup-carve/carve-js/blob/main/docs/integrations.md#prettier)
- [carve-lsp](https://github.com/markup-carve/carve-lsp)

## Framework integrations

Publishing and application adapters should document the engine commit they run before accepting 0.2 source.

- [mkdocs-carve](https://github.com/markup-carve/mkdocs-carve)
- [jekyll-carve](https://github.com/markup-carve/jekyll-carve)
- [eleventy-carve](https://github.com/markup-carve/eleventy-carve)
- [astro-carve](https://github.com/markup-carve/astro-carve)
- [hugo-carve](https://github.com/markup-carve/hugo-carve)
- [docusaurus-carve](https://github.com/markup-carve/docusaurus-carve)
- [webpack-loader-carve](https://github.com/markup-carve/webpack-loader-carve)
- [obsidian-carve](https://github.com/markup-carve/obsidian-carve)
- [symfony-carve](https://github.com/markup-carve/symfony-carve)
- [symfony-carve-demo](https://github.com/markup-carve/symfony-carve-demo)
- [laravel-carve](https://github.com/markup-carve/laravel-carve)
- [laravel-carve-demo](https://github.com/markup-carve/laravel-carve-demo)
- [cakephp-carve](https://github.com/markup-carve/cakephp-carve)
- [tempest-carve](https://github.com/markup-carve/tempest-carve)
- [tempest-carve-demo](https://github.com/markup-carve/tempest-carve-demo)
- [shopware-carve](https://github.com/markup-carve/shopware-carve)
- [wp-carve](https://github.com/markup-carve/wp-carve)
- [carve-grammars](https://github.com/markup-carve/carve-grammars)
- [vite-plugin-carve](https://github.com/markup-carve/vite-plugin-carve)
- [carve-press](https://github.com/markup-carve/carve-press)
- [zensical-carve](https://github.com/markup-carve/zensical-carve)
- [zensical-carve-demo](https://github.com/markup-carve/zensical-carve-demo)

## PDF / output

These projects provide output or extraction paths outside the 0.2 core HTML and canonical Carve contract. Their 0.2 compatibility needs a separate check.

- [carve-pdf](https://github.com/markup-carve/carve-pdf)
- [carve-hexapdf](https://github.com/markup-carve/carve-hexapdf)
- [pandoc-carve](https://github.com/markup-carve/pandoc-carve)
- [carve-latex](https://github.com/markup-carve/carve-latex)
- [reveal-carve](https://github.com/markup-carve/reveal-carve)
- [carve-sile](https://github.com/markup-carve/carve-sile)
- [pdf-to-carve](https://github.com/markup-carve/pdf-to-carve)
- [docling-carve](https://github.com/markup-carve/docling-carve)
- [carve-okf](https://github.com/markup-carve/carve-okf)

## Format bridges

Bridges exchange trees or source with other document models. AST 2.0 is a new contract, so a 0.1 bridge needs an explicit migration or port.

- [pandoc-carve](https://github.com/markup-carve/pandoc-carve)
- [unified-carve](https://github.com/markup-carve/unified-carve)
- [carve-grammars](https://github.com/markup-carve/carve-grammars)
- [carve-php](https://github.com/markup-carve/carve-php/blob/main/docs/prosemirror.md)

## Extensions

Application behavior outside the core. The 0.2 extension interface is provisional.

- [carve-php-media-embed](https://github.com/markup-carve/carve-php-media-embed)
- [carve-php-chat](https://github.com/markup-carve/carve-php-chat)

## Evidence & benchmarks

Historical 0.1 figures do not measure 0.2. Use the [0.2 specification tests](./conformance) and a new benchmark run.

- [carve-conformance](https://github.com/markup-carve/carve-conformance)
- [carve-bench](https://github.com/markup-carve/carve-bench)
- [pandoc-format-fidelity](https://github.com/markup-carve/pandoc-format-fidelity)

## AI / agent tooling

Authoring helpers and tool servers need version-specific syntax guidance.

- [carve-skill](https://github.com/markup-carve/carve-skill)
- [carve-mcp](https://github.com/markup-carve/carve-mcp)

## Resources

Lists, installation helpers and sandboxes. Check which Carve version each uses.

- [awesome-carve](https://github.com/markup-carve/awesome-carve)
- [homebrew-carve](https://github.com/markup-carve/homebrew-carve)
- [PHP Sandbox](https://sandbox.dereuromark.de/sandbox/carve)

For 0.2 document transport, the media type remains `text/x-carve; charset=utf-8`. The [AST contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/ast.md) and [tooling contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md) define what an integration should exchange.
