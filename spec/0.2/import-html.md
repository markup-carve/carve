# Carve 0.2: importing HTML

Status: freeze candidate 4 of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md`); the examples are verified against the reference importer (`import/` of `carve-js`).

This document defines how an HTML importer turns HTML into a 0.2 tree. `html.md` defines how a tree becomes HTML and, in its section "Import", how the carriers of a render with `roundtrip` are read back (C2-H-182 to C2-H-199). This document covers everything else: HTML from any other tool, Carve HTML rendered without `roundtrip`, and every element and attribute that carries no carrier. The mapping is the one the reference importer follows. No carrier is added: a fact that HTML cannot hold is a loss, and the importer reports it.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-M-nnn`. `C2-A-nnn`, `C2-B-nnn`, `C2-H-nnn`, `C2-I-nnn`, `C2-L-nnn` and `C2-W-nnn` name clauses of the AST document, the block and inline chapters, the HTML document, the sidecar document and the writer document.
- A clause that starts with the word "Exception" is a carve-out from a more general clause. Exceptions are counted at the end.
- The tables of this document are also the rows of `data/import-html.json`. Where a row and its clause disagree, the clause wins.
- Each example is a `compare` container that holds the HTML input, the children of the imported document as JSON without positions and provenance, and the Carve source the canonical writer gives for that tree. The line above it gives its number and status. *Verified* means the reference importer at `carve-js` `next2` commit `0266e137` gives this tree and this source, with the example's import option, and reports every code of the example's `Reported:` line. *Unverified* means the importer differs: the tree and the report were written by hand from the clauses, and the source was then produced by the 0.2 writer from that tree with no loss reported. A line below an example that starts with `Reported:` names codes the import reports; it need not name every one.
- "Report X" means: add an entry with the code X to the diagnostics record (C2-M-080).

## Scope and input

**C2-M-001** The importer takes a string of HTML and returns a 0.2 document tree, its canonical Carve source and a diagnostics record. The tree is valid by C2-A-188: it passes the schema and the reader's checks.

**C2-M-002** The input is a document when, after any leading ASCII whitespace and comments, it starts with `<!doctype` or with `<html`, compared without ASCII case. A document is parsed with the HTML Standard's parsing algorithm for documents. Any other input is a fragment and is parsed with the HTML fragment parsing algorithm with a `body` element as the context element.

**C2-M-003** The importer reads the tree the parser builds, not the input text. So character references are decoded, a carriage return and a CR LF pair are one line feed (C2-H-195 row 1), U+0000 in text is U+FFFD, attribute names are in lower case (C2-H-195 row 13), and the elements the parser opens, closes or moves stand where the parser put them. The importer repeats none of this work and reports none of it.

**C2-M-004** A document's children are the children of its `<body>`. The `lang` of `<body>`, or else of `<html>`, is the `lang` of the document node, and the same holds for a `dir` of `ltr`, `rtl` or `auto`. Every other attribute of `<html>` and `<body>` is dropped and reported with `import-attribute-dropped`.

**C2-M-005** `<head>` and everything in it are dropped and reported once with `import-element-dropped`: the title, `<meta>`, `<link>`, `<base>`, and the scripts and styles of the head. The doctype is dropped and reported in the same way.

**C2-M-006** An input that would give a tree deeper than the nesting limits a reader accepts (C2-A-171, C2-B-190, C2-I-118) is refused. The importer returns no tree, and the command line fails with status 2 and the category `import-input-invalid`, in the form of C2-W-101.

Example 1 (verified)

::: compare

```html
<!DOCTYPE html>
<html lang="de">
<head><title>T</title><script>x()</script></head>
<body class="page"><p>Hallo</p></body>
</html>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"Hallo"}]}
]
```

```carve
Hallo
```

:::

The doctype and the head give two `import-element-dropped` entries, and the class of `<body>` an `import-attribute-dropped` entry. The document node has `lang: "de"`.

Reported: `import-element-dropped`, `import-attribute-dropped`.

## Carriers and the two documents

**C2-M-007** Where an element carries a reserved name of C2-H-115, `html.md` governs what the name sets, when it is ignored (C2-H-185, C2-H-186) and how the definitions are rebuilt (C2-H-191 to C2-H-194). This document governs every element and every attribute that no carrier covers, and the reading of a carrier's element in every respect the carrier's row does not name.

**C2-M-008** The importer reads every input in the same way. It has no mode for Carve HTML and no mode for foreign HTML, and it never guesses which tool wrote the input. A carrier is read where it stands, an element without one is read by this document, and the two combine in one input element by element (C2-H-197).

**C2-M-009** A carrier that `html.md` ignores is reported with `import-carrier-ignored`, with the element as the locator. The reserved name is never kept as an attribute (C2-H-186).

**C2-M-010** The conventions of the Carve renderer that need no carrier are part of the mapping and apply to every input: the section a render opens at a heading (C2-M-026), the footnote section (C2-M-061 to C2-M-064), the classes of the table "Conventions" (C2-M-035), the task box (C2-M-032) and the alignment declarations (C2-M-075). Foreign HTML that uses one of them is read as Carve HTML that uses it.

Example 2 (verified, import option `rawHtml` on)

::: compare

```html
<p><span data-carve-raw="html">&lt;b&gt;</span> and <span class="c">x</span></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"raw_inline","format":"html","value":"<b>"},{"type":"text","value":" and "},{"type":"span","children":[{"type":"text","value":"x"}],"attrs":{"classes":["c"]}}]}
]
```

```carve
`<b>`{=html} and [x]{.c}
```

:::

The raw span carries a carrier and is read by C2-H-186; the span beside it carries none and is read by C2-M-052.

## How content is read

**C2-M-011** Each element is read in one of two contexts. The children of the document, of a `<div>`, `<blockquote>`, `<li>`, `<dd>`, `<figure>`, `<figcaption>`, `<caption>`, `<details>`, an admonition, a section and a cell that holds a block element are read as blocks. The children of `<p>`, `<h1>` to `<h6>`, `<dt>`, `<summary>`, a cell that holds no block element, and of every element read as an inline node are read as inline content.

**C2-M-012** Among blocks, a run of adjacent text nodes, comments and elements that are no block element of the table "Elements" is one paragraph, as a render writes a bare paragraph. A run that holds only whitespace gives nothing. With the import option `rawHtml` on, a comment in a run that also holds inline content, text that is not whitespace or an element, is a `raw_inline` of that paragraph; a run that holds only comments and whitespace gives one `raw_block` per comment (C2-M-065). A run splits only at a block element.

**Exception C2-M-013** A run that holds only `<img>` elements, whitespace and comments gives one image paragraph per `<img>` (C2-H-020), not one paragraph.

**C2-M-014** Inside inline content, an element that the table "Elements" maps to a block is read as a `span` of its inline content, with its attributes, and is reported with `import-element-mapped`. The HTML parser already closes a `<p>` before a block element, so this happens only inside other inline elements, as in `<em><p>x</p></em>`.

**C2-M-015** Text in inline content is kept as it stands, except for the rules of the section "Whitespace". Each line feed in it is a `soft_break`. Adjacent text is joined into one `text` node (C2-A-040).

## Whitespace

**C2-M-016** Text that holds only whitespace between two blocks is not read. Whitespace here is the ASCII whitespace of the HTML Standard: space, tab, line feed, form feed and carriage return.

**C2-M-017** In inline content, spaces and tabs directly before or after a line feed are removed, and a run of line feeds with only spaces and tabs between them is one `soft_break`. A line feed directly before a `<br>` is removed: it is layout (C2-H-195 row 5).

