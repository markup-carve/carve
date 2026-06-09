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
| [carve-php](https://github.com/markup-carve/carve-php) | PHP | Forked from djot-php; syntax migration in progress. *Alpha.* |
| [carve-wasm](https://github.com/markup-carve/carve-wasm) | WASM | Browser/Node bindings for carve-rs. *Early.* |

## Editor support

Syntax highlighting, structural editing, and diagnostics inside editors.

| Project | Target | Status |
|---|---|---|
| [vscode-carve](https://github.com/markup-carve/vscode-carve) | VS Code | Highlighting, snippets, live preview. |
| [zed-carve](https://github.com/markup-carve/zed-carve) | Zed | Editor support. |
| [tree-sitter-carve](https://github.com/markup-carve/tree-sitter-carve) | Tree-sitter | Grammar for highlighting and structural editing. |
| [carve-lsp](https://github.com/markup-carve/carve-lsp) | LSP | Language server - syntax diagnostics, Djot/Markdown collision hints. *Early.* |

## Integrations

Carve embedded in another tool or framework.

| Project | Host | Status |
|---|---|---|
| [wp-carve](https://github.com/markup-carve/wp-carve) | WordPress | Plugin on the carve-php engine - live preview, multi-format paste, REST API. |
| [carve-grammars](https://github.com/markup-carve/carve-grammars) | Tiptap | Editor kit and Carve serializer. |
| [vite-plugin-carve](https://github.com/markup-carve/vite-plugin-carve) | Vite | Import `.carve` / `.crv` documents as rendered HTML. *Early.* |

## Resources

| Project | Description |
|---|---|
| [awesome-carve](https://github.com/markup-carve/awesome-carve) | Curated list of Carve tools, libraries, and resources. |

---

Building something new? See [Build Your Own Implementation](./implementing-carve).
External tools are welcome in [awesome-carve](https://github.com/markup-carve/awesome-carve)
even if they do not live in the org.
