---
description: "The normative extension contract: the feature tiers, what each guarantees, and how a processor registers a handler."
---

# Carve extensions contract (NORMATIVE)

This document is normative. The conformance corpus (`tests/corpus`) remains the
authority for Tier-1 output; the optional Tier-2 corpus
(`tests/corpus-optional`) pins configuration-dependent outputs per feature id.
This document defines the feature taxonomy and the extension mechanism every
implementation realizes.

::: tip Hands-on
For a worked, end-to-end walkthrough of building a Tier-3 extension (a `qr`
fenced block, in both carve-js and carve-php), see
[Writing an extension: a QR-code case study](./extension-tutorial).
:::

## 1. Feature taxonomy

| Tier | Definition | Default | Conformance |
|------|------------|---------|-------------|
| 1&nbsp;·&nbsp;<Badge type="tip" text="core" /> | Normative syntax in `resources/grammar.ebnf` + the corpus; identical output everywhere. | Always on | Mandatory (corpus) |
| 2&nbsp;·&nbsp;<Badge type="info" text="standard" /> | Spec-listed behaviors every impl SHOULD offer but ship off/passthrough ("standard-recommended"). | Off / passthrough | Optional corpus when enabled |
| 3&nbsp;·&nbsp;<Badge type="warning" text="extension" /> | Not in the spec, not conformance-tested, may exist in one impl only (app extension). | Off | Never |

Invariant: a feature's tier is identical in every language; a Tier-1 feature is
core-and-default-on everywhere and its default output is corpus-pinned.

> The same split is described as MUST / SHOULD / MAY in
> [`native-features-analysis.md`](./native-features-analysis): **MUST** = Tier-1
> core (not disableable); **SHOULD** = Tier-1 default-on but a processor MAY
> turn it off (the four shorthands below); **MAY** = Tier-2 / Tier-3. Same model,
> two vocabularies.

### Feature tiers (quick reference)

The one place to answer "is feature X core or an extension?". "Disable?" is
whether a conformant processor may turn a default-on feature off (grammar
PART 9 §19); Tier-2 / Tier-3 are off until enabled.

| Feature | Tier | Default | Disable? |
|---|---|---|---|
| Headings, paragraphs, lists, task lists, blockquotes, thematic breaks | <Badge type="tip" text="core" /> | on | no |
| Tables (incl. rowspan/colspan/alignment), fenced code, inline code | <Badge type="tip" text="core" /> | on | no |
| Emphasis family (bare `/` `*` `_` `~` `=`; sup/sub braced-only `{^ ^}` / `{, ,}`), links, images, `<…>` autolinks | <Badge type="tip" text="core" /> | on | no |
| Attributes `{.class #id k=v}`, generic divs / spans, captions / figures | <Badge type="tip" text="core" /> | on | no |
| Admonitions (8 canonical types), definition lists, verse `::: \|` | <Badge type="tip" text="core" /> | on | no |
| Math `$…$` / `$$…$$`, footnotes `[^id]` + inline `^[…]`, abbreviations | <Badge type="tip" text="core" /> | on | no |
| Cross-references `</#id>` + numbered cross-refs, editorial / critic markup | <Badge type="tip" text="core" /> | on | no |
| Frontmatter, comments, raw blocks / inline `=format` | <Badge type="tip" text="core" /> | on | no |
| The extension **syntax** `:name[…]` (inline) and `::: name` (block) | <Badge type="tip" text="core" /> | on | no — the *handlers* are Tier-2/3 |
| Smart typography, `@mention`, `#tag`, `:symbol:` parsing | <Badge type="tip" text="core" /> | on | **yes** (§19) |
| Citations `[@key]`, bare-URL autolinking, code callouts `<n>` | <Badge type="info" text="standard" /> | off | — |
| Mention/tag → URL templates, symbol map (e.g. emoji glyphs), locale smart-quote sets | <Badge type="info" text="standard" /> | off | — |
| ListTable (§5), Details, Spoiler, Tabs — shipped in all three engines and pinned in `tests/corpus-optional` | <Badge type="info" text="standard" /> | off | — |
| Mermaid / FencedRender, MathBlock, Glossary, Index, HeadingNumbers, CodeGroup | <Badge type="warning" text="extension" /> | off | — |
| Bibliography (§6) — an **option on Citations**, not a separate registration: the host passes a CSL-JSON pool to the Citations extension | <Badge type="warning" text="extension" /> | off | — |
| TableOfContents and TocPlacement (§8b.1 - the injector and the `::: toc` directive; not interchangeable), HeadingPermalinks / LevelShift, ExternalLinks, Wikilinks and HeadingReference (§12), ColorSwatch, Lowercase/AsciiHeadingIds | <Badge type="warning" text="extension" /> | off | — |
| Semantic span attributes — `[x]{kbd}`, `[HTML]{abbr="…"}`, `[now]{time="…"}` (three names; PART 9 §9) | <Badge type="tip" text="core" /> | on | no |
| SemanticSpan — the four names core does not reserve (`samp`, `var`, `cite`, `dfn`), plus the soft-deprecated `:name[…]` spelling for all seven | <Badge type="info" text="standard" /> | off | — |
| [ImgFence](/svg-images) (sanitized SVG `img` fence — sandboxed by default) | <Badge type="warning" text="extension" /> | off | — |

A `:name[…]` / `::: name` whose word has no registered handler renders via the
generic fallback (`<span>` / `<div class="name">`), so a document using an
unknown extension word still parses and stays readable — only its *rendering*
differs by processor. The narrative below details each tier.

- Tier 1: corpus categories 01–88 (admonitions, footnotes, cross-references,
  list-item attributes, `::: |` verse, `<…>` autolinks, the
  `:name[…]` / `::: name` extension syntax). Recognized `:::` type words
  (the eight admonitions + `line-block`) are cataloged in [`examples/extensions.md`](/examples/extensions). Smart
  typography and `@mention` / `#tag` / `:symbol:` parsing are also default-on and
  corpus-pinned, but per grammar PART 9 §19 a processor MAY disable them.
- Tier 2: configuration over Tier-1 syntax — mention/tag→URL, symbol map (e.g. emoji glyphs),
  locale smart-quote sets, bare-URL autolinking, citations (§4), code
  callouts (`<n>` markers inside fenced code + a bound explanation list; §10),
  and SemanticSpan (§11: the four names core does not reserve, plus the
  soft-deprecated `:name[…]` spelling for all seven) —
  plus four block features that ship in carve-js, carve-php and carve-rs and
  carry pinned cases in `tests/corpus-optional`: ListTable (a `::: list-table`
  div whose nested list renders as a real HTML `<table>`, so cells can hold
  block content the pipe-table syntax cannot; `{header-rows}` /
  `{header-cols}` take a count or the boolean first-row/column form, and `^` /
  `<` give pipe-table-parity rowspan / colspan; §5), Details, Spoiler and Tabs.
  Being off by default is what Tier-2 means; it is the cross-engine pin that
  separates them from Tier 3.

  `Details` is a pure renderer extension over the existing `:::details`
  admonition (no new syntax): it emits the HTML5 `<details>/<summary>`
  disclosure widget instead of the default `<div class="details">`. The
  **quoted** title becomes the `<summary>` (a title-less block falls back to
  `<summary>Details</summary>`); `{open}` on the opener carries through as the
  `open` attribute (`<details open="">` interactive, `<details open>` static).
  Disabled, the block renders as the ordinary admonition
  div, so documents stay readable. See the per-impl `docs/extensions.md` in
  carve-js / carve-php / carve-rs.

  `Spoiler` is the standard hidden-content role from the Extension Registry, with
  no new syntax. Inline `:spoiler[text]` → `<span class="spoiler">text</span>`;
  block `::: spoiler "Title"` → an HTML5 `<details class="spoiler">` disclosure
  (native, keyboard- and screen-reader-accessible), defaulting to
  `<summary>Spoiler</summary>` when title-less. Without the extension the inline
  form stays the generic `<span class="ext-spoiler">` and the block stays a
  plain `<div class="spoiler">`, so documents remain readable. Carve emits only
  the marker; the blur + reveal is the host's CSS. Author attributes merge onto
  the output element (the `spoiler` base class ahead of author classes) with the
  always-on attribute hardening. In carve-php / carve-js / carve-rs.