**C2-M-018** At the start and at the end of the inline content of a block, whitespace of every kind is removed, and so is a `soft_break`. A no-break space is no whitespace and stays.

**C2-M-019** A `<br>` at the end of the inline content of a block is removed: it renders no line.

**C2-M-020** The rules C2-M-017 to C2-M-019 change no visible text. Each application is reported with `import-whitespace-normalized`, whose severity is `hint`.

**C2-M-021** A run of spaces inside a line is kept: a Carve paragraph holds it, and the renderer writes it back as it stands.

**C2-M-022** The text of `<pre>` is read verbatim, with no rule of this section, and so is the value of a code span, a math node and a raw node.

Example 3 (verified)

::: compare

```html
<p>
  one
  two  
</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"one"},{"type":"soft_break"},{"type":"text","value":"two"}]}
]
```

```carve
one
two
```

:::

Example 4 (verified)

::: compare

```html
<p>  lead <b>x</b> </p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"lead "},{"type":"strong","children":[{"type":"text","value":"x"}]}]}
]
```

```carve
lead *x*
```

:::

Example 5 (verified)

::: compare

```html
<p>a<br></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"a"}]}
]
```

```carve
a
```

:::

Example 6 (verified)

::: compare

```html
<p>a&amp;b &copy; &#x41;&nbsp;c</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"a&b © A c"}]}
]
```

```carve
a&b © A c
```

:::

The no-break space before `c` is the character U+00A0 in the text (C2-H-195 row 3).

## Block elements

**C2-M-023** `<p>` is a `paragraph`. A paragraph whose only content is one image is an image paragraph, `role: "image"` (C2-H-020); one whose only content is one display `math` node has `role: "math"` (C2-A-184).

**C2-M-024** `<h1>` to `<h6>` is a `heading` of that level. `<div role="heading" aria-level="N">` with an integer N above 6 is a heading of level N (C2-H-021), and `role` and `aria-level` are not kept.

**C2-M-025** The `id` of a heading element is its authored `attrs.id`. Without the carrier `data-carve-generated-id` the importer cannot tell a generated id from an authored one, so every id is authored (C2-M-091).

**C2-M-026** A `<section>` whose first child element is a heading element, with only whitespace before it, is the section a render opens at a heading (C2-H-026). It gives the heading and then the blocks that follow it in the section; the `<section>` itself gives no node. Its `id` is the heading's id (C2-H-027). Where the heading element carries an `id` of its own that differs, that `id` wins, and the `id` of the `<section>` is dropped and reported with `import-attribute-dropped`.

**C2-M-027** Every other attribute of such a section is dropped and reported with `import-attribute-dropped`. A render writes no other attribute on it.

Example 44 (unverified)

::: compare

```html
<section id="outer"><h1 id="inner">H</h1></section>
```

```json
[
  {"type":"heading","level":1,"children":[{"type":"text","value":"H"}],"attrs":{"id":"inner"}}
]
```

```carve
{#inner}
= H
```

:::

The heading element keeps its own `id`; the `id` of the section is dropped.

Reported: `import-attribute-dropped`.

**C2-M-028** A `<section>` that does not open with a heading is read as a `div` with its attributes, and is reported with `import-element-mapped`.

Example 7 (verified)

::: compare

```html
<section class="c" id="s"><h2>T</h2></section>
```

```json
[
  {"type":"heading","level":2,"children":[{"type":"text","value":"T"}],"attrs":{"id":"s"}}
]
```

```carve
{#s}
== T
```

:::

The class `c` is dropped and reported.

Example 8 (verified)

::: compare

```html
<section><p>no heading</p></section>
```

```json
[
  {"type":"div","children":[{"type":"paragraph","children":[{"type":"text","value":"no heading"}]}]}
]
```

```carve
:::
no heading
:::
```

:::

**C2-M-029** `<blockquote>` is a `block_quote`. `<hr>` is a `thematic_break`. A `<div>` is a `div`, unless C2-M-024 or the table "Conventions" makes it something else. All three take their attributes.

**C2-M-030** `<pre>` is a `code_block`. Its value is the text of its `<code>` child when it holds one, and otherwise its own text, in both cases with the markup inside dropped. A value that is not empty and does not end with a line feed gets one (C2-A-045). The first class of `<code>` that starts with `language-` gives `syntax`, the rest of the class. Any other attribute of `<code>` is dropped and reported with `import-attribute-dropped`. The `title` of `<pre>` is the title (C2-H-048), and the other attributes of `<pre>` are the block's attributes.

Example 9 (verified)

::: compare

```html
<pre title="Example"><code class="language-js">let a = 1
</code></pre>
```

```json
[
  {"type":"code_block","value":"let a = 1\n","syntax":"js","title":[{"type":"text","value":"Example"}]}
]
```

````carve
```js "Example"
let a = 1
```
````

:::

## Lists

**C2-M-031** `<ul>` and `<menu>` are a bullet `list` with the marker `-`, and `<ol>` is an ordered `list`. `<li>` is a `list_item`. The `type` of `<ol>` gives the style when it is `a`, `A`, `i` or `I`, and decimal otherwise. Its `start`, read as an HTML integer, gives `start` when it is not 1 and lies between 0 and 999999999 (C2-B-219); another value is dropped and reported with `import-attribute-dropped`. `data-delim=")"`, which every render writes (C2-H-031), gives the delimiter `)`; otherwise the delimiter is `.`.

**C2-M-032** The first `<input type="checkbox">` that is a child of `<li>` is the task box; each further one is dropped and reported with `import-element-dropped`, also with `rawHtml` on. The item has a `task` whose mark is the value of `data-task-state` when that value is the state attribute of a row of `task-states.json`, and otherwise `x` when the box carries `checked` and a space when it does not. A `data-task-state` with another value is ignored and reported with `import-attribute-dropped`. One space directly after the box is removed. `type`, `checked`, `disabled` and `aria-label` of the box are read; any other attribute of it is dropped and reported. The class `task` and the declaration `list-style: none` that a render gives a task item (C2-H-032), and the class `task-list` of its list, are not kept.

Example 47 (verified)

::: compare

```html
<ul><li><input type="checkbox"><input type="checkbox" checked> x</li></ul>
```

```json
[
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"x"}]}],"task":{"mark":" "}}],"marker":{"kind":"bullet","char":"-"},"spacing":"tight"}
]
```

```carve
- [ ] x
```

:::

The first box gives the task mark; the second is dropped, and the space before `x` is then at the start of the paragraph (C2-M-018).

Reported: `import-element-dropped`, `import-whitespace-normalized`.

**C2-M-033** A list is loose when an item has a `<p>` with no attribute as its first child, after whitespace and the task box, since a tight list writes that paragraph bare (C2-H-034). A list is also loose when an item holds more than one block that is no list. Otherwise it is tight. A list with one item is tight even so (C2-B-062).

**C2-M-034** A child of a list that is no `<li>` is dropped with its content and reported with `import-structure-repaired`. Text that holds only whitespace is not such a child.

Example 10 (verified)

::: compare

```html
<ol start="3" type="a" data-delim=")">
  <li>three</li>
  <li><input type="checkbox" checked disabled> done</li>
</ol>
```

```json
[
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"three"}]}]},{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"done"}]}],"task":{"mark":"x"}}],"marker":{"kind":"ordered","style":"a","delimiter":")","start":3},"spacing":"tight"}
]
```

```carve
c) three
d) [x] done
```

:::

Example 11 (verified)

::: compare

```html
<ul><li><p>a</p></li><li><p>b</p></li></ul>
```

```json
[
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"a"}]}]},{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"b"}]}]}],"marker":{"kind":"bullet","char":"-"},"spacing":"loose"}
]
```

