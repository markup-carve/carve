---
description: Projects that work with Carve, with their version boundaries.
---

# Ecosystem

Everything that parses, displays, edits or converts Carve, grouped by role. All of it lives under the [markup-carve](https://github.com/markup-carve) organization.

Most existing integrations target released 0.1 engines. A link here does not claim 0.2 support, and the project descriptions below were written for the 0.1 line unless a row says otherwise. Check each project's branch and engine pin before using it with 0.2 documents. The 0.2 reference implementation is [carve-js on `main`](https://github.com/markup-carve/carve-js/tree/main), and its portable contract is in the [0.2 specification](./grammar). For how engines are compared against one spec pin, and the dated 0.1 measurements, see [Implementation comparison methodology](./implementation-comparison-methodology).

## Parsers

The engines that turn Carve source into an AST and HTML. Conformance is measured against the shared [0.2 conformance cases](./conformance); the bar for "a Carve implementation" is the core (native syntax), see [Implementing Carve](./implementing-carve). Released PHP, Rust and JavaScript packages remain on the 0.1 line unless their project documents a 0.2 build. The "Tier-1 corpus passing" notes below were measured against the 0.1 corpus.

| Project | Language | Status |
|---|---|---|
| [carve-js](https://github.com/markup-carve/carve-js) | TypeScript | Reference implementation. `main` is the 0.2 reference engine; released packages are 0.1. Tier-1 0.1 corpus passing. |
| [carve-rs](https://github.com/markup-carve/carve-rs) | Rust | Parser and HTML renderer with a `carve` CLI. Tier-1 0.1 corpus passing. |
| [carve-php](https://github.com/markup-carve/carve-php) | PHP | Forked from djot-php; Carve syntax implemented, 0.1 corpus passing. Powers the [PHP sandbox](https://sandbox.dereuromark.de/sandbox/carve) and wp-carve. |
| [carve-wasm](https://github.com/markup-carve/carve-wasm) | WASM | Browser and Node bindings for carve-rs. *Early.* |

## Language bindings

Higher-level bindings and satellite packages that wrap one of the engines. Their language support does not imply that their bundled engine reads 0.2.

On the 0.1 line, a binding over carve-rs exposed the complete core output surface: HTML, Markdown, plain text, ANSI, canonical Carve and the published AST. Importers were optional, but each binding declared every HTML, Markdown, Djot and BBCode importer as either implemented or out of scope. A machine-readable declaration, `resources/binding-contract.json` on the `0.1` branch, checked that the required output set was exact, that every importer had exactly one declaration, and that both kinds of declaration held against the source each binding shipped. The main branch carries no binding contract for 0.2, and in 0.2 Markdown, plain text and ANSI exports are engine behavior rather than specified output.

| Project | Language | Notes |
|---|---|---|
| [carve-go](https://github.com/markup-carve/carve-go) | Go | Pure-Go module via wazero and WASI over carve-rs. |
| [carve-py](https://github.com/markup-carve/carve-py) | Python | PyO3 bindings over carve-rs. Enables MkDocs, Pelican and other Python pipelines. |
| [carve-rb](https://github.com/markup-carve/carve-rb) | Ruby | Native gem via magnus over carve-rs. |
| [echo-carve](https://github.com/markup-carve/echo-carve) | Echo | HTML rendering through a small C ABI over carve-rs. Not released yet; build from source. |
| [carve-components](https://github.com/markup-carve/carve-components) | React / Vue | UI components for rendering Carve markup in the browser. |
| [carve-wysiwyg](https://github.com/markup-carve/carve-wysiwyg) | TypeScript | WYSIWYG editor and live sandbox (Tiptap and carve-grammars). |
| [carve-css](https://github.com/markup-carve/carve-css) | CSS | Shared styles for semantic Carve HTML such as admonitions and tabs. |

## Editor support

Syntax highlighting, structural editing and diagnostics inside editors. These may recognize only 0.1 spellings. In particular, 0.2 adds `=` headings next to `#`, writes the thematic break as `***` and table header cells as `|=`, and changes several inline forms: bare `_`, `~` and `=` are text, and underline, strike and highlight are braced. See [What's new in 0.2](./whats-new-0-2).

| Project | Target | Status |
|---|---|---|
| [vscode-carve](https://github.com/markup-carve/vscode-carve) | VS Code | Highlighting, snippets, live preview. |
| [emacs-carve](https://github.com/markup-carve/emacs-carve) | Emacs | Major mode for `.crv` files. |
| [vim-carve](https://github.com/markup-carve/vim-carve) | Vim / Neovim | Syntax highlighting and tree-sitter grammar. |
| [sublime-carve](https://github.com/markup-carve/sublime-carve) | Sublime Text | Syntax package for `.crv` files. |
| [sublime-carve-lsp](https://github.com/markup-carve/sublime-carve-lsp) | Sublime Text | LSP helper package: diagnostics, hover and symbols via the Carve language server. |
| [helix-carve](https://github.com/markup-carve/helix-carve) | Helix | Editor support for Carve. |
| [intellij-carve](https://github.com/markup-carve/intellij-carve) | JetBrains IDEs | Highlighting, live preview and export for IntelliJ, PhpStorm and others. |
| [zed-carve](https://github.com/markup-carve/zed-carve) | Zed | Editor support. |
| [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) | Tree-sitter | Grammar for highlighting and structural editing. |
| [highlightjs-carve](https://github.com/markup-carve/highlightjs-carve) | Highlight.js | Syntax grammar for highlighted Carve source. |
| [pygments-carve](https://github.com/markup-carve/pygments-carve) | Pygments | Lexer for Python documentation and highlighting tools. |
| [rouge-carve](https://github.com/markup-carve/rouge-carve) | Rouge | Lexer coloring Carve source wherever Rouge highlights. |
| [tempest-highlight-carve](https://github.com/markup-carve/tempest-highlight-carve) | tempest/highlight | Server-side highlighting of Carve source in PHP. |
| [Prettier plugin](https://github.com/markup-carve/carve-js/blob/main/docs/api.md#prettier) | Prettier | Ships with carve-js as `@markup-carve/carve/prettier`. Formats `.crv` with the same formatter as `carve fmt`, so the two never disagree. |
| [carve-lsp](https://github.com/markup-carve/carve-lsp) | LSP | Language server: syntax diagnostics, Djot and Markdown collision hints. *Early.* |

### Copying a Carve document

For 0.2 document transport, the media type remains `text/x-carve; charset=utf-8`. An integration that puts Carve source on the clipboard carries it as `text/x-carve`, written without its `charset=utf-8` parameter on a clipboard, next to a `text/plain` flavor for targets that know no Carve. Browser and Electron hosts must write it as `web text/x-carve`: the unprefixed type fails only when the write runs, so await `navigator.clipboard.write` and report its rejection, or a copy that put nothing on the clipboard looks like success. This clipboard rule was clause CARVE-P9-071 in 0.1; the 0.2 specification does not restate it.

## Framework integrations

Carve embedded in another tool or framework. Publishing and application adapters should document the engine commit they run before accepting 0.2 source.

| Project | Host | Status |
|---|---|---|
| [mkdocs-carve](https://github.com/markup-carve/mkdocs-carve) | MkDocs | Plugin: renders `.crv` pages in MkDocs documentation sites. |
| [jekyll-carve](https://github.com/markup-carve/jekyll-carve) | Jekyll | Converter plugin for `.crv` pages. |
| [eleventy-carve](https://github.com/markup-carve/eleventy-carve) | Eleventy (11ty) | Plugin for processing Carve source files. |
| [astro-carve](https://github.com/markup-carve/astro-carve) | Astro | Integration for importing `.crv` pages. |
| [hugo-carve](https://github.com/markup-carve/hugo-carve) | Hugo | Preprocessor that converts `.crv` content to HTML, via carve-go. |
| [docusaurus-carve](https://github.com/markup-carve/docusaurus-carve) | Docusaurus | Docs plugin: converts `.crv` pages and delegates routes, sidebars and metadata to Docusaurus. |
| [webpack-loader-carve](https://github.com/markup-carve/webpack-loader-carve) | webpack / Next.js | Build-time loader for importing `.crv` as rendered HTML modules. |
| [obsidian-carve](https://github.com/markup-carve/obsidian-carve) | Obsidian | Community plugin with source and reading views for `.crv` notes. |
| [symfony-carve](https://github.com/markup-carve/symfony-carve) | Symfony | Bundle to render Carve markup to HTML via carve-php. |
| [symfony-carve-demo](https://github.com/markup-carve/symfony-carve-demo) | Symfony | Demo app for the symfony-carve bundle. |
| [laravel-carve](https://github.com/markup-carve/laravel-carve) | Laravel | Integration with Blade directives, services, validation and caching. |
| [laravel-carve-demo](https://github.com/markup-carve/laravel-carve-demo) | Laravel | Runnable app demonstrating every feature of laravel-carve. |
| [cakephp-carve](https://github.com/markup-carve/cakephp-carve) | CakePHP | Plugin with rendering, views, validation, an ORM behavior, commands and caching. |
| [tempest-carve](https://github.com/markup-carve/tempest-carve) | Tempest | Safe-by-default Carve rendering for Tempest applications. |
| [tempest-carve-demo](https://github.com/markup-carve/tempest-carve-demo) | Tempest | Runnable app demonstrating every feature of tempest-carve. |
| [shopware-carve](https://github.com/markup-carve/shopware-carve) | Shopware 6 | Twig filters, CMS element, product and category fields, admin live preview, mail and a CLI. |
| [wp-carve](https://github.com/markup-carve/wp-carve) | WordPress | Plugin on the carve-php engine: live preview, multi-format paste, REST API. |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | Tiptap | Editor kit and Carve serializer. |
| [vite-plugin-carve](https://github.com/markup-carve/vite-plugin-carve) | Vite | Import `.crv` documents as rendered HTML. *Early.* |
| [carve-press](https://github.com/markup-carve/carve-press) | Static sites | Carve-native static site generator. |
| [zensical-carve](https://github.com/markup-carve/zensical-carve) | Zensical | Carve integration for Zensical documentation sites. |
| [zensical-carve-demo](https://github.com/markup-carve/zensical-carve-demo) | Zensical | A site written in Carve with every extension enabled. |

## PDF / output

Render Carve documents to formats beyond HTML, or extract Carve from other formats. These paths lie outside the 0.2 core HTML and canonical Carve contract, so their 0.2 compatibility needs a separate check.

| Project | Output | Notes |
|---|---|---|
| [carve-pdf](https://github.com/markup-carve/carve-pdf) | PDF | Render `.crv` documents to clean, paginated PDFs. |
| [carve-hexapdf](https://github.com/markup-carve/carve-hexapdf) | PDF | Carve to PDF via the pure-Ruby HexaPDF engine (over carve-lang / carve-rb). |
| [pandoc-carve](https://github.com/markup-carve/pandoc-carve) | LaTeX, Typst, DOCX, PDF, ... | Carve AST to Pandoc JSON bridge; reaches every pandoc writer and makes `{=latex}`-style raw spans fire. |
| [carve-latex](https://github.com/markup-carve/carve-latex) | LaTeX, PDF | `@markup-carve/carve-latex`: publishing templates, bibliography, indexing and project assembly. |
| [reveal-carve](https://github.com/markup-carve/reveal-carve) | Presentations | `@markup-carve/reveal-carve`: runtime plugin and static build step for reveal.js slides. Its peer dependencies include Carve and reveal.js. |
| [carve-sile](https://github.com/markup-carve/carve-sile) | PDF | SILE input support for typesetting Carve documents. |
| [pdf-to-carve](https://github.com/markup-carve/pdf-to-carve) | Carve source | Extract PDF text and layout into validated `.crv` documents. |
| [docling-carve](https://github.com/markup-carve/docling-carve) | Carve source | Export Docling documents with provenance, assets and conversion diagnostics. Published on PyPI as `docling-carve`. |
| [carve-okf](https://github.com/markup-carve/carve-okf) | Open Knowledge Format | `@markup-carve/carve-okf`: export to an OKF bundle of portable Markdown files, with a report of the constructs that do not survive. |

## Format bridges

Conversions between the Carve AST and another document model, in both directions. These are keyed by bridge rather than by repository, because one of them lives inside an engine rather than in a package of its own. Why the boundary sits at the AST, and what a bridge owes its caller: [Format conversion](./format-bridges).

AST 2.0 is a new contract, so a bridge written against the 0.1 AST needs an explicit migration or port before it reads 0.2 trees. The directions below describe the 0.1 bridges.

| Bridge | Model | Runtime | Carve to it | It to Carve |
|---|---|---|---|---|
| [pandoc-carve](https://github.com/markup-carve/pandoc-carve) | Pandoc AST | Node and `pandoc` | Yes, every pandoc writer | Yes, everything pandoc reads |
| [unified-carve](https://github.com/markup-carve/unified-carve) | mdast (unified / remark) | Node | Yes, `carveParse` (not released yet) | Not yet |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | ProseMirror / Tiptap | Node | Yes, `carveToProseMirror` | Yes, `serializeToCarve` |
| [carve-php](https://github.com/markup-carve/carve-php/blob/main/docs/prosemirror.md) | ProseMirror / Tiptap | PHP | Yes, `ProseMirrorRenderer` | Yes, `ProseMirrorToCarve` |

The same editor model is reached from two runtimes on purpose: an editor needs the model in whatever runtime the application already has. The carve-php pair is what lets a Tiptap editor in the browser and PHP rendering in a queue worker share one stored document with no Node runtime anywhere in the pipeline. carve-grammars owns the shared `CarveKit` schema and the name map both sides read.

carve-js and carve-rs have no bridge of their own. On the 0.1 line their `prosemirror` HTML import adapter was a different job at a different stage; 0.2 specifies HTML import only (see [HTML import](./html-import)).

## Extensions

Opt-in extensions outside the core. The 0.2 extension interface is provisional, and in 0.2 an extension claims an existing core form instead of adding syntax (see [Optional features and extensions](./extensions)).

| Project | Target | Notes |
|---|---|---|
| [carve-php-media-embed](https://github.com/markup-carve/carve-php-media-embed) | carve-php | Embeds audio and video through dereuromark/media-embed. |
| [carve-php-chat](https://github.com/markup-carve/carve-php-chat) | carve-php | Renders Carve to chat-platform markup (WhatsApp, Slack, Telegram, Discord) via data-driven flavor definitions. |

## Evidence & benchmarks

Measurements of the language and its engines, each published as a website built from committed results. Historical 0.1 figures do not measure 0.2. Use the [0.2 conformance cases](./conformance) and a new benchmark run.

| Project | Website | Description |
|---|---|---|
| [carve-conformance](https://github.com/markup-carve/carve-conformance) | [Conformance](https://markup-carve.github.io/carve-conformance/) | Machine-checked models of Carve parsing rules and cross-format AST compatibility, compared with the reference implementations. |
| [carve-bench](https://github.com/markup-carve/carve-bench) | [Bench](https://markup-carve.github.io/carve-bench/) | Cross-engine render performance benchmarks (carve-js, carve-php, carve-rs). |
| [pandoc-format-fidelity](https://github.com/markup-carve/pandoc-format-fidelity) | [Fidelity](https://markup-carve.github.io/pandoc-format-fidelity/) | How much of a document survives a pandoc conversion, per format and feature, including the pandoc-carve bridge. |

## AI / agent tooling

Skills and servers that let AI coding agents author, validate and convert Carve. They need version-specific syntax guidance: a helper that teaches 0.1 writes source that 0.2 reads differently.

| Project | Target | Status |
|---|---|---|
| [carve-skill](https://github.com/markup-carve/carve-skill) | Claude Code / agents | Authoring skill: a syntax card, the Markdown and Djot trap list, and a `carve lint` validation loop so agents write valid `.crv` the first time. |
| [carve-mcp](https://github.com/markup-carve/carve-mcp) | MCP clients | Published on npm as `@markup-carve/carve-mcp`. Run with `npx -y @markup-carve/carve-mcp`; Node.js 20 or newer is required. Filesystem access needs an explicit workspace root. |

## Resources

Lists, installation helpers and sandboxes. Check which Carve version each uses.

| Project | Description |
|---|---|
| [awesome-carve](https://github.com/markup-carve/awesome-carve) | Curated list of Carve tools, libraries and resources. |
| [homebrew-carve](https://github.com/markup-carve/homebrew-carve) | Homebrew tap for installing Carve tools. |
| [PHP Sandbox](https://sandbox.dereuromark.de/sandbox/carve) | Live sandbox on the carve-php engine: explore syntax and extensions, inspect output, and share snippets via pastebin-style links. |

***

Building something new? See [Implementing Carve](./implementing-carve). External tools are welcome in [awesome-carve](https://github.com/markup-carve/awesome-carve) even if they do not live in the org.

**Specification (external):** [AST 2.0](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md) and [Tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md) (C2-T-003) define what an integration should exchange; [Extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md).
