# Proposal: generic fenced-render factory + `math` fenced block

Status: **Draft / for review.** Two Tier-3 extension specs. Not yet implemented.
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
Chart.js, ABC music, GeoJSON, and a GitHub-Flavored `math` block. Almost all of
them are the **same client-hydration shape** Mermaid already uses; they differ
only in the keyword, the wrapper element, and whether the body is placed as text
or as a JSON config.

Rather than add one extension per library, this proposal adds:

1. **A generic client-rendered fenced-block factory** that Mermaid becomes a
   preset of, covering the whole text/JSON-hydration family in one unit.
2. **A `math` fenced block** - the one genuine *syntax* gap vs GitHub-Flavored
   Markdown - reusing Carve's existing math output.

Both are Tier-3 (opt-in, never in the corpus), per the extension taxonomy in
`extensions.md` section 1.

---

## Part A: generic fenced-render factory

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

---

## Part B: `math` fenced block

### Concept

A fenced code block with language `math` renders as **display math**, matching
GitHub-Flavored Markdown and Pandoc. Carve already has inline `` $`x` `` and
display `` $$`x` `` math; this adds the block-fence form authors expect from GFM.

### Syntax and output

````
``` math
\int_0^1 x^2 \, dx
```
````
->
```html
<div class="math display">\[\int_0^1 x^2 \, dx\]</div>
```

- Output reuses Carve's existing math class + delimiters. Inline/display math
  today emit `<span class="math display">\[...\]</span>`; the fenced *block* form
  uses a block-level `<div>` with the same `math display` class so KaTeX /
  MathJax pick it up identically.
- The body is the raw fence content (LaTeX). It is HTML-escaped exactly the way
  the existing math renderer escapes its content (mirror that escaping for
  parity - do not invent a new rule).
- When the extension is not enabled, `` ```math `` is an ordinary code block
  (`<pre><code class="language-math">`), so documents stay readable.

### Tier vs core

Specced here as a Tier-3 opt-in (`mathBlock()`), consistent with "add via
extension." Because Carve already has math in core, it could instead **graduate
to core** (always-on, corpus-pinned) for full GFM parity. This is an Open
Question for review - the extension form is the safe default; promotion is a
one-line follow-up if desired.

### Per-impl shape

Same as a text-mode `fencedRender` but with a fixed wrapper/transform: claim
language `math`, emit `<div class="math display">\[BODY\]</div>`. Could even be
implemented as a `fencedRender` variant whose body is wrapped in the math
delimiters rather than placed raw - see Open Questions.

---

## Cross-cutting

- **Contract**: both are §2.3 renderer extensions keyed on a fenced *code-block*
  node by language word. No parser/grammar change (no new syntax) - they
  reinterpret an existing code block.
- **Safe mode / profile**: they emit structural HTML like `MermaidExtension`;
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

``` math                       <div class="math display">\[x^2\]</div>
x^2
```
````

## Rollout

1. Land this spec (this PR).
2. carve-js: implement `fencedRender` + presets + `mathBlock`; re-express
   `mermaid()` as a preset (alias kept). Reference impl + goldens.
3. carve-php, carve-rs: port to byte parity (Mermaid pattern; rs via
   `before_render` -> `RawBlock`).
4. Add a `Fenced render` + `math` section to each repo's `docs/extensions.md`
   and to the Tier-3 catalog in this repo's `extensions.md`.

## Open questions (for review)

1. **Factory name**: `fencedRender` vs `clientBlock` vs `diagramBlock`?
2. **v1 scope of `contentMode`**: ship both `text` and `json`, or `text` only
   first (JSON/script-tag adds the `</script>`-guard edge case)?
3. **Preset list for v1**: which of `d2` / `graphviz` / `wavedrom` / `abc` /
   `vega-lite` / `chart` ship built-in vs left to the factory?
4. **Mermaid**: keep `MermaidExtension` as a permanent alias, or deprecate once
   the factory exists?
5. **`math` block**: Tier-3 extension (proposed) or graduate to core for GFM
   parity?
6. **`math` impl**: standalone extension, or a `fencedRender` variant with a
   `wrap` option (`\[`...`\]`)?
7. **Server-rendered libs** (PlantUML, Graphviz server, Ditaa): out of scope
   here (need a render callback / infra). Separate proposal, or fold a
   `render: (body) => html` callback into this factory later?
