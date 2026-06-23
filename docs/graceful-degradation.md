# Graceful Degradation

Carve renders to several targets: interactive HTML, static HTML (and PDF derived
from it), Markdown, plain text, and ANSI terminal output. Some constructs are
inherently interactive - tabs you click, disclosures you expand, diagrams a
script draws. This page defines how those constructs must behave when the target
is **not** interactive, so that no document silently loses content on the way to
print, Markdown, or a terminal.

## The principle

> When an interactive construct is rendered to a non-interactive target, the
> renderer MUST preserve the construct's **content and structure** and may drop
> only its **interaction**. Authored text - especially a label or title that
> distinguishes one panel from another - MUST NOT be silently discarded.

A reader of the PDF should be able to tell the tabs apart. A reader of the
Markdown export should see every panel's heading. Losing the click is fine;
losing the words is not.

## Output targets

| Target | Interaction | Client scripts | Typical use |
| --- | --- | --- | --- |
| Interactive HTML | yes | yes (KaTeX, mermaid, tab JS) | docs sites, blogs |
| Static HTML / PDF | no | no (print, weasyprint) | handouts, archives |
| Markdown | no | n/a (host may re-render) | export, interchange |
| Plain text / ANSI | no | n/a | terminals, emails, logs |

The non-interactive targets share one requirement: every authored token must
survive in a readable form.

## How each construct degrades

The table reflects the reference engines' renderer behavior.

| Construct | Interactive HTML | Static / PDF / Markdown / Plain | Status |
| --- | --- | --- | --- |
| Tabs / code-group | clickable tabs; `[label]` is the tab header | each panel shown in sequence, **its `[label]` as a caption heading** | see normative rule below |
| Disclosure (`details`) | collapsible; `"title"` is the summary | title shown, body expanded | degrades natively (title is a quoted title node) |
| Spoiler | blurred until revealed | revealed | degrades natively (hiding is meaningless offline) |
| Mermaid / charts | script-drawn diagram | diagram source preserved (a ` ```mermaid ` fence in Markdown); for PDF the extension SHOULD pre-render to SVG/PNG at build time | source never lost; image needs build-time render |
| Math (`$\`...\``) | KaTeX / MathJax | source preserved (`$...$` in Markdown); for PDF use server-side KaTeX to MathML/HTML | source never lost |
| Footnotes | jump links | print-native footnotes; `[^id]` preserved in Markdown | degrades natively |
| Links / autolinks | clickable | clickable in PDF; URL preserved in plain text | degrades natively |
| Cross-references / TOC | anchor links | internal PDF links; anchors preserved in Markdown | degrades natively |

Most constructs already degrade well because their distinguishing text is a
**title** (a quoted `"..."` node the renderer emits) or **source** (kept
verbatim). The exception is tabs/code-group, whose distinguishing text is a
**grouping `[label]`**.

## The label problem

A `:::` fenced div may carry a grouping `[label]`. By the block rules, core does
not assign the label any meaning - only a group extension (tabs, code-group)
consumes it, turning each panel's `[label]` into a clickable tab header. That is
correct for interactive HTML.

The hazard is every other target. When the group extension is absent (static
HTML, or any build that did not enable it) or cannot apply (Markdown, plain
text, ANSI, PDF), the label has historically been dropped. The panels then stack
with no indication of which is which:

```
:::: tabs
::: tab [Installation]
`composer require markup-carve/carve-php`
:::
::: tab [Usage]
`$converter->convert($carve)`
:::
::::
```

rendered to Markdown without the fallback collapses to two unlabeled code spans -
the reader cannot tell "Installation" from "Usage". The authored labels are gone.

## Normative rule: unconsumed labels render as captions

> A renderer that does not consume a fenced div's grouping `[label]` (because no
> group extension is active for the target) MUST render the label as a visible
> caption at the start of that div's content. The caption uses the same slot a
> quoted title would: an `<p class="div-label">` in HTML, a bold line in
> Markdown, and a standalone line in plain text and ANSI. If a block has both a
> title and a label, the title is rendered first.

This makes the label **degradation-safe by default**: it survives in every
target whether or not a group extension is present, and the interactive
extension simply consumes it earlier (transforming the node before rendering),
so there is no double rendering on the web.

The same invariant generalizes: any future construct whose meaning lives in an
extension-only token (a carousel index, an embed poster, a reveal trigger) MUST
define a static caption-or-source fallback, or the renderer MUST surface the
token rather than drop it.

