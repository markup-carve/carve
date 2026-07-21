# Static Rendering Recipes

[Static render mode](/graceful-degradation) flattens interaction for free, but the
**client-rendered visuals** (mermaid, charts, math) need a build-time renderer -
a function you pass in the `renderers` map so the engine can embed a real image
instead of leaving raw source. The spec defines the contract; this page gives
tested recipes for the renderers themselves, which constructs to use, and the
one footgun that silently eats your images.

## The footgun: sanitizers strip `data:` image URIs

Build-time renderers usually return a self-contained `<img src="data:image/png;base64,...">`.
If you run the static HTML through an HTML sanitizer (HTML Purifier, DOMPurify,
etc.) **after** rendering, the default allowed-URI-scheme list is
`http`/`https`/`mailto` - so the `data:` image is **removed** and your diagram
silently vanishes (the caption survives, the picture does not).

When you sanitize static output, **allow the `data:` scheme for images**. It is
safe: a sanitizer's data-URI handler only permits image MIME types, not scripts.

- HTML Purifier (PHP): `$config->set('URI.AllowedSchemes', ['http'=>true,'https'=>true,'mailto'=>true,'data'=>true]);`
- DOMPurify (JS): `DOMPurify.sanitize(html, { ADD_DATA_URI_TAGS: ['img'] })` (or allow `data:` in `ALLOWED_URI_REGEXP`).

The alternative is to write the image to a file and reference it by path - but a
data URI keeps the output self-contained, which is the point of static mode.

## Choosing a renderer

| Construct | Recommended (local, no external service) | Quick (external service) |
| --- | --- | --- |
| Graphviz / DOT | the `dot` binary (`-Tsvg` / `-Tpng`) - **always prefer this** | - |
| Mermaid | `@mermaid-js/mermaid-cli` (`mmdc`); needs a headless browser | a self-hosted [kroki](https://kroki.io) |
| Charts | a chart library in a headless renderer, or pre-export | quickchart, kroki (vega/plantuml) |
| Math (HTML target) | **KaTeX / MathJax server-side -> MathML or SVG** | - |
| Math (PDF via dompdf) | MathJax -> SVG -> rasterize, or a PNG service | a LaTeX-to-PNG service |

Two rules of thumb:

- **Prefer local renderers.** `dot` and KaTeX/MathJax run in-process with no
  network. External services (kroki.io, codecogs) ship your document content to
  a third party - a privacy and abuse concern for any hosted/public tool. If you
  use kroki, **self-host it**; for math, prefer KaTeX over a public PNG service.
- **Match the target.** For static *HTML* (browser, email), KaTeX/MathJax SSR to
  **MathML or SVG** is crisp and accessible. For *PDF via dompdf*, MathML/CSS
  support is weak, so a rasterized image (MathJax SVG rendered to PNG, or a PNG
  service) is more reliable. There is a genuine quality-vs-toolchain trade here;
  the SVG path is the principled one, the raster path is the pragmatic one.

## Closure signatures per engine

The `renderers` map is **open**, keyed by the fence's css class (`mermaid`,
`chart`, `graphviz`, `plantuml`, `math`, or any custom fence word). The closure takes the source string and returns an HTML fragment (an
`<img>`, inline `<svg>`, or your fallback). Math additionally receives a display
flag where the engine exposes one.

- **carve-php:** `new CarveConverter(mode: RenderMode::STATIC, renderers: ['mermaid' => fn (string $src): string => ..., 'math' => fn (string $tex): string => ...])`
- **carve-js:** `renderHtml(doc, { mode: 'static', renderers: { mermaid: (src) => '...', math: (tex, display) => '...' } })`
- **carve-rs:** `Options::new().with_mode(Mode::Static).with_renderers(StaticRenderers { mermaid: Some(Box::new(|src| ...)), math: Some(Box::new(|tex, display| ...)), ..Default::default() })`
- **carve-py:** `carve.to_html(src, mode='static', renderers={'mermaid': lambda s: '...', 'math': lambda tex, display: '...'})`

In every engine, **if a needed renderer is absent the static path falls back to
source** - so a renderer is an enhancement, never a requirement.

## Recipes

### Graphviz (local `dot`) - the model recipe

`dot` is local, fast, and emits SVG (vector). This is the shape every renderer
should follow: render, embed, and **fall back to source on failure**.

```php
'graphviz' => function (string $src): string {
    $p = proc_open('dot -Tsvg', [0 => ['pipe','r'], 1 => ['pipe','w'], 2 => ['pipe','w']], $pipes);
    if (is_resource($p)) {
        fwrite($pipes[0], $src); fclose($pipes[0]);
        $svg = stream_get_contents($pipes[1]); fclose($pipes[1]); fclose($pipes[2]); proc_close($p);
        if ($svg) {
            // inline SVG (vector) for HTML; for dompdf, rasterize or use -Tpng instead
            return '<figure>' . $svg . '</figure>';
        }
    }
    return '<pre><code>' . htmlspecialchars($src) . '</code></pre>'; // source fallback
}
```

### Mermaid (local `mmdc`, preferred) or self-hosted kroki

`mmdc` (`@mermaid-js/mermaid-cli`) renders locally but pulls in a headless
browser. For a server without one, a **self-hosted** kroki instance is the
practical alternative (do not point a public tool at the hosted kroki.io with
user content).

```js
// carve-js, mermaid via a self-hosted kroki at $KROKI:
renderers: {
  mermaid: async () => { /* see note: the engine's renderers are sync; pre-render
    diagrams in a build step and inject the resulting <img>/<svg> string */ }
}
```

Renderers are synchronous in the engine. For an async tool (mmdc, an HTTP
service), **pre-render in your build step** - collect the diagram sources, render
them to images, and pass a map/closure that returns the already-rendered result.
Do not block the render call on network.

### Math: KaTeX server-side (HTML target)

For static HTML, KaTeX renders LaTeX to MathML/HTML in-process - crisp,
accessible, no external call:

```js
import katex from 'katex';
renderers: {
  math: (tex, display) => katex.renderToString(tex, { displayMode: display, output: 'mathml', throwOnError: false })
}
```

For **PDF via dompdf**, MathML/KaTeX-CSS does not lay out reliably; render with
MathJax to **SVG** and rasterize, or accept a PNG. Document this trade-off for
your users rather than assuming the HTML recipe works in print.

## A note on caching and load

Build-time renders are deterministic on their source, so **cache them keyed on a
hash of the source** (and cache the final artifact - PDF, page - too). For any
external service, cache **successful** renders only, so a transient failure
retries instead of caching a fallback, and the service is never hit twice for
the same input. This also bounds the load a public tool can put on an external
renderer.