```carve
- a

- b
```

:::

Example 12 (verified)

::: compare

```html
<ul><li><p>only</p></li></ul>
```

```json
[
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"only"}]}]}],"marker":{"kind":"bullet","char":"-"},"spacing":"tight"}
]
```

```carve
- only
```

:::

Example 13 (verified)

::: compare

```html
<ul><li>a</li>stray<p>p</p></ul>
```

```json
[
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"a"}]}]}],"marker":{"kind":"bullet","char":"-"},"spacing":"tight"}
]
```

```carve
- a
```

:::

**C2-M-036** `<dl>` is a `definition_list`, `<dt>` a `definition_term` of inline content and `<dd>` a `definition_description` of blocks. A `<div>` child of `<dl>`, which the HTML Standard allows around a group of terms and descriptions, is read as the children it holds. Any other child is dropped with its content and reported with `import-structure-repaired`.

Example 14 (verified)

::: compare

```html
<dl><dt>Term</dt><dd>One</dd><dd><p>Two</p><p>Three</p></dd></dl>
```

```json
[
  {"type":"definition_list","children":[{"type":"definition_term","children":[{"type":"text","value":"Term"}]},{"type":"definition_description","children":[{"type":"paragraph","children":[{"type":"text","value":"One"}]}]},{"type":"definition_description","children":[{"type":"paragraph","children":[{"type":"text","value":"Two"}]},{"type":"paragraph","children":[{"type":"text","value":"Three"}]}]}]}
]
```

```carve
:: Term
: One
: Two

  Three
```

:::

Example 15 (verified)

::: compare

```html
<dl><div><dt>a</dt><dd>b</dd></div></dl>
```

```json
[
  {"type":"definition_list","children":[{"type":"definition_term","children":[{"type":"text","value":"a"}]},{"type":"definition_description","children":[{"type":"paragraph","children":[{"type":"text","value":"b"}]}]}]}
]
```

```carve
:: a
: b
```

:::

## Tables

**C2-M-037** `<table>` is a `table`. `<thead>` is a `table_head`, `<tbody>` a `table_body` and `<tfoot>` a `table_foot`. Rows that are direct children of `<table>` form one `table_body` of their own. The groups take the order of C2-A-086: the first `<thead>` is the first group and the first `<tfoot>` the last wherever they stand, as HTML displays them, and this move is not reported; each further `<thead>` or `<tfoot>` is a `table_body` at its place and is reported with `import-structure-repaired`. `<tr>` is a `table_row`, and `<th>` and `<td>` are a `table_cell` with `header` true and false.

Example 50 (unverified)

::: compare

```html
<table><thead><tr><th>h</th></tr></thead><tfoot><tr><td>f</td></tr></tfoot><tbody><tr><td>b</td></tr></tbody></table>
```

```json
[
  {"type":"table","children":[{"type":"table_head","children":[{"type":"table_row","children":[{"type":"table_cell","header":true,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"h"}]}]}]}]},{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"b"}]}]}]}]},{"type":"table_foot","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"f"}]}]}]}]}],"columns":[{"type":"table_column"}]}
]
```

```carve
{footer-rows=1}
|= h |
| b |
| f |
```

:::

HTML 4 wrote the foot before the body; the foot is the last group of the tree, where a browser shows it.

**C2-M-038** A cell that holds no block element holds one `cell_paragraph` of its inline content. A `soft_break` or `hard_break` in it becomes one space (C2-H-195 row 7) and is reported with `import-whitespace-normalized`. A cell that holds a block element holds those blocks, and one empty `cell_paragraph` when every one of them is dropped (C2-M-069, C2-M-070, C2-A-091).

Example 49 (unverified)

::: compare

```html
<table><tr><td><p></p></td><td>a</td></tr></table>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[]}]},{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"a"}]}]}]}]}],"columns":[{"type":"table_column"},{"type":"table_column"}]}
]
```

```carve
| | a |
```

:::

The empty paragraph is dropped (C2-M-069), and the cell keeps one empty `cell_paragraph`.

**C2-M-039** `colspan` and `rowspan` above 1, read as HTML integers, give the spans. A `rowspan` of 0 gives no span and is reported with `import-structure-repaired`. A row span that reaches past the last row of its group is clamped to it (C2-A-093) and reported in the same way.

**C2-M-040** `scope` is kept unless it is the one a render writes on every header cell: `col` in the head and `row` outside it. `align`, or a `style` that is exactly `text-align: left;`, `text-align: right;` or `text-align: center;`, gives the cell's alignment; `valign` gives its vertical alignment. The values of `scope`, `align` and `valign` compare without ASCII case and are kept in lower case; a value outside the set of its field (C2-A-092) is dropped and reported with `import-attribute-dropped`. The alignments are then resolved backward by C2-B-213: a body cell that shows the mark of its column's header cell takes it from there, and in a table with no head a column whose cells all show one alignment gives it to the column.

Example 54 (unverified)

::: compare

```html
<table><tr><td ALIGN="CENTER" valign="center">a</td></tr></table>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"a"}]}]}]}]}],"columns":[{"type":"table_column","align":"center"}]}
]
```

```carve
{aligns=center}
| a |
```

:::

`CENTER` is the alignment `center`, which the column takes (C2-B-213); `center` is no vertical alignment.

Reported: `import-attribute-dropped`.

**C2-M-041** A `<col>` of the first `<colgroup>` whose `style` is exactly `width: N%;`, with N a decimal number greater than 0 and at most 100 (C2-B-212), gives its column the width N/100 (C2-H-152); another `style` of a `<col>` gives no width and is dropped and reported with `import-attribute-dropped`. The first `<caption>` is the table's `caption`, read as blocks; each further one is dropped with its content and reported with `import-element-dropped`. Any other child of `<table>`, of a row group or of a row is dropped and reported with `import-structure-repaired`.

Example 48 (unverified)

::: compare

```html
<table><caption>A</caption><caption>B</caption><tr><td>x</td></tr></table>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"x"}]}]}]}]}],"columns":[{"type":"table_column"}],"caption":{"type":"caption","children":[{"type":"paragraph","children":[{"type":"text","value":"A"}]}]}}
]
```

```carve
| x |
^ A
```

:::

The first caption fills the slot, and the second is dropped.

Reported: `import-element-dropped`.

Example 16 (verified)

::: compare

```html
<table>
<caption>Prices</caption>
<thead><tr><th>Item</th><th style="text-align: right;">Cost</th></tr></thead>
<tbody><tr><td>tea</td><td style="text-align: right;">2</td></tr></tbody>
<tfoot><tr><td>all</td><td>2</td></tr></tfoot>
</table>
```

```json
[
  {"type":"table","children":[{"type":"table_head","children":[{"type":"table_row","children":[{"type":"table_cell","header":true,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"Item"}]}]},{"type":"table_cell","header":true,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"Cost"}]}],"align":"right"}]}]},{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"tea"}]}]},{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"2"}]}]}]}]},{"type":"table_foot","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"all"}]}]},{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"2"}]}]}]}]}],"columns":[{"type":"table_column"},{"type":"table_column"}],"caption":{"type":"caption","children":[{"type":"paragraph","children":[{"type":"text","value":"Prices"}]}]}}
]
```

```carve
{footer-rows=1}
|= Item |={>} Cost |
| tea | 2 |
| all | 2 |
^ Prices
```

:::

Example 17 (verified)

::: compare

```html
<table><tr><td>a<br>b</td></tr></table>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"a b"}]}]}]}]}],"columns":[{"type":"table_column"}]}
]
```

```carve
| a b |
```

:::

Example 53 (unverified)

