# Proposal: generic fenced-render factory

Status: **Draft / for review.** A Tier-3 extension spec. Not yet implemented.
Companion to [`docs/extensions.md`](../extensions.md) (the extension contract and
Tier taxonomy).

## Motivation

Carve renders exactly one fenced-language block specially today: `mermaid`
(`MermaidExtension` -> `<pre class="mermaid">...</pre>`, hydrated client-side by
Mermaid.js). Every other "special" rendering in Carve already follows the same
shape - emit a hint, let a client library hydrate:

- code highlighting: `<code class="language-X">` -> Prism / highlight.js
- math: `` $`x` `` / `` $$`x` `` -> `<span class="math inline">\(x\)</span>` /
  `\[x\]` -> KaTeX / MathJax
- diagrams: `` ```mermaid `` -> `<pre class="mermaid">` -> Mermaid.js

The wider ecosystem (MkDocs-Material, Docusaurus, Obsidian, Quarto) puts many
more tools behind a fenced block - D2, Graphviz/DOT, WaveDrom, Vega-Lite,
Chart.js, ABC music, GeoJSON. Almost all of them are the **same client-hydration
shape** Mermaid already uses; they differ only in the keyword, the wrapper
element, and whether the body is placed as text or as a JSON config.

Rather than add one extension per library, this proposal adds a single generic
client-rendered fenced-block factory that Mermaid becomes a preset of, covering
the whole text/JSON-hydration family in one unit.

It is Tier-3 (opt-in, never in the corpus), per the extension taxonomy in
`extensions.md` section 1.

---

## The fenced-render factory

### Concept

A configurable extension that claims fenced code blocks by language word and
emits a single hydration element. The block body is passed through verbatim (no
Carve parsing). Mermaid is one configuration of it.

### Configuration

| Option | Type | Default | Meaning |
|--------|------|---------|---------|
| `language` | string \| string[] | (required) | Fence info word(s) this instance claims. |
| `cssClass` | string | = first `language` | Class on the output element. |
| `tag` | `"pre"` \| `"div"` | `"pre"` | Wrapper element. |
| `contentMode` | `"text"` \| `"json"` | `"text"` | How the body is placed (see below). |
| `wrapInFigure` | bool | `false` | Wrap in `<figure class="{cssClass}-figure">` (mirrors current Mermaid option). |

### Behavior

- Claim a fenced code block iff its language equals one of `language`. Otherwise
  defer (the block renders as an ordinary `<pre><code class="language-...">`).
- `contentMode: "text"` (Mermaid, D2, Graphviz, WaveDrom, ABC):

  ````
  ``` d2
  a -> b
  ```
  ````
  ->
  ```html
  <pre class="d2">a -&gt; b</pre>
  ```
  Body is HTML-escaped text inside the element (identical to Mermaid today).

- `contentMode: "json"` (Vega-Lite, Chart.js - libraries that read a JSON
  config from a script tag):

  ````
  ``` vega-lite
  {"mark": "bar"}
  ```
  ````
  ->
  ```html
  <div class="vega-lite"><script type="application/json">{"mark": "bar"}</script></div>
  ```
  Body is emitted verbatim inside `<script type="application/json">`; `tag`
  defaults to `div` when `contentMode` is `json`. (Script-tag JSON is not
  HTML-escaped the way text is; `</script>` in the body is the one sequence that
  must be guarded - see Open Questions.)

- It is a renderer (emits structural tags), so it is active even under raw-HTML
  stripping, consistent with `MermaidExtension`.

### Mermaid becomes a preset

```js
// carve-js
mermaid()  ===  fencedRender({ language: 'mermaid', cssClass: 'mermaid' })
```

`MermaidExtension` / `mermaid()` is kept as a named alias for back-compat (no
behavior change; current Mermaid output is unchanged).

### Suggested presets to ship

Text mode: `d2`, `graphviz` (claims `dot` + `graphviz`), `wavedrom`, `abc`.
JSON mode: `vegaLite` (`vega-lite`), `chart` (Chart.js).

Each preset is a one-line `fencedRender({...})`. The factory itself covers the
long tail (any client lib) without new code.

### Per-impl shape

- **carve-js**: `fencedRender(opts): CarveExtension` returning a `blockRenderers`
  entry keyed on the code-block node, claiming by language.
- **carve-php**: `FencedRenderExtension` constructed with the options (mirrors
  `MermaidExtension`'s `on('render.code'...)` hook); presets as small factory
  methods or subclasses.
- **carve-rs**: a `FencedRender` struct + `FencedRenderOptions`, run as a
  `before_render` transform rewriting the matched code block into a `RawBlock`
  of the exact HTML (the Mermaid pattern - no child rendering needed since the
  body is verbatim, so no `RenderContext` changes are required, unlike the
  `details` extension).

### Conformance

Tier-3: not corpus-pinned. But for a fixed configuration the output MUST be
byte-identical across the three impls (the same parity bar Mermaid already
meets). Golden examples in this doc are the parity reference; per-impl unit
tests assert them.

## Cross-cutting

- **Contract**: a §2.3 renderer extension keyed on a fenced *code-block* node by
  language word. No parser/grammar change (no new syntax) - it reinterprets an
  existing code block.
- **Safe mode / profile**: it emits structural HTML like `MermaidExtension`;
  follow its existing safe-mode/profile behavior (do not bypass profile gating).
- **Round-trip** (`HtmlToCarve`): out of scope for v1. A rendered
  `<pre class="d2">` has no Carve-specific marker, so reversing it is a separate
  effort; note it, do not block on it.

## Golden outputs (parity reference)

````
INPUT                          OUTPUT
``` mermaid                    <pre class="mermaid">graph TD; A--&gt;B</pre>
graph TD; A-->B
```

``` d2                         <pre class="d2">a -&gt; b</pre>
a -> b
```

``` vega-lite                  <div class="vega-lite"><script type="application/json">{"mark":"bar"}</script></div>
{"mark":"bar"}
```
````

## Rollout

1. Land this spec (this PR).
2. carve-js: implement `fencedRender` + presets; re-express `mermaid()` as a
   preset (alias kept). Reference impl + goldens.
3. carve-php, carve-rs: port to byte parity (Mermaid pattern; rs via
   `before_render` -> `RawBlock`).
4. Add a `Fenced render` section to each repo's `docs/extensions.md` and to the
   Tier-3 catalog in this repo's `extensions.md`.

## Open questions (for review)

1. **Factory name**: `fencedRender` vs `clientBlock` vs `diagramBlock`?
2. **v1 scope of `contentMode`**: ship both `text` and `json`, or `text` only
   first (JSON/script-tag adds the `</script>`-guard edge case)?
3. **Preset list for v1**: which of `d2` / `graphviz` / `wavedrom` / `abc` /
   `vega-lite` / `chart` ship built-in vs left to the factory?
4. **Mermaid**: keep `MermaidExtension` as a permanent alias, or deprecate once
   the factory exists?
5. **Server-rendered libs** (PlantUML, Graphviz server, Ditaa): out of scope
   here (need a render callback / infra). Separate proposal, or fold a
   `render: (body) => html` callback into this factory later?
