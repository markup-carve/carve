---
description: How Carve output stays readable without client scripts or extensions.
---

# Output without JavaScript

Carve renders HTML in two modes, interactive and static, and every engine also
exports Markdown, plain text and ANSI terminal text. Tabs, disclosures, spoilers
and browser-drawn diagrams cannot work the same way in every one of them. This
page states what replaces them, what a reader sees when an extension or its
renderer is missing, and which content must remain. The specification calls this
behavior **graceful degradation**; this page uses **fallback output**.

## The principle

When an interactive construct is written to output that cannot run it, the
renderer keeps the construct's **content and structure** and drops only its
**interaction**. Authored text, especially a title that tells one panel from
another, is never silently discarded.

A reader of the PDF should be able to tell the tabs apart. A reader of the
Markdown export should see every panel's title. Losing the click is fine; losing
the words is not.

Carve 0.2 builds this into the tree. Every optional feature is an extension
node, and every extension node carries a mandatory **fallback**: core content of
the same block or inline role that any reader can render. A renderer that cannot
handle the extension writes that fallback instead.

## Output formats

| Output | Interaction | Browser scripts | Typical use |
| --- | --- | --- | --- |
| Interactive HTML (`mode: 'interactive'`) | yes | allowed (KaTeX, Mermaid, tab scripts) | docs sites, blogs |
| Static HTML (`mode: 'static'`) | no | none needed | PDF source, handouts, archives |
| Markdown export | no | n/a (the host may render it again) | export, interchange |
| Plain text / ANSI export | no | n/a | terminals, email, logs |

The specification defines the two HTML modes. The Markdown, plain text and ANSI
exports (`carve render --to markdown`, `--to plain`, `--to ansi`) ship in every
engine, but their exact output is engine behavior outside the specification. The
examples on this page show what the reference engine writes today. For output you
must rely on, use HTML or the AST; see [format conversion](./format-bridges.md).

## Fallback output by feature

| Construct | Interactive HTML | Static HTML | Markdown / plain text |
| --- | --- | --- | --- |
| Tabs (`carve.tabs`) | radio inputs and labels, or the ARIA tab pattern | one `<section>` per tab, its title as an `<h3>` | each title as a bold line (plain text: its own line), then the panel |
| Code group (`carve.codeGroup`) | radio inputs and labels over the code blocks | one `<section>` per block, its label as an `<h3>` | code fences in order, each keeping its `[label]` |
| Disclosure (`carve.details`) | native `<details>`/`<summary>` | `<details open>`, kept, not flattened | title line, then the body |
| Spoiler (`carve.spoiler`, `carve.spoilerBlock`) | `<span class="spoiler">`, hidden by CSS | `spoiler spoiler-revealed`: shown | the text, shown |
| Mermaid and other diagram fences | `<pre class="mermaid">` for the client script | the image from a build function, else the source as a code block | the source fence |
| Core math (`` $`...` ``) | `math` span with `\(...\)` or `\[...\]` | the same span: core math has no build-time renderer | `$...$` / `$$...$$` (plain text: the TeX) |
| Math block (`carve.mathBlock`) | `<div class="math display">` | server-rendered math from a build function, else the source | the source fence |
| Footnotes | links to the endnotes | the same links and endnotes | `[^1]` notes |
| Links and autolinks | clickable | clickable (and in a PDF made from it) | Markdown keeps the link; plain text keeps the URL |
| Multiple table header rows | every row in `<thead>` | the same | the first row stays the header; later header rows become body rows (`table-header-row-demoted`) |
| Composite figure (`::: figure`) | one `<figure>` holding the panel figures and the group caption | the same | panels in order, panel captions in italics, group caption last in bold; plain text puts the group caption first |
| Frontmatter | not part of the body | not part of the body | Markdown writes it first between `---` lines; plain text omits it |

### Composite figures keep every caption

A composite figure's panels, panel captions and group caption are all
**content**, and no target may drop or reorder them. Layout hints degrade to
nothing, since order is the only layout a non-HTML target keeps, but the text
always survives. Panel letters appear in cross-reference text only; no target
invents visible `(a)` labels the author did not write.

