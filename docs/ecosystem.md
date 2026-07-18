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

Higher-level bindings and satellite packages that wrap one of the engine implementations.

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
| [emacs-carve](https://github.com/markup-carve/emacs-carve) | Emacs | Major mode for `.crv` files. |
| [vim-carve](https://github.com/markup-carve/vim-carve) | Vim / Neovim | Syntax highlighting + tree-sitter grammar. |
| [sublime-carve](https://github.com/markup-carve/sublime-carve) | Sublime Text | Syntax package for `.crv` files. |
| [helix-carve](https://github.com/markup-carve/helix-carve) | Helix | Editor support for Carve. |
| [intellij-carve](https://github.com/markup-carve/intellij-carve) | JetBrains IDEs | Highlighting, live preview, and export for IntelliJ, PhpStorm, etc. |
| [zed-carve](https://github.com/markup-carve/zed-carve) | Zed | Editor support. |
| [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) | Tree-sitter | Grammar for highlighting and structural editing. |
| [carve-lsp](https://github.com/markup-carve/carve-lsp) | LSP | Language server - syntax diagnostics, Djot/Markdown collision hints. *Early.* |

## Framework integrations

Carve embedded in another tool or framework.

| Project | Host | Status |
|---|---|---|
| [mkdocs-carve](https://github.com/markup-carve/mkdocs-carve) | MkDocs | Plugin: renders `.crv` pages in MkDocs documentation sites. |
| [jekyll-carve](https://github.com/markup-carve/jekyll-carve) | Jekyll | Converter plugin for `.crv` pages. |
| [eleventy-carve](https://github.com/markup-carve/eleventy-carve) | Eleventy (11ty) | Plugin for processing Carve source files. |
| [astro-carve](https://github.com/markup-carve/astro-carve) | Astro | Integration for importing `.crv` pages. |
| [hugo-carve](https://github.com/markup-carve/hugo-carve) | Hugo | Preprocessor that converts `.crv` content to HTML, via carve-go. |
| [symfony-carve](https://github.com/markup-carve/symfony-carve) | Symfony | Bundle to render Carve markup to HTML via carve-php. |
| [symfony-carve-demo](https://github.com/markup-carve/symfony-carve-demo) | Symfony | Demo app showcasing the symfony-carve bundle. |
| [laravel-carve](https://github.com/markup-carve/laravel-carve) | Laravel | Integration with Blade directives, services, validation, and caching. |
| [laravel-carve-demo](https://github.com/markup-carve/laravel-carve-demo) | Laravel | Runnable app demonstrating every feature of laravel-carve. |
| [shopware-carve](https://github.com/markup-carve/shopware-carve) | Shopware 6 | Twig filters, CMS element, product/category fields, admin live preview, mail, and a CLI. |
| [wp-carve](https://github.com/markup-carve/wp-carve) | WordPress | Plugin on the carve-php engine - live preview, multi-format paste, REST API. |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | Tiptap | Editor kit and Carve serializer. |
| [vite-plugin-carve](https://github.com/markup-carve/vite-plugin-carve) | Vite | Import `.crv` documents as rendered HTML. *Early.* |

## PDF / output

Render Carve documents to formats beyond HTML.

| Project | Output | Notes |
|---|---|---|
| [carve-pdf](https://github.com/markup-carve/carve-pdf) | PDF | Render `.crv` documents to clean, paginated PDFs. |
| [carve-hexapdf](https://github.com/markup-carve/carve-hexapdf) | PDF | Carve to PDF via the pure-Ruby HexaPDF engine (over carve-lang / carve-rb). |
| [pandoc-carve](https://github.com/markup-carve/pandoc-carve) | LaTeX, Typst, DOCX, PDF, ... | Carve AST to Pandoc JSON bridge; reaches every pandoc writer and makes `{=latex}`-style raw spans fire. |

## Extensions

Opt-in extensions that add non-core syntax.

| Project | Target | Notes |
|---|---|---|
| [carve-php-media-embed](https://github.com/markup-carve/carve-php-media-embed) | carve-php | Embeds audio/video from 30+ providers via dereuromark/media-embed. |

## Benchmarks

| Project | Description |
|---|---|
| [carve-bench](https://github.com/markup-carve/carve-bench) | Cross-engine render performance benchmarks (carve-js / carve-php / carve-rs). |

## AI / agent tooling

Skills and context packs that teach AI coding agents to author Carve.

| Project | Target | Status |
|---|---|---|
| [carve-skill](https://github.com/markup-carve/carve-skill) | Claude Code / agents | Authoring skill - a syntax card, the Markdown/Djot trap list, and a `carve lint` validation loop so agents write valid `.crv` the first time. |

## Resources

| Project | Description |
|---|---|
| [awesome-carve](https://github.com/markup-carve/awesome-carve) | Curated list of Carve tools, libraries, and resources. |
| [PHP Sandbox](https://sandbox.dereuromark.de/sandbox/carve) | Powerful live sandbox on the carve-php engine - explore syntax and extensions, inspect output, and share snippets via pastebin-style links. |

---

Building something new? See [Build Your Own Implementation](./implementing-carve).
External tools are welcome in [awesome-carve](https://github.com/markup-carve/awesome-carve)
even if they do not live in the org.