## Three classes of degradation

"Not online" is two failure modes, not one, plus a third in the same family:

1. **Interaction-only** - tabs, code-group, details, spoiler. The content is all
   present; only the *UI* (click, hover) is gone. Fallback: **flatten** - show
   every panel, surface its label, expand disclosures.
2. **Client-rendered visual** - mermaid, charts, math. The content is *source*
   that needs a client script to become a visual. Offline you get raw source,
   not the diagram. Fallback: **move rendering to build time** - pre-render to an
   image (mermaid/chart) or server-side render (math); else degrade to source.
3. **Embedded** - iframes, video, future embed extensions. Online is a live
   embed; offline is a **poster image plus a link**.

Class 1 is a cheap markup transform. Classes 2 and 3 need a build-time renderer
and so are a pipeline concern, not a markup tweak.

## How the renderer chooses: the `mode` signal

The engine does **not** sniff the target. Degradation is set by a render
**mode** - `"interactive"` (default) or `"static"` - plus the output format:

- **Output format.** Markdown, plain text, and ANSI are inherently static and
  force `"static"`; the label-caption rule and source-fallbacks apply
  unconditionally there.
- **Mode (HTML only).** `"interactive"` renders the live forms; `"static"`
  renders through each extension's `renderStatic` path (and the core caption
  floor for any unconsumed label). See the
  [Extensions Contract](/extensions) for the `renderStatic` hook, the
  resolution order, and the `renderers` map that supplies class-2/3 build-time
  renderers.

So the **build chooses the mode by target**, the same way it already chooses a
[profile](/profiles):

- **Online HTML** - `mode: "interactive"`. Tabs are live, mermaid draws via its
  script, math via KaTeX.
- **Static HTML / PDF source / archival** - `mode: "static"` (with a `renderers`
  map for diagrams/math). Tabs flatten to labeled sections, diagrams become
  images or source, math is server-rendered or source - self-contained, no
  client JS required.

There is no implicit detection: a given `(format, mode, renderers)` triple
produces one deterministic result. A host that wants both an interactive site
and a print/PDF artifact renders twice with the two modes, or keeps the
interactive HTML and adds a print stylesheet (see below). `"print"`, `"email"`,
and similar are reserved for future named presets layered on `"static"`.

## A PDF workflow

Two supported routes; both rely on the rules above so no authored content is
lost:

1. **HTML to PDF.** Render Carve to HTML in **`mode: "static"`** with a
   `renderers` map (so tabs become labeled stacked sections, disclosures expand,
   mermaid/charts **pre-render** to SVG/PNG, and **math** renders server-side).
   Pass that self-contained HTML to a print engine
   (weasyprint, headless Chromium). Because client scripts never run in a print
   engine, anything left to client JS would otherwise be blank - the disabled
   extensions plus pre-rendering are what make the PDF complete.
2. **Markdown to PDF.** Render Carve to Markdown (the fallback is automatic),
   then hand it to a Markdown-to-PDF toolchain (for example pandoc). Diagram
   and math source survive as fenced blocks for that toolchain to handle.

The alternative to route 1's "disable extensions" step is to render the
interactive HTML once and ship a **print stylesheet** that, under
`@media print`, expands disclosures, shows every tab panel with its label, and
reveals spoilers. That keeps a single HTML artifact serving both screen and
print, at the cost of a stylesheet that the diagram/math extensions must still
cooperate with (their output must be print-visible, i.e. pre-rendered, not
script-drawn).

## Recommendations for interactive extensions

- **Tabs / code-group:** rely on the label-caption fallback above; an extension
  targeting a non-HTML renderer SHOULD emit each panel as a labeled section.
- **Mermaid / charts:** for PDF and offline HTML, pre-render diagrams to SVG or
  PNG at build time (client scripts do not run in a print pipeline). For
  Markdown, keep the source fence - hosts such as GitHub render it.
- **Math:** for PDF, render server-side (KaTeX to MathML/HTML). Keep `$...$`
  source in Markdown.
- **Print stylesheet:** an HTML-to-PDF pipeline SHOULD ship a print stylesheet
  that force-expands disclosures, shows all tab panels with their labels, and
  reveals spoilers.

## Lint

Silent loss of an authored label is exactly the class of problem the validator
should catch. A grouping `[label]` (or title) that no active renderer consumes
and that is not surfaced as a caption SHOULD be reported by `carve lint`, the
same way broken cross-references and leaked block markers are.