::: compare

```html
<table><colgroup><col style="width: 150%;"></colgroup><tr><td>a</td></tr></table>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"a"}]}]}]}]}],"columns":[{"type":"table_column"}]}
]
```

```carve
| a |
```

:::

A width above 100 percent is no width of C2-B-212.

Reported: `import-attribute-dropped`.

## Figures

**C2-M-042** A `<figure>` whose first class is `carve-figure-group` is a `figure_group` whose panels are its `<figure>` children, and whose `<figcaption>` is its caption (C2-H-063, C2-H-064).

**C2-M-043** Any other `<figure>` that holds one block, which C2-A-082 lets carry a caption and which has none yet, and a `<figcaption>` is that block with the caption in its `caption` slot, and with the attributes of the `<figure>` as its attributes (C2-H-199, C2-A-183). A figure with no `<figcaption>` that holds one image paragraph is that paragraph. A figure that holds more than one block, or one block that C2-A-082 does not let carry a caption or that has a caption already, is a `figure_group`.

Example 18 (verified)

::: compare

```html
<figure class="wide"><img src="/cat.png" alt="Cat"><figcaption>A cat</figcaption></figure>
```

```json
[
  {"type":"paragraph","role":"image","children":[{"type":"image","src":"/cat.png","alt":"Cat"}],"caption":{"type":"caption","children":[{"type":"paragraph","children":[{"type":"text","value":"A cat"}]}]},"attrs":{"classes":["wide"]}}
]
```

```carve
{.wide}
![Cat](/cat.png)
^ A cat
```

:::

Example 19 (verified)

::: compare

```html
<figure><table><tr><td>a</td></tr></table><figcaption>T</figcaption></figure>
```

```json
[
  {"type":"table","children":[{"type":"table_body","children":[{"type":"table_row","children":[{"type":"table_cell","header":false,"children":[{"type":"cell_paragraph","children":[{"type":"text","value":"a"}]}]}]}]}],"columns":[{"type":"table_column"}],"caption":{"type":"caption","children":[{"type":"paragraph","children":[{"type":"text","value":"T"}]}]}}
]
```

```carve
| a |
^ T
```

:::

C2-H-199 reads the table with its caption.

Example 43 (verified)

::: compare

```html
<figure><p>x</p><figcaption>y</figcaption></figure>
```

```json
[
  {"type":"figure_group","children":[{"type":"paragraph","children":[{"type":"text","value":"x"}]}],"caption":{"type":"caption","children":[{"type":"paragraph","children":[{"type":"text","value":"y"}]}]}}
]
```

```carve
::: figure
x
:::
^ y
```

:::

A plain paragraph carries no caption (C2-A-082), so the figure is a group around it.

## Conventions

**C2-M-035** These elements and classes are read as the Carve node a render writes them for. A class that a convention reads is not kept in `attrs.classes`.

| Convention | Element | Test | Node |
|---|---|---|---|
| admonition | `aside` | first class `admonition`, second class a kind of C2-H-154 | admonition; `aria-label` and `aria-labelledby` are not kept |
| admonition-title | `p` | class exactly `admonition-title`, first block of a div or admonition | its title |
| critic-comment | `span` | first class `critic-comment` | critic_comment |
| directive | `div` | first class a directive kind: `bibliography`, `footnotes`, `glossary`, `index`, `references`, `toc` | directive (C2-H-195 row 9) |
| div-label | `p` | class exactly `div-label`, after the title | groupLabel |
| ext | `span` | first class `ext-NAME`, where NAME is an inline extension name (C2-I-094) | inline_extension NAME (C2-H-195 row 10) |
| figure-group | `figure` | first class `carve-figure-group` | figure_group |
| math | `span` | classes `math inline` or `math display`, text between `\(` and `\)` or `\[` and `\]` | math |
| mention | `span` | first class `mention`, one `strong` child whose text starts with the sigil | mention |
| tag | `span` | first class `tag`, one `strong` child whose text starts with `#` | tag |

Example 20 (verified)

::: compare

```html
<aside class="admonition warning" aria-label="Warning"><p class="admonition-title">Careful</p><p>Hot.</p></aside>
```

```json
[
  {"type":"admonition","kind":"warning","title":[{"type":"text","value":"Careful"}],"children":[{"type":"paragraph","children":[{"type":"text","value":"Hot."}]}]}
]
```

```carve
::: warning "Careful"
Hot.
:::
```

:::

Example 21 (verified)

::: compare

```html
<p><span class="ext-x">e</span> <span class="mention"><strong>@ann</strong></span> <span class="critic-comment">c</span></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"inline_extension","name":"x","children":[{"type":"text","value":"e"}]},{"type":"text","value":" "},{"type":"mention","target":"ann","kind":"user"},{"type":"text","value":" "},{"type":"critic_comment","value":"c"}]}
]
```

```carve
:x[e] @ann {#c#}
```

:::

Example 22 (verified)

::: compare

```html
<div class="toc">x</div>
```

```json
[
  {"type":"directive","kind":"toc","children":[{"type":"paragraph","children":[{"type":"text","value":"x"}]}]}
]
```

```carve
::: toc
x
:::
```

:::

Example 52 (unverified)

::: compare

```html
<p><span class="ext-1">x</span></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"span","children":[{"type":"text","value":"x"}],"attrs":{"classes":["ext-1"]}}]}
]
```

```carve
[x]{.ext-1}
```

:::

`1` is no inline extension name, so the class is an ordinary class.

## Inline elements

**C2-M-044** The inline elements with a Carve counterpart map as the table "Elements" gives: `<em>` and `<i>` to `emphasis`, `<strong>` and `<b>` to `strong`, `<s>` and `<strike>` to `strike`, `<del>` to `delete`, `<ins>` to `insert`, `<mark>` to `highlight`, `<u>` to `underline`, `<sub>` to `subscript`, `<sup>` to `superscript`, and `<span>` to `span`. Each takes its attributes.

**C2-M-045** `<code>` is a `code` node whose value is its text, with the markup inside dropped.

**C2-M-046** `<br>` is a `hard_break`. `<wbr>` is dropped and reported with `import-element-dropped`: it marks a place where a line may break and renders nothing.

**C2-M-047** `<kbd>` is a `span` with the key `kbd` and an empty value, and `<time>` a span with the key `time` and the value of `datetime`, or an empty value when it has none (C2-H-075). `<abbr>` is an `abbreviation` when an abbreviation template (C2-H-187) defines its text with its `title` as the expansion and it holds no element; otherwise it is a span with the key `abbr` and the value of `title`, or an empty value when it has none.

Example 46 (verified)

::: compare

```html
<p><time>today</time> <abbr>HTML</abbr></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"span","children":[{"type":"text","value":"today"}],"attrs":{"keyValues":[["time",""]]}},{"type":"text","value":" "},{"type":"span","children":[{"type":"text","value":"HTML"}],"attrs":{"keyValues":[["abbr",""]]}}]}
]
```

```carve
[today]{time} [HTML]{abbr}
```

:::

With no `datetime` and no `title`, each key has an empty value.

**C2-M-048** `<ruby>` is a `ruby` node: each `<rt>` closes a pair whose base is the content before it, and `<rb>` gives its content. `<rp>` is dropped without a report, since every render writes the parentheses again. A base with no `<rt>` after it is text, reported with `import-structure-repaired`.

**C2-M-049** `<math>` is a `math` node when it holds a TeX source: the text of an `<annotation>` whose `encoding` is `application/x-tex`, `text/x-tex` or `LaTeX`, or else its `alttext`. `display="block"` makes it display math. A `<math>` with no TeX source is its text, reported with `import-element-mapped`.