::: compare
```crv
::: figure
![First photo](examples/a.jpg)
^ First panel

![Second photo](examples/b.jpg)
^ Second panel
:::
^ Two photos side by side
```
```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="examples/a.jpg" alt="First photo">
    <figcaption>First panel</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <img src="examples/b.jpg" alt="Second photo">
    <figcaption>Second panel</figcaption>
  </figure>
  <figcaption>Two photos side by side</figcaption>
</figure>
```
:::

`carve render --to markdown` writes the same figure as:

```markdown
![First photo](examples/a.jpg)

*First panel*

![Second photo](examples/b.jpg)

*Second panel*

**Two photos side by side**
```

### Multiple header rows

Markdown tables have one header row. The export keeps the cell text of every
other header row and reports what it changed:

::: compare
```crv
|= Region |= Sales |= < |
|= |= Q1 |= Q2 |
| North | 10 | 12 |
```
```html
<table>
  <thead>
    <tr><th scope="col">Region</th><th colspan="2" scope="col">Sales</th></tr>
    <tr><th scope="col"></th><th scope="col">Q1</th><th scope="col">Q2</th></tr>
  </thead>
  <tbody>
    <tr><td>North</td><td>10</td><td>12</td></tr>
  </tbody>
</table>
```
:::

```text
$ carve render --to markdown table.crv
table.crv:1:12: warning table-span-flattened Flattened a spanned table cell while rendering markdown
table.crv:2:1: warning table-header-row-demoted Wrote a header row as an ordinary row in Markdown
| Region | Sales |  |
| --- | --- | --- |
|  | Q1 | Q2 |
| North | 10 | 12 |
```

Most constructs degrade well because their distinguishing text is a **title**,
which the renderer always writes, or **source**, which it keeps verbatim. Tabs
were the hard case in 0.1, because their names lived in grouping `[label]`s that
only the tabs extension read. In 0.2 a tab's name is its quoted title, so it
takes the same path as every other title.

## What a reader without the extension sees

There are three ways an extension ends up not rendering, and each has its own
output. All three keep the text.

**1. The extension is not registered.** Nothing claims the div, so it stays a
core div. Its quoted title is written as the first child, the same as on any
div. This is what a reader gets from an engine or site that knows nothing about
tabs:

::: compare
```crv
:::: tabs
::: tab "Installation"
`composer require markup-carve/carve-php`
:::

::: tab "Usage"
`$converter->convert($carve)`
:::
::::
```
```html
<div class="tabs">
  <div class="tab">
    <p class="admonition-title">Installation</p>
    <p><code>composer require markup-carve/carve-php</code></p>
  </div>
  <div class="tab">
    <p class="admonition-title">Usage</p>
    <p><code>$converter-&gt;convert($carve)</code></p>
  </div>
</div>
```
:::

**2. The extension is registered, but no renderer handles it.** The tabs
matcher claims the div and builds a `carve.tabs` node, but the host registered
no renderer for it in the selected mode. The engine writes the node's fallback
and reports `extension-fallback-rendered`. The tabs fallback is each title as a
`strong` paragraph followed by that tab's body:

```js
import { readFileSync } from 'node:fs'
import { renderWithDiagnostics, tabsExtensions } from '@markup-carve/carve'

const source = readFileSync('tabs.crv', 'utf8')
// The tabs matcher claims the div, but no tabs renderer is registered.
const { html, diagnostics } = renderWithDiagnostics(source, { extensions: tabsExtensions })
console.log(html)
console.log(diagnostics.map((d) => d.code))
```

```text
<p><strong>Installation</strong></p>
<p><code>composer require markup-carve/carve-php</code></p>
<p><strong>Usage</strong></p>
<p><code>$converter-&gt;convert($carve)</code></p>
[ 'extension-fallback-rendered' ]
```

The same happens to a diagram fence in static mode when the host gave it no
build function, and to a renderer that throws: the engine writes the fallback
and reports the failure as well.

**3. The profile does not allow it.** A render profile can degrade an extension
even when its renderer is installed. The node is then written as the plain text
of its fallback, and the engine reports `profile-construct-degraded`. Under the
`comment` profile, which also refuses code spans, the tab set becomes four plain
paragraphs:

```crv
:::: tabs
::: tab "Installation"
`composer require markup-carve/carve-php`
:::

::: tab "Usage"
`$converter->convert($carve)`
:::
::::
```

