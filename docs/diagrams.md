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

The optional `FencedRender` extension recognizes these eight fence names and
generates an HTML element for the selected browser library.

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

### The marker is an image, and it is named

The body of a text-mode fence is diagram **source**. Before the client library
runs - and if it never runs, which is the default, since no engine ships one - a
reader announces the backslashes and arrows as prose; afterwards the injected
`<svg>` has no accessible name either. `role="img"` says the block IS an image
whether or not the script arrives, and the name says which one (carve#1468).

- **The role and the name travel together.** An `img` with no accessible name is
  skipped entirely, which is worse than the source being read out, so setting
  the label to the empty string removes the role as well.
- **The default is the extension's own class word** (`mermaid`, `d2`, `chart`).
  That is the fence's own word wherever a preset claims one language, and the
  class wherever it claims aliases: a `dot` fence and a `puml` fence are named
  `graphviz` and `plantuml`, after the class they render into, so one preset
  names every fence it claims alike. Either way the word is one the extension
  already carries rather than invented English - so there is nothing here to
  translate and this is an option on the extension rather than a `labels` key
  ([extensions §1.5](./extensions#_1-5-the-strings-an-extension-writes-itself)).
  A host that wants a reader to hear something better sets it, and an author can
  name one diagram with `{aria-label="Deploy flow"}` on the fence.
- **The author's own `role` or `aria-label` wins**, matched
  ASCII-case-insensitively because HTML attribute names are. An author who wrote
  only a name still gets the role - losing it there would leave the defect on
  the one fence whose author cared enough to name it.
- **The no-renderer static fallback is NOT named.** That path really is source
  text in a `<pre><code>`; calling it an image would hide the one thing it
  exists to show.

## Rendering without a browser

For PDF, email, or any output with no client-side JavaScript, `renderStatic`
accepts a **renderers** map. The standard keys are `mermaid`, `chart`,
`graphviz` and `math`; implementations must use exactly these names so one config
behaves identically across engines.

Renderers are synchronous (`source -> string`). An async tool such as `mmdc` or
an HTTP service must run in a build step and be supplied as a pre-resolved
lookup, not awaited inside the render. A renderer typically returns a
self-contained `data:` image URI, so if you sanitize the static HTML afterwards,
**allow the `data:` scheme for images** or the diagram is silently stripped.

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

When the extension is off, or no renderer is supplied for that key, the fence
falls back to its **source as a code block**. It never renders blank. The
diagram description stays readable in the document, which is the point of
keeping it as text in the first place.

See [Output without JavaScript](/graceful-degradation) for every output format.

## Enabling

`FencedRender` is an implementation-specific extension and starts disabled.
Enable it for a document or project; see the
[Optional Features and Extensions](/extensions) and each implementation's own
`docs/extensions.md` for the client libraries it pairs with.

This output is implementation-specific and is not part of the shared
input/output tests. An implementation can therefore update its supported
diagram libraries without changing the Carve specification.
