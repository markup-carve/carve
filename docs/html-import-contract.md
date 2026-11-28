---
description: An integration map for the Carve 0.2 HTML importer.
---

# HTML import contract

This page is for hosts that feed HTML into Carve and for authors of importers. For a first migration, the command line, and how to review a report, start with [Import HTML](/html-import).

> [!TIP]
> If you integrate an importer into an application, read the sections on the result, options and losses first. The element families after them say what each kind of HTML becomes, with the edge cases a host meets on real pages.

HTML import is a migration boundary, not an HTML serializer. The importer parses HTML the way a browser does, maps what it can to a Carve 0.2 tree, and writes Carve source from that tree with the canonical writer. Every fact of the input that the tree does not keep is reported. The examples on this page are real output of the reference importer: the HTML input comes first, then the Carve source the import returns, then the codes it reported.

## What the contract is for

A host uses the importer for one of three jobs:

- **Migration.** Move pages out of a CMS, a wiki or a static site into `.crv` files. The source is the artifact you keep, so the report tells you what a page lost on the way.
- **Editor intake.** Accept HTML from a rich text editor or a clipboard and store it as Carve. The `adapter` option names the editor that wrote it.
- **Round trips.** Render Carve to HTML, let something else touch the HTML, and read it back. A render with `roundtrip` writes carriers that tell the importer what plain HTML cannot hold.

All three run the same mapping. There is no mode for trusted input and no mode for Carve output: the importer reads every input the same way and never guesses which tool wrote it.

## Pipeline

```text
HTML text -> HTML parser -> tree of elements -> mapping -> Carve 0.2 tree -> canonical writer -> Carve source
```

1. **Document or fragment.** After any leading whitespace and comments, an input that starts with `<!doctype` or `<html` (in any letter case) is a document. Anything else is a fragment and is parsed as the content of a `<body>`.
2. **Parse.** The importer reads the tree the HTML parser builds, not the input text. Character references are already decoded, a CR LF pair is one line feed, attribute names are lower case, and the elements the parser opened, closed or moved stand where it put them. The importer reports none of this work.
3. **Map.** Each element is read by its row in the element table: it becomes a node, a `div`, a `span`, its children, raw HTML, or nothing. The sections below go family by family.
4. **Write.** The canonical writer spells the tree. What the writer cannot spell, it reports in the same record.

A document's content is its `<body>`. The `lang` of `<body>`, or else of `<html>`, becomes the `lang` of the document node, and a `dir` is read the same way. `<head>` is dropped with everything in it, and so is the doctype. Any other attribute of `<html>` and `<body>` is dropped and reported.

```html
<!DOCTYPE html>
<html lang="de">
<head><title>T</title><script>x()</script></head>
<body class="page"><p>Hallo</p></body>
</html>
```

```crv
Hallo
```

Reported: `import-element-dropped` on `#doctype`, `import-element-dropped` on `<head>`, `import-attribute-dropped` on `<body>`, `field-unspellable`.

The `lang` survives in the tree but not in the source: Carve source has no spelling for a document language, so the writer reports `field-unspellable` at `/lang`. The next section explains what a host does with such a row.

## The result: one tree, one source, one report

`importDocument(html, { from: 'html' })` returns three things from one import:

- `document`: the Carve 0.2 tree. It passes the schema and the reader's checks.
- `source`: the canonical Carve source the writer wrote from that tree.
- `diagnostics`: one list of entries from the importer and from the writer.

The tree and the source say the same thing, except where the writer reports `field-unspellable` or `structure-unspellable`. Such a row names, by JSON path, the part of the tree the source could not hold. The importer reports what it changed; the writer reports what it cannot spell. A host that keeps the source should treat a writer row as a loss of that source, even though the tree still has the fact.

An attribute value holding a line feed is a typical case. The tree keeps the value as it stands, and the source writes a space instead:

```html
<div class="h" data-copy="a
b"><pre><code>x</code></pre></div>
```

````crv
{data-copy="a b"}
::: h
```
x
```
:::
````

Reported: `field-unspellable`.

What a host does with this:

- To keep the facts the source cannot hold, store the tree as AST JSON beside the source, or instead of it. See [AST JSON](/ast-json).
- To refuse such a page, check for the two writer codes, or run with `strictLosses`, which turns every loss into an error.
- The command line does not write a source that `field-unspellable` or `structure-unspellable` makes lossy. Without `--strict-losses`, `carve import` fails that file with the category `writer-refused` and status 1, and writes the rows on standard error. The library call still returns the nearest source with its report.

Changed in 0.2: 0.1 had two calls, `htmlToAst` and `htmlToCarve`, and a stated invariant that parsing the second gave the first. 0.2 returns both from one call, and the writer rows are the stated exceptions.

## Two kinds of input: Carve HTML and other HTML

A render of Carve with the `roundtrip` option writes reserved `data-carve-*` attributes, called carriers, on the elements whose Carve meaning HTML cannot show: a generated heading id, a reference link, an autolink, a list's tightness, a footnote label, and about twenty more. The importer reads a carrier where it stands and never keeps it as an attribute. An element without a carrier is read by the ordinary mapping, so one input can mix both, element by element.

This is a heading with a generated id, a reference link and an autolink, rendered with `roundtrip`:

```html
<section data-carve-generated-id id="Intro">
  <h1>Intro</h1>
  <p>See <a href="/guide" title="Guide" data-carve-ref="g">the guide</a> and <a href="https://example.com" data-carve-autolink>https://example.com</a>.</p>
</section>
```

```crv
= Intro

See [the guide][g] and <https://example.com>.

[g]: /guide "Guide"
```

Reported: nothing.