- Tier 3 (non-exhaustive): FencedRender (a generic fenced-code-block factory
  with Mermaid, D2, Graphviz, WaveDrom, ABC, PlantUML, Vega-Lite and Chart.js presets),
  MathBlock (a ` ```math ` fenced block →
  `<div class="math display">`, the GFM-style block form of Carve's `$…$`
  math), Bibliography (a reference list rendered from citation
  keys (§4) resolved against an external CSL-JSON source named in front-matter,
  reusing the `::: references` placeholder with mandated numeric output and
  back-links; §6), Glossary (a `::: glossary` definition list whose terms become
  `<dt id="gloss-{slug}">` entries that `:term[word]` links to; §7), Index
  (invisible `:index[term]` markers collected into a sorted `::: index` list
  with back-links to every occurrence; §8),
  CodeGroup, TableOfContents,
  HeadingPermalinks,
  HeadingNumbers (auto-number sections - `<span class="section-number">1.2</span>`
  on each heading - and rewrite auto-filled `</#id>` cross-references to
  "Section 1.2 - Title"; opt-in, no new syntax; §9),
  HeadingLevelShift, ExternalLinks, DefaultAttributes, Wikilinks,
  ColorSwatch (inline `:color[value]` -> a validated color chip; carve-php,
  carve-js and carve-rs — see the [extension tutorial](./extension-tutorial)),
  and the opt-in heading-id transforms (LowercaseHeadingIds, AsciiHeadingIds).

  `FencedRender` is the generic form of the Mermaid pattern: one configurable
  renderer claims fenced code blocks by language word and emits a single
  client-hydration element. In **text** mode (Mermaid, D2, Graphviz, WaveDrom,
  ABC, PlantUML) the body is HTML-escaped inside `<pre class="lang">…</pre>`, with `&` and
  `<` escaped but `>` preserved so arrow syntax (`-->`) survives; in **json**
  mode (Vega-Lite, Chart.js) the body is emitted verbatim inside
  `<div class="lang"><script type="application/json">…</script></div>`. The eight
  named presets are one-liners, and any other client-rendered language needs no
  new code - just a new instance with its fence word. Carve only emits the
  marker element; loading the client library and hydrating it is the host's job.
  Mermaid is one preset of this shape. In carve-php / carve-js / carve-rs; see
  each impl's `docs/extensions.md` for the per-language client libraries.

  Note: json mode emits a `<script type="application/json">`. Because an HTML
  parser ends *script data* on the literal `</script>` regardless of the
  script's MIME type, a json-mode renderer **MUST** neutralize script-data
  terminators in the body (rewrite `</` so `</script>`, `<!--`, and `<script`
  cannot break out) before emitting -- a Tier-3 requirement mirroring the core
  attribute hardening (grammar PART 9 §25). Even then, an HTML
  sanitizer run *after* conversion usually strips the whole element. Every json-mode type has a
  non-script alternative: render that same language in **text mode** instead, so
  the config rides in a `<pre class="lang">` as escaped text and survives
  sanitizing (the host reads it from `textContent` rather than a script tag).
  So `vega-lite`, `chart`, etc. each work either way - json mode for a direct
  `<script>` config, or text mode for a sanitizer-safe `<pre>`. Consumers that
  keep json mode should whitelist `<script type="application/json">`.

  `MathBlock` renders a ` ```math ` fence as
  `<div class="math display">\[ … \]</div>` (body HTML-escaped). A preceding
  `{#id .class key=val}` block-attribute line merges onto the div exactly as
  core display `$$` math carries its attributes - the `math display` base class
  ahead of author classes, then id and other attributes. Those attributes get
  the same always-on hardening every element gets (event handlers `on*`,
  `srcdoc`, `formaction` stripped; dangerous URL / `expression()` values
  neutralized), so a `{onclick="…"}` on the fence can never reach the output.
  Because MathBlock mirrors each implementation's own core `$$` math, the
  attribute **order** follows core math per impl: carve-php and carve-rs emit
  the class first, carve-js emits attributes in author source order. (This is a
  pre-existing core-math divergence, not specific to MathBlock; the no-attribute
  output is identical everywhere.)

Footnotes are **not** Tier 3. Reference footnotes `[^id]` and inline footnotes
`^[content]` are both implemented Tier-1 core (`resources/grammar.ebnf` PART 9
§16), and they are the only note forms. The once-proposed **sidenote** form
`[>content]` was dismissed rather than deferred: margin placement is CSS over
the existing footnote output, so `[>` stays unclaimed and `[>foo]` is literal
text (see [dismissed syntax](./dismissed-syntax)). The djot-php
`[…]{.fn}` form maps onto carve's inline `^[content]`; see
`native-features-analysis.md`.

### 1.5 The strings an extension writes itself

Almost every string in the output is the author's. This section is about the
remainder: the words an **extension** writes on its own, where the author has
no place to spell them - a tab set's group name, an index back-link's leading
words. PART 9 §16a governs the same question for core, and its rule binds here:

> An extension MAY read the map for a string it shares with core; it MUST NOT
> require the host to configure the same text twice.

**One `labels` map localizes a whole document.** Every extension-written string
that has a fixed English default has a key in the render's `labels` map, and the
extension reads it. A host translating a document sets `labels` **once**:

```js
carveToHtml(src, {
  labels: {
    footnoteBacklink: 'Zurück zur Referenz',
    endnotes: 'Fußnoten',
    indexBackref: 'Zurück zu',
    tabsGroup: 'Registerkarten',
    codeGroup: 'Codebeispiele',
  },
  extensions: [index(), tabs(), codeGroup()],
})
```

**Precedence: the author's attribute, then the extension's own option, then the
map, then the default.** An option passed to an extension wins over the map for
every node that extension renders, so a host can override one string without
restating the rest. Naming two tab sets on one page apart is the AUTHOR's job,
not a second registration: an `aria-label` written on the set wins over both the
option and the map, because a name the author wrote is already in the document's
language.

| Key | Default | Written by |
|-----|---------|-----------|
| `indexBackref` | `Back to` | Index (§8.2) |
| `tabsGroup` | `Tabs` | Tabs (§13.4) |
| `codeGroup` | `Code examples` | CodeGroup (§13.4) |

**What does NOT get a key.** A string with no fixed English default is not in
the map, because there is nothing to translate: a diagram fence's name defaults
to the *extension's own class word* (`mermaid`, `d2`, and `graphviz` for the
`dot` fence it claims), so it stays an option on the extension. Neither is a string the author already wrote - a tab's `[label]`, which
also names its panel (§13.2), an
index term, an admonition title. Those are named by DERIVING from the document,
so a translated document translates them exactly once, in the document.

**Why this is not localization.** There is no locale name and no built-in
translation table, for the reason §16a gives: a locale table is data every
engine would then carry and keep current, and a host that needs translated
strings already has a catalog. The map is the seam to that catalog.

**An import does not turn one of these strings back into source.** Whether an
extension DERIVED the name from the document - a panel's tab label, a diagram
fence's `aria-label` defaulting to its own class word - or read it from this
map, the engine wrote it, so an HTML importer drops an attribute whose value
equals what the renderer derives and keeps every other one (PART 9 §16a, and
[HTML import](./html-import#a-derived-attribute-does-not-come-back)). Keeping it
would make a generated string indistinguishable from an authored one, and the
author-wins precedence above would then let the imported copy outrank the map on
every later render.

## 2. Extension system

An extension is a named unit contributing any subset of four things, run as:

    parse (core + extension MATCHERS)
      → afterParse TRANSFORM → beforeRender TRANSFORM
      → render (core + extension RENDERERS)

### 2.1 Matchers (parse stage) — scanner-function contract

- inline: `(text, pos, ctx) -> { node, end } | null`
- block:  `(lines, ctx) -> { node, linesConsumed } | null`
- `ctx` exposes: definition tables (link/footnote/abbr); recursive
  `parseInlines(text)` / `parseBlocks(lines)`; the extension's config.
- Precedence: core matchers run first at each position; extension matchers are
  tried only where core does not consume (extensions add syntax, never hijack
  core). Extension matchers run in registration order; optional integer priority
  is the escape hatch.
- **A matcher MUST be pure** (normative, grammar PART 9R R1a): no observable side
  effects, and the same answer for the same `(lines, position, ctx)`. A processor
  MAY call it speculatively, more than once at one position, and discard the
  result - core parsing already does when a matcher reports a consumption the
  parser rejects, and the definition pre-passes ask the block reader (which runs
  matchers) before they may cut a definition out of a line. Allocate ids, count
  occurrences or record state in `afterParse` / `beforeRender`, which run once
  over the finished document - never in a matcher.
- **A matcher's coordinates are LOCAL, not absolute** (normative, grammar
  PART 9R R1b). The `lines` array a matcher receives MAY begin at a container's
  content rather than at the document, re-based so index 0 is that first line,
  and `position` is an index into the array given. A matcher whose answer
  depends on where it sits in the whole document, or on lines outside the array
  it was handed, is not conforming.

  This is not a probe caveat. Every container that recurses passes its body
  down re-based, so a matcher inside a list item, a block quote or a `:::`
  container already sees a fragment; the definition pre-pass is one caller of
  that path, not the origin of it. Measured on all three engines, a five-line
  document whose list item holds two lines calls the matcher with a two-line
  array at index 0, then with the whole document at index 3.

  The consequence worth naming: **the same `(lines, position)` pair can occur
  twice for different lines.** A footnote definition produces `position = 0`
  against the whole document and `position = 0` again against a two-line
  fragment. A matcher keying on `position == 0` to mean "start of document" is
  answering a question the parser never asked it - purity above says the same
  arguments give the same answer, and this clause says which arguments those
  are.

### 2.2 Transforms

- afterParse `(Document) -> Document` (collection/inspection)
- beforeRender `(Document, BeforeRenderContext) -> Document` (mutation)
- Every extension's afterParse runs before any extension's beforeRender; within a
  phase, registration order.

#### The beforeRender context

`beforeRender` runs before the render starts, so a hook that produces output of
its own has nothing to inherit: with the document alone in hand it renders with
DEFAULTS. The table-of-contents extension is the case that shows it, because it
builds its `<nav>` in exactly that hook - the entry and the heading it was cloned
from disagree whenever a render option reaches inline rendering. Given

```
{#h}
# :ok: h
```

and a symbols map of `ok` to `OK`, a hook rendering with defaults produces

```html
<nav class="toc">
<ul>
<li><a href="#h">:ok: h</a></li>
</ul>
</nav>
<section id="h">
  <h1>OK h</h1>
</section>
```

The context is what the hook inherits instead. It carries:

- **the render options** the conversion was called with, so a hook that renders
  something renders it the way the caller asked;
- **the effective mode** for the target format. It is `"interactive"` for the
  Markdown, plain-text and ANSI renderers whatever the caller passed, because
  static rendering is an HTML-only concern (§2.5): a caller reusing one set of
  options across formats gets unchanged non-HTML output;
- **whether the final target is HTML**. An extension that emits HTML in this hook
  reads this to skip its transform on a non-HTML target and leave the source node
  for that renderer to emit as source.

The context is **READ-ONLY**, and that is part of the contract rather than an
implementation detail. A hook must not be able to talk the renderer out of the
caller's own hardening: the guard that reads an option runs after the hooks, so a
hook handed the live options could clear the very field that guard measures.
carve-rs met that shape from the other side - its `max_length` cap sat behind
these hooks, and because the hook took the document by value a hook could empty
the field the cap measured. An implementation therefore passes a value the hook
cannot write back through: a frozen copy that is not the object the renderer is
handed, or an immutable reference. Where a nested value is the caller's own
object, read-only remains the contract even where the language cannot enforce it
past the first level.

The spelling is implementation-idiomatic (accessor methods in carve-rs and
carve-php, readonly properties in carve-js); what an implementation MUST carry is
the three items above. `afterParse` takes no context: it runs before rendering is
a question at all.

### 2.3 Renderers

- Registered per node type / extension name; receive the node, emit
  implementation-specific output. Renderers are the impl-idiomatic half; matchers
  and transforms are the portable contract.

### 2.4 Registration & config

- Impl-idiomatic (PHP `addExtension`/ctor; JS `extensions: [...]` option),
  declaring the same lifecycle contributions.

### 2.5 Static rendering mode (`renderStatic`)

A render carries a **mode** - a render option, not document syntax:

- `"interactive"` (default) - online HTML; extensions render their interactive
  form (live tabs, mermaid via a client script, KaTeX).
- `"static"` - HTML for a medium that cannot interact or run client scripts
  (print, PDF source, archival HTML). The mode is an HTML concern: the Markdown,
  plain-text and ANSI renderers ignore it, reaching the same end by flattening
  (see the end of this section), so their output does not vary with it and the
  effective mode a `beforeRender` context reports on those targets is
  `"interactive"` whatever the caller passed (§2.2).

`"print"`, `"email"`, and similar names are **reserved** for future named
presets; an implementation MUST reject an unknown mode value rather than guess.
Omitting the mode means `"interactive"`, so existing callers are unaffected.

In `"static"` HTML an extension renders through an optional
`renderStatic(node, ctx)` hook. Per node, the resolution order is:

1. the extension's `renderStatic`, if defined;
2. else the extension's ordinary renderer (correct for extensions that are
   already static - list-table, citations, heading-permalinks - which need no
   `renderStatic`);