Example 23 (verified)

::: compare

```html
<p>A <em>b</em> and <strong>c</strong>.</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"A "},{"type":"emphasis","children":[{"type":"text","value":"b"}]},{"type":"text","value":" and "},{"type":"strong","children":[{"type":"text","value":"c"}]},{"type":"text","value":"."}]}
]
```

```carve
A /b/ and *c*.
```

:::

Example 24 (verified)

::: compare

```html
<p>H<sub>2</sub>O, x<sup>2</sup>, <mark>m</mark>, <del>d</del>, <ins>i</ins>, <kbd>Ctrl</kbd>, <abbr title="HyperText">HTML</abbr>, <time datetime="2026-11-16">today</time></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"H"},{"type":"subscript","children":[{"type":"text","value":"2"}]},{"type":"text","value":"O, x"},{"type":"superscript","children":[{"type":"text","value":"2"}]},{"type":"text","value":", "},{"type":"highlight","children":[{"type":"text","value":"m"}]},{"type":"text","value":", "},{"type":"delete","children":[{"type":"text","value":"d"}]},{"type":"text","value":", "},{"type":"insert","children":[{"type":"text","value":"i"}]},{"type":"text","value":", "},{"type":"span","children":[{"type":"text","value":"Ctrl"}],"attrs":{"keyValues":[["kbd",""]]}},{"type":"text","value":", "},{"type":"span","children":[{"type":"text","value":"HTML"}],"attrs":{"keyValues":[["abbr","HyperText"]]}},{"type":"text","value":", "},{"type":"span","children":[{"type":"text","value":"today"}],"attrs":{"keyValues":[["time","2026-11-16"]]}}]}
]
```

```carve
H{,2,}O, x{^2^}, {=m=}, {-d-}, {+i+}, [Ctrl]{kbd}, [HTML]{abbr=HyperText}, [today]{time=2026-11-16}
```

:::

Example 25 (verified)

::: compare

```html
<p><math display="block"><semantics><mi>x</mi><annotation encoding="application/x-tex">x^2</annotation></semantics></math></p>
<p><span class="math inline">\(y\)</span></p>
```

```json
[
  {"type":"paragraph","role":"math","children":[{"type":"math","display":true,"value":"x^2"}]},
  {"type":"paragraph","children":[{"type":"math","display":false,"value":"y"}]}
]
```

```carve
$$`x^2`

$`y`
```

:::

## Links and images

**C2-M-050** `<a>` with an `href` is a `link` whose `href` is the value and whose `tooltip` is its `title`. `<a>` without an `href` is its content, in a `span` when it has attributes. `<img>` is an `image` with `src`, `alt` (empty when absent) and `tooltip` from `title`; a `longdesc` is its long description, a paragraph with one link to that URL.

**C2-M-051** A destination is tested with the default deny list of C2-H-159 and C2-H-160. A link whose `href` fails is its content, in a span when it has attributes, and an image whose `src` fails is its alternative text, in a span when it has attributes. A `longdesc` that fails is dropped. Each failure is reported with `import-destination-denied`. The importer applies no other URL policy: a renderer applies its own policy to the tree it is given (C2-H-189).

Example 26 (verified)

::: compare

```html
<p><a href="/u" title="T">ok</a> <a href="javascript:alert(1)">bad</a> <a>plain</a></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"link","children":[{"type":"text","value":"ok"}],"href":"/u","tooltip":"T"},{"type":"text","value":" bad plain"}]}
]
```

```carve
[ok](/u "T") bad plain
```

:::

Example 27 (verified)

::: compare

```html
<p><img src="/a.png" alt="A"></p>
<p>Inline <img src="/i.png" alt="I" width="10"> and <img src="javascript:x" alt="gone"></p>
```

```json
[
  {"type":"paragraph","role":"image","children":[{"type":"image","src":"/a.png","alt":"A"}]},
  {"type":"paragraph","children":[{"type":"text","value":"Inline "},{"type":"image","src":"/i.png","alt":"I","attrs":{"keyValues":[["width","10"]]}},{"type":"text","value":" and gone"}]}
]
```

```carve
![A](/a.png)

Inline ![I](/i.png){width=10} and gone
```

:::

## Attributes

**C2-M-052** Each attribute of an element is read by the row of the table "Attributes" that matches its name: a row whose match is `name`, `prefix` or `reserved`, and only when none does, the row `*`. Where the row says `key`, the attribute is a key of `attrs` with its name and its value as they stand, in the order the parser gives.

| Name | Match | On | Treatment | Note |
|---|---|---|---|---|
| `*` | key | any | key | a name that is a key by C2-I-030; any other name is dropped and reported |
| `aria-label` | name | input | field | read on the task box; on an admonition `aside` it is generated and not kept; elsewhere a key |
| `class` | name | any | classes | split at ASCII whitespace; a class a convention reads is not kept |
| `data-carve-` | reserved | any | carrier | the 18 reserved names of C2-H-115 only |
| `dir` | name | any | dir | `ltr`, `rtl` or `auto`; another value is dropped and reported |
| `formaction` | name | any | drop |  |
| `id` | name | any | id |  |
| `lang` | name | any | lang |  |
| `on` | prefix | any | drop | event handlers |
| `srcdoc` | name | any | drop |  |
| `style` | name | any | key | exact alignment declarations are read (C2-M-040, C2-M-075) |

**C2-M-053** The attributes that a clause of this document reads for an element, such as `href` on `<a>` or `start` on `<ol>`, are fields of its node and are not kept as keys. A `class` that a convention reads is not kept (C2-M-035).

**C2-M-054** A name that is no key by C2-I-030, such as `x:y` or `data-ü`, has no spelling in an attribute block. The attribute is dropped and reported with `import-attribute-dropped`.

**C2-M-055** A `style` is a key with its value as written, except the exact declarations of C2-M-040 and C2-M-075. It is not parsed further, and no other tree fact is taken from it. The renderer tests it when it writes it (C2-H-162).

Example 28 (verified)

::: compare

```html
<p id="p1" class="lead note" lang="de" data-id="7" style="color: red" onclick="go()">Text</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"Text"}],"lang":"de","attrs":{"id":"p1","classes":["lead","note"],"keyValues":[["data-id","7"],["style","color: red"]]}}
]
```

```carve
{#p1 .lead .note :de data-id=7 style="color: red"}
Text
```

:::

`onclick` is dropped and reported (C2-H-161).

Example 29 (verified)

::: compare

```html
<p><span x:y="1" data-k="2">t</span></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"span","children":[{"type":"text","value":"t"}],"attrs":{"keyValues":[["data-k","2"]]}}]}
]
```

```carve
[t]{data-k=2}
```

:::

## Elements without a counterpart

**C2-M-056** Every element is read by its row of the table "Elements". An element with no row is read by the row `*`: an inline `span`. The treatment of a row is one of these:

- `map`: the element is the node its clauses name.
- `div`: the element is a `div` with its attributes and its children read as blocks.
- `span`: the element is a `span` with its attributes and its children read as inline content.
- `unwrap`: the element gives no node, and its children are read in its place.
- `raw`: the element is raw HTML (C2-M-065) when the import option `rawHtml` is on, and gives nothing when it is off (C2-M-066).
- `drop`: the element and its content give nothing.

**C2-M-057** Every treatment but `map` and `unwrap` is reported: `div` and `span` with `import-element-mapped`, `drop` with `import-element-dropped`, and `raw` as C2-M-066 states. `unwrap` is reported with `import-element-mapped` unless the row says otherwise. The choice is fixed by the table; an importer does not choose another treatment.