`carve render --profile comment --extensions '["carve.tabs"]'` writes:

```html
<p>Installation</p>
<p>composer require markup-carve/carve-php</p>
<p>Usage</p>
<p>$converter-&gt;convert($carve)</p>
```

When auditing output, check which of the two diagnostics a build reports:
`extension-fallback-rendered` means a renderer is missing or failed,
`profile-construct-degraded` means a [profile](./profiles.md) chose to degrade
the construct.

An inline extension behaves the same way. An unregistered `:name[...]` keeps
its content as a span with an `ext-` class, so `:badge[Ready]` still reads
"Ready":

::: compare
```crv
:badge[Ready]
```
```html
<p><span class="ext-badge">Ready</span></p>
```
:::

## Disclosure is a special case (not flattened)

A disclosure from the `details` extension renders as a native
`<details>`/`<summary>` element in both modes; in static mode it carries the
`open` attribute. It is **not** flattened, because `<details>` is interactive
*without scripts*: browsers collapse and expand it natively. Flattening it to a
plain section would only discard the disclosure semantics and its screen reader
affordance for no gain.

```crv
::: details "Show the full log"
The build finished in 4.2 seconds.
:::
```

`carve render --mode static --extensions '["carve.details"]'` writes:

```html
<details open>
  <summary>Show the full log</summary>
  <p>The build finished in 4.2 seconds.</p>
</details>
```

This is the line between disclosure and the script-dependent constructs. Tabs,
code groups and spoilers need a script or stylesheet to be interactive, so they
change form in static mode; `details` does not, so it stays itself. The only
static requirement is the `open` attribute: without it a PDF renderer could
print the disclosure collapsed and hide the body.

**Email and other targets without `<details>`.** Some email clients ignore the
`<details>` element. They do not lose content: a client without support shows
the summary and the body as ordinary blocks and only cannot toggle them. If a
target has no `<details>` at all, rewrite it as a post-step on the static HTML,
for example `<details open><summary>X</summary>...</details>` to
`<section class="disclosure"><p class="disclosure-title">X</p>...</section>`.
Carve 0.2 has no email mode: `mode` accepts only `interactive` and `static`, and
`carve render --mode print` fails with `bad value for --mode: print`. The
rewrite is a portability polish, not a correctness fix, since `<details open>`
already shows all content.

A spoiler, by contrast, does change in static mode. The interactive renderer
writes `<span class="spoiler">`, which a stylesheet hides; static mode adds
`spoiler-revealed`, so the text is shown:

```crv
The killer is :spoiler[the gardener].
```

`carve render --mode static --extensions '["carve.spoiler","carve.spoilerBlock"]'` writes:

```html
<p>The killer is <span class="spoiler spoiler-revealed">the gardener</span>.</p>
```

## Tabs in static mode

With the tabs extension registered, static mode writes each tab as a
`<section>` whose `<h3>` holds the title, so a printed page still shows which
panel is which:

```crv
:::: tabs
::: tab "Installation"
`composer require markup-carve/carve-php`
:::

::: tab "Usage"
`$converter->convert($carve)`
:::
::::
```

`carve render --mode static --extensions '["carve.tabs"]'` writes:

```html
<div class="tabs" role="group" aria-label="Tabs"><section class="tabs-panel"><h3 class="tabs-label">Installation</h3><p><code>composer require markup-carve/carve-php</code></p></section><section class="tabs-panel"><h3 class="tabs-label">Usage</h3><p><code>$converter-&gt;convert($carve)</code></p></section></div>
```

The Markdown export writes each title as a bold line before its panel, and plain
text writes it on a line of its own:

```text
$ carve render --to markdown tabs.crv
tabs.crv:1:1: warning markdown-container-flattened Flattened a container in Markdown
tabs.crv:2:1: warning markdown-container-flattened Flattened a container in Markdown
tabs.crv:6:1: warning markdown-container-flattened Flattened a container in Markdown
**Installation**

`composer require markup-carve/carve-php`

**Usage**

`$converter->convert($carve)`
```

## Bracket labels stay visible