The same source rendered without `roundtrip` comes back with the facts the HTML could not show turned into their plain equivalents: the generated id becomes an authored one, the reference an inline link, and the autolink a link whose text is its target.

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="/guide" title="Guide">the guide</a> and <a href="https://example.com">https://example.com</a>.</p>
</section>
```

```crv
{#Intro}
= Intro

See [the guide](/guide "Guide") and [https://example.com](https://example.com).
```

Reported: nothing.

A carrier that is malformed, contradicts the HTML around it, or contradicts another carrier on the same element is ignored and reported. The element is then read as it stands:

```html
<ul data-carve-tight><li><p>a</p></li><li><p>b</p></li></ul>
```

```crv
- a

- b
```

Reported: `import-carrier-ignored` on `<ul>`.

`data-carve-tight` is ignored here because each item starts with a bare `<p>`, which a tight list never writes. The list reads as loose.

The [guarantee](#what-a-render-without-roundtrip-loses) at the end of this page lists what a render without `roundtrip` loses, carrier by carrier.

The renderer's other conventions need no carrier and apply to every input: the `<section>` a render opens at a heading, the footnote section, the classes of admonitions and named containers, the task box, and the alignment declarations. Foreign HTML that uses one of them is read as Carve HTML that uses it.

## API and command line

The library call is `importDocument(input, options)` from `@markup-carve/carve`. It is also exported from `@markup-carve/carve/import`, but that entry does not take `allowLosses` or `maxLosses`. The options of the core entry:

| Option | Default | Effect |
| --- | --- | --- |
| `from` | required | `'html'`. The reference engine also reads `markdown`, `gfm`, `djot` and `bbcode`; those are outside this contract. |
| `rawHtml` | `false` | Keeps comments and raw elements as raw nodes instead of dropping them. See [Comments and raw content](#comments-and-raw-content). |
| `adapter` | `'generic'` | The editor that wrote the HTML. See [Editor adapters](#editor-adapters). |
| `listTable` | `false` | Writes a table whose cells hold blocks as a list table. See [Tables whose cells hold blocks](#tables-whose-cells-hold-blocks). |
| `labels` | the defaults | The label map the HTML was rendered with, so generated accessible names are recognized. See [Generated names and labels](#generated-names-and-labels). |
| `strictLosses` | `false` | Turns every loss entry, the importer's and the writer's, into an error. |
| `allowLosses` | `[]` | Loss codes the host accepts. An allowed entry is left out of the record and never makes an import fail. |
| `maxLosses` | `100` | The number of loss entries kept. The rest are counted in `suppressedDiagnostics`. |

An unknown option or value, such as an `adapter` outside the list, throws `CarveOptionError` before the import starts. An input whose tree would nest deeper than a reader accepts throws `ImportInputError`; no partial tree is returned.

The command line maps the same options to flags:

```sh
carve import --from html page.html > page.crv
carve import --from html --adapter word --report-losses page.report.json export.html -o page.crv
carve import --from html --strict-losses --allow-loss import-whitespace-normalized page.html
```

| Flag | Option |
| --- | --- |
| `--from html` | `from`, required; without it the run fails with the category `usage` |
| `--adapter NAME` | `adapter`; an unknown name fails with `usage` |
| `--raw-html` | `rawHtml` |
| `--list-table` | `listTable` |
| `--strict-losses` | `strictLosses` |
| `--allow-loss CODE` | `allowLosses`, repeatable |
| `--max-render-losses N` | `maxLosses` |
| `--report-losses PATH` | writes the record as a JSON report |
| `--output PATH`, `-o PATH` | writes the source to a file |

`labels` has no flag; use the library call when the HTML was rendered with a custom label map.

Exit statuses a script should handle:

| Status | Category | When |
| --- | --- | --- |
| 0 | none | the source was written; loss rows, if any, went to standard error |
| 1 | `render-loss` | a loss under `--strict-losses`; no source is written |
| 1 | `writer-refused` | the writer reported `field-unspellable` or `structure-unspellable` without `--strict-losses` |
| 1 | `import-tree-invalid` | the importer built a tree the reader refuses; this is an engine defect |
| 2 | `import-input-invalid` | the input nests deeper than a reader accepts |
| 2 | `usage` | a missing `--from`, an unknown adapter, or another bad flag |

Several input files on one run write their sources one after another to standard output. Import one file per run, or pass `--output`, when you need one source per page.

Changed in 0.2: the 0.1 command was `carve migrate --from html` with `--mode`, `--report`, `--check-loss` and `--list-table`. It is now `carve import --from html`. The modes are gone (see [What 0.2 removed](#what-0-2-removed)), `--report` became `--report-losses`, and `--check-loss` became `--strict-losses`.

## Losses and the report

Every entry in the record has a `code`, a `severity`, a `channel`, a `message`, and a position. The importer's entries are in the `render-loss` channel, the same channel as the writer's.

The importer has seven codes:

| Code | Severity | What it reports |
| --- | --- | --- |
| `import-element-dropped` | warning | an element or comment given nothing, with its content: the head, the doctype, an element whose row says `drop`, and with `rawHtml` off every comment and raw element; a second task box or table caption; a ranged comment with no text |
| `import-element-mapped` | warning | an element without a Carve counterpart read as a `div`, a `span` or its children; a block element inside inline content; a `<section>` without a heading; MathML without TeX |
| `import-attribute-dropped` | warning | an attribute the tree does not keep: an event handler, a name that is no Carve key, an invalid `dir`, a section or wrapper attribute, an out-of-range list start, an unknown task state, a value outside its set |
| `import-destination-denied` | warning | a link or image destination that fails the deny list; the link becomes its text and the image its alt text |
| `import-structure-repaired` | warning | content dropped or changed so that the tree is valid: a non-item child of a list, a foreign child of a table or description list, a second table head or foot, a clamped row span, an empty node that held attributes, a ruby base with no annotation, a ranged comment read as a point |
| `import-carrier-ignored` | warning | a `data-carve-*` carrier that was malformed or contradicted |
| `import-whitespace-normalized` | hint | whitespace removed or a line break turned into a space; no visible text changed |

The writer adds `field-unspellable` and `structure-unspellable` for tree facts the source cannot hold, and `image-alt-unknown` for an image whose alt text is unknown. The last one never fails an import on its own outside `strictLosses`.

### Position of an entry

An importer entry is positioned in the HTML input: `range` holds the start and end of the element, attribute owner or text node in UTF-8 bytes, and `foreignType` names that node by its lower-case tag name, or `#comment`, `#text` or `#doctype`. The command line adds `line` and `column` for display. A writer entry has no range in the HTML; it carries `path`, a JSON pointer into the imported tree.

```json
{
  "code": "import-attribute-dropped",
  "severity": "warning",
  "channel": "render-loss",
  "message": "Attribute onclick dropped: an event handler",
  "foreignType": "b",
  "range": { "startOffset": 88, "endOffset": 110 }
}
```

The `message` is written for people and is not stable across engines. Filter on `code`, locate with `range` and `foreignType`, and show the message. The record is not sorted by document position: sort by `range.startOffset` when a reviewer reads it top to bottom.

### Severity, strict mode and the allow list

`strictLosses` turns every loss entry into an error, the importer's and the writer's, hints included. A page that only had layout whitespace trimmed therefore fails under `--strict-losses` unless the host allows that code:

```sh
carve import --from html --strict-losses --allow-loss import-whitespace-normalized page.html
```

An allowed code is left out of the record and does not count toward `maxLosses`. A useful baseline for a migration is to allow `import-whitespace-normalized`, review everything else, and decide per code which ones block publishing.

### Every loss is reported

The rule behind the record is that every fact of the input the tree does not hold, and every change of a fact, is reported, except where a rule on this page says a drop is silent. The silent cases are deliberate: they lose nothing a reader could see or a render writes back, such as an empty `<p>` with no attributes, the `<rp>` parentheses of ruby, a footnote backlink, or an accessible name the renderer generates.

A loss row is a ceiling, not a license. Because every change is reported, a row covers its own subject and nothing else: an import that also damages a neighboring construct on the way to a declared loss has made an unreported change, which is a defect even when the row is accurate.

Changed in 0.2: 0.1 used the codes `element-dropped`, `element-unwrapped`, `attribute-dropped`, `attribute-preserved`, `style-unmapped`, `table-degraded`, `raw-preserved`, `encoding-assumed` and `diagnostics-truncated`, with severities `info`, `warning` and `error`, a required order by document position, and an XPath-like `path` into the HTML. 0.2 uses the seven `import-*` codes above, the severity `hint` instead of `info`, byte ranges into the HTML, and no required order. The cap is now `maxLosses` with a `suppressedDiagnostics` count instead of a `diagnostics-truncated` entry.

## Whitespace

Whitespace here means the HTML Standard's ASCII whitespace: space, tab, line feed, form feed and carriage return.

- Text that holds only whitespace between two blocks is not read.
- In inline content, spaces and tabs around a line feed are removed, and a run of line feeds with only spaces and tabs between them is one soft break. A line feed directly before a `<br>` is removed.
- At the start and end of a block's inline content, whitespace and a soft break are removed. A `<br>` at the end of a block is removed too: it renders no line.
- A run of spaces inside a line is kept. A Carve paragraph holds it and the renderer writes it back.
- The text of `<pre>`, and the value of a code span, a math node and a raw node, are read verbatim.

Each trim is reported with `import-whitespace-normalized` at severity `hint`, since no visible text changes.

```html
<p>
  one
  two
</p>
<p>  lead <b>x</b> <br></p>
```

```crv
one
two

lead *x*
```

Reported: `import-whitespace-normalized` on `<p>`, `import-whitespace-normalized` on `#text`, `import-whitespace-normalized` on `#text`.

```html
<p>a   b&nbsp;&nbsp;c</p>
```

```crv
a   b  c
```

Reported: nothing.

The two characters between `b` and `c` in that source are U+00A0, kept as written.

### A whitespace-only block keeps its content and drops its layout

A no-break space is not whitespace in this sense. A `<p>&nbsp;</p>` is a paragraph holding U+00A0 and is kept, written as the character itself. A `<p> </p>` holds only layout and gives nothing:

```html
<ul><li>a</li></ul><p>&nbsp;</p><p> </p><ul><li>b</li></ul>
```

```crv
- a

 

- b
```

Reported: `import-whitespace-normalized` on `#text`.

The middle line of that source is a single U+00A0, which Carve reads back as a paragraph. The same rule keeps U+202F and U+3000. Word, CKEditor and TinyMCE write `<p>&nbsp;</p>` as a spacer; a migration that wants those gone removes them before the import, since the importer cannot tell a spacer from content.

### Edge whitespace inside a link stays inside it

Text inside a link or span is kept as it stands, edge spaces included:

```html
<p>Source: <a href="https://jma.go.jp/"> Japan Meteorological Agency </a>.</p>
```

```crv
Source: [ Japan Meteorological Agency ](https://jma.go.jp/).
```

Reported: nothing.

The label keeps its spaces, so the rendered link underlines them as the original did. A host that wants the 0.1 behavior trims link text before the import.

Changed in 0.2: 0.1 moved the edge whitespace of a link or span outside it; 0.2 keeps it inside. A dropped whitespace-only paragraph is now an `import-whitespace-normalized` hint instead of an `element-dropped` row.

## Paragraphs and runs

Among blocks, a run of adjacent text, comments and inline elements is one paragraph, as a render writes a bare paragraph. The run splits only at a block element. A run that holds only images, whitespace and comments gives one image paragraph per image:

```html
a <em>b</em> c<p>d</p><img src="a.png" alt="a"><img src="b.png" alt="b">
```

```crv
a /b/ c

d

![a](a.png)

![b](b.png)
```

Reported: nothing.

Inside inline content, an element that is normally a block is read as a span of its inline content and reported. The HTML parser already closes a `<p>` before a block element, so this happens only inside other inline elements:

```html
<em><p>x</p></em>
```

```crv
/[x]{}/
```

Reported: `import-element-mapped` on `<p>`.

### Empty blocks are dropped

A paragraph, heading or term with no content is dropped. When it carried an attribute, one `import-structure-repaired` row says so; a bare empty element loses nothing and is dropped silently. An `<hr>` has a spelling and keeps its attributes.

```html
<p>a</p><p class="mw-empty-elt" id="x"></p><h1></h1><h2 id="k"> </h2><p>b</p><hr id="h">
```

```crv
a

b

{#h}
***
```

Reported: `import-structure-repaired` on `<p>`, `import-whitespace-normalized` on `#text`, `import-structure-repaired` on `<h2>`.

Writing the attributes on a line of their own does not keep them: an attribute line attaches to the next block, so `{#x .mw-empty-elt}` above `b` would move the id and class onto a paragraph that never had them.

Changed in 0.2: 0.1 reported every dropped empty heading, attributes or not. 0.2 reports only the drop of one that carried attributes.

## Headings and sections

`<h1>` to `<h6>` give a heading of that level, written with `=` marks. `<div role="heading" aria-level="N">` with N above 6 is a heading of that level; Carve source cannot spell a level above 6, so the writer reports it.

A `<section>` whose first element child is a heading is the section a render opens at a heading. It gives the heading and then the blocks that follow, and its `id` becomes the heading's id:

```html
<section id="S1" class="ltx_section"><h2 class="t">Intro</h2><p>x</p></section>
<section id="outer"><h2 id="inner">Own id</h2></section>
<section><p>no heading</p></section>
```

```crv
{#S1 .t}
== Intro

x

{#inner}
== Own id

:::
no heading
:::
```

Reported: `import-attribute-dropped` on `<section>`, `import-attribute-dropped` on `<section>`, `import-element-mapped` on `<section>`.

- Every id is authored. Without the `data-carve-generated-id` carrier the importer cannot tell a generated id from an authored one, so it keeps them all.
- When the heading has an id of its own that differs, the heading's id wins and the section's id is reported.
- Every other attribute of the section is reported. The renderer writes nothing else on that wrapper, so nothing else moves onto the heading.
- A `<section>` that does not open with a heading is a `div`, reported with `import-element-mapped`.

Duplicate ids are kept as written. The tree then holds a duplicate id, which a later parse reports as `duplicate-id`; the importer changes no id.

Changed in 0.2: 0.1 dropped an id that equaled the one the renderer would derive for the heading. 0.2 keeps every id, because only a carrier proves an id was generated.

## Lists

`<ul>` and `<menu>` are bullet lists with the `-` marker; `<ol>` is an ordered list. `type` gives the style when it is `a`, `A`, `i` or `I`. `start` gives the first number when it is not 1 and is in range; another value is reported. `data-delim=")"`, which every render writes for that delimiter, gives `)`.

```html
<ol start="3" type="a" data-delim=")">
  <li>three</li>
  <li><input type="checkbox" checked disabled> done</li>
</ol>
```

```crv
c) three
d) [x] done
```

Reported: nothing.

### Lists keep the source's tightness

A list is loose when an item starts with a `<p>` that has no attributes, or when an item holds more than one block that is not a list. Otherwise it is tight. A list with one item is always tight, because Carve has no loose one-item list.

```html
<ul><li>one</li><li>two</li></ul>
<ol><li><p>one</p></li><li><p>two</p></li></ol>
<ul><li>one</li><li><p>two</p></li></ul>
<ol><li><p>only</p></li></ol>
```

```crv
- one
- two

. one

. two

- one

- two

. only
```

Reported: nothing.

Carve spells tightness per list, so a mixed list resolves to loose: one paragraph item loosens the whole list, as in CommonMark. An ordered list with the default numbering is written with the `.` marker, which numbers itself.

Changed in 0.2: 0.1 kept a one-item `<li><p>` list loose with a `{loose}` key. 0.2 has no loose one-item list, so it imports as tight with no report.

### Task items

The first `<input type="checkbox">` that is a child of an `<li>` is the task box. Its state comes from `data-task-state` when that value is a known task state, and otherwise from `checked`. An unknown `data-task-state` is reported; a second checkbox is dropped and reported. The `task` class, the `list-style: none` declaration of an item and the `task-list` class of the list are the renderer's and are consumed:

```html
<ul class="task-list c"><li data-task-state="?"><input type="checkbox"> ask</li><li data-task-state="maybe"><input type="checkbox" checked> done</li><li><input type="checkbox"><input type="checkbox" checked> two boxes</li></ul>
```

```crv
{.c}
- [?] ask
- [x] done
- [ ] two boxes
```

Reported: `import-attribute-dropped` on `<li>`, `import-element-dropped` on `<input>`, `import-whitespace-normalized` on `<input>`.

An ordered list takes task items too, as the `d) [x] done` item above shows.

Changed in 0.2: 0.1 could not spell a box on an ordered item and kept the brackets as text with a `structure-unspellable` row. 0.2 spells ordered task items.

### Repairs

A list with no item is dropped and reported. A child of a list that is not an `<li>` is dropped with its content and reported; whitespace between items is not such a child.

```html
<div class="m"><ul class="menu"></ul></div><ul><li>a</li>stray<p>p</p></ul>
```

```crv
::: m

:::

- a
```

Reported: `import-structure-repaired` on `<ul>`, `import-structure-repaired` on `#text`, `import-structure-repaired` on `<p>`.

The empty list leaves its container behind with nothing in it. Writing the list's attributes on a line of their own would attach them to the next block instead.

## Definition lists

`<dl>` is a definition list, `<dt>` a term of inline content, and `<dd>` a description of blocks. A `<div>` inside a `<dl>`, which HTML allows around a group, is read as the children it holds. Any other child is dropped and reported.

```html
<dl><dt>Term</dt><dd>One</dd><dd><p>Two</p><p>Three</p></dd></dl><dl><div><dt>a</dt><dd>b</dd></div></dl>
```

```crv
:: Term
: One
: Two

  Three



:: a
: b
```

Reported: nothing.

Two adjacent `<dl>` elements stay two lists. Three blank lines end a description list, and the writer puts them between the two.

An empty `<dd>` and a `<dd>` before the first `<dt>` are kept in the tree as they stand. Carve source has no spelling for either, so the writer reports `structure-unspellable` and writes the nearest source:

```html
<dl><dt>term</dt><dd></dd></dl>
```

```text
:: term
:
```

Reported: `structure-unspellable`, `structure-unspellable`. This nearest source is not a `carve fmt` fixed point, so it is shown as plain text.

```html
<dl><dd>a</dd><dt>t</dt><dd>d</dd></dl>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
```crv
: a
:: t
: d
```

Reported: `structure-unspellable`.

A host that keeps the source should treat these rows as real losses: the nearest source does not read back to the same list. Fill or remove empty descriptions before the import when the source is the artifact.

Changed in 0.2: 0.1 wrote an empty `<dd>` as `: {empty}` and moved a leading `<dd>` out of the list as plain blocks. 0.2 keeps both in the tree and leaves the spelling problem to the writer's report.

## Code blocks

`<pre>` is a code block. Its value is the text of its `<code>` child when it has one, otherwise its own text, with any markup inside dropped. A value that is not empty and does not end with a line feed gets one. The `title` of `<pre>` is the block's title, and the other attributes of `<pre>` stay on the block.

### The last newline of a code block is its terminator

A render writes one line feed before `</code>` for a block whose content is `x`, and two for one whose content ends in a blank line. The importer reads both back to what they were written from: the final line feed is the terminator, and any line feed before it is content. Nothing is reported.

```html
<pre><code>x
</code></pre>
<pre><code>x

</code></pre>
<pre>y</pre>
```

````crv
```
x
```

```
x

```

```
y
```
````

```html
<pre><code>x
</code></pre>
<pre><code>x

</code></pre>
<pre><code>y
</code></pre>
```

Reported: nothing.

### Language

Only one language convention is read: the first class of the `<code>` child that starts with `language-` gives the code block's language, the rest of the class. Every other attribute of `<code>` is dropped and reported. A class on `<pre>` stays a class of the block and does not give a language.

```html
<pre title="Example"><code class="language-js">let a = 1
</code></pre>
<pre class="language-py"><code>b = 2</code></pre>
<pre><code class="lang-rb" data-lang="ruby">c = 3</code></pre>
```

````crv
```js "Example"
let a = 1
```

{.language-py}
```
b = 2
```

```
c = 3
```
````

Reported: `import-attribute-dropped` on `<code>`.

A host that imports pages from highlighters that use other conventions (`lang-X`, `data-lang`, `brush: X`, or a GitHub or Sphinx wrapper `div`) rewrites them to a `language-X` class on `<code>` before the import.

Changed in 0.2: 0.1 read seven language conventions on `<code>`, `<pre>` and up to two wrapper levels. 0.2 reads only `language-X` on `<code>`.

## Tables

`<table>` is a table. `<thead>`, `<tbody>` and `<tfoot>` are its head, body and foot; rows that are direct children of `<table>` form a body of their own. The first `<thead>` is the first group and the first `<tfoot>` the last, wherever they stand, as a browser shows them. Each further `<thead>` or `<tfoot>` stays a body at its place and is reported.

```html
<table>
<caption>Prices</caption>
<thead><tr><th>Item</th><th style="text-align: right;">Cost</th></tr></thead>
<tbody><tr><td>tea</td><td style="text-align: right;">2</td></tr></tbody>
<tfoot><tr><td>all</td><td>2</td></tr></tfoot>
</table>
```

```crv
{footer-rows=1}
|= Item |={>} Cost |
| tea | 2 |
| all | 2 |
^ Prices
```

Reported: nothing.

A table with no `<thead>` takes as its head the leading rows whose cells are all `<th>` without a `scope`, or with `scope="col"`. A `<th>` elsewhere stays a header cell in its row:

```html
<table><tr><th>A</th><th>B</th></tr><tr><th>1</th><td>2</td></tr></table>
```

```crv
|= A |= B |
|= 1 | 2 |
```

Reported: nothing.

### Alignment

A cell's alignment comes from `align`, or from a `style` spelled exactly as a render writes it: `text-align: left;`, `text-align: right;` or `text-align: center;`, and for vertical alignment `vertical-align: top;`, `middle;`, `bottom;` or `baseline;`. Both may stand in one `style`, in that order, separated by one space. When an attribute and a declaration give the same axis, the declaration wins and the attribute is reported. Values of `align`, `valign` and `scope` ignore letter case.

Alignments are then resolved backward: a body cell that shows its header cell's alignment takes it from the header, and a headless table whose column cells all agree gives the alignment to the column. A cell that differs keeps its own mark.

```html
<table>
<thead><tr><th style="text-align: center;">H</th><th style="text-align:center">I</th><th align="RIGHT">J</th></tr></thead>
<tbody><tr><td style="text-align: center;">a</td><td>b</td><td style="text-align: left;">c</td></tr></tbody>
</table>
```

```crv
|={~} H |={style=text-align:center} I |={>} J |
| a | b |{<} c |
```

Reported: nothing.

A `style` spelled any other way is not parsed. `text-align:center` without the space and the semicolon stays a `style` key on the cell, as the second header shows, and the renderer writes it back as it stands.

Changed in 0.2: 0.1 read cell CSS case-insensitively with free whitespace and reported other declarations as `style-unmapped`. 0.2 reads only the renderer's exact spelling and keeps any other `style` as an attribute.

### Spans, columns and captions

`colspan` and `rowspan` above 1 give spans, written with the `<` and `^` placeholders. A `rowspan` of 0 gives no span and is reported. A row span that reaches past its group is clamped and reported.

```html
<table><tr><td colspan="2">wide</td></tr><tr><td rowspan="0">a</td><td>b</td></tr><tr><td>c</td><td>d</td></tr></table>
```

```crv
| wide | < |
| a | b |
| c | d |
```

Reported: `import-structure-repaired` on `<td>`.

The first `<colgroup>` gives column widths from a `<col>` style `width: N%`, with N above 0 and at most 100. A `<col>` style that holds anything else, or no valid width, is reported. The first `<caption>` is the table's caption; each further one is dropped and reported:

```html
<table><colgroup><col style="width: 30%"><col style="width: 70%; color: red"></colgroup><caption>A</caption><caption>B</caption><tr><td>a</td><td>b</td></tr></table>
```

```crv
{widths=30,70}
| a | b |
^ A
```

Reported: `import-element-dropped` on `<caption>`, `import-attribute-dropped` on `<col>`.

### Cells and line breaks

A cell that holds no block holds one cell paragraph. A `<br>` or a line feed in it becomes one space, reported as a hint, because a pipe-table row is one line. A cell that holds blocks keeps them in the tree; the pipe form cannot spell them, so the writer joins their text and reports the cell:

```html
<table><tr><td>a<br>b</td><td><p>one</p><p>two</p></td></tr></table>
```

```crv
| a b | one two |
```

Reported: `import-whitespace-normalized` on `<td>`, `structure-unspellable`.

### Tables whose cells hold blocks

With the `listTable` option (`--list-table`), a table one of whose cells holds two or more blocks, or one block that is not a paragraph, is written as a list table instead. Every other table keeps the pipe form, so turning the option on does not rewrite a table whose cells are all inline.

The option is off by default because the list table is an extension. A processor that has not enabled it renders a `div` around nested lists, which is worse than a flattened table. The caller knows which processor reads the output; the importer does not.

Without the option, this table loses its code block into one line:

```html
<table>
<caption>Steps</caption>
<tr><th>Step</th><th>Detail</th></tr>
<tr><th>1</th><td><p>Install.</p><pre><code>npm i</code></pre></td></tr>
<tr><td colspan="2">^</td></tr>
</table>
```

```text
|= Step |= Detail |
|= 1 | Install.  |
| \^ | < |
^ Steps
```

Reported: `structure-unspellable`. This nearest source is not a `carve fmt` fixed point, so it is shown as plain text.

With it:

```html
<table>
<caption>Steps</caption>
<tr><th>Step</th><th>Detail</th></tr>
<tr><th>1</th><td><p>Install.</p><pre><code>npm i</code></pre></td></tr>
<tr><td colspan="2">^</td></tr>
</table>
```

````crv
{header-rows=1}
::: list-table "Steps"
- - Step
  - Detail
- -{header} 1

  - Install.

    ```
    npm i
    ```
- - !`^`
  - <
:::
````

Reported: nothing.

How the list table is built:

- The list table is a `div` with the class `list-table`. The table's caption, when it holds one paragraph, becomes the opener's title.
- It holds one outer item per row, in group order, and one inner item per cell. An inner list is loose when it has two or more items and one of them holds more than one block.
- `header-rows`, `header-cols` and `footer-rows` count the head rows, the leading header cells of every other row, and the foot rows, each written only when it is above 0. A header cell outside those counts takes `{header}` on its item.
- A cell's attributes, and its own `align` and `valign`, go on its item.
- A covered slot holds the `<` or `^` placeholder. A cell whose whole text is a lone `<` or `^` is written as a literal-text span, `` !`<` `` or `` !`^` ``, so it is not read as a placeholder.
- An empty cell's item holds an empty comment, as the parse of `- %%` gives.
- What a list table has no place for is reported: a row's attributes, a cell's `scope` and header ids, a column width, a second caption, the boundary between two bodies, and a row span on a cell that spans both ways.

## Figures and captions

A `<figure>` holding one block that can carry a caption (an image, a table, a code block, a quote or a display-math paragraph) and a `<figcaption>` imports as that block with a caption line. The caption belongs to the block, so a `<figcaption>` written before the image still comes out after it:

```html
<figure class="wide"><figcaption>A cat</figcaption><img src="/cat.png" alt="Cat"></figure>
```

```crv
{.wide}
![Cat](/cat.png)
^ A cat
```

Reported: nothing.

A figure without a `<figcaption>` around such a block is just that block with the figure's attributes.

### A figure and its target share one attribute line

The attributes of the `<figure>` and of the block merge the way two stacked attribute lines merge in Carve: the figure's first, classes adding up, and the block's id or key replacing the figure's. The figure's value that loses is reported.

```html
<figure class="wide" id="f"><table class="t" id="t"><tr><td>a</td></tr></table><figcaption>c</figcaption></figure>
```

```crv
{#t .wide .t}
| a |
^ c
```

Reported: `import-attribute-dropped` on `<figure>`.

```html
<figure id="l" class="listing"><pre class="playground"><code class="language-rust">x</code></pre><figcaption>Cap</figcaption></figure>
```

````crv
{#l .listing .playground}
```rust
x
```
^ Cap
````

Reported: nothing.

### Any other figure is a figure group

A figure around a paragraph, a list, more than one block, or no block at all is a figure group, written with a `::: figure` container. A paragraph cannot carry a caption line of its own, so a group is the only spelling that keeps it.

```html
<figure id="g"><p>x</p><figcaption>Cap</figcaption></figure><figure class="k"><pre>y</pre></figure>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
````crv
{#g}
::: figure
x
:::
^ Cap

{.k}
```
y
```
````

Reported: nothing.

The second figure above has no caption and holds one code block, so it is just that code block with the figure's class. `carve lint` reports `figure-group-empty` on the first one, because a group is meant to hold captioned panels; the import writes it anyway, since it is the only spelling that keeps both the paragraph and its caption.

### A caption is blocks; its source line is not

A caption in the tree holds blocks. A caption line in Carve source holds one paragraph, so a `<figcaption>` with two paragraphs is joined with one space in the source, and the writer reports it:

```html
<figure><img src="/i" alt="x"><figcaption><p>one</p><p>two</p></figcaption></figure>
```

```crv
![x](/i)
^ one two
```

Reported: `structure-unspellable`.

### Block quotes

`<blockquote>` is a quote. Its `cite` attribute rides the attribute line, like any other attribute on a block:

```html
<blockquote cite="https://example.com/src"><p>q</p></blockquote>
```

```crv
{cite=https://example.com/src}
> q
```

Reported: nothing.

Changed in 0.2: 0.1 kept a figure around a paragraph by writing the caption into the paragraph, or as raw HTML in `roundtrip` mode. 0.2 imports it as a figure group, which Carve spells.

## Containers and conventions

### A container comes back as the container

The renderer writes an admonition as `<aside class="admonition KIND">` and every other named container as `<div class="NAME">`. The importer reads that mapping backward: the class becomes the fence word instead of staying an attribute. A `<p class="admonition-title">` at the start becomes the title, and the `aria-label` the renderer wrote is consumed. A nested container is written with the outer fence longer, which is the form `carve fmt` writes. A `<div>` with no attributes is still a `div` and keeps its fence. A `<p class="div-label">` at the start becomes the container's group label:

```html
<aside class="admonition warning" aria-label="Warning"><p class="admonition-title">Careful</p><p>Hot.</p></aside>
<div class="tabs"><div class="tabs-panel"><p>a</p></div></div>
<div><p>bare</p></div>
<div><p class="div-label">group</p><p>body</p></div>
```

```crv
::: warning "Careful"
Hot.
:::

:::: tabs
::: tabs-panel
a
:::
::::

:::
bare
:::

::: [group]
body
:::
```

Reported: nothing.

A classed `<div>` whose first class a fence word can spell, digit-leading ones included, takes that class as its word. An `<aside>` that is not an admonition becomes a container with its classes and no report. Elements whose row says `div` (`<header>`, `<footer>`, `<nav>`, `<main>`, `<article>`, `<form>` and the like) become containers too and are reported. `<details>` becomes a container whose first paragraph is the `<summary>` text:

```html
<header class="top"><h1>Site</h1></header>
<details><summary>More</summary><p>Body</p></details>
<nav><a href="/">Home</a></nav>
```

```crv
::: top
= Site
:::

:::
More

Body
:::

:::
[Home](/)
:::
```

Reported: `import-element-mapped` on `<header>`, `import-element-mapped` on `<details>`, `import-element-mapped` on `<nav>`.

Changed in 0.2: 0.1 unwrapped a `<div>` with no attributes and wrote no fence. 0.2 keeps the `div`, because a render of a plain `:::` writes exactly that element.

### Elements with no counterpart

Every element is read by its row in the element table. An element with no row, including custom elements such as `<my-tag>` and `<react-app>`, is read as an inline span and reported. So are `<small>`, `<cite>`, `<samp>` and similar inline elements without a Carve node:

```html
<p>A <small>fine</small> <cite>print</cite> <my-tag class="c">x</my-tag></p>
```

```crv
A [fine]{} [print]{} [x]{.c}
```

Reported: `import-element-mapped` on `<small>`, `import-element-mapped` on `<cite>`, `import-element-mapped` on `<my-tag>`.

That rule also applies to a custom element that wraps whole blocks. Its headings and paragraphs are then inline content, read as spans, and the page collapses into one paragraph:

```html
<react-app><h1>Title</h1><p>Body</p></react-app>
```

```crv
[[Title]{}[Body]{}]{}
```

Reported: `import-element-mapped` on `<react-app>`, `import-element-mapped` on `<h1>`, `import-element-mapped` on `<p>`.

Frameworks wrap whole pages in such elements (`<react-app>`, `<turbo-frame>`, `<app-root>`). A host importing those pages unwraps them before the import, for example by replacing the custom element with its children in the DOM, or by importing only the content element.

`<q>` loses its quotation marks this way, and `<button>` and `<label>` keep only their text. `<picture>` gives its `<img>`, and each `<source>` inside it is dropped and reported.

An element that needs a parent and stands outside it, such as an `<li>` outside a list or a `<figcaption>` outside a `<figure>`, gives its children in its place.

Changed in 0.2: 0.1 replaced every unknown element by its children, so blocks stayed blocks. In 0.2 the unknown-element row is an inline span.

### Renderer conventions

These classes are read as the Carve node a render writes them for, and the class is not kept:

| Element | Test | Node |
| --- | --- | --- |
| `aside` | first class `admonition`, second a kind such as `note` or `warning` | admonition |
| `p` | class exactly `admonition-title`, first block of a container | its title |
| `p` | class exactly `div-label`, after the title | group label |
| `div` | first class `bibliography`, `footnotes`, `glossary`, `index`, `references` or `toc` | directive |
| `figure` | first class `carve-figure-group` | figure group |
| `span` | first class `critic-comment` | editorial comment |
| `span` | first class `ext-NAME`, NAME an inline extension name | inline extension |
| `span` | classes `math inline` or `math display` around `\(...\)` or `\[...\]` | math |
| `span` | first class `mention`, one `strong` child starting with the sigil | mention |
| `span` | first class `tag`, one `strong` child starting with `#` | tag |

```html
<p><span class="ext-x">e</span> <span class="mention"><strong>@ann</strong></span> <span class="tag"><strong>#topic</strong></span> <span class="critic-comment">c</span> <span class="ext-1">not one</span></p><div class="toc"></div>
```

```crv
:x[e] @ann #topic {#c#} [not one]{.ext-1}

::: toc

:::
```

Reported: nothing.

`ext-1` is not an inline extension name, so that class stays a class.

A word processor comment as Pandoc writes it, a `<span class="comment-start">` with a matching `comment-end`, becomes an editorial comment at its place, with `data-author` and `data-date` as `author` and `datetime`. Carve's editorial comment is a point, so the range it covered is lost and reported:

```html
<p>A <span class="comment-start" data-comment-id="0" data-author="Ann" data-date="2026-01-02">Check this</span>word<span class="comment-end" data-comment-id="0"></span> b</p>
```

```crv
A {#Check this#}{author=Ann datetime=2026-01-02}word b
```

Reported: `import-structure-repaired` on `<span>`.

Changed in 0.2: 0.1 kept a `critic-comment` span and an `ext-` span as classed spans. 0.2 reads them as the editorial comment and the inline extension.

## Inline elements

`<em>` and `<i>` are emphasis, `<strong>` and `<b>` strong, `<s>` and `<strike>` strike, `<del>` deletion, `<ins>` insertion, `<mark>` highlight, `<u>` underline, `<sub>` and `<sup>` subscript and superscript, and `<span>` a span. Each keeps its attributes. Inside a word, the writer uses the braced forms:

```html
<p>H<sub>2</sub>O, x<sup>2</sup>, <mark>m</mark>, <del>d</del>, <ins>i</ins>, <u>u</u>, <s>s</s>, a<b>b</b>c, <code>a<b>b</b></code></p>
```

```crv
H{,2,}O, x{^2^}, {=m=}, {-d-}, {+i+}, {_u_}, {~s~}, a{*b*}c, `ab`
```

Reported: nothing.

`<code>` is a code span whose value is its text, with any markup inside dropped and nothing reported. A `<del>` followed by an `<ins>` stays two nodes; the importer does not merge them into a substitution.

### Semantic elements

`<kbd>`, `<abbr>` and `<time>` become spans with a key: `kbd` with an empty value, `abbr` with the `title`, and `time` with the `datetime`. A missing value gives an empty one. Leftover attributes ride the same span, with the key last. An authored attribute that has the key's own name, such as `abbr` on `<abbr>`, is written in upper case so the two stay apart:

```html
<p><kbd id="k" class="key">Tab</kbd>, <abbr title="HyperText">HTML</abbr>, <time datetime="2026-11-16">today</time>, <abbr>CSS</abbr>, <abbr abbr="x" title="y">A</abbr>, <samp>out</samp></p>
```

```crv
[Tab]{#k .key kbd}, [HTML]{abbr=HyperText}, [today]{time=2026-11-16}, [CSS]{abbr}, [A]{abbr=y ABBR=x}, [out]{}
```

Reported: `import-element-mapped` on `<samp>`.

`<abbr>` becomes a real abbreviation instead when an abbreviation template, written by a `roundtrip` render, defines it.

Changed in 0.2: 0.1 also wrote `<samp>`, `<var>`, `<cite>` and `<dfn>` as keyed spans for an extension to pick up. 0.2 reads them as plain spans and reports them.

### Line breaks

`<br>` is a hard break, written as a backslash at the end of the line. `<wbr>` renders nothing and is dropped and reported. A `<br>` at the end of a block is removed.

```html
<p>a<br>b<wbr>c<br></p>
```

```crv
a\
bc
```

Reported: `import-element-dropped` on `<wbr>`, `import-whitespace-normalized` on `<br>`.

### Ruby

`<ruby>` is a ruby node: each `<rt>` closes a pair whose base is the content before it, and `<rb>` gives its content. `<rp>` is dropped without a report, since every render writes the parentheses again. A base with no `<rt>` after it is plain text and is reported. Carve source has no ruby syntax, so the writer writes `base(annotation)` and reports `structure-unspellable`; the pairing survives only in the tree.

```html
<p><ruby>字<rp>(</rp><rt>ji</rt><rp>)</rp></ruby> and <ruby>a<rt>1</rt>b</ruby></p>
```

```crv
字(ji) and a(1)b
```

Reported: `import-structure-repaired` on `<ruby>`, `structure-unspellable`, `structure-unspellable`.

### MathML

A `<math>` element is a math node when it carries TeX: the text of an `<annotation>` whose `encoding` is `application/x-tex`, `text/x-tex` or `LaTeX`, or else its `alttext`. `display="block"` makes it display math. A `<math>` with neither is read as its text and reported. A `<span class="math inline">` holding `\(...\)` is math by the renderer's convention.

```html
<p><math display="block"><semantics><mi>x</mi><annotation encoding="application/x-tex">x^2</annotation></semantics></math></p>
<p>A <math alttext="a+b"><mi>a</mi><mo>+</mo><mi>b</mi></math> and <math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>, <span class="math inline">\(y\)</span></p>
```

```crv
$$`x^2`

A $`a+b` and 12, $`y`
```

Reported: `import-element-mapped` on `<math>`.

The fraction above reads `12`, which is a wrong value rather than a degraded one. A host that imports presentation MathML adds an `alttext` or a TeX annotation first, or rejects pages that report `import-element-mapped` on `<math>`.

Changed in 0.2: 0.1 reported `encoding-assumed` for an `alttext`, read only linear MathML as text, dropped other MathML, and dropped a fallback image whose `alt` repeated the formula. 0.2 reads `alttext` silently, reads any MathML without TeX as its text, and keeps fallback images.

## Links and images

`<a href>` is a link whose `title` is its tooltip. `href=""` is an empty link, `[t]()`. An `<a>` without `href` is its content, in a span when it has attributes:

```html
<p><a href="/u" title="T">ok</a>, <a href="">empty</a>, <a id="k">no href</a>, <a>plain</a></p>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
```crv
[ok](/u "T"), [empty](), [no href]{#k}, plain
```

Reported: nothing.

`<img>` is an image with `src`, `alt` and the `title` as tooltip. `alt=""` makes it decorative. An image with no `alt` attribute has an unknown alt text; the writer writes empty brackets and reports `image-alt-unknown`. A run of images alone becomes image paragraphs:

```html
<p><img src="/a.png" alt="A"></p><p>Inline <img src="/i.png" alt="I" width="10">, <img src="/d.png" alt="">, <img src="/u.png"></p>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
```crv
![A](/a.png)

Inline ![I](/i.png){width=10}, ![](/d.png), ![](/u.png)
```

Reported: `image-alt-unknown`.

A `longdesc` becomes the image's long description, a paragraph with one link to that URL.

### A denied destination is not a destination

A destination is checked against the default deny list, the same list the renderer uses: `javascript:`, `vbscript:`, `data:` and the other schemes the renderer refuses. The scheme is read as a browser reads it, so `java&#9;script:` is denied too. A link whose `href` fails is its content, and an image whose `src` fails is its alt text, each in a span when attributes remain. A `longdesc` that fails is dropped. Each failure is reported once with `import-destination-denied`:

```html
<p><a href="javascript:alert(1)">click here</a> <a id="z" href="java&#9;script:x">split</a> <img src="data:image/png;base64,AA" alt="pic"></p>
```

```crv
click here [split]{#z} pic
```

Reported: `import-destination-denied` on `<a>`, `import-destination-denied` on `<a>`, `import-destination-denied` on `<img>`.

The importer applies no other URL policy. A renderer applies its own policy to the tree it is given, so a host with a stricter allow list sets it on the render.

## Attributes

Each attribute is kept as a key with its name and value as they stand, in the order the parser gives them, unless a rule reads it: `id` and `class` become the id and classes, `lang` and `dir` become node fields, and attributes a clause reads (`href` on `<a>`, `start` on `<ol>`) become fields of the node. Event handlers (`on...`), `formaction` and `srcdoc` are dropped and reported. A name that is no Carve key, such as `x:y` or `data-ü`, has no spelling in an attribute block and is dropped and reported:

```html
<p id="p1" class="lead note" lang="de" data-id="7" style="color: red" onclick="go()" x:y="1">Text</p>
```

```crv
{#p1 .lead .note :de data-id=7 style="color: red"}
Text
```

Reported: `import-attribute-dropped` on `<p>`, `import-attribute-dropped` on `<p>`.

A `style` is kept as a key with its value as written. The importer parses no `style` except the exact alignment spellings above and a `<col>` width; the renderer checks a `style` when it writes it. On a `<p>`, `<div>` or heading, `text-align: VALUE;` spelled exactly that way becomes the key `align`:

```html
<p align="right" style="text-align: left;">x</p><p style="text-align: center">y</p>
```

```crv
{align=left}
x

{style="text-align: center"}
y
```

Reported: `import-attribute-dropped` on `<p>`.

Changed in 0.2: 0.1 parsed `style` in its `semantic` mode and reported unmapped declarations. 0.2 keeps the value as a key and lets the renderer decide.

### An attribute value holding a pipe is escaped

A table row is one line cut at its pipes, so the writer escapes a pipe in an attribute value with a backslash and quotes the value, in a cell or anywhere else:

```html
<table><tr><td id="c" data-x="a|b">t</td><td><span data-y="p|q">u</span></td></tr></table>
```

```crv
|{#c data-x="a\|b"} t | [u]{data-y="p\|q"} |
```

Reported: nothing.

### Generated names and labels

An accessible name or text that the renderer writes from a label string, and that equals that label, is generated: the importer keeps no attribute for it and reports nothing. The admonition's `aria-label` is the common case. An `aria-label` that differs is the author's and is kept. A page rendered with a custom label map imports correctly only when the host passes the same map as `labels`:

```html
<aside class="admonition note" aria-label="Note"><p>a</p></aside><aside class="admonition note" aria-label="Hinweis"><p>b</p></aside>
```

```crv
::: note
a
:::

{aria-label=Hinweis}
::: note
b
:::
```

Reported: nothing.

With `labels: { admonitionNote: 'Hinweis' }`, the two swap: `Hinweis` is now the generated name and `Note` the author's:

```html
<aside class="admonition note" aria-label="Note"><p>a</p></aside><aside class="admonition note" aria-label="Hinweis"><p>b</p></aside>
```

```crv
{aria-label=Note}
::: note
a
:::

::: note
b
:::
```

Changed in 0.2: 0.1 dropped any attribute whose value equaled what the renderer derives, including the `role` and `aria-label` of a diagram fence. 0.2 limits the rule to names the renderer writes from a label string; a diagram's `role="img"` and `aria-label` stay as keys.

## Footnotes

A `<section>` with `role="doc-endnotes"`, or with the class `footnotes`, is a footnote section. Each `<li>` with an `id` in its first `<ol>` is a footnote; the key comes from a `data-carve-footnote-label` carrier, or else from the `id` without a leading `user-content-fn-`, `fn-` or `fn`. A heading in the section before the list, the label other renderers write, is dropped silently.

An `<a>` with `role="doc-noteref"` or `data-footnote-ref` is a note reference; a `<sup>` holding only that link is the reference alone. Backlinks (`role="doc-backlink"`, `data-footnote-backref` or the class `footnote-backref`) are dropped silently, and a paragraph left holding nothing but backlinks is dropped too.

```html
<p>x<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup></p>
<section class="footnotes"><h2>Notes</h2><ol><li id="fn-1"><p>Note <a href="#fnref-1" data-footnote-backref class="footnote-backref">↩</a></p></li></ol></section>
```

```crv
x[^1]

[^1]: Note
```

Reported: nothing.

### An endnotes section keeps the position it was written at

Footnote definitions are written after the blocks of the document. A footnote section that is not last, or that has a title or label, gives a `::: footnotes` directive where it stood, so the rendered notes go back to that place:

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes"><ol><li id="fn1"><p>n</p></li></ol></section>
<p>after</p>
```

```crv
a[^1]

::: footnotes

:::

after

[^1]: n
```

Reported: nothing.

A note reference whose `href` names no note and has no usable fragment is a plain link that keeps its `role` as a key:

```html
<p><a href="/u" role="doc-noteref">x</a> and <a href="#fn" role="doc-noteref">y</a></p>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
```crv
[x](/u){role=doc-noteref} and [y](#fn){role=doc-noteref}
```

Reported: nothing.

Changed in 0.2: 0.1 imported a section that no reference pointed at as the `<hr>` and `<ol>` it is built from. 0.2 reads any footnote section by its role or class, and drops an item without an `id` with `import-structure-repaired`.

## Comments and raw content

By default, the importer keeps no raw HTML. Every comment, every element whose row says `raw` (`<script>`, `<style>`, `<iframe>`, `<video>`, `<svg>`, form controls and the like) and every raw span a `roundtrip` render wrote is dropped with its content and reported with `import-element-dropped`:

```html
<!-- note --><p>a<!-- inline -->b</p><script>run()</script><p>Video: <iframe src="/v" onload="x()"></iframe></p>
```

```crv
ab

Video:
```

Reported: `import-element-dropped` on `#comment`, `import-element-dropped` on `#comment`, `import-element-dropped` on `<script>`, `import-element-dropped` on `<iframe>`, `import-whitespace-normalized` on `<iframe>`.

With `rawHtml` on (`--raw-html`), a comment becomes a raw node in HTML format: a raw span inside a run of inline content, a raw block among blocks. A raw element becomes the same, holding its outer HTML. Nothing is reported, because each node holds its element whole. A reserved `data-carve-*` name is removed before the element is serialized; event handlers inside raw HTML are not.

Raw content in the tree is data, not permission to output it. A render without its own `rawHtml` option, which is the default, writes a raw block as a code block and a raw span as escaped text. Here is the import with `rawHtml` on, followed by the default render of that source:

```html
<!-- note --><p>a<!-- inline -->b</p><script>run()</script><p>Video: <iframe src="/v" onload="x()"></iframe></p>
```

````crv
```=html
<!-- note -->
```

a`<!-- inline -->`{=html}b

```=html
<script>run()</script>
```

Video: `<iframe src="/v" onload="x()"></iframe>`{=html}
````

```html
<pre><code class="language-html">&lt;!-- note --&gt;
</code></pre>
<p>a&lt;!-- inline --&gt;b</p>
<pre><code class="language-html">&lt;script&gt;run()&lt;/script&gt;
</code></pre>
<p>Video: &lt;iframe src="/v" onload="x()"&gt;&lt;/iframe&gt;</p>
```

Keep `rawHtml` off for untrusted input, and if you turn it on, turn it on in the render only for trusted sources and behind your own HTML sanitizer. See [Security](/security).

A raw span holding a line feed cannot be written inside a table cell, which is one line. The writer writes a space and reports `field-unspellable`:

```html
<table><tr><td>c<!-- k
l -->d</td></tr></table>
```

```crv
| c`<!-- k l -->`{=html}d |
```

Reported: `field-unspellable`.

Changed in 0.2: 0.1 imported HTML comments as Carve comments in every mode and kept unsupported markup as raw HTML only in `roundtrip` mode. 0.2 has no mode: comments and raw elements are dropped, or kept as raw nodes when `rawHtml` is on.

## Escaping in the written source

The writer decides each escape by writing the text bare and parsing it in its context; it can keep an escape that a later round makes unneeded, so an escape is not proof that the character was syntax. Imported text often holds characters that are syntax in Carve, so this is where a host sees the escapes. Each of these comes back as the text the HTML held:

A table cell whose whole text is a span placeholder:

```html
<table><tr><td>^</td><td>&lt;</td></tr><tr><td>a</td><td>b</td></tr></table>
```

```crv
| \^ | \< |
| a | b |
```

Reported: nothing.

A symbol, tag or mention sigil in text:

```html
<p>a :rocket: b #t @x</p>
```

```crv
a \:rocket\: b \#t \@x
```

Reported: nothing.

Paragraph text that would read as a caption line under an image:

```html
<img src="g.jpg" alt="G">
<p>^ c</p>
```

```crv
![G](g.jpg)

\^ c
```

Reported: nothing.

A span or link whose text would open a note reference or close a bracket:

```html
<p><abbr title="y">^1</abbr> <abbr title="y">^</abbr> <span class="b">[</span> <a href="/x">a]b</a></p>
```

```crv
[\^1]{abbr=y} [\^]{abbr=y} [\[]{.b} [a\]b](/x)
```

Reported: nothing.

Emphasis marks, list markers and heading marks at the start of a paragraph:

```html
<p>a *b* /c/ _d_ = 1. x</p><p>1. not a list</p><p>- nor this</p><p># or a heading</p>
```

```crv
a \*b* \/c/ \_d_ = 1. x

1\. not a list

\- nor this

\# or a heading
```

Reported: nothing.

A host that compares imported text against the HTML compares the parsed tree or the rendered output, not the source characters.

## Editor adapters

The `adapter` option names the editor that wrote the HTML: `generic` (the default), `tiptap`, `prosemirror`, `ckeditor`, `tinymce`, `word` or `google-docs`. Any other value is refused before the import starts.

| Adapter | What it adds |
| --- | --- |
| `generic` | nothing; any HTML |
| `tiptap`, `prosemirror`, `ckeditor`, `tinymce` | nothing; the mapping already reads what these editors write |
| `word` | the note pass, for Word "Save as Web Page" and its filtered form, LibreOffice and Pandoc 1 exports |
| `google-docs` | the same note pass, for Google Docs "Download as HTML" |

Naming the editor still helps: it records where the input came from, and a later engine can add a pass for that editor without a change on your side.

### The note pass of `word` and `google-docs`

A word processor exports each footnote as a pair of links: the reference points at the note, and the note points back. The note pass finds those pairs before the mapping runs and turns them into footnotes:

- A reference becomes a note reference, in place of the `<sup>` around it when the `<sup>` holds nothing else.
- The note's backlink and the separator above the notes (the `<hr>` and `<br>` a word processor writes) are removed, and so is any element the notes leave empty.
- Notes that already sit in a footnote section stay there. Other notes move to one footnote section at the end, keyed `1`, `2` and so on.
- The pass reports nothing: references, backlinks and separators are the export's navigation and layout. Everything else is read and reported as in any import.

Without the adapter, a Word export keeps its notes as links and containers:

```html
<p>Data<a href="#_ftn1" name="_ftnref1" title=""><span class="MsoFootnoteReference">[1]</span></a> centre.</p>
<div><br clear="all">
<hr align="left" size="1" width="33%">
<div id="ftn1">
<p><a href="#_ftnref1" name="_ftn1" title=""><span class="MsoFootnoteReference">[1]</span></a> NCAS British Atmospheric Data Centre</p>
</div>
</div>
```

<!-- carve-sample {"lint":"importer output shown verbatim; the finding is part of the example"} -->
```crv
Data[[[1]]{.MsoFootnoteReference}](#_ftn1 ""){name=_ftnref1} centre.

::::
{align=left size=1 width=33%}
***

{#ftn1}
:::
[[[1]]{.MsoFootnoteReference}](#_ftnref1 ""){name=_ftn1} NCAS British Atmospheric Data Centre
:::
::::
```

Reported: `import-whitespace-normalized` on `<div>`, `import-whitespace-normalized` on `#text`.

With `adapter: 'word'`:

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

Changed in 0.2: 0.1 accepted the same adapter names and normalized editor markup in its `semantic` mode. 0.2 defines one pass, the note pass, and runs it for `word` and `google-docs` only.

## What a render without roundtrip loses

For Carve HTML rendered with `roundtrip`, an import gives back the tree the source parsed to, apart from the few losses the HTML chapter lists for a `roundtrip` render and what the render itself does not write: comments, smart punctuation as glyphs, unresolved references, includes, denied destinations and filtered attributes. Without `rawHtml`, the raw content the render passed through is lost as well.

For Carve HTML rendered without `roundtrip` and not changed afterwards, the same holds except for the facts a carrier would have set. Without the carrier, each element reads as it stands:

| Carrier | Comes back as |
| --- | --- |
| `data-carve-abbreviations` | each `<abbr>` is a span with the key `abbr`; the definitions are gone |
| `data-carve-autolink` | a link whose text is its target |
| `data-carve-caption-number` | the number as text in the caption |
| `data-carve-div` | nothing: a plain div reads as a div |
| `data-carve-explicit-id` | nothing: every id reads as authored |
| `data-carve-footnote-label` | the key from the note id, the footnote number |
| `data-carve-generated-id` | the generated id as an authored id |
| `data-carve-inline-footnote` | a footnote reference and a footnote definition |
| `data-carve-label` | no group label on the code block |
| `data-carve-line-block` | a div with class `line-block` of paragraphs with hard breaks |
| `data-carve-loose` | spacing by the tightness rule: a loose list reads as tight unless an item starts with a bare `<p>` or holds more than one block |
| `data-carve-raw` | the payload as text |
| `data-carve-ref`, `-ref-collapsed`, `-ref-shortcut` | an inline link or image; no definition is rebuilt |
| `data-carve-snippet`, `-snippet-mark` | the copied content in place of each use |
| `data-carve-snippet-scope`, `data-carve-snippets` | nothing: the snippet definitions are gone |
| `data-carve-source-level` | a heading at its shifted level |
| `data-carve-src` | nothing |
| `data-carve-tight` | spacing by the tightness rule: a tight list with more than one item reads as loose when an item holds more than one block or starts with a bare `<p>` the render kept |
| `data-carve-xref` | a link to `#ID` whose text is the generated text |
| `data-marker` | the bullet `-` |

The list is meant to be complete. A tree fact it does not name is expected to survive a render without `roundtrip` and an import; a round trip that loses another fact is a defect of the specification or of the engine, and worth a ticket.

## Resource limits

An input whose tree would nest deeper than a reader accepts is refused as a whole: the library throws `ImportInputError`, and the command line fails with status 2 and the category `import-input-invalid`. No partial tree is returned. `maxLosses` caps the loss entries kept, default 100, and counts the rest in `suppressedDiagnostics`; the cap changes no output, and `strictLosses` still counts every loss. Bound the input size before the import as you would for any parser that builds a full DOM.

## What 0.2 removed

These 0.1 subjects have no 0.2 counterpart:

- **Modes.** `safe`, `semantic` and `roundtrip` are gone. Safety now comes from dropping raw content unless `rawHtml` is on, and from the renderer's own policy; Carve HTML is recognized by its carriers instead of a mode.
- **`roundtrip` figure rebuilding and raw preservation of unspellable figures.** A figure Carve cannot spell as a captioned block is a figure group in every import.
- **`attribute-preserved` rows and refused `style` declarations inside raw HTML.** Raw content is kept whole or dropped whole, so there is no per-attribute row; the [comments and raw content](#comments-and-raw-content) section says what reaches the render.
- **The required diagnostic order and the XPath-like `path`.** Entries carry a byte range and `foreignType` instead, as described under [Position of an entry](#position-of-an-entry).
- **The shared fixture directories `tests/html-import`.** 0.2 conformance is the examples of the specification, verified against the reference importer. The 0.1 fixtures are indexed below for the migration audit.

## Changed in 0.2: legacy fixture index

The directories below were the 0.1 HTML import fixtures; they are removed from the repository. The 0.1 migration audit reads this index. They are not a conformance list for the 0.2 importer; the sections above, and the specification linked at the end of this page, give current behavior.

| fixture | subject |
| --- | --- |
| `basic` | a heading, emphasis and a link - the shape everything else assumes |
| `security` | an event handler and a `<script>` removed, and said so |
| `semantic-spans-core` | `kbd`, `abbr` and `time`, the three core names |
| `semantic-spans-extension` | `samp`, `var`, `cite` and `dfn`, which need the extension to render as elements |
| `semantic-span-attributes` | a consumed value beside a leftover `id`/`class`, a value that needs quotes, an empty value, and an event handler still stripped |
| `semantic-span-carve-outs` | `<mark>`, inline `<code>` and `<pre><code>`, none of which take the compact form |
| `figure-caption` | a `<figure>` with a `<figcaption>`, which imports as the image and a caption line |
| `blockquote-cite` | a `<blockquote cite>`, whose attribute is kept on a block-attribute line |
| `derived-accessible-name` | a diagram fence's derived `role` and name, dropped, beside an authored name that is kept |
| `derived-endnotes-section` | a reference-less endnotes `<section>`, whose wrapper and both attributes are derived, so nothing is reported - and whose one-item list spells its looseness with `{loose}` |
| `synthesized-wrapper-path` | a bare inline run wrapped in a paragraph the importer added, whose diagnostic is numbered among the body children rather than inside the wrapper |
| `container-round-trip` | a rendered callout and a named container, which come back as the containers they were written from rather than as a body and a `div` |
| `caption-attributes` | an attribute on a `<figcaption>`, dropped because a caption line has no slot for it, and reported rather than dropped in silence |
| `table-caption-attributes` | an attribute on a table's `<caption>`, the other spelling of a caption line, reported by the same rule |
| `traversal-shaped-index` | the three index exemptions on one document - an item, a row and a cell, none of which whitespace can move |
| `table-caption-index` | the same table caption written across lines, where it is the SECOND child and no exemption applies to it |
| `container-nesting` | containers two and three deep, whose fences widen INWARD because that is the form `carve fmt` writes |
| `attribute-less-div` | a bare `<div>` unwrapped to its content beside an id-bearing one that keeps its fence, which is where that boundary sits |
| `unsupported-element-keeps-its-blocks` | unsupported elements around blocks, beside loose text, nested two deep, inside a list item and inside a paragraph, each replaced by its children with one row |
| `container-label-keeps-the-fence` | a `<div>` kept by its grouping label alone, an id-bearing one whose label comes back on the opener, and one whose label the lift refuses so it unwraps after all |
| `diagnostic-order` | two losses in one table, whose rows follow the document and not the order the importer builds them in |
| `destination-less-link` | an explicit empty `href` or `src` becomes a native node; the anchor missing `href` unwraps. The pinned engine's older output is declared in `html-import-pin-drift.txt`. |
| `denied-scheme-destination` | a `javascript:` anchor, a split-scheme anchor that keeps its `id`, and a `data:` image, which come back as their content with one warning each |
| `marker-shaped-cell` | a table cell whose whole payload is a span marker, escaped so the cell survives |
| `symbol-sigil-escape` | a symbol sigil in imported text, escaped so it stays the text the HTML held |
| `extension-sigil-escape` | text ending in `:name` before a span and before a link, whose colon is escaped so the two do not join into an inline extension |
| `detached-caption-caret` | a paragraph that looks like a caption line under an image, escaped so it stays a paragraph |
| `note-reference-in-a-span` | a span whose text opens a note-reference label, escaped beside the unlabeled caret that needs no escape |
| `empty-definition-description` | an empty `<dd>`, dropped with a row that declares it, where the bare colon line would have taken the `<dt>` too |
| `empty-definition-description-not-last` | the same empty `<dd>` with an entry after it, where the list is broken rather than letting the next term inherit the description below |
| `endnotes-section-not-last` | an endnotes section with a paragraph after it, which keeps its position through `::: footnotes` |
| `whitespace-only-block` | a `<p>` holding one no-break space, kept as itself, beside the ASCII-space and tab spellings that carry nothing and are dropped with a row |
| `table-degraded` | a `<thead>` between two `<tbody>` runs, which the row-grouping field cannot describe: the head is a prefix of the rows and the foot a suffix |
| `list-table-for-block-cells` | a table with a list, a code block and two paragraphs in its cells, imported with `options.json` setting `listTableForBlockCells`: spans as `^` and `<`, a `<th>` outside the header rows as `{header}`, a cell class on its item, a hard break kept, a lone `^` escaped, and the row's `id` reported |
| `task-state-is-consumed` | a `data-task-state` read as the item's state beside a ticked box that needs none, and a value outside the enumeration that stays the author's attribute |
| `task-list-class-and-done-state-are-consumed` | a list's `task-list` class consumed beside an authored class that stays, and a done item's `data-task-state="x"` consumed with its ticked box |
| `ordered-delimiter-is-consumed` | a `data-delim` read as the list's delimiter, the bare `<ol>` that stays `.`, the attribute beside `type` and `start`, and a value outside the enumeration that stays the author's attribute |
| `same-kind-strong-nesting` | a strong directly inside a strong, with both levels preserved as braced spans (PART 11 §1c) |
| `same-kind-superscript-nesting` | two superscript levels preserved as nested braced spans |
| `same-kind-indirect-nesting` | an emphasis inside a strong inside an emphasis, kept because the braced strong between them starts its own scope (PART 9 §9 R1, #2091) |
| `table-cell-hard-break` | a `<br>` in a cell written as one space between words, as nothing at the cell's end, and as a space at the edge of a span inside the cell, one row per break (PART 11 §1b) |
| `adjacent-code-spans` | two `<code>` elements with nothing between them, separated by an empty delimited comment so the backtick runs do not merge (PART 11 §10k N3) |
| `link-edge-whitespace` | edge whitespace of a link and a span moved outside, merged at a join and dropped at a block edge, beside a no-break space, a whitespace-only label and an edge image that stay |
| `formatting-around-link` | formatting around a link drops block-edge and redundant padding while keeping the only separator, including asymmetric and nested cases |
| `mathml-without-tex` | presentation-only MathML imported as its text where the tokens are linear, and a fraction dropped where they are not |
| `mathml-fallback-image` | a formula beside its fallback image imported once, including through the image's `alt` when the `<math>` carries no TeX |
| `empty-list` | a `<ul>` and an `<ol>` with no item, attributed inside a container, bare, and nested in an item, each dropped with one row |
| `section-wrapper-id` | a `<section>` around a heading whose authored id comes back on the heading, a derived id that does not, a heading id that wins over the section's, and a section class that is dropped with a row |
| `empty-paragraph` | an attributed empty `<p>` and one holding only an empty `<span>`, each dropped with one row, beside an attributed `<hr>` that keeps its attribute |
| `comment-beside-dropped-element` | a comment beside an empty unknown element and beside a `<noscript>`, written as a block comment because a dropped element leaves no inline run, and beside an unknown element with text, which keeps it inline |
| `authored-role` | an authored `role` on a container, a span and a list item, kept because the renderer derives none of them |
| `url-list-attribute` | a `srcset` on an image, kept because a URL-list attribute is hardened by the renderer rather than refused |
| `adjacent-definition-lists` | two attribute-less `<dl>` elements joined into one list with a row, beside a paragraph and an attributed `<dl>` that each keep a list apart |
| `figure-target-attributes` | a figure around a code block and around a quote, each sharing one attribute line with its target, and an image whose own braces keep its attributes apart |
| `table-cell-multi-line-comment` | a comment holding a line break dropped from a cell with a row, a one-line comment among a cell's blocks written inline, and a multi-line comment outside any cell kept |
| `lone-bracket-in-bracketed-content` | an unpaired `[` or `]` inside a span or link text, escaped in the minimal form as in `[\[]{.b}`, beside balanced pairs that stay bare (PART 11 §5) |
| `paren-after-a-closed-bracket` | a `(` right after a paired bare `]` that would open a closing destination, escaped as `[a]\(b)` at top level, in a span, across code and around nested parentheses, beside `f(x)`, `[a] (b)`, `[a](b c)` and `[a]()` that stay bare (PART 11 §5). Across EMPHASIS the escape moves to the bracket opener, `\[/a](b)/`: PART 8 resolves the bracket run before the emphasis marker (carve#2577), so a bare pair would swallow the closer, and once the opener is escaped the paren escape is idle (PART 11 §2) |
| `auto-text-link` | a link to a heading whose text repeats the heading, written as `[Target](#Target)` and not recovered as the cross-reference `</#Target>` |
| `editorial-comment` | a `critic-comment` span, kept as a classed span and not recovered as the editorial comment `{#note#}` |
| `forced-strike` | an `<s>` inside a word, written in the braced form `a{~b~}c` |
| `forced-strong` | the same intraword case for `<strong>`, written as `a{*b*}c` |
| `forced-underline` | the same intraword case for `<u>`, written as `a{_b_}c` |
| `inline-extension` | a span whose class names an extension, kept as a classed span and not recovered as an inline extension |
| `local-hard-break-block` | a `hardbreaks` div, written as a `::: hardbreaks` container with an explicit backslash break rather than as the local hard-break block |
| `math-block-and-mathml` | a display-math `div` and a block and an inline `<math>` read through `alttext`, all written in the core math form, with an `encoding-assumed` row for each `alttext` |
| `substitution` | a `<del>` followed by an `<ins>`, written as `{-old-}{+new+}` and not merged into the substitution `{~old~>new~}` |
| `code-language-hints` | one code block per recognized language-hint convention, plus a conflicting pair where the `code` child's class wins, the hinting attribute kept on the block as well |
| `attribute-value-pipe` | a pipe in an attribute value on a cell and on a span inside a cell, backslash-escaped so the row does not split |
| `attribute-value-line-break` | an attribute value holding a line break, dropped with a row because a Carve attribute value cannot hold one |
| `definition-description-without-term` | a `<dd>` with no `<dt>` before it, emitted as blocks ahead of the list with a row, including a list holding no entry whose class is dropped |
| `cell-text-align-columns` | cell CSS maps to column markers without unmapped-style rows |
| `cell-text-align-overrides` | explicit body alignment overrides the header default |
| `cell-text-align-declarations` | the last supported declaration wins; unsupported values and priority suffixes remain unmapped |
| `cell-text-align-unmapped` | supported alignment maps while unrelated CSS and unsupported values report loss |
| `heading-multi-line-comment` | an HTML comment holding a line break inside a heading, dropped with a row because a heading is one line |
| `summary-holding-blocks` | a `<summary>` holding blocks flattened into the container title, with a row per unwrapped element and per dropped attribute |
| `container-class-a-fence-word-spells` | a digit-leading class, which `explicit_identifier` admits, consumed as the fence word |
| `empty-heading` | a bare empty heading and an attributed whitespace-only one, each dropped with one row |
| `code-span-holding-blocks` | two blocks flattened into a `<code>`, joined with no separator and the lost boundary reported |

**Specification (external):** [importing HTML](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md), with [scope and input](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#scope-and-input), [carriers and the two documents](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#carriers-and-the-two-documents), [how content is read](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#how-content-is-read), [whitespace](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#whitespace), [block elements](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#block-elements), [lists](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#lists), [tables](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#tables), [figures](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#figures), [conventions](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#conventions), [inline elements](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#inline-elements), [links and images](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#links-and-images), [attributes](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#attributes), [elements without a counterpart](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#elements-without-a-counterpart), [footnotes](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#footnotes), [raw content](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#raw-content), [normalization](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#normalization), [diagnostics](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#diagnostics), [the guarantee](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#the-guarantee) and [editor adapters](https://github.com/markup-carve/carve/blob/main/spec/0.2/import-html.md#editor-adapters); the [roundtrip carriers](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#roundtrip-carriers) and their [import](https://github.com/markup-carve/carve/blob/main/spec/0.2/html.md#import) in the HTML chapter; the [`carve import` flags](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#carve-import), [library calls](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#library) and [exit codes](https://github.com/markup-carve/carve/blob/main/spec/0.2/tooling.md#exit-codes) in the tooling chapter; and [what the writer cannot spell](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#what-the-writer-cannot-spell) and [escaping](https://github.com/markup-carve/carve/blob/main/spec/0.2/writer.md#escaping) in the writer chapter.