| Element | Treatment | Node | Note |
|---|---|---|---|
| `*` | span | span | every element with no row, custom elements included |
| `a` | map | link, or footnote reference |  |
| `abbr` | map | abbreviation, or span with the key abbr |  |
| `acronym` | span | span |  |
| `address` | div | div |  |
| `article` | div | div |  |
| `aside` | map | admonition; div when it is none |  |
| `audio` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `b` | map | strong |  |
| `base` | drop |  | reported once with head |
| `bdi` | span | span |  |
| `bdo` | span | span |  |
| `big` | span | span |  |
| `blockquote` | map | block_quote |  |
| `body` | unwrap |  | the document node; not reported |
| `br` | map | hard_break |  |
| `button` | span | span |  |
| `canvas` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `caption` | map | caption of the table |  |
| `center` | div | div |  |
| `cite` | span | span |  |
| `code` | map | code |  |
| `col` | map | column widths |  |
| `colgroup` | map | column widths |  |
| `data` | span | span |  |
| `dd` | map | definition_description |  |
| `del` | map | delete |  |
| `details` | div | div |  |
| `dfn` | span | span |  |
| `dialog` | div | div |  |
| `div` | map | div, or a heading or convention |  |
| `dl` | map | definition_list |  |
| `dt` | map | definition_term |  |
| `em` | map | emphasis |  |
| `embed` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `fieldset` | div | div |  |
| `figcaption` | map | caption |  |
| `figure` | map | the captioned block, or figure_group |  |
| `font` | span | span |  |
| `footer` | div | div |  |
| `form` | div | div |  |
| `h1` | map | heading |  |
| `h2` | map | heading |  |
| `h3` | map | heading |  |
| `h4` | map | heading |  |
| `h5` | map | heading |  |
| `h6` | map | heading |  |
| `head` | drop |  | reported once with head |
| `header` | div | div |  |
| `hgroup` | div | div |  |
| `hr` | map | thematic_break |  |
| `html` | unwrap |  | the document node; not reported |
| `i` | map | emphasis |  |
| `iframe` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `img` | map | image |  |
| `input` | map | the task box of its item; raw elsewhere, nothing with `rawHtml` off |  |
| `ins` | map | insert |  |
| `kbd` | map | span with the key kbd |  |
| `label` | span | span |  |
| `legend` | map | the first paragraph of its fieldset |  |
| `li` | map | list_item |  |
| `link` | drop |  | reported once with head |
| `main` | div | div |  |
| `map` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `mark` | map | highlight |  |
| `math` | map | math |  |
| `menu` | map | list, bullet |  |
| `meta` | drop |  | reported once with head |
| `meter` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `nav` | div | div |  |
| `noscript` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `object` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `ol` | map | list, ordered |  |
| `output` | span | span |  |
| `p` | map | paragraph |  |
| `param` | drop |  |  |
| `picture` | unwrap |  | its img is read |
| `pre` | map | code_block |  |
| `progress` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `q` | span | span |  |
| `rb` | map | ruby |  |
| `rp` | drop |  | not reported |
| `rt` | map | ruby |  |
| `ruby` | map | ruby |  |
| `s` | map | strike |  |
| `samp` | span | span |  |
| `script` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `search` | div | div |  |
| `section` | map | heading and its blocks, a footnote section, or a div |  |
| `select` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `small` | span | span |  |
| `source` | drop |  |  |
| `span` | map | span, or a convention |  |
| `strike` | map | strike |  |
| `strong` | map | strong |  |
| `style` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `sub` | map | subscript |  |
| `summary` | map | the first paragraph of its details |  |
| `sup` | map | superscript, or a footnote reference |  |
| `svg` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `table` | map | table |  |
| `tbody` | map | table_body |  |
| `td` | map | table_cell |  |
| `template` | raw | raw_block, nothing with `rawHtml` off; an abbreviation template where C2-H-187 reads it |  |
| `textarea` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `tfoot` | map | table_foot |  |
| `th` | map | table_cell |  |
| `thead` | map | table_head |  |
| `time` | map | span with the key time |  |
| `title` | drop |  | reported once with head |
| `tr` | map | table_row |  |
| `track` | drop |  |  |
| `tt` | span | span |  |
| `u` | map | underline |  |
| `ul` | map | list, bullet |  |
| `var` | span | span |  |
| `video` | raw | raw_block or raw_inline; nothing with `rawHtml` off |  |
| `wbr` | drop |  |  |

**C2-M-058** An element whose counterpart needs a parent element and that stands outside it, such as an `<li>` outside a list or a `<figcaption>` outside a `<figure>`, is read with the treatment `unwrap`: its children are read in its place. These are `li`, `dt`, `dd`, `caption`, `figcaption`, `summary` and `legend`. The HTML parser already drops table parts outside a table.

**C2-M-059** `<details>` is a `div`. Its first `<summary>` child is a paragraph of the summary's inline content, the first block of the div.

**C2-M-060** An `<aside>` that is no admonition of the table "Conventions" is a `div`, as is every row with the treatment `div`.

Example 30 (verified)

::: compare

```html
<details><summary>More</summary><p>Body</p></details>
```

```json
[
  {"type":"div","children":[{"type":"paragraph","children":[{"type":"text","value":"More"}]},{"type":"paragraph","children":[{"type":"text","value":"Body"}]}]}
]
```

```carve
:::
More

Body
:::
```

:::

Example 31 (verified)

::: compare

```html
<header class="top"><h1>Site</h1></header>
```

```json
[
  {"type":"div","children":[{"type":"heading","level":1,"children":[{"type":"text","value":"Site"}]}],"attrs":{"classes":["top"]}}
]
```

```carve
::: top
= Site
:::
```

:::

Example 32 (verified)

::: compare

```html
<p>A <small>fine</small> <cite>print</cite> <my-tag>x</my-tag></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"A "},{"type":"span","children":[{"type":"text","value":"fine"}]},{"type":"text","value":" "},{"type":"span","children":[{"type":"text","value":"print"}]},{"type":"text","value":" "},{"type":"span","children":[{"type":"text","value":"x"}]}]}
]
```

```carve
A [fine]{} [print]{} [x]{}
```

:::

## Footnotes

**C2-M-061** A `<section>` with `role="doc-endnotes"`, or whose classes include `footnotes`, is a footnote section. Each `<li>` of its first `<ol>` that has an `id` is a `footnote` whose blocks are those of the item. The key is the value of `data-carve-footnote-label` where C2-H-186 reads it; otherwise the `id` without a leading `user-content-fn-`, `fn-` or `fn`. An item with no `id` is dropped and reported with `import-structure-repaired`.

**C2-M-062** An `<a>` with `role="doc-noteref"` or the attribute `data-footnote-ref` is a `footnote_ref` whose key is that of the note its `href` names, or else its fragment without the prefixes of C2-M-061. A `<sup>` whose only content is such an `<a>`, or whose first class is `footnote-ref` and which holds one, is that reference alone. The `id` a render generates on a reference (C2-H-088) is not kept.

**C2-M-063** A backlink of a note, an `<a>` with `role="doc-backlink"`, with the attribute `data-footnote-backref` or with the class `footnote-backref`, is dropped without a report, with the spaces before it. A paragraph that held only backlinks is dropped.

**C2-M-064** The footnote definitions stand after the blocks of the document and after the rebuilt link definitions (C2-H-194), in the order of the notes. A footnote section with a title or a label, or with blocks after it, gives a `footnotes` directive at its place (C2-H-158).

Example 33 (verified)

::: compare