3. else, for a container whose grouping `[label]` no extension consumed, the
   core caption floor (see [Graceful Degradation](/graceful-degradation)).

No construct falls through to "dropped": every authored token reaches at least
the floor. `renderStatic` MUST preserve all content and MAY drop only
interaction.

An extension whose **interactive output depends on a client script** (tabs,
code-group, spoiler, fenced-render, math, and any future carousel/embed) MUST
implement `renderStatic` - otherwise step 2 falls back to its script-dependent
interactive output, which is silently broken in a `static` render. An engine
SHOULD warn when such an extension is registered without a `renderStatic`, and
`carve lint` MAY flag it. (Extensions whose ordinary output is already static -
list-table, citations, heading-permalinks - are exempt; they have no script to
lose.)

Expected static output per interactive extension:

| Extension | `renderStatic` output |
| --- | --- |
| tabs / code-group | each panel as a `<section>` headed by its `[label]` |
| details | not a `renderStatic` case - emits a native `<details open>` in static (see [Graceful Degradation](/graceful-degradation)); interactive without scripts, so never flattened |
| spoiler | the revealed content (no blur) |
| fenced-render (mermaid, chart, graphviz, plantuml, custom) | a build-rendered image if a renderer keyed by the fence's css class is supplied, else the source as a code block |
| math (display / inline) | server-side output (MathML/HTML) if a renderer is supplied, else the source |

Client-script extensions cannot produce their image inside the engine. A
`"static"` render therefore accepts a **renderers** map. The map is **open**: a
diagram renderer is keyed by the **fence's css class** - `mermaid`, `chart`,
`graphviz`, `plantuml`, or any custom fence word - so a custom `FencedRender`
instance is static-capable with no change to the engine, no spec edit, and no
lockstep. `math` is the one distinct key (its renderer also takes a display
flag). Implementations MUST consult the renderer by css class and MUST fall back
to source when the needed renderer is absent - never blank.

A supplied diagram renderer's output MUST be wrapped in a single
`<div>` carrying the fence's **merged attributes** - the css class ahead of any
author `{#id .class data-*}` - so the wrapper is uniform across engines and the
class survives for styling:

```html
<div class="mermaid"><!-- renderer output (svg / img) --></div>
```

The wrapper is a `<div>`, not the interactive hydration tag (`<pre>` for text
mode, `<div>` for json), because the rendered output is an image, not source
text. The source-fallback form (no renderer) stays a `<pre><code>` block.
(Attribute ordering within the tag follows the engine's element serialization,
PART 10.)

> [!NOTE]
> The map was **closed** in earlier drafts (a fixed `{mermaid, chart, graphviz,
> plantuml, math}` set); it is now **open** so third-party diagram libraries are
> first-class. A custom fence word (`fencedRender({ language: 'myuml' })` +
> `renderers: { myuml: … }`) renders statically in every engine with the same
> config, exactly like a canonical preset - the portability the canonical set
> alone could not give. Canonical presets are just the pre-named css classes;
> they carry no privilege the map withholds from a custom one.

Renderers are **synchronous** (`source -> string`; `math` also takes a
display flag): an async tool (mmdc, an HTTP service) must be run in a build step
and supplied as a pre-resolved lookup, not awaited inside the render. Renderers
apply to the **static HTML** path only - the Markdown/plain/ANSI renderers keep
client-script blocks as source regardless.
A renderer typically returns a self-contained `data:` image URI; if you sanitize
the static HTML afterwards, **allow the `data:` scheme for images** or the image
is silently stripped. Concrete, tested renderer recipes (graphviz/mermaid/math,
per engine) are in [Static Rendering Recipes](/static-rendering-recipes).

`renderStatic` is the HTML-static path only. The Markdown, plain-text, and ANSI
renderers reach the same end by flattening containers and keeping client-script
blocks as source; they do not call `renderStatic`.

Parity: for a given `(input, mode, renderers)` the implementations MUST produce
the same output - a static-mode parity battery, mirroring the profile fixtures.

### 2.6 Generated ids share the document id namespace

