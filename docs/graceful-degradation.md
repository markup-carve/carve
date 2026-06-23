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

## How the renderer chooses: interactive vs static

The engine does **not** sniff the target. It does not ask "is this a PDF." The
degradation is decided entirely by two caller-controlled inputs:

1. **Output format.** Markdown, plain text, and ANSI are inherently static and
   have no extension render hooks, so they **always** take the fallback. The
   label-as-caption rule applies unconditionally there.
2. **The enabled extension set** for an HTML render. If the interactive group
   extension (tabs / code-group) is active, it transforms the node first and
   consumes the `[label]` into a clickable header - the core fallback never
   fires. If that extension is **not** enabled, the labeled container reaches
   the core renderer and the caption is emitted.

So the **build chooses the mode by target**, the same way it already chooses a
[profile](/profiles):

- **Online HTML** - enable the interactive extensions (tabs, code-group, the
  client-rendered mermaid/chart/math). Labels are consumed into live widgets.
- **Static HTML / PDF / Markdown / plain / ANSI export** - omit the interactive
  extensions. Labels surface as captions, diagram blocks fall back to source
  (or a pre-rendered image), and the output is self-contained.

There is no implicit detection and no ambiguity: a given `(format, extension
set)` pair produces one deterministic result. A host that wants both an
interactive site and a print/PDF artifact runs the render twice with the two
configurations, or keeps the interactive HTML and adds a print stylesheet (see
below). Implementations MAY ship a named **static / print preset** (the
extension-set analogue of a profile) so callers need not assemble the list by
hand.

## A PDF workflow

Two supported routes; both rely on the rules above so no authored content is
lost:

1. **HTML to PDF.** Render Carve to HTML **with the interactive extensions
   disabled** (so tabs become labeled stacked sections and disclosures expand),
   **pre-render** mermaid/charts to SVG/PNG, and render **math server-side**
   (KaTeX to MathML/HTML). Pass that self-contained HTML to a print engine
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