In 0.1 a tab took its name from a grouping `[label]`, and a renderer without the
tabs extension could drop the label, leaving panels nobody could tell apart. In
0.2 the tabs extension reads only the quoted title; a bracket label, a `label`
attribute or a first heading does not name a tab. `carve upgrade` moves a 0.1
tab label into the quoted title (rewrite `U-412`):

<!-- carve-sample {"skip":"0.1 input to carve upgrade"} -->
```text
:::: tabs
::: tab [Installation]
`composer require markup-carve/carve-php`
:::
::: tab [Usage]
`$converter->convert($carve)`
:::
::::
```

becomes `::: tab "Installation"` and `::: tab "Usage"`.

A bracket label is still allowed on any div, and the renderer never drops it.
HTML writes it as `<p class="div-label">` after any title, the Markdown export
as a bold line, and plain text as a line of its own:

::: compare
```crv
::: note [Before you start]
Back up the database.
:::

::: steps [Step 1]
Run the installer.
:::
```
```html
<aside class="admonition note" aria-label="Note">
  <p class="div-label">Before you start</p>
  <p>Back up the database.</p>
</aside>
<div class="steps">
  <p class="div-label">Step 1</p>
  <p>Run the installer.</p>
</div>
```
:::

```text
$ carve render --to markdown labels.crv
labels.crv:5:1: warning markdown-container-flattened Flattened a container in Markdown
**Before you start**

Back up the database.

**Step 1**

Run the installer.
```

The same rule covers any construct whose meaning lives in an extension: its
fallback must hold the distinguishing text (a caption, a title, the source), so
a reader without the extension still sees it.

## Three kinds of fallback

"Not online" is two failure modes, not one, plus a third in the same family:

1. **Interaction only**: tabs, code groups, details, spoilers. The content is
   all present; only the click or hover is gone. Fallback: **flatten**. Show
   every panel with its title, open disclosures, reveal spoilers.
2. **Client-rendered visual**: Mermaid and the other diagram fences, math. The
   content is *source* that needs a client script to become a picture. Without
   the script you get the source, not the diagram. Fallback: **render at build
   time**. Give the diagram extension a build function (a local `dot`, `mmdc`)
   and render math server-side; otherwise the source is shown.
3. **Embedded**: iframes, video, maps. Online this is a live embed; offline it
   should be a **poster image plus a link**. The 0.2 standard catalog has no
   embed extension, so this is up to the host extension that adds one, and
   its mandatory fallback is where the poster and link belong.

Class 1 needs only the extensions' own static output. Classes 2 and 3 need
host code in the build: see [static rendering recipes](./static-rendering-recipes.md).

## Carrying a container through a round trip

Flattening keeps the words and loses the container. On the Markdown export that
is total for a tab set, an admonition, a named div, a disclosure, a spoiler and
a composite figure's group: no element, marker or attribute survives, so an
import cannot tell a container was ever there. An admonition loses its kind:

```text
$ carve render --to markdown note.crv | carve import --from markdown
An admonition body.
```

The 0.1 Markdown carrier mode, which bracketed each container with
`<!-- carve: ... -->` comments, is not part of the 0.2 Markdown export: the
export has no roundtrip option, and `--roundtrip` adds no markers to it. For a
round trip, go through HTML instead. The HTML importer reads the admonition back:

```text
$ carve render note.crv | carve import --from html
::: note
An admonition body.
:::
```

The `roundtrip` render option (`--roundtrip`) adds attributes for tree facts
HTML has no spelling for, such as whether a heading id was authored or generated,
so the HTML import gets more of the tree back. For a lossless exchange between
programs, use the AST JSON. See [HTML import](./html-import.md) and
[format conversion](./format-bridges.md).

## How the renderer chooses: the `mode` signal

The renderer does not guess how the output will be used. The application passes
`mode`, `interactive` (the default) or `static`, together with the output
format:

- **Output format.** The Markdown, plain text and ANSI exports are static by
  nature and always write the flattened forms, whatever mode the caller passed.
- **Mode (HTML only).** `interactive` uses each extension's interactive
  renderer; `static` uses its build-time renderer. Registering a renderer for
  interactive mode alone does not select it in static mode, and with no renderer
  in the selected channel the fallback is written.

So the **build chooses the mode by target**, the same way it chooses a
[profile](./profiles.md):

