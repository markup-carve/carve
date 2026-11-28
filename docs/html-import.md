---
description: Turn HTML into a Carve tree, Carve source and diagnostics.
---

# Import HTML

Use HTML import to migrate existing content into Carve or to accept HTML from an editor. The importer returns a Carve tree, the canonical Carve source for it, and a report of everything it could not keep exactly.

For the element-by-element rules, the options, and the edge cases a host meets, read the [HTML import contract](/html-import-contract).

## Basic workflow

1. Import a page to Carve source, and save the loss report beside it.
2. Read the report: each entry names what changed and where in the HTML.
3. Lint the source and render it, then check the structures your application depends on.
4. Store the source only after that review passes.

```sh
carve import --from html --report-losses page.report.json page.html -o page.crv
carve lint page.crv
carve render page.crv > page-output.html
```

For a large migration, keep each report with its source document, so a later review can tell an accepted conversion from a loss nobody noticed.

From JavaScript, call `importDocument(html, { from: 'html' })` from `@markup-carve/carve`. It returns `document` (the tree), `source` (the Carve source) and `diagnostics` (the report) from one import. If your workflow changes the tree, write it back with the canonical writer instead of assembling Carve source by hand.

## What the importer reads

A paragraph with strong text imports like this:

```html
<p>Hello <strong>world</strong>.</p>
```

```crv
Hello *world*.
```

Reported: nothing.

Typical editor output maps directly:

```html
<h2>Plan</h2><p>Ship the <em>first</em> draft by <strong>Friday</strong>.</p><ul><li><p>Write</p></li><li><p>Review</p></li></ul><p><a href="https://example.com/spec">Spec</a></p>
```

```crv
== Plan

Ship the /first/ draft by *Friday*.

- Write

- Review

[Spec](https://example.com/spec)
```

Reported: nothing.

Common document HTML has a direct Carve counterpart:

- headings, paragraphs, lists, task lists, definition lists, block quotes and code blocks;
- emphasis, strong, underline, strike, highlight, insertions, deletions, superscripts and subscripts;
- links, images, inline code and math with a TeX source;
- tables, including heads, feet, spans, alignment and captions;
- figures with captions, admonitions and named containers;
- footnotes, including the sections other renderers and word processors write;
- semantic inline elements such as `kbd`, `abbr` and `time`, as keyed spans.

Attributes that Carve can hold stay on their element. Event handlers, attribute names Carve cannot spell, denied URLs and the document `<head>` are removed and reported. HTML that a Carve renderer wrote with the `roundtrip` option carries extra `data-carve-*` attributes, and the importer uses them to rebuild reference links, generated ids and other facts plain HTML cannot show. Ordinary HTML needs none of them.

## Choose the options

There are no import modes in 0.2. Every input is read by the same mapping, and a few options change the result:

| Option | Flag | Use it when |
| --- | --- | --- |
| `adapter` | `--adapter NAME` | the HTML came from an editor: `tiptap`, `prosemirror`, `ckeditor`, `tinymce`, `word` or `google-docs`. `word` and `google-docs` turn exported footnote links into real footnotes. The default is `generic`. |
| `rawHtml` | `--raw-html` | you want comments, scripts, embeds and other raw HTML kept as raw nodes instead of dropped. Leave it off for untrusted input. |
| `listTable` | `--list-table` | a table has cells that hold several blocks, and the processor that reads the output has the list-table extension enabled |
| `strictLosses` | `--strict-losses` | any loss must fail the import |
| `allowLosses` | `--allow-loss CODE` | a loss code is acceptable for your migration, such as `import-whitespace-normalized` |
| `labels` | none | the HTML was rendered with a custom label map; pass the same map so generated names are recognized |

This Word export turns into a footnote with `--adapter word`:

```html
<p>Data<a href="#_ftn1" name="_ftnref1" title=""><span class="MsoFootnoteReference">[1]</span></a> centre.</p>
<div><br clear="all">
<hr align="left" size="1" width="33%">
<div id="ftn1">
<p><a href="#_ftnref1" name="_ftn1" title=""><span class="MsoFootnoteReference">[1]</span></a> NCAS British Atmospheric Data Centre</p>
</div>
</div>
```

```crv
Data[^1] centre.

[^1]: NCAS British Atmospheric Data Centre
```

Reported: `import-whitespace-normalized` on `#text`.

Without the adapter, the same input keeps its notes as links and containers.

## Read the report

Each entry has a `code`, a `severity`, a `message`, and a position: a byte range into the HTML with the tag name of the node in `foreignType`, or for a writer entry a path into the imported tree. Filter on the code, not the message, which is written for people and differs between engines.

| Severity | Meaning | Suggested response |
| --- | --- | --- |
| `hint` | whitespace was trimmed; no visible text changed | usually allow it |
| `warning` | something was dropped, mapped to a plainer node, or cannot be spelled in the source | review it when the affected content matters |
| `error` | any loss, under `strictLosses` | the command line writes no source (the library still returns the nearest source); fix the input or allow the code |

