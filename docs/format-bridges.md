---
description: Convert Carve to and from other formats through the AST and the HTML importer.
---

# Format conversion

Carve 0.2 specifies a semantic AST and an HTML import path. Every engine offers Markdown, plain text, and ANSI export through its library API and `carve render --to`, but their output is engine behavior the specification does not define (C2-T-003). An application that needs another format should choose a bridge for that target, then check its losses. See [the AST interchange contract](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#tree-and-sidecars), [HTML import](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), and [the removed paths](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#command-line-and-missing-features).

## Choose a path

| Task | Path | What to inspect |
| --- | --- | --- |
| Display a Carve document | `carve render` or `render` | HTML and render-loss diagnostics |
| Bring HTML into Carve | `carve import --from html` or `importDocument` | Tree, written source, importer and writer losses |
| Exchange structure with another tool | 2.0 AST envelope | Version, declarations, fallback nodes, and reader validation |
| Convert Markdown, GFM, or Djot | Produce HTML, then import it | HTML conversion losses and Carve import losses |
| Produce Markdown, plain text, or ANSI | The engine export (`carve render --to markdown`, `--to plain`, `--to ansi`) | Engine-specific output and export-only loss codes |
| Produce another target | A host-owned writer over the 2.0 AST | Unsupported node and field losses |

The reference JavaScript engine has extra import adapters. Their behavior is outside the 0.2 specification. The [tooling scope](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#scope) names those extensions to the command.

## Preserve what matters

For a semantic bridge, keep the 2.0 tree's declared child slots, authored attributes, extension fallbacks, and resource references. Source spelling belongs to the [layout sidecar](./ast-source-layout.md), not the semantic tree. A bridge that cannot represent a field reports it with its path. The canonical Carve writer also reports [unspellable shapes](https://github.com/markup-carve/carve/blob/main/spec/0.2/ast.md#shapes-that-carve-source-cannot-spell).

Rendered HTML is useful for display and as the specified import hub. It is not a complete serialization of every AST field. If a Carve to HTML to Carve round trip matters, render with `roundtrip`, import the result, and check both diagnostics records. See [roundtrip carriers](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers) and [import carriers](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#carriers-and-the-two-documents).