- **Online HTML**: `mode: 'interactive'` (`carve render`). Tabs are live,
  Mermaid draws through its script, math through KaTeX or MathJax.
- **Static HTML, PDF source, archives**: `mode: 'static'`
  (`carve render --mode static`), with build functions for diagrams and math
  blocks. Tabs become titled sections, disclosures open, diagrams become images
  or source. The page needs no client script.

There is no implicit detection: one input with the same format, mode, profile
and registered extensions gives one deterministic result. A host that wants both
an interactive site and a PDF renders twice with the two modes, or keeps the
interactive HTML and adds a print stylesheet (see below). On the command line,
`--extensions` registers standard extensions with their standard renderers;
build functions are host code and exist only in the library calls. See
[extensions](./extensions.md) for registration.

## A PDF workflow

Two routes; both rely on the rules above so no authored content is lost:

1. **HTML to PDF.** Render Carve to HTML with `mode: 'static'` and build
   functions for diagrams and math blocks, so tabs become titled sections,
   disclosures open, and diagrams and math arrive as images or MathML. Pass that
   self-contained HTML to a PDF tool such as WeasyPrint or headless Chromium.
   Client scripts do not run in that pipeline, which is why the build has to
   render the visuals. Core inline math (`` $`...` ``) stays TeX in a `math`
   span in both modes, so a PDF that needs typeset inline math must render those
   spans itself, for example with KaTeX's auto-render step in headless Chromium.
2. **Markdown to PDF.** Export to Markdown (the flattening is automatic), then
   hand it to a Markdown-to-PDF toolchain such as pandoc. Diagram and math
   source arrive as fences and `$...$` for that toolchain to handle.

The alternative to route 1 is to render the interactive HTML once and ship a
**print stylesheet** that, under `@media print`, opens disclosures, shows every
tab panel with its title, and reveals spoilers. That keeps one HTML file for
screen and print, but diagrams and math must still be print-visible, that is,
rendered at build time and not drawn by a script.

## Recommendations for interactive extensions

- **Tabs and code groups:** use the standard extensions; their static output and
  their fallback both keep each panel's title.
- **Mermaid and other diagrams:** for PDF and offline HTML, give the diagram
  extension a build function that renders SVG or PNG at build time; client
  scripts do not run in a print pipeline. For Markdown, keep the source fence;
  hosts such as GitHub render Mermaid fences.
- **Math:** for PDF, render math blocks server-side (KaTeX to MathML). The
  Markdown export keeps `$...$` source.
- **Your own extension:** make the fallback carry the meaning. A reader without
  your extension sees only the fallback, so put the title, caption or source
  there, not a placeholder.
- **Print stylesheet:** an HTML-to-PDF pipeline that keeps interactive HTML
  should ship a print stylesheet that opens disclosures, shows all tab panels
  with their titles, and reveals spoilers.

## Lint and diagnostics

A silently lost label is exactly the problem a validator should catch. In 0.2
the HTML renderer cannot lose one: a title or bracket label no extension consumes
is always written. What a build should watch instead are the render diagnostics:

- `extension-fallback-rendered`: an extension node was written as its
  fallback, because no renderer handled it or a renderer failed.
- `profile-construct-degraded`: the profile degraded a construct to plain text.
- `markdown-container-flattened`, `table-header-row-demoted` and the other
  export warnings: the Markdown export changed structure.

`carve render --strict-losses` turns these into a failed render, and
`--allow-loss <code>` accepts the ones a build expects. See
[validation](./validation.md).

**Specification (external):** [Extensions: transformation and carriage](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#transformation-and-carriage) and [resolution and rendering](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#resolution-rendering-and-equality) (C2-X-022, C2-X-032 to C2-X-035, C2-X-050, C2-X-052); [the tabs extension](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#standard-extension-tabs) (C2-X-039 to C2-X-056); [the 0.1 catalog extensions](https://github.com/markup-carve/carve/blob/main/spec/0.2/extensions.md#standard-extensions-of-the-01-catalog) (C2-X-061 to C2-X-065); [HTML options](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#options) (C2-H-122, C2-H-123, C2-H-163 to C2-H-168); [roundtrip carriers](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers) (C2-H-112 to C2-H-114); [tooling](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md) (C2-T-003, C2-T-010).