The codes you will see most:

| Code | What changed |
| --- | --- |
| `import-element-dropped` | an element or comment was removed with its content: the head, `<script>`, `<iframe>`, a comment with raw HTML off |
| `import-element-mapped` | an element with no Carve counterpart became a container, a span or its children |
| `import-attribute-dropped` | an attribute was removed: an event handler, an invalid name, a value outside its set |
| `import-destination-denied` | a `javascript:` or other denied URL; the link became its text |
| `import-structure-repaired` | invalid structure was dropped or fixed, such as an empty list or a stray list child |
| `import-whitespace-normalized` | layout whitespace was trimmed |
| `structure-unspellable`, `field-unspellable` | the tree holds something Carve source cannot spell, so the source is lossy |

An exact import emits no entry for that content.

On the command line, entries go to standard error with a line and column, and `--report-losses` writes them as JSON. When the writer reports `structure-unspellable` or `field-unspellable`, `carve import` writes no source for that file and fails it with the category `writer-refused`. The library call still returns the nearest source with the report, and the tree in `document` keeps the fact.

## Expected degradation

These outcomes are normal, and most of them appear in the report:

- An HTML comment, a script, an iframe or a video is dropped unless `rawHtml` is on.
- A custom element such as `<my-tag>` becomes a span. A custom element that wraps a whole page, such as `<react-app>`, collapses its blocks into one paragraph; unwrap it before importing.
- `<header>`, `<nav>`, `<details>` and similar elements become plain containers.
- A table cell holding several blocks is joined into one line, unless you use the list-table option.
- MathML without a TeX annotation or `alttext` becomes its text, which can read wrong: a fraction of 1 over 2 reads `12`.
- Ruby keeps its pairing in the tree, but the source writes `base(annotation)`.
- A code block's language is read only from a `language-X` class on `<code>`.
- A `style` attribute is kept as written, except the exact alignment spellings a Carve render writes.

These are not errors in themselves. What matters is that a meaningful change is reported rather than hidden.

## Raw content and trust

HTML import is not permission to trust arbitrary HTML. Raw HTML is off by default: comments and raw elements are dropped. With `--raw-html` the importer keeps them as raw nodes, with event handlers inside left as they were. A raw node in the tree is still data: a render without its own `rawHtml` option writes it as an escaped code block or text. Turn raw output on in the render only for trusted sources, keep Carve's URL protections enabled, and apply your normal HTML sanitization where raw HTML or arbitrary attributes reach a page. See [Security](/security).

The importer itself denies `javascript:`, `data:` and the other dangerous URL schemes. Any stricter URL policy belongs on the render, which applies it to every tree it is given.

## Verify a migration

Before a bulk conversion, assemble a small set of representative pages that includes tables, figures, links, code, footnotes, comments and any markup specific to your site or editor. For each, compare:

1. the original rendered page;
2. the imported Carve source;
3. the loss report; and
4. the rendered Carve result.

Decide which codes you accept, pass them with `--allow-loss`, and run the bulk import with `--strict-losses` so that any other loss stops a page instead of slipping through. [Format conversion](/format-bridges) explains the same review when another document model is involved.

## Changed in 0.2

The command is `carve import --from html`; the 0.1 `carve migrate --from html` is gone. The 0.1 modes `safe`, `semantic` and `roundtrip` are gone too: the importer reads every input the same way, raw content is controlled by `rawHtml`, and Carve HTML is recognized by its `data-carve-*` attributes. The diagnostic codes now start with `import-`, and `info` became `hint`. HTML comments are no longer imported as Carve comments; they are dropped, or kept as raw HTML with `--raw-html`.

The specified import path is HTML. The reference JavaScript engine also offers Markdown, GFM, Djot and BBCode importers through `--from`, but they are outside the 0.2 import contract. To move one of those formats through the specified path, convert it to HTML first and import that HTML. See [Upgrading from 0.1](/upgrade-0-2) for the rest of the changes.

## Technical reference

The [HTML import contract](/html-import-contract) covers the result and the writer's rows, the options and exit statuses, the codes and positions of the report, whitespace, every element family, figures, tables and list tables, containers and renderer conventions, attributes and generated names, footnotes, raw content, escaping, editor adapters, and what a render without `roundtrip` loses.

**Specification (external):** [importing HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), including [the two documents](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#carriers-and-the-two-documents), [how content is read](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#how-content-is-read), [whitespace](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#whitespace), [normalization](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#normalization), [raw content](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#raw-content), [diagnostics](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#diagnostics), [the guarantee](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#the-guarantee) and [editor adapters](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#editor-adapters); the [`carve import` command](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#carve-import) in the tooling chapter; and the [upgrade notes for the command line](https://github.com/markup-carve/carve/blob/main/spec/0.2/UPGRADING.md#command-line-and-missing-features).