```html
<p>x<sup><a href="#fn-1" id="fnref-1" data-footnote-ref>1</a></sup></p>
<section class="footnotes"><ol><li id="fn-1"><p>Note <a href="#fnref-1" data-footnote-backref class="footnote-backref">↩</a></p></li></ol></section>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"x"},{"type":"footnote_ref","key":"1","namespace":"footnote"}]},
  {"type":"footnote","key":"1","namespace":"footnote","children":[{"type":"paragraph","children":[{"type":"text","value":"Note"}]}]}
]
```

```carve
x[^1]

[^1]: Note
```

:::

## Raw content

**C2-M-065** With the import option `rawHtml` on, a comment is a `raw_inline` with the format `html` in inline content and a `raw_block` with the format `html` among blocks. An element of the treatment `raw` is the same, with its outer HTML as serialized by the HTML Standard as the value. A raw block value ends with a line feed (C2-A-045, C2-A-048).

Example 45 (verified, import option `rawHtml` on)

::: compare

```html
<div><!--x--><p>y</p>a<!--z--></div>
```

```json
[
  {"type":"div","children":[{"type":"raw_block","format":"html","value":"<!--x-->\n"},{"type":"paragraph","children":[{"type":"text","value":"y"}]},{"type":"paragraph","children":[{"type":"text","value":"a"},{"type":"raw_inline","format":"html","value":"<!--z-->"}]}]}
]
```

````carve
:::
```=html
<!--x-->
```

y

a`<!--z-->`{=html}
:::
````

:::

The first comment has no inline content beside it before the block element, so it is a raw block; the second stands in the run of `a` and is a raw span of that paragraph.

**C2-M-066** The importer reads the option `rawHtml` of C2-H-137, whose default is off. With it off, every comment, every element of the treatment `raw` and every `data-carve-raw` span (C2-H-186) is dropped with its content and attributes, and each is reported with one `import-element-dropped` entry whose `foreignType` is its tag name or `#comment` (C2-M-081). Such an import loses every comment, every script and style, every embedded object, media element, canvas, image map and form control of the table "Elements", every `<svg>`, `<noscript>` and `<template>` that is no abbreviation template (C2-H-187), and every `<input>` that is no task box. The tree then holds no raw node, so neither the written source nor a later render with any setting carries raw content of the input. With the option on, the raw nodes of C2-M-065 are kept and are not reported, since each holds its element whole. Whether raw HTML then reaches the output is decided where the tree is rendered: with `rawHtml` off, which is the default, a raw block renders as a code block and a raw span as its escaped text (C2-H-050, C2-H-051), and the profile `article` refuses both (C2-H-129). Raw content in the tree is data and not a grant (C2-H-189).

**C2-M-067** A reserved name of C2-H-115 is removed from an element before the element is serialized as raw content, as C2-H-186 requires.

Example 34 (verified, import option `rawHtml` on)

::: compare

```html
<!-- note --><p>a<!-- inline -->b</p><script>run()</script>
```

```json
[
  {"type":"raw_block","format":"html","value":"<!-- note -->\n"},
  {"type":"paragraph","children":[{"type":"text","value":"a"},{"type":"raw_inline","format":"html","value":"<!-- inline -->"},{"type":"text","value":"b"}]},
  {"type":"raw_block","format":"html","value":"<script>run()</script>\n"}
]
```

````carve
```=html
<!-- note -->
```

a`<!-- inline -->`{=html}b

```=html
<script>run()</script>
```
````

:::

Example 35 (verified, import option `rawHtml` on)

::: compare

```html
<p>Video: <iframe src="/v"></iframe></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"Video: "},{"type":"raw_inline","format":"html","value":"<iframe src=\"/v\"></iframe>"}]}
]
```

```carve
Video: `<iframe src="/v"></iframe>`{=html}
```

:::

Example 41 (verified)

::: compare

```html
<!-- note --><p>a<!-- inline -->b</p><script>run()</script>
<p>Video: <iframe src="/v"></iframe></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"ab"}]},
  {"type":"paragraph","children":[{"type":"text","value":"Video:"}]}
]
```

```carve
ab

Video:
```

:::

The input of Examples 34 and 35 with `rawHtml` off, the default. The two comments, the script and the iframe give four `import-element-dropped` entries. The text around the inline comment is joined (C2-M-073), and the space before the iframe is removed at the end of its paragraph (C2-M-018) and reported with `import-whitespace-normalized`.

Reported: `import-element-dropped`, `import-whitespace-normalized`.

Example 42 (verified)

::: compare

```html
<p>a<span data-carve-raw="html">&lt;script&gt;x()&lt;/script&gt;</span>b</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"ab"}]}
]
```

```carve
ab
```

:::

With `rawHtml` off, the default, the raw span that a render with `roundtrip` wrote is dropped and gives one `import-element-dropped` entry whose `foreignType` is `span`. The text around it is joined (C2-M-073).

Reported: `import-element-dropped`.

## Normalization

**C2-M-068** The importer returns a tree that the 0.2 reader accepts and that the writer can spell wherever the HTML holds a fact Carve can hold. C2-M-069 to C2-M-074 state how.

**C2-M-069** A `paragraph`, `heading` or `definition_term` with no content after the rules of this document is dropped. So is an inline node that needs content and has none (C2-W-116), except a `span` with attributes, which Carve spells as `[]{...}`. A drop that loses an attribute is reported with `import-structure-repaired`; one that loses nothing is not reported.

**C2-M-070** A `list` with no item and a `definition_list` with no entry are dropped and reported with `import-structure-repaired`.

**C2-M-071** The HTML parser never puts an `<a>` inside an `<a>` (C2-M-003), so the tree holds no link inside a link.

**C2-M-072** Ids are kept as written, also when two elements carry the same id. The tree then holds a duplicate id, which the reader reports with `duplicate-id` (C2-A-039); the importer adds no report and changes no id.

**C2-M-073** Adjacent text is joined (C2-M-015).

**C2-M-074** A tree that holds a fact the writer has no spelling for in that place, such as blocks in a table cell, a row span the source cannot express or a `dir`, is returned as it stands. The writer reports it with `field-unspellable` or `structure-unspellable` (C2-W-117), in the same record.

**C2-M-075** On a `<p>`, a `<div>` and a heading element, a `style` that is exactly `text-align: left;`, `text-align: right;` or `text-align: center;` is the key `align` with that value, as a render writes it (C2-H-015). An `align` attribute of the same element is then dropped, since the declaration wins in a browser, and reported with `import-attribute-dropped`.

Example 51 (unverified)

::: compare

```html
<p align="right" style="text-align: left;">x</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"x"}],"attrs":{"keyValues":[["align","left"]]}}
]
```

```carve
{align=left}
x
```

:::

The declaration wins, as it does in a browser.

Reported: `import-attribute-dropped`.

Example 36 (verified)

::: compare

```html
<p></p><p><b></b>x<span id="a"></span></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"x"},{"type":"span","children":[],"attrs":{"id":"a"}}]}
]
```

```carve
x[]{#a}
```

:::

Example 37 (verified)

::: compare

```html
<p><a href="/x">a <a href="/y">b</a></a></p>
```

```json
[
  {"type":"paragraph","children":[{"type":"link","children":[{"type":"text","value":"a "}],"href":"/x"},{"type":"link","children":[{"type":"text","value":"b"}],"href":"/y"}]}
]
```

```carve
[a ](/x)[b](/y)
```

:::

Example 38 (verified)

::: compare

```html
<h2 id="a">A</h2><h2 id="a">B</h2>
```

```json
[
  {"type":"heading","level":2,"children":[{"type":"text","value":"A"}],"attrs":{"id":"a"}},
  {"type":"heading","level":2,"children":[{"type":"text","value":"B"}],"attrs":{"id":"a"}}
]
```