Extensions that mint DOM ids - tabs (`tabset-N`, `tabset-N-tab-M`,
`tabset-N-panel-M`), code groups (the `codegroup-N` family), citations
(`cite-{key}-{n}` back-link anchors, `ref-{key}` entries), and any future
generator - MUST reserve those ids in the same document id namespace as
explicit `{#id}` attributes and generated heading ids, and MUST deduplicate
against it with the mechanism headings use: the first use keeps the base name,
each collision takes the next free numeric suffix (`base-2`, `base-3`),
skipping candidates that are already reserved
([syntax.md 4.1, identifier step 7](/case-study/syntax#_4-1-document-structure);
`grammar.ebnf` PART 9 §13).

Both collision directions are covered: an explicit `{#tabset-1}` anywhere in
the document reserves the name before generation (the first tab set is bumped),
and a heading such as `# tabset 1` or `# cite foo 1` competes in document order
like any other generated id. Without this rule a duplicate DOM id is invalid
HTML and `label for=` / `getElementById` / anchor navigation silently resolve
to the first occurrence, breaking either the anchor or the widget wiring.
Implementations MUST agree here or cross-implementation anchors drift.

## 3. Home, conformance, per-impl

- This document is the normative home for the taxonomy + contract.
- syntax.md §4.20 is the non-normative narrative.
- Conformance: Tier-1 = existing corpus (mandatory); Tier-2 =
  `tests/corpus-optional` + `manifest.json`, run per enabled feature; Tier-3 =
  never in any corpus.
- A Tier-2 case pins the HTML target unless its manifest entry names another
  `target` (`markdown`, `plain`, `ansi`), in which case the expected file
  carries that target's extension. See
  [`tests/corpus-optional/README.md`](https://github.com/markup-carve/carve/blob/main/tests/corpus-optional/README.md).
  Carve-source expectations are not a target here; they live in
  `tests/corpus-roundtrip`.

## 4. Citations (Tier-2)

Bibliographic references (issue #90). Off by default; enable per processor.
Grammar: `resources/grammar.ebnf` PART 9 §22. Narrative: `case-study/syntax.md`.

### 4.1 Syntax

- A tail-less `[...]` whose content contains a `@key` is a citation group. A
  bare `@key` stays a core mention; `\@` is literal.
- Disambiguation against the inline grammar is by the character after `]`:
  `(` is a link, `[` a reference link, `{` a span. Only a bracket with none of
  those tails is claimed. This is exactly the gap core leaves (core declines
  tail-less brackets), so citations never hijack core syntax.
- Items are `;`-separated; each is `[prefix] [-] @key [, locator]`. The leading
  `-` suppresses the author in author-date mode (per item).
- A single leading `+` immediately after `[` marks the whole cluster as
  **integral** (author-in-text): `[+@smith2020]`, `[+see @smith2020, p. 12]`.
  Mode is a group property - there is no per-item integral flag. Vocabulary
  matches CSL / Citum `CitationMode` (`integral` / `non-integral`).
- Definitions are in-document, one per line, footnote-style:
  `[@key]: {author= year=}? entry`. The optional `{author= year=}` feeds
  author-date output; its quotes may be straight or smart (the typographic
  pass runs over entry prose). A leading `@` label is reserved from reference
  definitions in core (parallels `[^...]:` precedence).

### 4.2 Typed Locators

The locator text after the first `,` in an item is parsed into a structured
`{label, value}` pair plus a trailing suffix, so a host CSL processor receives
the same data it would from Pandoc.

**Matching rules:**

- Canonical labels (longest-match, boundary rule - a term matches only when
  followed by end-of-locator, whitespace, a digit, `§`, or `¶`):

  | Label | Abbreviations |
  |---|---|
  | book | bk. |
  | chapter | chap., chaps. |
  | column | |
  | figure | |
  | folio | |
  | issue | no. |
  | line | l., ll. |
  | note | n., nn. |
  | opus | |
  | page | p., pp. |
  | paragraph | para., ¶ |
  | part | |
  | section | sec., § |
  | sub verbo | s.v. |
  | verse | v., vv. |
  | volume | vol. |

- A leading digit with no preceding label defaults to `page`.
- The value runs to end-of-locator or the next `;`; trailing `,`, `&`, `-`,
  `.` are trimmed. The remainder (after the value) is the **suffix**.
- An unrecognized locator string is emitted as-is (no label, no value split).

### 4.3 Lifecycle

- **Matcher** (inline): claims `[...@key...]` per the rule above, producing a
  `citation-group` node carrying its verbatim `raw` source and the parsed
  integral flag, suppress-author flags, prefixes, locator labels/values, and
  suffixes.
- **afterParse**: collects and removes `[@key]:` definition lines; resets
  per-document state so a reused extension instance does not leak across runs.
- **beforeRender**: numbers cited+defined keys in first-citation order and
  places the references list - into an explicit `::: references` div/admonition
  if present, else appended at document end.
- **Renderers**: an inline renderer for `citation-group` (numbered `[1]` or
  author-date `(Author Year)`) and a block renderer that emits the references
  list (`<ol class="references">` numbered, sorted `<ul class="references">`
  author-date).

### 4.4 HTML data-\* contract

Each rendered citation anchor carries the following `data-*` attributes, in
canonical order, emitting only the attributes that apply for the item:

| Attribute | Value |
|---|---|
| `data-cite-key` | the citation key |
| `data-suppress-author` | `"true"` when `-` was present |
| `data-cite-prefix` | flattened plain-text prefix (when present) |
| `data-locator-label` | parsed label name (when a label was matched) |
| `data-locator` | parsed locator value (when present) |
| `data-suffix` | flattened plain-text suffix (when present) |

An integral cluster wraps all its items in:

```html
<span class="citation" data-cite-mode="integral">…</span>
```

### 4.5 Conformance (pinned in `tests/corpus-optional`)

- `citations-numbered`, `citations-author-date`: the base forms, the references
  list, and the `{author= year=}` author-date path (corpus cases 05-06).
- Failure modes are pinned too: a group with any undefined key renders verbatim;
  `[@k]{...}` is a span, not a citation; a `;` inside a locator falls back to
  literal text (cases 07-09).
- **Enrichment** (cases 13-24): typed locators (label match, boundary rule,
  default-page, value trim, suffix), integral cluster marker (`[+@key]`),
  per-item suppress-author, group-marker disambiguation vs. per-item flags,
  and trailing-comma edge case.

### 4.6 Undefined (impls MAY differ; NOT corpus-pinned)

- Same-author-year disambiguation letters (`2020a` / `2020b`) are out of scope
  for v1; the bare year is emitted.
- An uncited-but-defined entry is dropped from the references list (no
  `nocite`-style force-include).
- External bibliographies are handled by the Bibliography extension (§6, CSL-JSON
  via front-matter); `.bib` ingestion and narrative form remain out of scope.

## 5. ListTable (Tier-2)

Tables whose cells hold block content (multiple paragraphs, lists, code), which
pipe tables cannot express (issue #162). A `::: list-table` div whose body is a
nested list renders as a real HTML `<table>`. Shipped in carve-js, carve-php,
and carve-rs; off by default, enable per processor.

### 5.1 Syntax

- The block type word is `list-table`. A quoted title on the opener
  (`::: list-table "Quarterly"`) becomes the `<caption>` (the same title parse
  admonitions use; a bare unquoted title is invalid, per the strict `:::` rule).
- The body is a single nested list: each outer item is a row, each inner item is
  a cell, left to right. Because cells are list items, they hold full block
  content for free.
- `{header-rows=N}` / `{header-cols=N}` on the preceding attribute line promote
  the first N rows to `<thead>`/`<th>` and the first N cells of every row to
  row-header `<th>` (default 0).
- `{footer-rows=N}` makes the final N rows a table foot. Header and footer
  counts together may not exceed the row count.
- A boolean `{header-row}` attribute abutting the first inner cell marker
  (`- -{header-row} Cell`) starts a body group whose leading marked rows are column
  headers. The marker travels with the row, so inserting rows cannot silently
  retarget it. Consecutive marked rows form one group's header; a later marked
  row starts the next `<tbody>`.
- A boolean `{header}` on an inner cell marker (`  -{header} Cell`)
  promotes that individual cell to `<th>`. A body-row header defaults to
  `scope="row"`; a cell in a header row defaults to `scope="col"`.
- `{aligns="left,right"}`, `{valigns="top,bottom"}`, and `{widths="30,70"}`
  use the same positional,
  comma-separated column lists as core pipe tables. Empty entries are unset;
  too many entries is an error, while a short list renders with an unset tail
  and produces a lint diagnostic. Widths are percentages in source and
  fractional values in the exchange AST.
- A cell marker may carry `align=left|right|center` and/or
  `valign=top|middle|bottom` (for example,
  `-{align=center valign=middle} Cell`). Each cell value overrides the matching
  positional column value independently and is consumed rather than emitted as
  a legacy HTML attribute.
- Spans reuse the pipe-table span markers: a cell whose sole content is a lone
  `^` merges with the cell above (rowspan); a lone `<` merges with the cell to
  the left (colspan); continuation-style (`colspan=3` is two `<`, `rowspan=N` is
  N-1 `^`). A cell carrying its own attributes, or an escaped marker (`\^`), is
  literal and never a span marker.

### 5.2 Rendering

- A single-paragraph cell collapses to inline content (`<td>text</td>`); a
  multi-block cell keeps its `<p>`/`<ul>`/... wrappers.
- Ragged rows pad with empty `<td>` to the widest effective row (spans counted).
- A rowspan is clamped at the `<thead>`/`<tbody>` boundary - a header-row span
  does not reach into the body; the same clamp applies at the `<tbody>`/`<tfoot>`
  boundary (HTML cannot reliably span across row groups).
- A cell's own list-item attributes carry onto its `<td>`/`<th>`; a computed
  `rowspan`/`colspan` wins over an author-written one.
- The `<table>` output matches the equivalent pipe table's span markup.
- A foot renders as `<tfoot>` and maps to `rowGroups.footRows` in the exchange
  AST. Intermediate marked headers map to `rowGroups.bodies[].headRows`, and
  explicitly marked cells map to `table_cell.header`. Column alignment resolves into cell styles and
  widths render through `<colgroup>`/`<col>` before the row groups.
- Multiple body groups remain exchange-AST metadata. ListTable has one body
  list, so a canonical source writer flattens `rowGroups.bodies` into that body
  and reports the lost boundaries; `footer-rows` does not imply body-group
  syntax.

### 5.3 Degradation

When the extension is not enabled, or the block is malformed (any row yields no
cells), it renders as its ordinary `<div class="list-table">` containing the
literal nested list - no content is ever dropped, and the deferred output is
byte-identical to the plain div.

### 5.4 Conformance (`tests/corpus-optional`)

Tier-2, so not in the mandatory corpus. The shared optional corpus pins the
caption (case 26), leading header rows/columns (42), column metadata and the
foot (44), and local row/cell headers (45); run it per §3 whenever the feature
is enabled. The three implementations additionally pin malformed degradation,
spans, ragged padding, and row-group boundary clamping in their own suites.

### 5.5 Out of scope (impls MAY differ)

- Empty body-group boundaries with no header row remain exchange-AST-only;
  `{header-row}` spells the useful independently authored groups that begin with
  one or more intermediate header rows.
- Deeply ambiguous overlapping-span soup (a marker glued to another, or a `^`
  inside the interior of an existing merged rectangle) resolves however the
  native pipe-table grid walk resolves it; not pinned.

## 6. Bibliography (Tier-3)

Render a reference list from citation keys resolved against an external
CSL-JSON source (issue #199). This is the external-data follow-up the Citations
extension (§4) explicitly deferred (§4.6): §4 resolves `@key` against in-document
`[@key]:` definitions only; this extension adds a document-level bibliography
pool. Off by default; enable per processor. Depends on Citations (§4) being
enabled - it reuses the same `citation-group` nodes, numbering, and
`::: references` placeholder, so it is a data-source layer, not new syntax.

### 6.1 Data source

- A front-matter key names the source: `bibliography: refs.json` (a single
  string, or a list of strings). When several files are listed, the **host**
  merges them left to right and resolves duplicate `id`s (earlier file wins)
  before handing the extension a single pool - the extension never sees file
  boundaries (see the loader note below), so merge order is a host convention,
  not part of the extension's cross-impl contract.
- The format is **CSL-JSON only** - an array of entry objects, each with a
  string `id` matching a citation `@key`. One parser per implementation keeps
  cross-impl parity tractable. BibTeX is out of scope (convert to CSL-JSON
  upstream).
- **The extension does not perform file I/O.** Carve implementations are not all
  filesystem-capable (browser, WASM, sandboxed hosts), so mandating `fopen`
  would break parity. Instead the host resolves the front-matter path and passes
  the parsed CSL-JSON array in as a processor option (e.g. `bibliography:
  [...entries]`); the front-matter key is the **authoring convention** that
  filesystem-capable hosts follow to populate that option. The contract this
  spec pins is the data shape and the resolution rules below, not the loader.

### 6.2 Resolution

- A cited `@key` resolves against, in order: (a) an in-document `[@key]:`
  definition (§4), then (b) the CSL-JSON pool. An in-document definition wins on
  collision, so a document can override or supplement an external entry locally.
- Only **cited** keys enter the reference list (the §4.6 rule holds: no
  `nocite`-style force-include of uncited entries).
- Numbering is unchanged from §4: cited+resolved keys are numbered in
  first-citation order.

### 6.3 Rendering

- The list renders into an explicit `::: references` div if present, else is
  appended at document end - identical placement to §4.
- **Numeric is the mandated default**: `<ol class="references">`, in-text
  citations rendered `[1]`. When author-date mode (§4) is enabled, its sorted
  `<ul class="references">` form is reused; the CSL-JSON `author` / `issued`
  fields feed the author-date label.
- **Entry text from CSL-JSON** uses one fixed minimal template (full styling is
  the renderer-plugin point below). Build from three fields, omitting any absent
  field together with its separator, then append a trailing period if the result
  is non-empty:
  - `author`: the CSL array; each name renders `Family, Given` (just `Family`
    when `given` is absent, or the `literal` field verbatim when present),
    multiple authors joined with `; `.
  - year: `issued.date-parts[0][0]`, else `issued.literal`, wrapped in parens.
  - `title`: emitted verbatim.
  - Assembly: `"{authors} ({year})"` (a single space between the two), then the
    title joined with `. `, then a trailing `.`. Example:
    `Smith, John (2020). A Study.` The entry is **plain text, HTML-escaped** -
    CSL-JSON is external data, not Carve markup, so it is never re-parsed.
- **Back-links are mandated.** The in-text marker for each resolved key is
  `<a id="cite-{key}-{n}" href="#ref-{key}">{number}</a>` - the existing §4
  forward link gains a per-use `id`. The anchor sits on the **per-key rendered
  item**, not on the `citation-group` element, so a multi-key group such as
  `[@a; @b]` carries one anchor per key (`cite-a-1`, `cite-b-1`) rather than
  colliding on a single element `id`. `{n}` counts that key's use sites
  document-wide, independent of which group each use appears in. Each reference
  entry is then `<li id="ref-{key}">{entry} <a href="#cite-{key}-{m}"
  class="ref-backref">↩</a> …</li>`, one back-link per use site `m = 1 … n`.
  A group that renders verbatim (some key unresolved, §6.4) is not a use site and
  contributes no anchors. Back-links appear **only when a bibliography pool is
  supplied**; pure §4 in-document citations (no pool) render exactly as before,
  so the Tier-2 citation corpus is unchanged.
- Full CSL **style** resolution (rendering an arbitrary `.csl` style) is an
  explicit **renderer-plugin extension point**, not part of this contract and
  not corpus-pinned. The baseline this spec pins is numeric + the §4 author-date
  form from the CSL-JSON fields.

### 6.4 Degradation

Matches the §4 verbatim rule - no content is ever dropped:

- A citation group with any key that resolves in neither source renders its
  verbatim `[@key]` source. The whole group is then literal text, so **none** of
  its keys are cited - a key that appears only inside a verbatim group is not
  numbered, not added to the reference list, and is not a back-link use site
  (no orphan entry with a dangling back-ref). A key cited elsewhere in a
  fully-resolved group is unaffected.
- A `::: references` placeholder with no resolvable data (extension off, no
  bibliography option supplied, or every key unresolved) stays a plain
  `<div class="references">` containing whatever it literally held.
- An unreadable or malformed CSL-JSON source resolves to an empty pool; keys
  then fall back to in-document defs, and otherwise degrade per the verbatim
  rule above. A host MAY surface a load warning out of band, but the rendered
  output never changes shape on a missing source.

### 6.5 Conformance (NOT corpus-pinned)

Tier-3, so not in the mandatory corpus. The contract is cross-impl parity: for
the same document and the same CSL-JSON pool, the three implementations produce
the same numbered list, the same back-link anchors, and the same degradation.
Each implementation pins this in its own suite (external resolution from a
supplied pool, in-doc override precedence, back-links across multiple use sites,
the cited-only rule, and the missing-source / unresolved-key defer). Multi-file
merge is a host concern, not pinned here.

### 6.6 Out of scope (impls MAY differ)

- BibTeX (`.bib`) ingestion - convert to CSL-JSON upstream.
- Arbitrary `.csl` style rendering (the renderer-plugin point above).
- Same-author-year disambiguation letters (`2020a` / `2020b`), inherited from
  §4.6 - the bare year is emitted.

## 7. Glossary (Tier-3)

Defined terms with descriptions, linked from their in-text uses to a generated
glossary section (issue #91). Lower universality than citations, and the
glossary section is derived content (like the table of contents or heading
permalinks), so this is Tier-3: off by default, never in any corpus. It reuses
existing syntax - the definition list and the `:name[…]` inline extension form -
rather than adding a primitive.

### 7.1 Syntax

- A `::: glossary` block whose body is a definition list (`:: term` / `:  def`)
  declares the glossary. Each term is one entry.
- `:term[word]` (the core inline extension form) references a term. The link
  target is derived from the *bracket text*, not a separate key.

### 7.2 Slug

- A term's id is `gloss-{slug}`, where `slug` is the heading-id slug of the
  term's plain text with lowercasing on and ASCII folding off
  (`slugify(text, {lowercase: true})` - the same routine §-cross-references use,
  so `:term[HTTP]` and a `:: HTTP` entry agree on `gloss-http`). `:term[word]`
  slugs its own bracket text the same way, so the two sides meet without an
  explicit key.

### 7.3 Rendering

- The `::: glossary` block renders `<dl class="glossary">`; each term becomes
  `<dt id="gloss-{slug}">{term}</dt>` and each definition `<dd>{def}</dd>`,
  preserving the definition-list grouping (terms sharing one definition each get
  their own `<dt>`). Entries render in **source order** - no sort, so the output
  is trivially identical across implementations (alphabetizing is the author's
  job). On a duplicate slug the first entry wins the id; later duplicates still
  render their `<dt>`/`<dd>` but without the id.
- `:term[word]` renders `<a href="#gloss-{slug}" class="term">{word}</a>` when
  `slug` matches a defined term. When it matches none (resolved, but the term is
  not in any `::: glossary`), it degrades to `<span class="term">{word}</span>` -
  no link, nothing dropped.

### 7.4 Degradation

When the extension is off, `:term[word]` is the generic inline fallback
`<span class="ext-term">word</span>` and `::: glossary` is a plain
`<div class="glossary">` holding its literal definition list - readable either
way, no content lost.

### 7.5 Conformance (NOT corpus-pinned)

Tier-3, so not in the mandatory corpus. The contract is cross-impl parity: for
the same document the implementations produce the same `<dl>`, the same
`gloss-{slug}` ids, and the same `:term` resolution / degradation. Each
implementation pins this in its own suite.

## 8. Index (Tier-3)

Back-of-book index terms: mark occurrences in the text, collect them into a
generated, sorted index with back-links to every occurrence (issue #91).
Derived content like the glossary, so Tier-3, off by default, never in any
corpus. Pairs with but is independent of the Glossary extension (§7) - enable
either alone.

### 8.1 Syntax

- `:index[term]` (the core inline extension form) marks an index occurrence at
  that point. It is an **invisible marker**: it emits no visible text, only an
  empty `<span>` anchor target that the generated index links back to. A span
  (not an `<a>`) is used deliberately so a marker placed inside a link label
  never nests one anchor inside another.
- A `::: index` block marks where the index renders (its body is normally
  empty, like `::: references`).

### 8.2 Rendering

- Each `:index[term]` in the document body emits
  `<span id="idx-{slug}-{n}" class="index-term"></span>`, where `slug` is the
  §7.2 slug of the term and `n` is that slug's 1-based occurrence count in
  document order. The element is empty, so nothing shows inline.
- Only body occurrences are indexed. A marker inside deferred content - a
  footnote definition, which the renderer may drop (unreferenced) or reorder -
  renders **inert** (`<span class="index-term"></span>`, no id) and is not
  listed, so a generated back-link never points at an anchor that was dropped.
- `::: index` renders `<ul class="index">` with one `<li>` per distinct slug,
  the list **sorted by slug in ascending Unicode-codepoint order** (equivalently
  UTF-8 byte order - a fixed, locale-independent sort, so all implementations
  agree). Each item is `{display}` followed by one back-link per occurrence
  `1 … n`. The `{display}` text is the first occurrence's literal term text
  (HTML-escaped).
- **Each back-link carries an accessible name** (carve#1469). A bare `↩` is
  announced as "leftwards arrow with hook", or skipped - the sentence PART 9 §16
  exists to prevent, on the identical element one document over. §16's rule is
  **mirrored rather than reinvented**: the name is the label followed by *what
  the link visibly says*. A term with ONE occurrence renders the plain glyph and
  is named by label plus term; the k-th of SEVERAL renders `↩<sup>k</sup>` and
  takes that k, so a row of otherwise identical arrows is distinguishable by
  sight and by ear alike. Matching the visible text is WCAG 2.5.3, and it is why
  the ordinal appears in both. The name is TEXT and is attribute-escaped.

  ```html
  <li>widget <a href="#idx-widget-1" class="index-backref" aria-label="Back to widget 1">↩<sup>1</sup></a> <a href="#idx-widget-2" class="index-backref" aria-label="Back to widget 2">↩<sup>2</sup></a></li>
  <li>gadget <a href="#idx-gadget-1" class="index-backref" aria-label="Back to gadget">↩</a></li>
  ```

  The leading words default to `Back to`. They are settable on the extension
  **and** in the render's `labels` map under `indexBackref` - see
  [§1.5](#_1-5-the-strings-an-extension-writes-itself).
- If no `:index[…]` marker exists, `::: index` stays a plain
  `<div class="index">` (nothing to collect), matching the §6.4 empty-section
  rule.

### 8.3 Degradation

When the extension is off, `:index[term]` is the generic inline fallback
`<span class="ext-index">term</span>` (the term text becomes visible - the
marker cannot hide without its handler) and `::: index` is a plain
`<div class="index">`. No content is dropped.

### 8.4 Conformance (NOT corpus-pinned)

Tier-3, not corpus-pinned. The contract is cross-impl parity: the same document
yields the same `idx-{slug}-{n}` anchors, the same sorted `<ul>`, and the same
back-links. Each implementation pins this in its own suite (occurrence
anchoring, the codepoint sort, multi-occurrence back-links, and the
no-marker / extension-off degradation).

Where a term's display text is derived from a heading, it is R4's clone of that
heading's inline nodes and not a flattened string - the grammar's DERIVED
DISPLAY TEXT CLONES THE SAME NODES clause (PART 9R R4) binds this extension the
same as the crossref itself.

## 8b. Placement directives: TOC & footnotes (Tier-3)

Two directives let the author control *where* a piece of derived content
renders, extending the same collect-then-emit family as Glossary (§7) and
Index (§8).

### 8b.1 `::: toc` — table of contents

A `::: toc` block renders a `<nav class="toc">` of the document's headings at
that spot (rather than the top/bottom injection of the standalone TOC
extension). Opt-in, off by default. The level window is set with attributes on
the line **before** the opener (Carve attaches `:::`-block attributes on a
preceding attribute line, never inline on the opener):

```
::: toc              (all levels, 1-6)
:::

{depth=2}            (levels 1-2)
::: toc
:::

{from=2 to=4}        (levels 2-4)
::: toc
:::
```

- `{depth=N}` includes levels `1..N`; `{from=X to=Y}` is an explicit window
  (swapped if inverted). Both clamp to 1-6; a non-numeric value falls back.
- The author's `{#id .class}` is carried onto the `<nav>`; the directive-only
  `depth`/`from`/`to` keys are stripped from the output.
- Entries link to each heading's resolved, dedup-aware id (so links match the
  emitted heading anchors). **Every heading is included in document order**,
  recursing into containers (`::: note`, blockquotes, divs) — those headings
  render with id anchors, so they belong in the TOC. Footnote-definition
  headings get no id and are excluded. (A heading inside a list item is subject
  to the core list-interruption rules, which currently differ across engines;
  the TOC faithfully reflects each engine's parse.)
- The nested `<ul>` HTML is byte-identical to the standalone TOC extension
  (one tag per line).

**Two extensions produce a table of contents, and they are not
interchangeable.** `TocPlacement` implements this directive. `TableOfContents`
is the standalone injector on the Tier-3 catalog row: it puts one nav at the top
or the bottom of every document and never looks at `::: toc`. Registering the
wrong one is not an error and fails quietly, so it is worth knowing what each
combination renders.

For this document:

```
Intro paragraph.

::: toc
:::

# One

## One A
```

| registered | what renders |
|---|---|
| `TocPlacement` | `<nav class="toc">` where the directive is written |
| `TableOfContents` | `<nav class="toc">` at the top (or bottom), **plus** an empty `<div class="toc">` where the directive is written |
| both | two navs - one injected, one in place |
| neither | the empty `<div class="toc">` only, and no nav anywhere |

The `<div class="toc">` in rows two and four is the §8b.3 degradation floor for
an unhandled directive, not a defect. Registering `TableOfContents` alone gives
an author a table of contents in a place they did not choose beside an empty
element where they did choose:

```html
<nav class="toc">
<ul>
<li><a href="#One">One</a>
<ul>
<li><a href="#One-A">One A</a></li>
</ul>
</li>
</ul>
</nav>
<p>Intro paragraph.</p>
<div class="toc">

</div>
```

The two also differ on a document with **no** directive: `TocPlacement` renders
nothing at all, `TableOfContents` still injects its nav. So the choice is
between letting each document say where its contents go and letting the site
decide once for all of them. Registering both is supported and renders both.

All three engines ship both, under parallel names:

```js
carveToHtml(src, { extensions: [tocPlacement()] })
```

```php
new TocPlacementExtension();
```

```rust
TocPlacement::new()
```

### 8b.2 `::: footnotes` — endnotes placement

A `::: footnotes` block relocates the endnotes section to that spot instead of
the document end. This is **core** (no extension needed) — the marker itself is
the opt-in.

- All footnotes are flushed at the marker, including those referenced *after*
  it in the document.
- Only the **first** `::: footnotes` places; a second one degrades to an empty
  `<div class="footnotes"></div>` placeholder (no duplicate section).
- A document with **no** `::: footnotes` marker is **byte-identical** to the
  default end-of-document rendering.
- A marker in a document with no footnotes, or a `::: footnotes` nested inside a
  footnote definition, degrades to an ordinary `<div class="footnotes">` and
  never relocates.

### 8b.3 Degradation & conformance

Both degrade gracefully (a labeled `<div>` floor).

- **`::: footnotes`** is core and its full output is byte-identical across
  implementations, so it is **corpus-pinned** in the main corpus
  (`120-footnotes-placement`).
- **`::: toc`** is a Tier-3 extension whose embedded output carries
  per-implementation block indentation (like Glossary and Index), so it is
  **not** corpus-pinned; the cross-impl contract is the byte-identical `<nav>`
  list fragment, and each implementation pins the window selection, id
  resolution, and degradation in its own suite.

An entry's text is R4's clone of the heading's inline nodes, per the grammar's
DERIVED DISPLAY TEXT CLONES THE SAME NODES clause (PART 9R R4), taken **before**
any render-stage injection - so a `section-number` span added by HeadingNumbers
(§9) never appears in a TOC entry, and heading markup is never flattened out of
one.

## 9. HeadingNumbers (Tier-3)

Auto-number sections and render numbered cross-references - "Section 1.2" or
"Section 1.2 - Title" instead of the bare heading title (issue #198). Carve
already auto-numbers figures/tables/equations via captions; this is the section
equivalent. Numbering is a **rendering policy, not source semantics**, so it is
Tier-3: off by default, never corpus-pinned, and adds **no new syntax** (it only
reads existing headings and the `{.unnumbered}` class). It runs as a
render-stage transform.

### 9.1 Numbering

- Walk every heading in document order, descending into containers (list items,
  divs/admonitions, definition lists) exactly as id assignment does, but **skip
  headings inside a blockquote** (quoted content is not the document's own
  sections - matching how heading-id assignment declines blockquote headings as
  implicit-reference targets).
- Headings inside a footnote definition are **not** numbered (the walk covers
  the document body only); a `</#id>` to such a heading keeps its plain title.
- Number gap-free with a small stack: track the current dotted number and the
  heading level of each part. For a heading at level `L >= minLevel`, pop parts
  deeper than `L`; if the top part is at level `L` increment it, otherwise push a
  new `1`; the number is the parts joined with `.`. Headings shallower than
  `minLevel` are not numbered and do not affect the stack. A skipped structural
  level (a jump from `##` straight to `####`) therefore produces `1.1`, **not**
  an empty `1.0.1` segment - the dotted number reflects the *nesting of numbered
  headings*, not absolute levels.
- `minLevel` (option, default `1`) sets the top numbered level. A document whose
  `# Title` is the doc title sets `minLevel: 2` so the first `##` is `1`.
- A heading carrying the `unnumbered` class is skipped: it gets no number and
  **does not advance the stack**. Deeper headings continue from the surrounding
  state. The class comes from a **preceding** attribute line (trailing `{…}` on a
  heading is literal text in Carve, not an attribute):

  ```carve
  {.unnumbered}
  ## Changelog
  ```
- On a duplicate (explicit) heading id, the **first** heading wins the number /
  title used for `</#id>` rewrites, matching how id assignment picks the
  `</#id>` target - so a rewritten label and its link destination always agree.
  (A quoted or unnumbered first heading still wins the id though it carries no
  number.)
- A strictly-nested hierarchy numbers unambiguously. A *non-monotonic* one that
  returns to a previously **skipped** level (`#` → `###` → `##`) is inherently
  ambiguous and may reuse a number; the rule above stays deterministic, but
  authors should nest heading levels without skips for clean numbering.

### 9.2 Heading rendering

- A numbered heading prepends a number span inside the `<h*>`, one space before
  the title. The id stays where Carve already puts it - on the `<section>`
  wrapper for a top-level heading, on the `<h*>` itself for a heading nested in a
  list/div - and is unchanged; only the span is added:

  ```html
  <section id="parsing">
    <h2><span class="section-number">1.2</span> Parsing</h2>
  </section>
  ```

  The span is separate so a host can restyle or hide it in CSS.

### 9.3 Numbered cross-references

- Only **`</#id>` cross-references** are rewritten, identified by provenance:
  `resolve()` converts a `</#id>` crossref into a title-cloned link and tags it
  with a **non-rendered `fromCrossref` flag** (metadata every renderer ignores -
  it never appears in HTML). HeadingNumbers rewrites only flagged links.
  Ordinary `[text](#id)` links and implicit `[label][]` references are **not**
  tagged, so they always keep their text - including the case where that text
  happens to equal the heading title (`[Parsing](#parsing)`). This makes the
  "explicit text overrides" rule exact.
- This is the one small core touch the extension needs: a flag set at resolve
  time. It changes no rendered output, so the core conformance corpus is
  unaffected; it only lets a render-stage extension tell an auto-filled
  cross-reference from a hand-written link.
- The rewrite is controlled by the `crossref` option:
  - `number-title` (default): text becomes `{label} {N} - {title}` →
    `Section 1.2 - Parsing`.
  - `number`: text becomes `{label} {N}` → `Section 1.2`.
  - `title`: cross-references are left untouched (numbering appears only on the
    headings).
- `label` (option, default `Section`) is the prefix word; set it to `§`, a
  localized word, etc. The `href` is never changed.
- The `{title}` part is **not a string**. It is R4's clone of the heading's
  inline nodes, per the grammar's DERIVED DISPLAY TEXT CLONES THE SAME NODES
  clause (PART 9R R4), so a heading carrying emphasis or a code span keeps that
  markup in the rewritten cross-reference instead of being flattened to glyphs.
  The label is taken **before** this extension injects its `section-number`
  span, so an implementation that resolves cross-references at render time must
  clone from the pristine heading, not from the live one. The label word, the
  number and the separator around them remain this extension's own.

### 9.4 Interaction with HeadingLevelShift

Numbering keys off the heading level present when it runs. To number by the
**final** (post-shift) levels, register `headingNumbers` **after**
`headingLevelShift` so its render-stage pass runs later. Registered before, it
numbers by the pre-shift levels.

### 9.5 Degradation

When the extension is off, headings render with no number span and
cross-references keep their title-cloned text - exactly today's behavior, so a
document is unchanged and never broken by disabling the policy.

### 9.6 Conformance (NOT corpus-pinned)

Tier-3, not corpus-pinned. The contract is cross-impl parity: the same document
and options yield the same `section-number` strings on the same headings and the
same rewritten cross-reference text. Each implementation pins this in its own
suite (the dotted counter incl. the level-skip and `{.unnumbered}` rules,
`minLevel`, the three `crossref` styles, the auto-vs-explicit reference
distinction, and extension-off degradation).

### 9.7 Out of scope (impls MAY differ / future)

- Appendix lettering (`A`, `B`, `A.1`) and front-matter/body or per-section
  restart need a section-grouping marker; deferred to a follow-up.
- Numbering figures/tables relative to sections (`Figure 2-3`) is a caption
  concern, not this extension.

## 10. CodeCallouts (Tier-2)

Mark points inside a fenced code block with `<n>` and attach an explanation
list (issue #88), the way AsciiDoc callouts work. Tier-2 (standard-recommended):
a spec-defined cross-impl syntax that every implementation SHOULD offer but
ships **off / passthrough** by default; its output is pinned in the optional
corpus (`tests/corpus-optional`) when enabled. Collision risk is low because the
markers are recognized **only inside fenced code**.

### 10.1 Syntax

- Inside a fenced code block, a `<n>` token (`n` = one or more ASCII digits)
  that is the **last non-whitespace content on its line** is a callout marker.
  Whitespace before it is ordinary code indentation and is preserved.
  In-code markers render whenever the extension is enabled, independently of
  whether an explanation list follows (a marked line with no bound list still
  shows its bubble - the author placed the marker).
- Immediately after the code block, a **callout list** binds the explanations: a
  paragraph whose every soft-break line has the form `<n> text` (a marker, a
  single space, then inline prose). The list binds only when (a) the code block
  contains at least one marker and (b) every line of that following paragraph is
  a `<n> text` item; otherwise that paragraph is ordinary content (the list does
  not bind) - the in-code markers still render as bubbles per the rule above.

### 10.2 Rendering

- An in-code marker renders as `<b class="callout" data-callout="n">n</b>` -
  the only part of the code line that is **not** HTML-escaped; the rest of the
  content escapes as usual. The marker is a styleable element the host hides from
  copy-to-clipboard with CSS (`user-select: none`), so Carve emits it and the
  host styles it - no script required.
- The callout list renders as `<ol class="callouts">`, one `<li value="n">` per
  `<n> text` item in source order (its inline prose parsed normally). The
  explicit `value="n"` is the item's marker number, so the displayed ordinal
  always equals the in-code bubble even when numbers are non-sequential or do
  not start at 1 (`<3>` ↔ `<li value="3">`); alignment is by number, not list
  position.

### 10.3 Degradation

- **Non-HTML targets** (Markdown, plain text, ANSI): the extension contributes
  HTML renderers only, so non-HTML output keeps the `<n>` markers literal in the
  code and the callout list as its ordinary `<n> text` lines. Nothing is dropped
  and the marker↔note correspondence survives as the literal numbers - it is the
  source-faithful, copy-paste-able form. (A `(n)`-style rewrite in non-HTML
  targets would need non-HTML extension render hooks; out of scope for v1.)
- **Extension off**: identical to the above - the `<n>` tokens stay literal in
  the code and the following lines are an ordinary paragraph; nothing is
  reinterpreted.

### 10.4 Conformance (`tests/corpus-optional`)

Tier-2, so pinned in the optional corpus when enabled, with a `manifest.json`
entry. Cases pin: in-code marker rendering (escaping around the `<b>`), the
`<ol class="callouts">` binding, the marker/list alignment, and the failure
modes (a code block with no marker, and a following paragraph with a non-`<n>`
line, both leave the `<n>` literal).

### 10.5 Out of scope (impls MAY differ / future)

- Comment-anchored markers (`// <1>`) - bare `<n>` only for v1.
- Linking a marker to its list item (anchor/back-ref) - the marker is a
  styleable bubble, not a link, in v1.

## 11. SemanticSpan (Tier-2)

The four semantic span names core does not reserve, plus the compatibility
spelling for all seven. Tier-2: spec-defined, identical across implementations,
**off by default**, pinned in `tests/corpus-optional` when enabled.

Core reserves `abbr`, `time` and `kbd` as span attributes (PART 9 §9) because
the first two carry data and the third is ubiquitous. `samp`, `var`, `cite` and
`dfn` carry no data and collide with no core clause, so a conformant core leaves
them as ordinary attributes. This extension gives them the same meaning core
gives its three.

### 11.1 Syntax

- On an ordinary `[content]{attrs}` span, `samp`, `var`, `cite` and `dfn` are
  consumed and wrap the rendered content in their same-named element.
- A non-empty `dfn` value becomes `title`. Values on `samp`, `var` and `cite`
  only select the wrapper - the value reaches no output, which `carve lint`
  reports as `semantic-attribute-value-ignored`.
- The nesting order extends core's, inner to outer: `abbr`, `time`, `samp`,
  `var`, `kbd`, `cite`, `dfn`.
- Leftover attributes ride the outermost semantic element, exactly as PART 9 §9
  states for core.

::: compare

```carve
[x]{samp} [y]{var} [Dune]{cite} [CSS]{dfn="Cascading Style Sheets"}
```

```html
<p><samp>x</samp> <var>y</var> <cite>Dune</cite> <dfn title="Cascading Style Sheets">CSS</dfn></p>
```

:::

### 11.2 The `:name[…]` spelling is soft-deprecated

The extension also accepts `:abbr[…]`, `:time[…]`, `:kbd[…]`, `:samp[…]`,
`:var[…]`, `:cite[…]` and `:dfn[…]`, rendering the same elements with authored
attributes on the element.

It is accepted for compatibility, not because two spellings are wanted: it was
released behavior in carve-js and carve-rs, so removing it outright would break
documents that shipped. **Write the span attribute.** The form is scheduled for
removal in 0.2, and it cannot express a combination - `:dfn[:abbr[CSS]]` does
not nest, where `[CSS]{dfn abbr="…"}` does.

Core registers no `:name[…]` handler at all, so with the extension off every one
of the seven takes the ordinary `<span class="ext-NAME">` fallback.

### 11.3 What is NOT here

- `code` and `mark`. Carve already spells both inline - `` `x` `` and `=x=` -
  and `code` would additionally give one tag two content models, since a code
  span is verbatim while an extension body is parsed.
- `ruby`. Accessible ruby needs structured base and annotation children rather
  than a single inline container.
- Any name outside the seven. An implementation MUST NOT turn an arbitrary
  extension name into an HTML tag.

### 11.4 Conformance (`tests/corpus-optional`)

`40-semantic-span-extension` pins the four names, their value mapping and the
riding rule; `41-semantic-span-extension-deprecated-spelling` pins the
compatibility form. Both are declared unreachable until an engine registers the
extension - see `tests/optional-corpus.test.mjs`, which names the window rather
than skipping silently.

## 12. Wikilinks and HeadingReference (Tier-2)

The two extensions that spell a link as `[[…]]`. They are documented together
because they claim the SAME syntax and answer different questions with it, so
the first thing a host has to decide is which one a render gets.

Core leaves `[[…]]` literal. That is what lets either extension add the form
without hijacking a core construct, and it is also the fallback both degrade to.

### 12.1 Wikilinks: a link to another page

The same-site link. A page name becomes a URL through a generator the host
supplies, because the URL a page name maps to depends on the site - the routing,
the extension, whether pages live in folders - and none of that is visible to a
parser. That is the taxonomy rule in
[Native Features](/native-features-analysis) applied literally: a feature whose
answer depends on the surrounding system is an extension, not syntax.

Four forms:

| Write | Means |
| --- | --- |
| `[[Page]]` | the page, linked by its own name |
| `[[page\|Display]]` | the page, with its own link text |
| `[[page#anchor]]` | a fragment inside the page |
| `[[folder/page]]` | a page under a path |

::: compare

```carve
See [[Tigers]] and [[page|Display]].
```

```html
<p>See <a href="tigers" class="wikilink" data-wikilink="Tigers">Tigers</a> and <a href="page" class="wikilink" data-wikilink="page">Display</a>.</p>
```

:::

`data-wikilink` carries the page name as written, so a host that post-processes
the HTML can find its own links without re-parsing them out of the `href`.

Three options, identical in meaning across the engines:

| Option | Default | What it does |
| --- | --- | --- |
| URL generator | a slugifier: lowercase, spaces to `-`, unsafe characters dropped, runs collapsed | maps the page name (anchor already stripped) to an href; the anchor is appended afterwards |
| CSS class | `wikilink` | class(es) on the anchor |
| New window | off | adds `target="_blank" rel="noopener"` |

The registration shape follows each language rather than a shared spelling:

```js
carveToHtml(src, { extensions: [wikilinks({ urlGenerator: (p) => `/docs/${slug(p)}.html` })] })
```

```php
new WikilinksExtension(urlGenerator: fn (string $page): string => '/docs/' . slug($page) . '.html');
```

```rust
Wikilinks::new().with_url_generator(Box::new(|page| format!("/docs/{}.html", slug(page))))
```

### 12.2 HeadingReference: a link to a heading in THIS document

Names a heading by its plain text, so an author never has to know the slug
rules. `[[Heading Text|click here]]` sets its own display text.

A reference resolves only when exactly one heading matches. A heading that does
not exist, and text that appears on more than one heading - where no choice
would be right - both fall back to the literal `[[…]]` source, so nothing is
silently swallowed:

::: compare

```carve
See [[Getting Started]] and [[No Such Heading]].

# Getting Started
```

```html
<p>See <a href="#Getting-Started" class="heading-ref">Getting Started</a> and [[No Such Heading]].</p>
```

:::

### 12.3 Enable one or the other, never both

They compete for `[[…]]` on the same render. Pick by what the document means by
a bare `[[Name]]`: another page in the site, or a heading in this file.

For an intra-document link that does not go through this extension at all, core
already has two spellings: `</#section-id>` clones the target's text
(PART 9 §16), and `[Page Name][]` is an ordinary collapsed reference that
resolves against a matching heading.

### 12.4 An unresolved reference survives for the host to resolve

Where a document links to something this document cannot resolve, the reference
is not discarded. `[Some Page][]` with nothing to resolve against stays a `link`
node carrying `href: ""` plus `ref` and `rawRef` (PART 12 §3a), and the core
render degrades to the literal source text rather than inventing a URL. A site
layer that knows which pages exist can walk the AST, match `ref` against its own
index and fill `href` in - which is the same division of labor Wikilinks makes
explicit through its URL generator.
## 13. Tabs (Tier-2) and CodeGroup (Tier-3)

Two constructs of the same shape. A `:::: tabs` container turns each `::: tab
[Label]` child into one panel; a `::: code-group` container does the same with
each fenced code block, taking the fence's `[Label]` as the tab name and its
language word where none was written. Tabs is Tier-2 and pinned in
`tests/corpus-optional`; CodeGroup is Tier-3 and is not corpus-pinned. Every
rule in this section binds BOTH: two constructs of the same shape do not get
different accessibility ceilings because one of them was written second
(carve#1468).

### 13.1 Two modes, and why `css` is the default

Both extensions carry a `mode` option with exactly two values:

| `mode` | How a panel is revealed | Needs a client script |
|---|---|---|
| `css` (default) | one `<input type="radio">` per tab plus a sibling `<label for=…>`; a stylesheet reveals the checked panel | no |
| `aria` | a `<button type="button" role="tab">` per tab and `role="tabpanel"` panels; every non-selected panel carries `hidden` | yes |

`css` is the default in both, and an implementation MUST NOT ship `aria` as the
default. That is a consequence of the §2.5 rule rather than of compatibility:
content is never dropped, only interaction. `aria` mode reveals with `hidden`,
so a page that registers it and ships no script loses every panel but the first,
while `css` mode with no stylesheet at all shows every panel. A default whose
failure mode is missing content is the wrong default, whatever its semantics are
when it works. The question reopens if `aria` mode stops using `hidden` for the
reveal.

An unknown `mode` value MUST be rejected rather than guessed, for the reason
§2.5 gives about render modes: a guess turns a typo into silently different
output.

A `"static"` render (§2.5) takes neither mode. `renderStatic` flattens the set to
one `<section>` per panel headed by its `[label]`, where the heading IS the name
and no interaction survives to bind.

### 13.2 A `css`-mode panel carries its tab's name

Under `css` there are no tab roles, so nothing binds a panel to the control that
reveals it: all radios and labels are emitted before all panels, and the panel
itself is anonymous. Each panel therefore takes a role and a name of its own:

```html
<div class="tabs" role="group" aria-label="Tabs">
<input type="radio" name="tabset-1" id="tabset-1-tab-1" class="tabs-radio" checked>
<label for="tabset-1-tab-1" class="tabs-label">First</label>
<div class="tabs-panel" role="group" aria-label="First">
<p>Content one.</p>
</div>
</div>
```

- **The name is the tab's own label** - the same string the tab's `<label>`
  element carries. It is DERIVED from the document, so per
  [§1.5](#_1-5-the-strings-an-extension-writes-itself) it gets **no `labels`
  key**, exactly as an admonition title does not: a translated document
  translates it once, in the document. The name is TEXT and is
  attribute-escaped.
- There is no separate attribute for it, and none is introduced: an author
  renames a panel by renaming its tab.
- **`role="group"`, not `role="tabpanel"`.** The control that reveals this panel
  is a `radio`, not a `tab`. `group` is all the CSS mode can honestly claim.
- **Not `<section>`.** One landmark per panel is N landmarks per tab set, which
  is the noise §1.5's sibling ruling removed from untitled admonitions.
- **A bare `aria-labelledby` would not do instead.** ARIA marks `aria-label` and
  `aria-labelledby` **prohibited** on role `generic`, which a plain `<div>` maps
  to, so the attribute is ignored where it is not flagged outright - and there
  is nothing to point one at, since the `<label>` elements carry `for=`, not
  `id=`.

`code-group` panels take the same treatment, keyed on the panel's own label: the
tab name where one was written, otherwise the language word.

```html
<div class="code-group" role="group" aria-label="Code examples">
<input type="radio" name="codegroup-1" id="codegroup-1-tab-1" class="code-group-radio" checked>
<label for="codegroup-1-tab-1" class="code-group-label">Node</label>
<input type="radio" name="codegroup-1" id="codegroup-1-tab-2" class="code-group-radio">
<label for="codegroup-1-tab-2" class="code-group-label">python</label>
<div class="code-group-panel" role="group" aria-label="Node"><pre><code class="language-js">console.log(1)
</code></pre>
</div>
<div class="code-group-panel" role="group" aria-label="python"><pre><code class="language-python">print(1)
</code></pre>
</div>
</div>
```

### 13.3 An `aria`-mode panel is bound, not named

In `aria` mode the association already exists, so the panel takes **neither**
`role="group"` **nor** an `aria-label`. It stays `role="tabpanel"`, bound by
`aria-labelledby` to its `<button type="button" role="tab">`, and every non-selected panel
carries `hidden`:

```html
<div class="tabs" role="tablist" aria-label="Tabs">
<button type="button" role="tab" id="tabset-1-tab-1" aria-selected="true" aria-controls="tabset-1-panel-1" class="tabs-label">First</button>
<button type="button" role="tab" id="tabset-1-tab-2" aria-selected="false" aria-controls="tabset-1-panel-2" class="tabs-label" tabindex="-1">Second</button>
<div role="tabpanel" id="tabset-1-panel-1" aria-labelledby="tabset-1-tab-1" class="tabs-panel">
<p>Content one.</p>
</div>
<div role="tabpanel" id="tabset-1-panel-2" aria-labelledby="tabset-1-tab-2" class="tabs-panel" hidden>
<p>Content two.</p>
</div>
</div>
```

Naming it as well would give one element two accessible names and pull it out of
the `tablist` relationship that is the only reason to be in this mode. So the
rule in §13.2 is a `css`-mode rule specifically, not "every panel gets a name".

**The control is `type="button"`, not the implicit `submit`.** A `<button>` with
no `type` is a submit button, so a tab set rendered inside a `<form>` submitted
the form when a tab was activated, instead of switching panels: the one
interaction this mode exists to provide, traded for the one thing the page never
asked for. The attribute is not a style choice and an implementation MUST write
it, on every generated control in BOTH constructs. `css` mode is unaffected -
its control is an `<input type="radio">`, which already says what it is.

Nothing here is an invitation to write other attributes on the control. The
`tabindex="-1"` on every non-selected tab is the roving-tabindex the `tablist`
pattern requires, and it and `type` are the whole list.

### 13.4 The set's own name

Both wrappers are named already, and unlike a panel name those two strings are
extension-written with a fixed English default, so both DO have `labels` keys:

```html
<div class="tabs" role="group" aria-label="Tabs">
<div class="code-group" role="group" aria-label="Code examples">
```

`tabsGroup` and `codeGroup` in the §1.5 table carry them, an option on the
extension overrides the map, and an `aria-label` the author writes on the
container outranks both - naming two tab sets on one page apart is the author's
job. In `aria` mode the tabs wrapper is `role="tablist"` instead and keeps the
same name.

### 13.5 Exactly one item is selected, and the first mark wins

An item marked `{selected}` opens the set. Where the document marks none, the
FIRST item opens it, in both modes and in both constructs. Where the document
marks several, the first mark wins and the later ones are ignored:

```
:::: tabs
::: tab [First]
Content one.
:::

{selected}
::: tab [Second]
Content two.
:::

{selected}
::: tab [Third]
Content three.
:::
::::
```

Only `Second` is selected: not `First`, which is what the default would have
chosen, and not `Third`, which is what a last-wins rule would.

**Why first-wins and not last-wins.** The `css` mode is a radio group, and a
radio group cannot have two checked members - the browser resolves it to one and
the document's intent is already lost either way. `aria` mode emitting two
`aria-selected="true"` tabs is not more expressive, it is a shape a
single-select `tablist` has no state for: two panels are revealed, both take a
normal tab stop, and no assistive technology can report which tab the set is on.
So the only question is which single item the rule keeps, and first-wins is what
the `css` default already does with `checked`. That makes the two modes agree,
which is the whole point of this section binding both.

Last-wins would mean an author scrolling a long tab set and marking the item in
front of them silently unselects one above, with nothing in the rendered page
saying so.

**Over-specifying is not an error.** An implementation MUST NOT emit a
diagnostic for a document that marks several items: the document is redundant,
not wrong, and this section has no diagnostic channel. The same holds for a
document that marks the first item explicitly, which asks for exactly what it
would have got.

### 13.6 Conformance

Tabs is pinned in `tests/corpus-optional`. Feature `tabs` covers the `css`
panel name (cases 28 and 46); feature `tabs-aria` covers §13.3 - the
`tabpanel` / `aria-labelledby` binding, the `hidden` reveal that §13.1 turns on,
the absence of `role="group"` there, and the control's `type="button"`
(case 47).

§13.5 is pinned twice on one document, because a rule that says the two modes
agree is not pinned by either mode alone: case 48 is the `aria` render under
`tabs-aria` and case 49 the `css` render under `tabs`. Both mark the second and
third items, so a fixture that selected the first would be reading the default
rather than the rule, and one that selected the third would be reading
last-wins.

CodeGroup is Tier-3 and NOT corpus-pinned; `resources/examples-tier3.md` is its
only verifier in this repo. Its `mode` option, its panel naming and its
rejection of an unknown mode are stated here and pinned by each implementation
in its own suite, the same division §8.4 describes for Index.
