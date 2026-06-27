# Ecosystem

Everything that speaks Carve, grouped by role. All of it lives under the
[markup-carve](https://github.com/markup-carve) organization. For live corpus
conformance numbers of the reference parsers, see
[Implementation Comparison](./implementation-comparison).

## Parsers

The engines that turn Carve source into an AST and HTML. Conformance is
measured against the shared [spec corpus](https://github.com/markup-carve/carve);
the bar for "a Carve implementation" is **Tier-1 core** (native syntax) - see
[Build Your Own Implementation](./implementing-carve).

| Project | Language | Status |
|---|---|---|
| [carve-js](https://github.com/markup-carve/carve-js) | TypeScript | Reference implementation. Tier-1 corpus passing. |
| [carve-rs](https://github.com/markup-carve/carve-rs) | Rust | Parser + HTML renderer with a `carve` CLI. Tier-1 corpus passing. |
| [carve-php](https://github.com/markup-carve/carve-php) | PHP | Forked from djot-php; Carve syntax implemented, corpus passing. Powers the [PHP sandbox](https://sandbox.dereuromark.de/sandbox/carve) and wp-carve. |
| [carve-wasm](https://github.com/markup-carve/carve-wasm) | WASM | Browser/Node bindings for carve-rs. *Early.* |

## Language bindings

Higher-level bindings and satellite packages that wrap one of the reference implementations.

| Project | Language | Notes |
|---|---|---|
| [carve-go](https://github.com/markup-carve/carve-go) | Go | Pure-Go module via wazero + WASI over carve-rs. |
| [carve-py](https://github.com/markup-carve/carve-py) | Python | PyO3 bindings over carve-rs. Enables MkDocs, Pelican, and other Python pipelines. |
| [carve-rb](https://github.com/markup-carve/carve-rb) | Ruby | Native gem via magnus over carve-rs. |
| [carve-components](https://github.com/markup-carve/carve-components) | React / Vue | UI components for rendering Carve markup in the browser. |
| [carve-wysiwyg](https://github.com/markup-carve/carve-wysiwyg) | TypeScript | WYSIWYG editor / live sandbox (Tiptap + carve-grammars). |

## Editor support

Syntax highlighting, structural editing, and diagnostics inside editors.

| Project | Target | Status |
|---|---|---|
| [vscode-carve](https://github.com/markup-carve/vscode-carve) | VS Code | Highlighting, snippets, live preview. |
| [emacs-carve](https://github.com/markup-carve/emacs-carve) | Emacs | Major mode for `.crv`/`.carve` files. |
| [vim-carve](https://github.com/markup-carve/vim-carve) | Vim / Neovim | Syntax highlighting + tree-sitter grammar. |
| [sublime-carve](https://github.com/markup-carve/sublime-carve) | Sublime Text | Syntax package for `.crv`/`.carve`. |
| [helix-carve](https://github.com/markup-carve/helix-carve) | Helix | Editor support for Carve. |
| [intellij-carve](https://github.com/markup-carve/intellij-carve) | JetBrains IDEs | Highlighting, live preview, and export for IntelliJ, PhpStorm, etc. |
| [zed-carve](https://github.com/markup-carve/zed-carve) | Zed | Editor support. |
| [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) | Tree-sitter | Grammar for highlighting and structural editing. |
| [carve-lsp](https://github.com/markup-carve/carve-lsp) | LSP | Language server - syntax diagnostics, Djot/Markdown collision hints. *Early.* |

## Framework integrations

Carve embedded in another tool or framework.

| Project | Host | Status |
|---|---|---|
| [mkdocs-carve](https://github.com/markup-carve/mkdocs-carve) | MkDocs | Plugin: renders `.crv`/`.carve` pages in MkDocs documentation sites. |
| [jekyll-carve](https://github.com/markup-carve/jekyll-carve) | Jekyll | Converter plugin for `.crv`/`.carve` pages. |
| [eleventy-carve](https://github.com/markup-carve/eleventy-carve) | Eleventy (11ty) | Plugin for processing Carve source files. |
| [astro-carve](https://github.com/markup-carve/astro-carve) | Astro | Integration for importing `.carve`/`.crv` pages. |
| [symfony-carve](https://github.com/markup-carve/symfony-carve) | Symfony | Bundle to render Carve markup to HTML via carve-php. |
| [symfony-carve-demo](https://github.com/markup-carve/symfony-carve-demo) | Symfony | Demo app showcasing the symfony-carve bundle. |
| [wp-carve](https://github.com/markup-carve/wp-carve) | WordPress | Plugin on the carve-php engine - live preview, multi-format paste, REST API. |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | Tiptap | Editor kit and Carve serializer. |
| [vite-plugin-carve](https://github.com/markup-carve/vite-plugin-carve) | Vite | Import `.carve` / `.crv` documents as rendered HTML. *Early.* |

## Resources

| Project | Description |
|---|---|
| [awesome-carve](https://github.com/markup-carve/awesome-carve) | Curated list of Carve tools, libraries, and resources. |
| [PHP Sandbox](https://sandbox.dereuromark.de/sandbox/carve) | Powerful live sandbox on the carve-php engine - explore syntax and extensions, inspect output, and share snippets via pastebin-style links. |

---

Building something new? See [Build Your Own Implementation](./implementing-carve).
External tools are welcome in [awesome-carve](https://github.com/markup-carve/awesome-carve)
even if they do not live in the org.
