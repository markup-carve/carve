---
description: Render pages that work without client scripts or external rendering services.
---

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

## Highlight code blocks

A host passes `codeBlockRenderer(node, defaultHtml)` to the render call. It runs once for every code block the renderer writes, in both modes, and gets the block's `syntax` and `value` with the default `<pre>` HTML. It returns HTML to write in its place, or nothing to keep the default. The returned HTML is trusted and inserted unchanged, so a highlighter must escape the code itself. See [the code block renderer](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#code-and-raw-content).

## Soft breaks for chat output

`softBreak` writes a line break inside a paragraph as a line break (`newline`, the default), one space (`space`), or `<br>` (`br`) for output that shows source line breaks. The command line flag is `--soft-break`. See [render options](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Headings under a page title

When the page template writes the document title as the `<h1>`, `headingShift` moves every heading down by 0 to 5 levels (default 0). With `headingShift: 1`, `=` renders as `<h2>` and `==` as `<h3>`, inside quotes, divs, list items and expanded includes too. The command line flag is `--heading-shift`:

```sh
carve render --heading-shift=1 document.crv > document.html
```

The shift runs after includes and before any extension transform, so `tableOfContents`, `headingPermalinks` and `headingNumbers` see the shifted levels, and their level options name them: with a shift of 1, `headingPermalinks({ levels: [1] })` matches no heading. Ids and cross-references do not change. A level above 6 renders as `<div role="heading" aria-level="7">` and reports `heading-shift-above-6` once. Under `roundtrip` each heading carries `data-carve-source-level`, so an HTML import gives back the authored level. The Markdown export (`carve render --to markdown`) reads the option too and clamps a level above 6 to 6; the plain text and ANSI exports refuse it. The option replaces the 0.1 `headingLevelShift()` extension. See [C2-H-208](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).

## Core math

Core math stays TeX-delimited HTML in static mode. A site that needs server-rendered math applies a separate postprocess or host integration. See [C2-H-168](https://github.com/markup-carve/carve/blob/next2/spec/0.2/html.md#options).
