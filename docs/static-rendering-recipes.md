# Static rendering recipes

Use static mode when a page must work without client scripts or external rendering services. The 0.2 renderer writes HTML; it does not ship a general Graphviz, Mermaid, MathJax, or KaTeX conversion step. See [the static mode contract](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Render a document

```sh
carve render --mode static --strict-losses document.crv > document.html
```

`--strict-losses` fails on unallowed render losses and writes no HTML for the affected file. Save a report with `--report-losses FILE` when a build needs machine-readable diagnostics. See [render flags and loss handling](https://github.com/markup-carve/carve/blob/next2/spec/0.2/tooling.md#carve-render).

## Render an extension at build time

Register a trusted renderer for the extension's qualified name and version. It receives the resolved node, its fallback, the profile, URL policy, and host helpers for escaped text, attributes, child lists, and ids. Its returned string is inserted as HTML. When a renderer is absent, the engine writes the fallback and reports `extension-fallback-rendered`. A renderer failure also uses the fallback and reports a failure. See [extension rendering](https://github.com/markup-carve/carve/blob/next2/spec/0.2/extensions.md#resolution-rendering-and-equality).

For a diagram, the host can run a local renderer during the build, sanitize its result for the site's trust model, and return HTML. Keep the diagram's source as a readable fallback. Do not let untrusted document text choose a command line or remote endpoint. [Writing an extension](./extension-tutorial.md) shows the registration surface.

## Core math

Core math stays TeX-delimited HTML in static mode. A site that needs server-rendered math applies a separate postprocess or host integration. See [C2-H-168](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).
