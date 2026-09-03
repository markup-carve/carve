---
title: "Diagrams & Charts"
description: Draw UML, flowcharts, graphs and charts from fenced code blocks - diagrams-as-code in Carve.
---

# Diagrams & Charts

Carve stores diagram instructions in fenced code blocks. A browser library or
build tool can turn those instructions into an image.

````carve
``` mermaid
classDiagram
  class Parser {
    +parse(source) Document
    -blockPass()
  }
  Parser --> Document : produces
  Document <|-- Section
```
````

The rest of this page lists supported diagram languages and output options.

## Supported diagram languages

The optional `FencedRender` extension recognizes these fence names and generates
an HTML element for the selected drawing library.

| Fence word | Draws | Mode |
| ---------- | ----- | ---- |
| `mermaid` | flowcharts, UML (class, sequence, state, ER), Gantt, C4 | text |
| `d2` | declarative diagrams, layered layouts | text |
| `graphviz` (`dot`) | directed / undirected graphs | text |
| `wavedrom` | digital timing diagrams, register maps | text |
| `abc` | musical notation | text |
| `plantuml` (`puml`) | the full UML set (use-case, component, deployment, timing, …) | text |
| `vega-lite` | statistical charts from a grammar-of-graphics spec | json |
| `chart` | Chart.js charts | json |

An application can configure another fence name and drawing library.

## UML specifically

Mermaid covers most of UML directly:

| Diagram | Mermaid keyword |
| ------- | --------------- |
| Class | `classDiagram` |
| Sequence | `sequenceDiagram` |
| State | `stateDiagram-v2` |
| Entity relationship | `erDiagram` |
| Activity | `flowchart` / `graph` |

````carve
``` mermaid
sequenceDiagram
  participant U as User
  participant P as Parser
  U->>P: parse(source)
  P-->>U: Document
```
````

Use-case, component, deployment and timing diagrams are **not** covered by
Mermaid. For those, use the `plantuml` preset (also claimed as `puml`), which
carries the full UML set:

````carve
``` plantuml
@startuml
actor User
User --> (Parse source)
@enduml
```
````

## Generated HTML

Carve generates the HTML element shown below. The application must load the
library that replaces it with a finished diagram.

**Text mode** (Mermaid, D2, Graphviz, WaveDrom, ABC, PlantUML) escapes the body inside a
`<pre>`. Note that `&` and `<` are escaped but `>` is preserved, so arrow syntax
like `-->` survives intact:

```html
<pre class="mermaid" role="img" aria-label="mermaid">graph LR; A --&gt; B</pre>
```

**JSON mode** (Vega-Lite, Chart.js) emits the body verbatim inside a script tag:

```html
<div class="chart" role="img" aria-label="chart"><script type="application/json">{"type":"bar"}</script></div>
```

### Give a diagram a useful name

Add an `aria-label` when the fence word alone would not tell someone what the
diagram shows:

````carve
{aria-label="Deployment flow"}
``` mermaid
flowchart LR
  Build --> Test --> Deploy
```
````

In browser output, the generated element uses that label. Without one, the
extension uses its class word, such as `mermaid`, `graphviz`, or `plantuml`.
For text-based formats, the source remains in that labeled element until the
drawing library replaces it. To leave otherwise-unnamed fences without an image
role or default label, configure the extension with `label: ''`.

## Rendering without a browser

For PDF, email, or another output without browser JavaScript, select static mode
and pass a renderers map keyed by each fence's generated CSS class. A renderer
can return a self-contained `data:` image URI. If you sanitize the resulting
HTML, allow `data:` for images or the sanitizer will remove the diagram.

Working per-engine recipes are in
[Static Rendering Recipes](/static-rendering-recipes).

## Seeing it rendered

This page shows the source and generated HTML, not the drawn diagram. To see the
finished output:

- **[Playground](/playground)** - paste a `mermaid` fence and the browser draws
  the diagram.
- **[carve-pdf `03-math-diagrams.pdf`](https://github.com/markup-carve/carve-pdf/blob/master/examples/03-math-diagrams.pdf)** -
  a real PDF built from
  [`03-math-diagrams.crv`](https://github.com/markup-carve/carve-pdf/blob/master/examples/03-math-diagrams.crv),
  with Mermaid flowcharts, KaTeX math and a Chart.js chart all drawn at print
  time. Source and output side by side, for a target with no client-side
  JavaScript at view time.

## When a diagram cannot be drawn

The fallback depends on how the document is rendered:

- With the extension off, the fence is an ordinary code block.
- In browser output, text-based formats keep their source in the prepared,
  labeled element until a drawing library replaces it. JSON-based formats keep
  their data in the page, but no chart appears without the library.
- In static output, a fence with no configured renderer becomes a source code
  block. It has no image role or extension-supplied name, although attributes
  written by the author remain.

The diagram never disappears silently, and its source remains in the document.

See [Output without JavaScript](/graceful-degradation) for every output format.

## Enabling

`FencedRender` starts disabled. Enable it for a document or project, then choose
the drawing libraries you want. See [Optional Features and
Extensions](/extensions) and your implementation's extension documentation.