```carve
{#a}
== A

{#a}
== B
```

:::

Example 39 (verified)

::: compare

```html
<p>a<wbr>b</p>
```

```json
[
  {"type":"paragraph","children":[{"type":"text","value":"ab"}]}
]
```

```carve
ab
```

:::

## Diagnostics

**C2-M-080** An importer reports into the diagnostics record of C2-A-172. Every entry has a code, a severity, a position, a message and a channel (C2-A-173). The codes of the importer are in the render-loss channel, as those of the writer are (C2-W-104), and a code keeps that channel in every tool.

**C2-M-081** The position of an importer entry is a range in UTF-8 bytes of the HTML input: the start and the end of the element, attribute owner or text node the entry is about, as the HTML parser locates them. An entry may also carry the path of the node it produced in the imported tree. The entry names that node in the field `foreignType` (C2-A-173): its lower-case tag name, or `#comment`, `#text` or `#doctype`.

**C2-M-082** Every fact of the input that the tree does not hold, and every change of a fact, is reported, except where a clause says the drop is not reported. The importer reports what it changed; the writer reports what it cannot spell (C2-M-074). `strictLosses` makes every render-loss entry an error (C2-A-174), the importer's included.

**C2-M-083** The codes are the rows of `codes` in `data/import-html.json`:

| Code | Severity | Reports |
|---|---|---|
| `import-attribute-dropped` | warning | an attribute that the tree does not keep: an event handler, a name that is no key, an invalid `dir`, a wrapper or section attribute, an unread attribute of `code` or of a task box, an ordered start out of range, an `align` beside an alignment declaration, a `col` style that gives no width, a cell `scope`, `align` or `valign` outside its set |
| `import-carrier-ignored` | warning | a reserved name that `html.md` ignores (C2-H-185) |
| `import-destination-denied` | warning | a destination that fails the deny list; the link is its text and the image its alternative text |
| `import-element-dropped` | warning | an element or comment given nothing, with its content: the head, the doctype, the treatment `drop`, and with `rawHtml` off every comment, the treatment `raw` and every `data-carve-raw` span |
| `import-element-mapped` | warning | an element without a counterpart read as a div, a span or its children; a block element in inline content; a section without a heading; MathML without TeX |
| `import-structure-repaired` | warning | content dropped or changed so that the tree is valid: a non-item child of a list, a foreign child of a table or a description list, a second head or foot of a table, a clamped row span, an empty node that held attributes, a ruby base without annotation |
| `import-whitespace-normalized` | hint | whitespace removed or a line break turned into a space; no visible text changes |

## The guarantee

**C2-M-090** For Carve HTML rendered with `roundtrip`, C2-H-188 to C2-H-196 state what survives. Both guarantees assume an import with the option `rawHtml` on; with it off, the comments and the elements of the treatment `raw` that the render passed through and the raw spans it wrote with `data-carve-raw` are also lost (C2-M-066).

**C2-M-091** For Carve HTML rendered without `roundtrip` and not changed afterwards, an import gives back the parsed tree of the source, except for these losses: the losses of a render with `roundtrip` (C2-H-119, C2-H-193, C2-H-194, C2-H-195), the facts that the render itself does not write (comments, smart punctuation as glyphs, unresolved references, includes, denied destinations, filtered attributes and the other render losses of `html.md`), every fact a carrier of C2-H-186 sets, and, with the import option `rawHtml` off, what C2-M-066 drops. Without the carrier, each element reads as it stands; the rows of `losses` in `data/import-html.json` say what comes back:

| Carrier | Comes back as |
|---|---|
| `data-carve-abbreviations` | each `<abbr>` is a span with the key `abbr`; the definitions are gone |
| `data-carve-autolink` | a link whose text is its target |
| `data-carve-caption-number` | the number as text in the caption |
| `data-carve-div` | nothing: a plain div reads as a div |
| `data-carve-explicit-id` | nothing: every id reads as authored |
| `data-carve-footnote-label` | the key from the note id, the footnote number |
| `data-carve-generated-id` | the generated id as an authored `attrs.id` |
| `data-carve-inline-footnote` | a footnote reference and a footnote definition |
| `data-carve-label` | no `groupLabel` on the code block |
| `data-carve-line-block` | a div with class `line-block` of paragraphs with hard breaks |
| `data-carve-raw` | the payload as text |
| `data-carve-ref` | an inline link or image with its `href`, `src` and `title`; no definition is rebuilt |
| `data-carve-ref-collapsed` | as `data-carve-ref` |
| `data-carve-ref-shortcut` | as `data-carve-ref` |
| `data-carve-src` | nothing |
| `data-carve-tight` | spacing by C2-M-033: a tight list whose item holds more than one block reads as loose |
| `data-carve-xref` | a link to `#ID` whose text is the generated text |
| `data-marker` | the bullet `-` |

**C2-M-092** The list of C2-M-091 is complete as far as known. A tree fact that it does not name is expected to survive a render without `roundtrip` and an import. A round trip that loses another fact is a defect of this specification or of the engine.

**C2-M-093** Evidence, measured on the 434 examples of the specification that the harness of the reference importer reads (`import/scripts/roundtrip.ts`, `carve-js` commit `cd8e431b`), whose importer keeps raw content as the option `rawHtml` on does. With `roundtrip`: 320 trees are equal as they stand and 431 after the losses the harness applies. Without `roundtrip`: 250 are equal as they stand and 337 after the same losses. Of the other 97, 94 differ only in facts of the table above, so 431 are equal after the losses of C2-M-091; this count attributes each remaining difference of the harness to a carrier and is not a mode of the harness. The remaining three are the same three in both runs, and their only differences are C2-H-195 row 8 and the declared head count, which was then the tree field `table_body.headRows` and is now a sidecar fact (C2-A-088); the harness applies neither. With those two all 434 come back equal after the listed losses.

Example 40 (verified)

::: compare

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="/guide" title="Guide">the guide</a> and <a href="https://example.com">https://example.com</a>.</p>
  <ul>
    <li>one
      <p>more</p>
    </li>
    <li>two</li>
  </ul>
</section>
```

```json
[
  {"type":"heading","level":1,"children":[{"type":"text","value":"Intro"}],"attrs":{"id":"Intro"}},
  {"type":"paragraph","children":[{"type":"text","value":"See "},{"type":"link","children":[{"type":"text","value":"the guide"}],"href":"/guide","tooltip":"Guide"},{"type":"text","value":" and "},{"type":"link","children":[{"type":"text","value":"https://example.com"}],"href":"https://example.com"},{"type":"text","value":"."}]},
  {"type":"list","children":[{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"one"}]},{"type":"paragraph","children":[{"type":"text","value":"more"}]}]},{"type":"list_item","children":[{"type":"paragraph","children":[{"type":"text","value":"two"}]}]}],"marker":{"kind":"bullet","char":"-"},"spacing":"loose"}
]
```

```carve
{#Intro}
= Intro

See [the guide](/guide "Guide") and [https://example.com](https://example.com).

- one

  more

- two
```

:::

This is the render of `# Intro`, a paragraph with the reference `[the guide][g]` and the autolink `<https://example.com>`, and a tight list whose first item holds two paragraphs, without `roundtrip`. The generated id comes back as authored, the reference as an inline link with its title, the autolink as a link whose text is its target, and the tight list as loose, since its first item holds two blocks.

## Counts

**C2-M-099** This document holds 84 clauses: 83 rules and 1 exception. It holds 54 examples: 46 verified and 8 unverified. `data/import-html.json` holds 118 element rows, 11 attribute rows, 10 conventions, 7 codes and 18 loss rows.
