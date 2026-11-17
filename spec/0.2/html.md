# Carve 0.2: HTML rendering

Status: freeze candidate 3 of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md`).

This document defines how a 0.2 tree becomes HTML. The block and inline chapters say which tree a source gives, `ast.md` defines the tree, and `writer.md` defines the way back to source. It ports PART 10 of the 0.1 grammar and the rendering parts of PART 9 and PART 9R, and applies the 0.2 decisions.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-H-nnn`. `C2-A-nnn`, `C2-B-nnn`, `C2-I-nnn`, `C2-L-nnn`, `C2-M-nnn` and `C2-W-nnn` name clauses of the AST document, the block and inline chapters, the sidecar document, the HTML import document and the writer document. `CARVE-Pn-nnn` names a 0.1 clause.
- A clause that starts with the word "Exception" is a carve-out from a more general clause. Exceptions are counted at the end.
- Each example is a `compare` container that holds the Carve input and the expected HTML. The line above it gives its number and its status. *Generated* means the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. A flag named beside the status was passed to the engine. *Unverified* means the HTML was written by hand from the clauses and has not been run through any engine.
- Generated examples write headings with `#`, which 0.2 accepts (C2-B-152), because the 0.1 engine reads `=` as text.
- Where a clause says "as in 0.1", the 0.1 definition holds unchanged and is not restated here.

## Output form

**C2-H-001** The renderer returns an HTML fragment: no document wrapper, and no line ending after the last block.

**C2-H-002** In text content `&`, `<` and `>` are written as `&amp;`, `&lt;` and `&gt;`, and a no-break space (U+00A0) is written as `&nbsp;`. No other entity is produced.

**C2-H-003** An attribute value stands in double quotes, and `&`, `<`, `>`, `"` and `'` in it are written as `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&apos;`. A no-break space in a value stays the character.

**C2-H-004** A void element is written without a trailing slash: `<hr>`, `<img>`, `<br>`, `<input>`.

**C2-H-005** Each block element starts on its own line. A list, a quote, a table, a div, a figure, a section and the footnote section indent their child blocks by two spaces per level. Inline content stays on the line of its block, and a line break inside it is written as a line break with no indent.

**Exception C2-H-006** A quote whose only visible child is one paragraph without a caption is written on one line: `<blockquote><p>q</p></blockquote>`.

**Exception C2-H-007** A list item whose only block is one paragraph without a caption, bare or wrapped, is written on one line. An item with more blocks puts a first paragraph, bare or wrapped, on the line of `<li>` and each later block on its own line. A bare block image paragraph (C2-H-020) is not a paragraph in the sense of this clause, of C2-H-006 and of C2-H-040: its `<img>` stands on its own line inside the item, the description or the quote. A display math paragraph without a caption is one, and is written on one line; a captioned paragraph is written as its figure (C2-H-062), on its own lines as in a quote (C2-H-006).

**C2-H-008** A container whose body renders nothing keeps one empty line between its tags. This holds for a quote, a div, an admonition, a line block, a hard-break block and a figure group, and a body that holds only comments is such a body. The line is empty, with no indent. A table with no rows is not such a container: it is written as `<table>` and `</table>` on two lines.

Example 1 (generated)

::: compare

```carve
:::
:::

> %% note
```

```html
<div>

</div>
<blockquote>

</blockquote>
```

:::

## Attributes

**C2-H-009** The attributes of an element are written in one fixed order: the structural attributes of C2-H-010, then `id`, then `class`, then the language and the direction, then the keys in the order written, then the generated attributes that are not structural (`role`, `aria-label`, `aria-labelledby` and a generated `style`), then the render annotation of C2-H-016. A generated `style` merged with an authored `style` stands at the place of the authored key, and the `style` of an `align` key at the place of the first of the two keys (C2-H-015, C2-H-032, C2-H-057). The language is written as the `lang` attribute (C2-A-037) and the direction as the `dir` attribute (C2-A-031). Where C2-H-015 or C2-H-057 merge an authored `style` with generated declarations, the value is the authored value without its trailing spaces and `;`, then `; ` when that value is not empty, then the generated declarations.

**C2-H-010** A structural attribute is one the element derives from its own marker, destination or resolution: `type`, `start` and `data-delim` on `<ol>`; `data-task-state` on `<li>`; `href` and `title` on `<a>`; `src`, `alt` and `title` on `<img>`; `role` on a footnote reference; `title` on `<abbr>` and `datetime` on `<time>` (C2-H-075); `rowspan`, `colspan` and `scope` on a cell; and, with `roundtrip` on, the carriers of C2-H-112. They are written in the order this clause names them.

**Exception C2-H-011** On a footnote reference the `id` stands before `href`, and on the `<li>` of a note before the carriers. On a mention or a tag the class stands first, and on the title paragraph of an admonition the class stands before the `id`. On a link `rel` stands directly behind `href` and `title`, before the carriers (C2-H-167).

**C2-H-012** All classes of an element form one `class` value, joined by one space. A base class that the element's kind requires stands first: `task-list`, `math inline` or `math display`, `admonition` and the admonition kind, the name of a div's opener, `carve-figure-group`, `carve-figure-panel`. The classes the author wrote follow in the order written. A class the marker generates stands last: `line-block`. The class `hardbreaks` is a class of the tree and stands where `attrs.classes` has it (C2-A-068). A class that occurs more than once is written once, at its first place; the tree keeps every occurrence.

**C2-H-013** Attribute names compare without regard to ASCII letter case. A structural attribute replaces an authored key of the same name, except where a clause says the authored key wins (C2-H-048, C2-H-075), and an authored key replaces every other generated attribute of the same name, except a `style`, which is merged (C2-H-015, C2-H-032, C2-H-057). No element carries one name twice. A `lang` key beside the language part of an attribute block, as in `{lang=de :en}`, is such a case: the language part decides, and the key is not written. A `dir` key beside the `dir` field of a supplied or imported tree is the same case: the field decides.

**C2-H-014** An attribute whose value is the empty string is written as `name=""`.

**C2-H-015** An authored `align` key with the value `left`, `right` or `center` on a paragraph, a div or a heading is written as `style="text-align: VALUE;"`. An authored `style` on the same element keeps its value and takes the declaration after it. On every other element `align` stays an ordinary attribute. As in 0.1.

Example 62 (generated)

::: compare

```carve
{style="color:red" align=center k=v}
Text.

{k=v align=center}
Text.
```

```html
<p style="color:red; text-align: center;" k="v">Text.</p>
<p k="v" style="text-align: center;">Text.</p>
```

:::

Example 65 (generated)

::: compare

```carve
{style="color: red; " align=center}
T

{style="url(x)" align=center}
U
```

```html
<p style="color: red; text-align: center;">T</p>
<p style="text-align: center;">U</p>
```

:::

**C2-H-016** With `sourceLines` on, each block element carries `data-source-line`, the number of the source line it starts on, counted from 1, as its last attribute. It is structural (C2-H-010): the generated value replaces an authored key of that name. Block elements here are the element of each block node, the `<figure>` around a captioned block (C2-H-062), and `<li>`, `<dt>`, `<dd>`, `<thead>`, `<tbody>`, `<tfoot>` and `<tr>`; not `<section>`, `<caption>`, `<figcaption>`, `<th>`, `<td>`, nor the `<hr>` and the `<li>` of the footnote section.

**C2-H-017** Attribute names, attribute values and destinations pass the filter of C2-H-128 before they are written. The filter removes attributes and blanks destinations. It never removes an element.

In 0.1 the authored attributes kept their written order, so the id followed a class written before it. The next example shows the 0.2 order.

Example 2 (unverified)

::: compare

```carve
{.c k=v #i}
- a

[t]{z=1 .x #y}
```

```html
<ul id="i" class="c" k="v">
  <li>a</li>
</ul>
<p><span id="y" class="x" z="1">t</span></p>
```

:::

Example 3 (generated)

::: compare

```carve
{.verse}
::: |
roses
:::

1) one
2) two
```

```html
<div class="verse line-block">
  <p>roses</p>
</div>
<ol data-delim=")">
  <li>one</li>
  <li>two</li>
</ol>
```

:::

## Paragraphs, headings and sections

**C2-H-018** A paragraph is `<p>` around its inline content, except where a tightness rule writes it bare (C2-H-034, C2-H-040). A paragraph that carries attributes or a `lang` is never written bare, in an item and in a description alike: the `<p>` is what carries them.

**C2-H-019** A paragraph that holds only comments and the breaks between them renders nothing: no element and no empty line (C2-B-140). A paragraph that holds only a braced comment is this case, and so is one of braced comments on several lines. A paragraph whose content, after the breaks that C2-H-069 does not write, holds only comments renders nothing as well.

**C2-H-020** A paragraph promoted to a block image (C2-B-157, C2-A-136) is written without its `<p>`: the bare `<img>` on its own line. Where the image is an unresolved reference, C2-H-085 writes it as text, and text needs a block around it: the paragraph then keeps its `<p>`. The paragraph also keeps its `<p>` where it carries attributes or a `lang` (C2-H-018): the `<p>` carries them, and the `<img>` stands inside it on the same line, as inline content does.

**C2-H-021** A heading is `<h1>` to `<h6>` by its level. HTML has no element for a level above 6, which only a supplied tree can hold (C2-A-071): such a heading is written as `<div role="heading" aria-level="N">` with its true level, so the level is not lost. It takes its attributes and its id like any heading, and it nests sections by its level (C2-H-026).

**C2-H-022** Unless `headingIds` is `off`, every heading has an id: the id the author wrote, or a generated one. A generated id is the slug of the heading's plain text, computed as in 0.1 (CARVE-P2-004) and stated in C2-H-143 to C2-H-148. With `keep-case` the case is kept and a run of spaces becomes one hyphen. `lower` also folds the slug to lower case, and `ascii` also transliterates it to ASCII, as the two 0.1 switches did.

**C2-H-023** A generated id is a resolution result: the `generatedId` that resolution computes (C2-A-134, C2-A-135). It is not an authored id: `attrs.id` holds only what the author wrote (C2-A-038), the writer does not write a generated id into the source (C2-W-054), and the carrier `data-carve-generated-id` marks it under `roundtrip`.

**C2-H-024** Generated heading ids are unique in the document; the ids of notes and their marks are fixed (C2-H-088, C2-H-089) and take no part. Authored ids are reserved first, in document order. Generated ids follow in document order, and a slug that is already taken gets the suffix `-2`, then `-3`, and so on. An authored id is written as the author wrote it, also where two nodes carry the same one: the renderer does not change it, each later one is reported (C2-A-039), and a reference to that id resolves to the first node that carries it.

**Exception C2-H-025** The headings of a footnote body take their generated ids after every heading of the document body, in the order of the footnote numbers. A heading in an unused footnote definition takes none.

The ids `fnN` and `fnrefN` are not checked against the heading ids, so a heading `fn1` and the first note share the id, as in 0.1.

Example 60 (generated)

::: compare

```carve
# fn1

a[^x]

[^x]: n
```

```html
<section id="fn1">
  <h1>fn1</h1>
  <p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>n<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-H-026** With `sections` on, each top-level heading opens a `<section>` that holds the heading and every following top-level block up to the next heading of the same or a lower level number. Sections nest by level, and a level that is skipped makes no section of its own.

**C2-H-027** The id of a heading that opens a section is written on the `<section>`. Every other attribute of that heading stays on the heading element.

**C2-H-028** A heading inside a container opens no section and carries its id itself. The same holds for every heading when `sections` is off.

Example 4 (generated)

::: compare

```carve
# One

## Two words

# One

{#mine .c k=v}
## Three

> # Quoted
```

```html
<section id="One">
  <h1>One</h1>
  <section id="Two-words">
    <h2>Two words</h2>
  </section>
</section>
<section id="One-2">
  <h1>One</h1>
  <section id="mine">
    <h2 class="c" k="v">Three</h2>
    <blockquote>
      <h1 id="Quoted">Quoted</h1>
    </blockquote>
  </section>
</section>
```

:::

**C2-H-143** The plain text of a heading is the text its inline nodes give, in order. `text`, `code`, `literal_inline` and `math` give their value, and `non_breaking_space` gives a no-break space. `soft_break` and `hard_break` give one space. `smart_punctuation` gives the glyph it is written as. `image` gives its alt text, `autolink` its visible text, `abbreviation` the term as written, `mention` an at-sign and its target, `tag` a `#` and its name, and `caption_number` its number, or nothing while it has none. A `ruby` gives, for each pair, the base, `(`, the annotation and `)`. Every other node with inline children gives the text of its children: emphasis, strong, the braced forms, a span, a link and an inline extension. An inline extension named `index` gives nothing. `footnote_ref`, `inline_footnote`, `xref`, `symbol`, `raw_inline`, `critic_comment`, `comment` and `citation_group` give nothing, so a comment never moves an id. Which nodes give text is fixed by the node type, before any reference or symbol is resolved.

**C2-H-144** The plain text is normalized to NFC, so a precomposed and a decomposed character give the same id. Then the bidirectional controls and the invisible characters of the list `removed` in `data/heading-slug.json` are removed.

**C2-H-145** Each glyph of the list `reversed` in `data/heading-slug.json` is replaced by its ASCII source, whether smart typography wrote it or the author typed it: `’` becomes `'` and `→` becomes `-->`. Every other character stays.

**C2-H-146** Each maximal run of characters that are not an ASCII letter, an ASCII digit or a character at or above U+0080 is replaced by one hyphen. Leading and trailing hyphens are then removed. ASCII letters keep their case, and every character at or above U+0080 is kept as it is: letters of any script, symbols, punctuation outside ASCII, and the no-break space.

**C2-H-147** With `lower`, each character of the result of C2-H-146 is then mapped to lower case on its own, by the Unicode lowercase mapping of that character with no context, so `Σ` becomes `σ` also at the end of a word and `İ` becomes `i` followed by U+0307. With `ascii`, the result is transliterated to ASCII, C2-H-146 is applied again, and the result is lowered as with `lower`. The transliteration table, and what it does with a character it cannot map, belong to the host. An id under `ascii` is outside conformance.

**C2-H-148** A result whose first character is a Unicode number (general category N, not only an ASCII digit) gets the prefix `s-`, and an empty result becomes `s`. The category is that of the pinned Unicode version (C2-I-127). This is the slug. A duplicate slug then takes its suffix (C2-H-024), so the suffix follows the prefix: two headings `1` give `s-1` and `s-1-2`.

Example 24 (generated)

::: compare

```carve
# Hello, World!

# Don't stop -- go

# Café 日本語

# 2nd *try*

# ***

# Hello-World
```

```html
<section id="Hello-World">
  <h1>Hello, World!</h1>
</section>
<section id="Don-t-stop-go">
  <h1>Don’t stop – go</h1>
</section>
<section id="Café-日本語">
  <h1>Café 日本語</h1>
</section>
<section id="s-2nd-try">
  <h1>2nd <strong>try</strong></h1>
</section>
<section id="s">
  <h1>***</h1>
</section>
<section id="Hello-World-2">
  <h1>Hello-World</h1>
</section>
```

:::

Example 25 (generated, `--heading-ids lower`)

::: compare

```carve
# Ärger mit ΣΑΣ

# İstanbul Straße
```

```html
<section id="ärger-mit-σασ">
  <h1>Ärger mit ΣΑΣ</h1>
</section>
<section id="i̇stanbul-straße">
  <h1>İstanbul Straße</h1>
</section>
```

:::

An attribute line on a block image paragraph keeps the `<p>`, which carries it; the image below has none and is bare (C2-H-020).

Example 37 (unverified)

::: compare

```carve
{.c #i}
![a](x.png)

{:de}
![b](y.png)

![c](z.png)
```

```html
<p id="i" class="c"><img src="x.png" alt="a"></p>
<p lang="de"><img src="y.png" alt="b"></p>
<img src="z.png" alt="c">
```

:::

## Lists

**C2-H-029** A bullet list is `<ul>`, an ordered list is `<ol>`, and an item is `<li>`.

**C2-H-030** An ordered list carries `type` when its style is not decimal (`a`, `A`, `i` or `I`) and `start` when it does not start at 1.

**C2-H-031** An ordered list whose delimiter is `)` carries `data-delim=")"`. A list with the dot carries no such attribute. Both delimiters are meaning (C2-B-037), so the attribute is written on every render, with `roundtrip` on or off.

**C2-H-032** A task item carries the base class `task`. In a bullet list it also carries `style="list-style: none"`, so its bullet is never shown. In an ordered list the number remains visible and the item has no generated style declaration. An authored `style` follows the generated declaration after `; ` where there is one. The item starts with `<input type="checkbox" disabled aria-label="TEXT">` and one space, with `checked` before `disabled` for `x`; TEXT is the plain text (C2-H-143) of its direct paragraph and heading children, in order and joined by one space; its other blocks give no text. The box and its space stand directly behind `<li>`: before a `<p>` on the same line, and before a nested block at the end of the line. A `<ul>` or `<ol>` with a task item carries class `task-list`; its other items are plain `<li>` elements. The ordered list's `start` and `type` attributes follow C2-H-030.

**C2-H-033** A task item carries `data-task-state` with its mark (C2-A-060). Of the nine box characters, `x` and `X` both give `x`, the space gives no attribute, and `_`, `/`, `!`, `-`, `>` and `?` give themselves.

**C2-H-034** In a tight list a paragraph is written bare, without `<p>`, only when it is the first block of its item. Every other paragraph of the item gets `<p>` (C2-B-063).

**C2-H-035** In a loose list every paragraph of every item gets `<p>` (C2-B-064).

**C2-H-036** The renderer reads `list.spacing` (C2-A-059) and never derives tightness from blank lines or from the blocks of an item. A list with one item is always tight in a parsed tree (C2-B-062).

**C2-H-037** The bullet character adds nothing to the default output. Under `roundtrip` it is carried by `data-marker` (C2-H-112).

Example 5 (unverified)

::: compare

```carve
1) a
2) b

- [ ] open
- [x] done
- [-] dropped
- [_] kept
- [/] half
- [!] urgent
- [>] moved
- [?] unsure
- [X] Done
```

```html
<ol data-delim=")">
  <li>a</li>
  <li>b</li>
</ol>
<ul class="task-list">
  <li class="task" style="list-style: none"><input type="checkbox" disabled aria-label="open"> open</li>
  <li data-task-state="x" class="task" style="list-style: none"><input type="checkbox" checked disabled aria-label="done"> done</li>
  <li data-task-state="-" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="dropped"> dropped</li>
  <li data-task-state="_" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="kept"> kept</li>
  <li data-task-state="/" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="half"> half</li>
  <li data-task-state="!" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="urgent"> urgent</li>
  <li data-task-state="&gt;" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="moved"> moved</li>
  <li data-task-state="?" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="unsure"> unsure</li>
  <li data-task-state="x" class="task" style="list-style: none"><input type="checkbox" checked disabled aria-label="Done"> Done</li>
</ul>
```

:::

Example 6 (generated)

::: compare

```carve
- one
- two

- three
```

```html
<ul>
  <li><p>one</p></li>
  <li><p>two</p></li>
  <li><p>three</p></li>
</ul>
```

:::

In 0.1 the blank line inside the second item made this list loose. In 0.2 it is tight.

Example 7 (unverified)

::: compare

```carve
- a
- b

  c
- d
```

```html
<ul>
  <li>a</li>
  <li>b
    <p>c</p>
  </li>
  <li>d</li>
</ul>
```

:::

Example 8 (unverified)

::: compare

```carve
- > quote

  after
```

```html
<ul>
  <li>
    <blockquote><p>quote</p></blockquote>
    <p>after</p>
  </li>
</ul>
```

:::

The label of the box joins the texts of the item's two paragraphs; the quote gives none (C2-H-032).

Example 40 (unverified)

::: compare

```carve
- [ ] first *a*

  second

  > quote
```

```html
<ul class="task-list">
  <li class="task" style="list-style: none"><input type="checkbox" disabled aria-label="first a second"> first <strong>a</strong>
    <p>second</p>
    <blockquote><p>quote</p></blockquote>
  </li>
</ul>
```

:::

## Description lists

**C2-H-038** A description list is `<dl>`, a term is `<dt>`, and a description is `<dd>`.

**C2-H-039** A term holds inline content and never a `<p>`.

**C2-H-040** A description with one visible block writes a paragraph without a caption bare; a captioned one is its figure (C2-H-062). A description with several visible blocks gives every paragraph `<p>`, the first one included (C2-B-073, C2-B-077). The rule reads the visible blocks of the description, as C2-H-006 does for a quote: a comment and a definition are not counted. A description list has no `spacing` field.

A lone block image in a description stands on its own line, as in an item (C2-H-007).

Example 63 (generated)

::: compare

```carve
:: T
: ![a](x.png)
```

```html
<dl>
  <dt>T</dt>
  <dd>
    <img src="x.png" alt="a">
  </dd>
</dl>
```

:::

Example 9 (generated)

::: compare

```carve
:: Term
: one

:: Other
: one

  two
```

```html
<dl>
  <dt>Term</dt>
  <dd>one</dd>
  <dt>Other</dt>
  <dd>
    <p>one</p>
    <p>two</p>
  </dd>
</dl>
```

:::

## Quotes, divs and their sigil forms

**C2-H-041** A quote is `<blockquote>`. The quote fence and `>` lines give the same output.

**C2-H-042** A div is `<div>`. The name on its opener is its first class. A title on its opener is written as its first child, `<p class="admonition-title">`, as in 0.1. An admonition and a directive render as in 0.1. C2-H-154 to C2-H-158 state how.

**C2-H-043** A line block is `<div class="line-block">` around one `<p>` per stanza. Every line break in it is `<br>`, and leading spaces of a line are written as `&nbsp;`, one per space.

**C2-H-044** A hard-break block is `<div class="hardbreaks">` around its blocks. The opener form and the class form (C2-A-068, C2-L-018) give the same output, and every line break inside a paragraph of the block is `<br>`.

**C2-H-045** A hard break is `<br>` followed by a line break. A soft break is a line break.

**C2-H-046** A thematic break is `<hr>`.

Example 10 (generated)

::: compare

```carve
::: |
roses are red
  violets
:::

::: \
a
b
:::

{.hardbreaks}
:::
a\
b
:::
```

```html
<div class="line-block">
  <p>roses are red<br>
&nbsp;&nbsp;violets</p>
</div>
<div class="hardbreaks">
  <p>a<br>
b</p>
</div>
<div class="hardbreaks">
  <p>a<br>
b</p>
</div>
```

:::

**C2-H-136** A line of a line block that holds only a braced comment is a `line` node that holds the comment (C2-A-069). It renders as an empty line.

**C2-H-154** An admonition is `<aside>` whose classes are `admonition`, then its kind, then the authored classes: `::: note` gives `<aside class="admonition note">`. A title on the opener is its first child, `<p class="admonition-title">`, and a label in brackets follows as `<p class="div-label">`. Each is written only when the author wrote it, and an empty quoted title still gives an empty title paragraph. No title is made from the kind.

**C2-H-155** An admonition carries an accessible name. With a title, the title paragraph takes a generated id (C2-H-156) and the `<aside>` carries `aria-labelledby` with that id. Without a title, the `<aside>` carries `aria-label` with the `labels` string whose key is `admonition` followed by the kind with its first letter in upper case: `admonitionNote`, whose default is `Note`. When the attribute line carries `aria-label` or `aria-labelledby`, in any ASCII letter case, the renderer writes neither attribute itself and generates no id, and the title paragraph has no id.

**C2-H-156** The generated ids are `adm-1`, `adm-2` and so on. They count the titled admonitions and the titled `footnotes` directives that place the footnote section, in document order, and then those inside footnote bodies, in the order of the footnote numbers. An unused footnote definition counts none. Every authored id and every generated heading id is reserved first. An `adm-N` that is taken gets the suffix `-2`, then `-3`, until it is free.

**C2-H-157** A plain div writes its title and its label as an admonition does, and carries no name and no generated id.

**C2-H-169** The blocks inside the directive that places the footnote section are written before the section, in their order. The attributes of the directive are not written, and the section is named with `aria-labelledby` also when the directive carries an authored `aria-label`: the attributes of this directive are not written, so the exception of C2-H-155 for an authored name does not apply to it.

**C2-H-158** A top-level `footnotes` directive places the footnote section (C2-H-093). Its title and its label are the first children of the `<section>`, before `<hr>`. A titled one carries `aria-labelledby` and a generated id as in C2-H-155, in place of the `aria-label` of C2-H-089. The other five directives, `toc`, `glossary`, `index`, `bibliography` and `references`, place nothing in the core: each is written as `<div class="KIND">` that holds its title, its label and its blocks as a plain div does. An extension registered for the kind writes it instead, such as a table of contents for `toc`. A `footnotes` directive that places nothing is written as `<div class="footnotes">` in the same way.

Example 28 (generated)

::: compare

```carve
::: note
Plain.
:::

::: warning "Be careful"
Body.
:::

::: tip [Tab]
Labeled.
:::

::: custom "Title"
c
:::

::: toc "Contents"
:::

::: index
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>Plain.</p>
</aside>
<aside class="admonition warning" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Be careful</p>
  <p>Body.</p>
</aside>
<aside class="admonition tip" aria-label="Tip">
  <p class="div-label">Tab</p>
  <p>Labeled.</p>
</aside>
<div class="custom">
  <p class="admonition-title">Title</p>
  <p>c</p>
</div>
<div class="toc">
  <p class="admonition-title">Contents</p>
</div>
<div class="index">

</div>
```

:::

Example 29 (generated)

::: compare

```carve
Text[^1].

::: footnotes "Notes"
:::

[^1]: A note.

::: footnotes
:::
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Notes</p>
  <hr>
  <ol>
    <li id="fn1">
      <p>A note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
<div class="footnotes">

</div>
```

:::

## Code and raw content

**C2-H-047** A code block is `<pre><code>` around its escaped value, with `class="language-X"` on `<code>` when it has a language. The value is written as it is, its final line ending included, and nothing is added.

**C2-H-048** The attributes of a code block go on `<pre>`. A title is the `title` attribute of `<pre>`, and an authored `title` key wins over the title of the info string.

**C2-H-049** A code span is `<code>` around its escaped content. A literal-text span is its escaped content with no element, or a `<span>` when it carries attributes (C2-I-018).

**C2-H-050** With `rawHtml` off, which is the default, a raw block with the format `html` is written as a code block with the language `html`: `<pre><code class="language-html">`, the escaped payload, `</code></pre>`.

**C2-H-051** With `rawHtml` off, a raw span with the format `html` is written as its escaped payload. With `roundtrip` off no element stands around it; with `roundtrip` on it stands in `<span data-carve-raw="html">` (C2-H-114). The carrier is written for no other raw span: with `rawHtml` on a raw span with the format `html` is verbatim (C2-H-053), and a raw span in any other format renders nothing (C2-H-054), also under `roundtrip`.

**C2-H-052** The escaped form is not a render loss. The CLI prints one line on stderr per run in which it escaped raw HTML, and the line names the flag `--raw-html`.

**C2-H-053** With `rawHtml` on, a raw block and a raw span with the format `html` are written verbatim. A raw block is written at column 0 on its own lines, with no element around it.

**C2-H-054** Raw content in any other format renders nothing in HTML and is reported as the render loss `raw-format-dropped`.

Example 11 (generated, `--no-raw-html`)

::::: compare

````carve
```=html
<b>x</b>
```

a `<i>y</i>`{=html} b
````

```html
<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;
</code></pre>
<p>a &lt;i&gt;y&lt;/i&gt; b</p>
```

:::::

With `roundtrip` on and `rawHtml` off, the escaped payload of the raw span stands in its carrier element (C2-H-051).

Example 49 (unverified, `--roundtrip`)

::: compare

```carve
`<b>x</b>`{=html}
```

```html
<p><span data-carve-raw="html">&lt;b&gt;x&lt;/b&gt;</span></p>
```

:::

**C2-H-134** With `rawHtml` on, a raw HTML block whose payload has no line and one whose payload is one blank line both write one empty line. HTML does not show the difference that `value` keeps (C2-A-048).

## Tables

**C2-H-055** A table is `<table>` with `<thead>`, `<tbody>` and `<tfoot>` for its groups. Each group tag stands on its own line and each row is one line: `<tr>`, its cells, `</tr>`. An empty group is not written.

**C2-H-056** A header cell is `<th>` and a data cell is `<td>`. Explicit `table_cell.scope` writes `scope` with its value; otherwise a head header uses `scope="col"` and another header uses `scope="row"`. `headerIds` writes a space-separated `headers` attribute in its listed order, and each id names a header cell.

**C2-H-057** A cell with a resolved alignment (C2-B-213) carries `style="text-align: VALUE;"`. Vertical alignment adds `vertical-align: VALUE;` after it, one space apart. A cell with no alignment carries no `style`. An authored `style` keeps its value and takes the declarations after it.

**C2-H-058** `rowspan` and `colspan` are written only for a count above 1. A cell that a span covers is not written.

**C2-H-059** `widths` gives a `<colgroup>` as in 0.1. C2-H-152 states it.

**C2-H-061** The caption of a table is `<caption>`, the first child of `<table>`. The attributes of the table stay on `<table>`.

Example 12 (generated)

::: compare

```carve
|= Name |={>} Price |
| tea   | 2         |
^ Table #: Drinks
```

```html
<table>
  <caption>Table 1: Drinks</caption>
  <thead>
    <tr><th scope="col">Name</th><th scope="col" style="text-align: right;">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>tea</td><td style="text-align: right;">2</td></tr>
  </tbody>
</table>
```

:::

**C2-H-152** A table with at least one column that has a `width` writes `<colgroup>` after its caption and before its first group, with one `<col>` per column. A column with a width carries `style="width: P%;"`, where P is the width times 100 written as a decimal number without trailing zeros, so `0.305` gives `30.5%` and `0.25` gives `25%`. A column without a width is a bare `<col>`. A table where no column has a width has no `<colgroup>`.

**C2-H-153** `aligns`, `widths`, `header-rows` and `footer-rows` on a table are never written as HTML attributes, whether the table consumed the key or kept it in `attrs` (C2-B-227). `header-cols` on a pipe table or a delimited table is written as an ordinary attribute (C2-B-214).

**C2-H-200** A cell whose children are not one `cell_paragraph` holds the blocks of an imported or supplied tree (C2-A-091), and each `paragraph` among them is written with `<p>`. A cell of one paragraph stays on the line of its row: `<td><p>c</p></td>`. Any other such cell is written as a list item with more blocks is (C2-H-007): a first paragraph on the line of the cell tag, every other block on its own line one level deeper than the row, and the closing cell tag on its own line at the indent of the row, after which the row goes on.

## Captions and figures

**C2-H-062** An image paragraph, a code block, a quote or a math block that carries a caption (C2-A-082) is written as `<figure>` around the block and then `<figcaption>` with the caption. The tree has no node for this `<figure>`. With `sourceLines` on it carries the line the block starts on, and the element of the block inside it the line of the block's own opening markup, after its attribute lines.

**C2-H-063** The `attrs`, `lang` and `dir` of such a block are written on its `<figure>`, its id included (C2-A-183). The block inside carries only what it generates itself, so a captioned block image is the bare `<img>` (C2-H-020).

**C2-H-064** A figure group is `<figure class="carve-figure-group">`. Each panel in it (C2-A-084) is `<figure class="carve-figure-panel">` in place of the `<figure>` of C2-H-062, and the caption of the group is the last child of the group. A table panel is wrapped too: the panel figure holds the `<table>`, which keeps its caption as `<caption>` (C2-H-061) and has no `<figcaption>`.

**C2-H-065** A caption holds blocks (C2-A-081). A caption with one paragraph, which is every parsed caption, writes that paragraph bare inside `<figcaption>` or `<caption>`, and line breaks in it are soft breaks. In a supplied caption with several blocks every paragraph gets `<p>`.

**C2-H-066** The caption number mark `#` in a caption is replaced by the number of the caption in its sequence. The sequences, the label word that selects one, and the numbering of equations are as in 0.1. C2-B-207, C2-B-208 and C2-H-149 to C2-H-151 state them. A panel caption takes no number. The number mark of a caption that takes no number, such as the caption of a panel, is written as the character `#`.

**C2-H-067** With `roundtrip` off the number is plain text. With it on, the number is wrapped in `<span data-carve-caption-number>`.

**C2-H-068** `caption.short` is not written to HTML (C2-A-175).

Example 13 (generated)

::::: compare

````carve
{#fig-sun}
![a](x.png)
^ Figure #: The sun

{#l1}
```js
x
```
^ Listing #: Code

> q
^ Someone

{#e1}
$$`E=mc^2`
^ Equation #: Mass

See </#fig-sun>, </#l1>, </#e1> and </#none>.
````

```html
<figure id="fig-sun">
  <img src="x.png" alt="a">
  <figcaption>Figure 1: The sun</figcaption>
</figure>
<figure id="l1">
  <pre><code class="language-js">x
</code></pre>
  <figcaption>Listing 1: Code</figcaption>
</figure>
<figure>
  <blockquote><p>q</p></blockquote>
  <figcaption>Someone</figcaption>
</figure>
<figure id="e1">
  <p><span class="math display" role="math">\[E=mc^2\]</span></p>
  <figcaption>Equation 1: Mass</figcaption>
</figure>
<p>See <a href="#fig-sun">Figure 1</a>, <a href="#l1">Listing 1</a>, <a href="#e1">Equation 1</a> and &lt;/#none&gt;.</p>
```

:::::

Example 14 (generated)

::: compare

```carve
::: figure
![a](a.png)
^ (a) First

![b](b.png)
^ (b) Second
:::
^ Figure #: Both
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="a">
    <figcaption>(a) First</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <img src="b.png" alt="b">
    <figcaption>(b) Second</figcaption>
  </figure>
  <figcaption>Figure 1: Both</figcaption>
</figure>
```

:::

**C2-H-135** The label word of a caption selects its number sequence, as in 0.1 (C2-B-208, C2-H-149).

**C2-H-149** Each sequence key (C2-B-208) has its own count, from 1, in document order. Each caption with a mark takes the next number of the sequence of its key. The label words are not a closed list: `Figure`, `Table`, `Listing` and `Equation` have no special meaning, the block under the caption does not select the sequence, and `Fig.`, `figure` and `Figure` count apart. The number is written in place of the mark as a decimal number, and the rest of the caption is written as it stands. A caption without a mark is written as it stands and takes no number.

**C2-H-150** The captions of footnote bodies take their numbers after every caption of the document body, in the order of the footnote numbers. A caption in an unused footnote definition takes none.

**C2-H-170** Captions and numbered equations of one key are counted in document order, a node before the nodes inside it: the caption of a table takes its number before an equation in a cell of that table.

**C2-H-151** In a supplied tree, a display `math` node that carries `numberPrefix` takes the next number of the sequence whose key is its `numberPrefix`, counted together with the captions of that key. The number is written after the math element as ` <span class="equation-number">PREFIX N</span>`. Inline math takes no number. A display math node inside a block or a `figure_group` whose caption has a mark takes no number of its own: the nearest such caption around it owns the number. `numberPrefix` has no source spelling, so a parsed tree holds no numbered equation, and `^ Equation #` numbers a caption.

Example 26 (generated)

::: compare

```carve
![a](a.png)
^ Figure #: One

![b](b.png)
^ *Figure* #. Two # more

![c](c.png)
^ Fig. # Three

![d](d.png)
^ figure #: Four

![e](e.png)
^ Figure \#5
```

```html
<figure>
  <img src="a.png" alt="a">
  <figcaption>Figure 1: One</figcaption>
</figure>
<figure>
  <img src="b.png" alt="b">
  <figcaption><strong>Figure</strong> 2. Two # more</figcaption>
</figure>
<figure>
  <img src="c.png" alt="c">
  <figcaption>Fig. 1 Three</figcaption>
</figure>
<figure>
  <img src="d.png" alt="d">
  <figcaption>figure 1: Four</figcaption>
</figure>
<figure>
  <img src="e.png" alt="e">
  <figcaption>Figure #5</figcaption>
</figure>
```

:::

Example 27 (generated)

::: compare

```carve
See[^a].

![a](a.png)
^ Table #: Body

[^a]: Note.

    | x |
    ^ Table #: In the note

[^b]: Unused.

    | y |
    ^ Table #: Never
```

```html
<p>See<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<figure>
  <img src="a.png" alt="a">
  <figcaption>Table 1: Body</figcaption>
</figure>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Note.</p>
      <table>
        <caption>Table 2: In the note</caption>
        <tbody>
          <tr><td>x</td></tr>
        </tbody>
      </table>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A table panel stands in a panel figure like the image panel, and keeps its own `<caption>` (C2-H-064).

Example 38 (unverified)

::: compare

```carve
:::: figure
![a](a.png)
^ First

| t |
^ Second
::::
```

```html
<figure class="carve-figure-group">
  <figure class="carve-figure-panel">
    <img src="a.png" alt="a">
    <figcaption>First</figcaption>
  </figure>
  <figure class="carve-figure-panel">
    <table>
      <caption>Second</caption>
      <tbody>
        <tr><td>t</td></tr>
      </tbody>
    </table>
  </figure>
</figure>
```

:::

## Comments, frontmatter and definitions

**C2-H-069** A comment renders nothing in every form: line, block and braced. The whitespace around a braced comment stays as written. A *comment line* of a paragraph or another leaf, a line that holds nothing but comments of any form and spaces, takes one of the two line breaks around it with it: the break behind it is not written, or the break before it when the content ends with the comment. The test is made in each list of inline children on its own, also in the children of an inline node such as a strong span: a line of that list is what stands between two of its breaks, and the end of the list counts as the end of the content. The tree keeps both breaks.

**C2-H-070** Frontmatter renders nothing.

**C2-H-071** A link definition and an abbreviation definition render nothing, except that with `roundtrip` on a run of abbreviation definitions writes a template (C2-H-178). A footnote definition renders only through the footnote section (C2-H-089).

Example 15 (generated)

::: compare

```carve
a %% c

{% only %}

%%%
block
%%%

b {% mid %} c
```

```html
<p>a</p>
<p>b  c</p>
```

:::

The line `%% c` holds only a comment within the children of the strong span, so the break behind it is not written (C2-H-069).

Example 47 (unverified)

::: compare

```carve
a
{*x
%% c
*} b
```

```html
<p>a
<strong>x
</strong> b</p>
```

:::

**C2-H-133** An include directive that was not expanded is an `include` node (C2-A-181). It renders as a paragraph that holds the directive as text, written bare or with `<p>` as a `paragraph` node at its place would be (C2-H-006, C2-H-007, C2-H-034, C2-H-040): `{{`, a space, the path as C2-H-171 writes it, the section, the options in the order of C2-W-058 and the entries of `invalid` as the tree holds them, each after one space, a space and `}}`. It is reported with the code `include-unresolved`. An include is unexpanded when no resolver was given or when its expansion failed (C2-N-061); an expanded include writes its children and nothing else (C2-N-075).

An unexpanded include that is the first block of a tight item is written bare, as a paragraph there is.

Example 64 (unverified)

::: compare

```carve
- {{ a.crv }}
- b
```

```html
<ul>
  <li>{{ a.crv }}</li>
  <li>b</li>
</ul>
```

:::

Reported: `include-unresolved`.

**C2-H-171** When an unexpanded include is written, a path that holds a space, a tab, `#`, `@`, `}`, `"` or `“` stands in double quotes, with a backslash before each `"` and `\` in it, as the writer writes it (C2-B-202, C2-W-058), so the text reads back as the same directive. An option value that holds a space, a tab, `@` or `}` stands in double quotes, and every other value stands bare. The value is the one the tree holds. An invalid option is written as the source spelled it (C2-A-181), so `@cols:"a,,b"`, which is no list of names (C2-B-205), stays `@cols:"a,,b"`. A `cols` list of names is written as its names joined by commas in one pair of double quotes; the tree keeps no quotes (C2-A-181). The writer does the same (C2-W-058). A value that starts with a double or a single quote is written in double quotes too, since bare it would read as the start of a quoted value (C2-B-204).

## Inline elements

**C2-H-072** The inline nodes map to elements as follows.

| Node | HTML |
|---|---|
| `emphasis` | `<em>` |
| `strong` | `<strong>` |
| `underline` | `<u>` |
| `strike` | `<s>` |
| `highlight` | `<mark>` |
| `superscript` | `<sup>` |
| `subscript` | `<sub>` |
| `insert` | `<ins>` |
| `delete` | `<del>` |
| `span` | `<span>` |
| `math` | `<span class="math inline" role="math">\(...\)</span>`, or `math display` with `\[...\]` |
| `critic_comment` | `<span class="critic-comment">` |

**C2-H-073** A replacement is a `delete` followed by an `insert` (C2-A-097) and renders as `<del>` directly followed by `<ins>`, with no wrapper.

**C2-H-074** Emphasis and strong nest in the tree order: `<strong><em>` or `<em><strong>`, as written (C2-A-096).

**C2-H-075** A span with one of the keys `abbr`, `time` or `kbd` is written as the element of that name in place of `<span>`. A value of `abbr` becomes `title`, a value of `time` becomes `datetime`, and a value of `kbd` is dropped. Several keys nest in the fixed order `abbr`, `time`, `kbd` from inside out, and the remaining attributes go on the outermost element. An authored `title` or `datetime` wins over the derived one. As in 0.1 (CARVE-P10-003 to CARVE-P10-007).

**C2-H-076** The names `samp`, `var`, `cite` and `dfn` are not core. Without their extension, `[x]{samp}` is a span with the attribute `samp=""`. An inline extension with no renderer is `<span class="ext-NAME">` around its content. The core never turns an extension name into an element name. In 0.2.0 an extension may give qualified `inline_extension` and `block_extension` nodes. A matching trusted renderer writes its returned HTML string unchanged under C2-X-034. An unknown optional extension renders through its fallback and is reported with the code `extension-fallback-rendered`.

**C2-H-077** A math block is a paragraph that holds nothing but one display math span. The fact is set when the paragraph closes (C2-B-158, C2-B-198) and is the mark `role: "math"` (C2-A-184), as for a block image. It is written as `<p>` around the display form of C2-H-072, and it takes a caption (C2-H-062).

**C2-H-078** A smart-punctuation node is written as its glyph. With `smartTypography` off it is written as its `source` (C2-A-098).

Example 16 (generated)

::: compare

```carve
Press [Tab]{kbd} for [HTML]{abbr="HyperText Markup Language"} at [noon]{time="12:00" #t}.

"q" -- a --- b ... --> (tm)
```

```html
<p>Press <kbd>Tab</kbd> for <abbr title="HyperText Markup Language">HTML</abbr> at <time datetime="12:00" id="t">noon</time>.</p>
<p>“q” – a — b … → ™</p>
```

:::

**C2-H-142** Three shapes reach the renderer only in a supplied tree (C2-A-175). `small_caps` is `<span class="smallcaps">` around its content. `ruby` is `<ruby>` that holds, for each pair, the base, then `<rp>(</rp>`, `<rt>` around the annotation and `<rp>)</rp>`. A `section` node is `<section>` around its blocks, indented like every container.

## Links, images and references

**C2-H-079** A link is `<a href="URL">` around its content, with `title` when it has one. An autolink is a link whose content is its body as written. The destination of an email autolink is `mailto:` followed by the address, and its content is the address.

**C2-H-080** An image is `<img src="URL" alt="ALT">`, with `title` when it has a tooltip. `alt` is always written, empty for a decorative image. A supplied image without `src` writes `src=""`. A `longDescription` writes its blocks as visible HTML after the block that contains the image. This keeps block elements outside a paragraph and needs no generated id or reference.

**C2-H-081** A direct link, a reference link, or an autolink inside link text is unwrapped: its content is written and its anchor is not (C2-A-111). A resolved cross-reference inside link text writes its generated plain text without an anchor. A mention or tag with a `social` URL inside link text writes its inert span instead of an anchor. These rules apply at every depth of the link text. An unresolved reference or cross-reference writes its ordinary text. Raw HTML, trusted symbol values, and extension renderer output remain verbatim; the core does not inspect anchors supplied by those payloads. A core citation group writes text and makes no anchor.

**C2-H-082** A destination that `urlPolicy` denies is written as the empty string, and the element stays: `<a href="">`. The denial is reported as the render loss `destination-denied`.

**C2-H-083** A link reference resolves against the link definitions, then against the headings (C2-I-081, C2-I-084). A reference that a heading resolves is `<a href="#ID">` with the id of that heading. The first matching heading in document order wins.

**Exception C2-H-084** An image reference never resolves against the headings (C2-I-083).

**C2-H-085** An unresolved full or collapsed reference renders its brackets and label as literal text: `[`, rendered children, `]`, then `[key]` for `refForm: "full"` or `[]` for `refForm: "collapsed"`. An image adds `!` and uses its `alt` as text. No source form is rebuilt for the children. A footnote reference or inline footnote among them keeps its ordinary meaning. A shortcut of parsed source has a matching definition and never reaches this rule (C2-I-125).

**C2-H-086** An unresolved footnote reference renders as the text `[^key]`, and an unresolved cross-reference as the text `</#key>`. A footnote reference or an inline footnote inside an unresolved reference is an ordinary one: it takes its number and makes its note.

Example 17 (generated)

::: compare

```carve
# Intro

See [Intro][] and [x][nope] and ![i][nope] and [^zz].

[a](javascript:alert(1)) and <https://example.org>
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="#Intro">Intro</a> and [x][nope] and ![i][nope] and [^zz].</p>
  <p><a href="">a</a> and <a href="https://example.org">https://example.org</a></p>
</section>
```

:::

Reported: `destination-denied`.

In 0.1 the full form did not reach the heading lookup and stayed text.

Example 18 (unverified)

::: compare

```carve
# Intro

See [the intro][Intro].
```

```html
<section id="Intro">
  <h1>Intro</h1>
  <p>See <a href="#Intro">the intro</a>.</p>
</section>
```

:::

The children of an unresolved reference are rendered, and its brackets, its label and its attribute block are text. In 0.1 the whole reference was written as typed.

Example 19 (unverified)

::: compare

```carve
See [*a*][nope]{.c #i} and [/b/][].
```

```html
<p>See [<strong>a</strong>][nope]{#i .c} and [<em>b</em>][].</p>
```

:::

**C2-H-139** An attribute block that is attached to an unresolved reference is written after it as text, as one brace block in the fixed order: id, classes, language, keys. A key with an empty value is written as its name alone. A value that holds whitespace, `"`, `'`, a backslash, `|` or `}` stands in double quotes, with a backslash before each `"` and each backslash in it; every other value stands bare.

**C2-H-141** The attributes of a link definition are merged into every link and image that resolves through it. The classes of the definition come first and the classes of the reference follow. An id and a key of the reference win over those of the definition. The keys of the definition that the reference does not carry come first, in the definition's order, then the keys of the reference in its order: a definition `{j=2 k=1}` and a reference `{m=4 j=3}` give `k="1" m="4" j="3"`.

## Footnotes

**C2-H-087** Footnotes are numbered from 1 in the order of their first reference in the document. A labeled footnote and an inline footnote share the one sequence. A later reference to the same label reuses its number. References in the body of the document are numbered first, in document order; references that stand inside a note are numbered after them, note by note in the order of the notes' numbers.

A footnote reference in the title of a div is reached before the children of the div, as in the source (C2-A-025).

Example 56 (unverified)

::: compare

```carve
::: note "[^a]"
[^b]
:::

[^a]: A
[^b]: B
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1"><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
  <p><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
</aside>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>A<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>B<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-H-088** A footnote reference or inline footnote writes its note mark as `<a id="fnrefN" href="#fnN" role="doc-noteref"><sup>N</sup></a>`. The second and later references to one note have the ids `fnrefN-2`, `fnrefN-3`, and so on. An id the author wrote on a reference replaces the generated one, and the backlink of the note points to it. When a note mark occurs anywhere in the text of a direct or reference link, including inside an inline descendant, nothing is written at its place. The marks are written directly after the closing `</a>` of the outermost rendered link in source order. The footnote and inline footnote nodes stay at their places in the tree, and the backlinks point to the moved marks. An image's alternative text and every other plain text rendering are unchanged. A cross-reference has generated plain text and no inline children that can hold a note mark. A heading's generated id is on its heading or section element, not on an enclosing anchor, so a link inside a heading follows this rule as elsewhere.

**C2-H-089** The footnotes are written in one section: `<section role="doc-endnotes" aria-label="LABEL">`, then `<hr>`, then `<ol>` with one `<li id="fnN">` per note in number order. LABEL is the `endnotes` string of `labels`.

**C2-H-090** Every paragraph of a footnote body gets `<p>` (C2-B-086), except a block image paragraph that C2-H-020 writes bare, as the bare `<img>`. The body of an inline footnote is one paragraph.

Example 66 (generated)

::: compare

```carve
a[^n]

[^n]: ![a][nope]
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>![a][nope]<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-H-091** The backlinks are appended to the last block of the note that renders something when that block is written as `<p>`, and otherwise stand in a paragraph of their own. A note with one reference has one backlink, `<a href="#fnrefN" role="doc-backlink" aria-label="LABEL">↩</a>`. A note with several has one per reference, each with `<sup>K</sup>` after the glyph and `LABEL K` as its label, joined by one space.

A comment after the last paragraph renders nothing and does not move the backlinks; a block image is no `<p>`, so they take a paragraph of their own.

Example 61 (generated)

::: compare

```carve
a[^n]

[^n]: ![a](x.png)
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <img src="x.png" alt="a">
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-H-092** A footnote definition that no reference uses is not written.

**C2-H-093** The section stands at the end of the document, after the last block. A top-level `::: footnotes` directive (C2-A-066) moves it to the place of that directive. A `::: footnotes` directive inside a container places nothing and renders as `<div class="footnotes">`. As in 0.1 (CARVE-P9-073).

**C2-H-094** With no numbered footnote in the document, no section is written. A note whose every reference is degraded (C2-H-165) is not written, and with no note left no section is written.

Example 20 (generated)

::: compare

```carve
a[^n] b^[inline *x*] c[^n]

After.

[^n]: Note.

    More.
```

```html
<p>a<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> b<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a> c<a id="fnref1-2" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<p>After.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>Note.</p>
      <p>More.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
    <li id="fn2">
      <p>inline <strong>x</strong><a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Example 33 (unverified)

::: compare

```carve
[see *this[^a]* and ^[inline] page[^b]](/u)

[^a]: A
[^b]: B
```

```html
<p><a href="/u">see <strong>this</strong> and  page</a><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a><a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a><a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>A<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>inline<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3">
      <p>B<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

## Cross-references and abbreviations

**C2-H-095** A cross-reference resolves against the ids of headings and of numbered captions, without case folding (C2-I-097). The id of a numbered caption is the `attrs.id` of the block that carries it.

**C2-H-096** A resolved cross-reference is `<a href="#ID">` around generated text. For a heading the text is the plain text of the heading. For a numbered caption it is the label word and the number, such as `Figure 1`. 0.2.0 renders this default text for every cross-reference: a `display` (C2-A-116) that an extension or a supplied tree set is kept in the tree and selects no other text in the core.

**C2-H-097** The generated text is plain text: no abbreviation, mention or typography rule is applied to it (C2-I-100).

**C2-H-098** An abbreviation node is `<abbr title="EXPANSION">` around the term.

**Exception C2-H-099** Inside a span that carries the `abbr` key an abbreviation node writes only its text, so no `<abbr>` nests in another.

Example 21 (generated)

::: compare

```carve
*[HTML]: HyperText Markup Language

HTML and *HTML* and `HTML`.
```

```html
<p><abbr title="HyperText Markup Language">HTML</abbr> and <strong><abbr title="HyperText Markup Language">HTML</abbr></strong> and <code>HTML</code>.</p>
```

:::

## Mentions, tags and symbols

**C2-H-100** A mention is `<span class="mention"><strong>@NAME</strong></span>` and a tag is `<span class="tag"><strong>#NAME</strong></span>`. When `social` gives a URL for it, the outer element is `<a class="mention" href="URL">` or `<a class="tag" href="URL">`. Where a mention carries `label` (C2-A-101), the label replaces `@NAME` inside `<strong>`.

**C2-H-101** A symbol whose name is in the `symbols` table is written as the table's value, verbatim. A symbol with no entry is written as its source, `:NAME:`. A symbol that carries attributes is wrapped in a `<span>` that carries them, around the value or the source.

Example 22 (generated)

::: compare

```carve
Hi @ann and #tag and :smile: and :kbd[Tab].
```

```html
<p>Hi <span class="mention"><strong>@ann</strong></span> and <span class="tag"><strong>#tag</strong></span> and :smile: and <span class="ext-kbd">Tab</span>.</p>
```

:::

A template gives the mention its link; the tag has no template and stays an inert span (C2-H-126).

Example 35 (unverified, `--social {"mentionUrl":"https://x.org/u/{name}"}`)

::: compare

```carve
@ann.b and #topic
```

```html
<p><a class="mention" href="https://x.org/u/ann.b"><strong>@ann.b</strong></a> and <span class="tag"><strong>#topic</strong></span></p>
```

:::

A linked mention is a link for the profile: `minimal` has no `link`, so the mention is its inert span (C2-H-167).

Example 36 (unverified, `--social {"mentionUrl":"https://x.org/u/{name}"}`, `--profile minimal`)

::: compare

```carve
@ann
```

```html
<p><span class="mention"><strong>@ann</strong></span></p>
```

:::

## State beyond the current block

A renderer that writes each block as soon as it is parsed needs the following state. Each clause names what has to be known before a byte of the affected element can be written.

**C2-H-102** *Definitions.* Link, footnote and abbreviation definitions stand anywhere at the top level, also after their uses. A streaming renderer buffers every leaf that holds a reference or, for abbreviations, every leaf, until the end of the document, unless the caller supplies the definitions in advance.

**C2-H-103** *Id collision counter.* The set of authored ids of the whole document is needed before the first generated id is final (C2-H-024). A streaming renderer buffers from the first heading without an authored id to the end of the document, or runs a first pass that collects the authored ids.

**C2-H-104** *Forward references.* A heading reference, a cross-reference and a caption number in a cross-reference can point at a block further down. They resolve only at the end of the document.

**C2-H-105** *Footnotes.* The number of a note is known at its first reference (C2-H-087), so a reference outside link text can be written at once when the definitions are known. A reference inside link text waits for the link's closing tag (C2-H-088). The note bodies and their backlinks are buffered to the place of the section, and a `::: footnotes` div above the last reference has to wait for the end.

**C2-H-106** *Tightness.* Whether a list is loose is known only when the list closes (C2-B-191). A streaming renderer buffers each top-level list as a whole, because the first item's `<p>` depends on a blank line that may follow the last item but one.

**C2-H-107** *Captions.* A caption line follows its block (C2-B-146), and it decides whether a `<figure>` wraps the block and whether a table has a `<caption>` as its first child. A streaming renderer holds back each image, table, code block, quote, math block and figure group until the next line is read.

**C2-H-108** *Sections.* A section closes at the next heading of the same or a lower level number, or at the end. Its opening tag needs only the heading, so sections need a stack and no buffer.

**C2-H-109** *Description wrapping.* Whether the first paragraph of a description is bare is known only when the description closes (C2-H-040).

**C2-H-110** *Task lists and table groups.* The `task-list` class and the head and the foot of a table are known when the list or the table closes.

**C2-H-111** A renderer may buffer more than these clauses require. Its output has to equal the output of a renderer that works from the finished tree. 0.2.0 defines no streaming renderer with weaker guarantees.

## Roundtrip carriers

**C2-H-112** With `roundtrip` on, the renderer adds attributes that carry tree facts HTML has no spelling for, and writes the abbreviation definitions as templates (C2-H-178). The option adds the carriers, the carrier element of a raw span (C2-H-051) and the abbreviation templates, and changes no rendered text. It is off by default.

**C2-H-113** A carrier exists only for a fact the tree holds. A spelling that the sidecar holds has no carrier, and neither has a field that 0.2 deleted.

**C2-H-114** The carriers of 0.1 (CARVE-P10-015, CARVE-P10-016) and their fate in 0.2:

| Attribute | On | Carries | 0.2 |
|---|---|---|---|
| `data-marker` | `<ul>` | the bullet character, when it is not `-` | stays: `marker.char` is in the tree |
| `data-char` | `<hr>` | the character of a thematic break | goes: `thematic_break.marker` is deleted (C2-A-072) |
| `data-carve-explicit-id` | `<section>` or heading | the heading id was authored | stays |
| `data-carve-id-slot` | `<section>` | the place of the id among the heading's attributes | goes: `attrs.order` is deleted (C2-A-033) |
| `data-carve-generated-id` | `<section>` or heading | the heading id was generated | stays |
| `data-carve-ref` | `<a>`, `<img>` | the key of a reference | stays; its value is the folded `key` |
| `data-carve-ref-collapsed` | `<a>`, `<img>` | the reference was written in the collapsed form | new in 0.2 (C2-H-140) |
| `data-carve-ref-shortcut` | `<a>`, `<img>` | the reference was written in the shortcut form | new in 0.2 (C2-H-140) |
| `data-carve-autolink` | `<a>` | the link is an autolink | stays |
| `data-carve-footnote-label` | the reference `<a>`, the note `<li>` | the footnote key | stays |
| `data-carve-inline-footnote` | the note `<li>` | the note is an inline footnote | stays |
| `data-carve-raw` | `<span>` | a raw span and its format | stays |
| `data-carve-escaped` | `<span>` | one escaped character | goes: `escaped_text` is not a node type (C2-A-041) |
| `data-carve-abbreviations` | `<template>` | a run of abbreviation definitions, as Carve source (C2-H-179) | stays; the text is no longer one definition per line |
| `data-carve-col-widths` | `<table>` | the dash widths of a separator row | goes: the separator row is cut and `table.separatorWidths` is deleted |
| `data-carve-label` | `<pre>` | the label of a code fence | stays |
| `data-carve-tight` | `<ul>`, `<ol>` | the list is tight | stays; written on every tight list (C2-H-138) |
| `data-carve-xref` | `<a>` | the link is a cross-reference | stays |
| `data-carve-caption-number` | `<span>` | the caption number mark | stays |
| `data-carve-div` | `<div>` | a div with no other attribute written, `data-source-line` included | stays |
| `data-carve-line-block` | `<div>` | a line block | stays |
| `data-carve-substitution` | `<span>` | a substitution node | goes: a replacement is a `delete` and an `insert` (C2-A-097) |
| `data-carve-src` | none | reserved, never written | stays reserved |

Five carriers go: `data-char`, `data-carve-id-slot`, `data-carve-escaped`, `data-carve-col-widths` and `data-carve-substitution`.

**C2-H-115** The reserved names are the 18 names of this table that stay, are new or stay reserved: 15 stay, 2 are new, and `data-carve-src` stays reserved. The set is a list, not a prefix: another `data-carve-` name is an ordinary authored attribute.

**C2-H-116** An authored attribute with a reserved name is dropped on every element, with `roundtrip` on or off, and reported as the render loss `carrier-attribute-dropped`. The attribute line of a definition inside an abbreviation template (C2-H-179) is text and not an attribute of an element: it keeps every key it holds, a reserved name included.

In 0.1 the attribute passed through when `roundtrip` was off.

Example 59 (unverified)

::: compare

```carve
[<img src=x onerror=alert(1)>]{data-carve-raw=html}
```

```html
<p><span>&lt;img src=x onerror=alert(1)&gt;</span></p>
```

:::

Reported: `carrier-attribute-dropped`.

**C2-H-117** A presence carrier is written as the bare attribute name, with no value. A reader takes the name as presence and does not compare a value.

**C2-H-118** `data-task-state`, `data-delim` and the `task-list` class are not carriers. Every render writes them (C2-H-031 to C2-H-033).

**C2-H-119** The quote form, the form of a hard-break block, the numbering form of an ordered list, continuation rows, the table form, the declared head count of a delimited table and the verbatim text of a reference are sidecar facts (C2-L-016 to C2-L-023, C2-L-057) and have no carrier. Source that is imported back from HTML is written with the defaults of C2-L-030 to C2-L-041.

**C2-H-120** The HTML importer is part of 0.2.0. It reads the 17 carriers of C2-H-115, the abbreviation template among them, and the reserved name `data-carve-src`, as the section "Import" states (CARVE-P10-017, CARVE-P10-021), and maps every other element and attribute as `import-html.md` states.

The 0.1 engine writes three of these carriers with the value `1`. The expected output has the bare names of C2-H-117.

Example 23 (unverified, `--roundtrip`)

::: compare

```carve
# H

[x][r] </#H> <https://example.org> a[^n] ^[inl]

:::
in
:::

[r]: /u
[^n]: N.
```

```html
<section data-carve-generated-id id="H">
  <h1>H</h1>
  <p><a href="/u" data-carve-ref="r">x</a> <a href="#H" data-carve-xref>H</a> <a href="https://example.org" data-carve-autolink>https://example.org</a> a<a id="fnref1" href="#fn1" role="doc-noteref" data-carve-footnote-label="n"><sup>1</sup></a> <a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a></p>
  <div data-carve-div>
    <p>in</p>
  </div>
</section>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1" data-carve-footnote-label="n">
      <p>N.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2" data-carve-inline-footnote>
      <p>inl<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

**C2-H-138** `data-carve-tight` is written on every tight list, with no test on its items.

**C2-H-140** Under `roundtrip` a resolved reference written in the collapsed form carries the presence carrier `data-carve-ref-collapsed` beside `data-carve-ref`. A reference in the full form carries `data-carve-ref` alone. A shortcut reference carries the presence carrier `data-carve-ref-shortcut` beside `data-carve-ref`.

**C2-H-178** With `roundtrip` on, each maximal run of consecutive `abbreviation_def` nodes among the children of the document is written at the place of the run as one `<template data-carve-abbreviations>`. A node of any other type ends the run, a comment included, so two definitions with a comment between them give two templates. A template stands where the first definition of its run would stand, inside the section that holds that place when `sections` is on (C2-H-026). With `roundtrip` off a definition writes nothing (C2-H-071). A profile does not degrade an `abbreviation_def`, also one outside the profile (C2-H-165): the template is data and no presentation, so it is written under every profile, and the definition is not reported as degraded.

**C2-H-179** The text of the template is the run as the canonical writer spells it: each definition by C2-W-055, with its attribute line directly above it (C2-W-047), and one blank line between two definitions (C2-W-017). No line ending follows the last line. The text is escaped as text content (C2-H-002) and stands between `<template data-carve-abbreviations>` and `</template>` with nothing else around it. The start tag stands on its own line with the indent of its level (C2-H-005); every later line of the text starts at column 0, as a line break inside inline content does.

**C2-H-180** Every definition of the run is in the text, in tree order: one that no abbreviation uses and one whose key an earlier definition holds (C2-B-085) are written like every other one. The renderer neither drops nor merges a definition.

**C2-H-181** A definition that the writer cannot spell is in the text as the writer writes it, and the render reports the writer's loss entry (C2-W-117). An expansion that holds a line break is such a case: it is written with one space in place of each line break (C2-W-055), so the template still reads back as a run of definitions (C2-H-187).

With `roundtrip` on, a run of two definitions gives one template, and the blank line between them is the one the writer puts between two blocks.

Example 42 (unverified, `--roundtrip`)

::: compare

```carve
*[HTML]: HyperText Markup Language
*[CSS]: Cascading Style Sheets

HTML and CSS.
```

```html
<template data-carve-abbreviations>*[HTML]: HyperText Markup Language

*[CSS]: Cascading Style Sheets</template>
<p><abbr title="HyperText Markup Language">HTML</abbr> and <abbr title="Cascading Style Sheets">CSS</abbr>.</p>
```

:::

Two runs apart give two templates, each at its place. The second one stands inside the section of the heading above it.

Example 43 (unverified, `--roundtrip`)

::: compare

```carve
*[A]: Alpha

# H

A and B.

*[B]: Beta
```

```html
<template data-carve-abbreviations>*[A]: Alpha</template>
<section data-carve-generated-id id="H">
  <h1>H</h1>
  <p><abbr title="Alpha">A</abbr> and <abbr title="Beta">B</abbr>.</p>
  <template data-carve-abbreviations>*[B]: Beta</template>
</section>
```

:::

The attribute line of a definition is part of the text. It writes no HTML attribute.

Example 44 (unverified, `--roundtrip`)

::: compare

```carve
{#x .c}
*[A]: Alpha

A.
```

```html
<template data-carve-abbreviations>{#x .c}
*[A]: Alpha</template>
<p><abbr title="Alpha">A</abbr>.</p>
```

:::

An unused definition and a duplicate stay in the text. The first definition of `A` decides the title (C2-B-085).

Example 45 (unverified, `--roundtrip`)

::: compare

```carve
*[A]: First
*[A]: Second
*[U]: Unused

A.
```

```html
<template data-carve-abbreviations>*[A]: First

*[A]: Second

*[U]: Unused</template>
<p><abbr title="First">A</abbr>.</p>
```

:::

Reported: `duplicate-abbreviation-definition`.

The text is escaped as text content: `&`, `<` and `>` are escaped, and a quotation mark is not.

Example 46 (unverified, `--roundtrip`)

::: compare

```carve
*[RnD]: R&D <research> "and" development

RnD.
```

```html
<template data-carve-abbreviations>*[RnD]: R&amp;D &lt;research&gt; "and" development</template>
<p><abbr title="R&amp;D &lt;research&gt; &quot;and&quot; development">RnD</abbr>.</p>
```

:::

Under `comment` the abbreviation is outside the profile and gives its plain text, but the definition still writes its template (C2-H-178).

Example 50 (unverified, `--roundtrip`, `--profile comment`)

::: compare

```carve
*[A]: Able

A b
```

```html
<template data-carve-abbreviations>*[A]: Able</template>
<p>A b</p>
```

:::

Reported: `profile-construct-degraded`.

## Import

**C2-H-182** The HTML importer reads an HTML fragment and returns a tree. This section states what it does with the 18 reserved names of C2-H-115, how it rebuilds the definitions that have no carrier, and what does not survive. An element that carries none of them is read as `import-html.md` maps that element (C2-M-007). Where this section says that a carrier is ignored, the importer reads its element in the same way, as if the carrier were not there: the HTML is read as it stands.

**C2-H-197** A carrier sets only the facts its row of C2-H-186 names. How the importer reads an element that carries no carrier does not depend on carriers elsewhere in the document, except a carrier of an ancestor whose row names that reading, as `data-carve-line-block` does for the lines it holds. So `<p>a&nbsp;b</p>` imports to the same tree alone and beside `<ul data-carve-tight>`, and a render with `roundtrip` that holds no carrier imports as every other render does.

**C2-H-183** The importer parses the HTML by the HTML Standard. The text of a `<template>` is the text of its template contents, which the HTML parser places in the content fragment of the template and not among its child nodes.

**C2-H-184** A carrier is read only on an element that the importer reads as structure: an element of the kind and at the place the table of C2-H-186 names. On any other element the carrier is ignored.

**C2-H-185** A carrier whose value is malformed, which contradicts the HTML around it or which contradicts another carrier of its element is ignored. The column "Ignored when" of C2-H-186 lists these cases for each name. Where two carriers contradict each other, both are ignored. A carrier that is ignored sets no tree fact, and the other carriers of its element are read as usual.

**C2-H-186** An importer never keeps a reserved name as an authored attribute, whether it reads the carrier or ignores it. What a reader does with each name:

| Name | Element | Tree fact it sets | Ignored when |
|---|---|---|---|
| `data-marker` | `<ul>` | `list.marker.char` is the value | the value is not `-` or `*` |
| `data-carve-tight` | `<ul>`, `<ol>` | `list.spacing` is `tight` | an item's first block is a `<p>` with no attribute, which a tight list writes bare (C2-H-034, C2-H-018) |
| `data-carve-explicit-id` | the `<section>` of a heading (C2-H-027), or an `<h1>` to `<h6>` that opens no section | the `id` of the element is the heading's authored `attrs.id` | the element has no `id`; it carries `data-carve-generated-id`; a `<section>` whose first child is no heading element |
| `data-carve-generated-id` | as `data-carve-explicit-id` | the `id` of the element is generated: the heading has no `attrs.id`, and resolution computes `generatedId` again (C2-A-134) | the element has no `id`; it carries `data-carve-explicit-id`; a `<section>` whose first child is no heading element |
| `data-carve-ref` | `<a>`, `<img>` | the link or image is a reference: `key` is the value, `namespace` is `link` and `refForm` is `full` | the value is empty or differs from its folded form (C2-A-104); the element carries `data-carve-autolink` or `data-carve-xref` |
| `data-carve-ref-collapsed` | an `<a>` or `<img>` whose `data-carve-ref` is read | `refForm` is `collapsed` | the element carries `data-carve-ref-shortcut` |
| `data-carve-ref-shortcut` | an `<a>` or `<img>` whose `data-carve-ref` is read | `refForm` is `shortcut` | the element carries `data-carve-ref-collapsed` |
| `data-carve-autolink` | `<a>` | an `autolink` whose `href` is the `href` of the element, with `text` where the text of the element differs from it (C2-A-216) | the `<a>` holds an element or has no `href`; it carries `data-carve-ref` or `data-carve-xref` |
| `data-carve-footnote-label` | a footnote reference `<a>` (C2-H-088); a note `<li>` of the footnote section (C2-H-089) | the `key` of the `footnote_ref`, or of the `footnote` the note is read as, is the value | the value is empty or differs from its folded form; the `<a>` and the note it points to carry different values; the `<li>` carries `data-carve-inline-footnote`; the `<a>` carries `data-carve-xref` |
| `data-carve-inline-footnote` | a note `<li>` of the footnote section | the reference that points to the note is an `inline_footnote` whose `children` are the inline content of the note without its backlink | the `<li>` carries `data-carve-footnote-label`; the note holds more than one paragraph; no reference points to it |
| `data-carve-raw` | `<span>` | a `raw_inline` whose `format` is the value and whose `value` is the text of the span; with the import option `rawHtml` off the span is dropped instead (C2-M-066) | the value is not a raw format name (C2-B-225); the span holds an element or carries another attribute |
| `data-carve-abbreviations` | `<template>` at the top level of the flow (C2-H-187) | the `abbreviation_def` nodes of its text, at its place (C2-H-187) | it stands elsewhere; its template contents hold anything but text; its text gives a block that is no abbreviation definition |
| `data-carve-label` | the `<pre>` of a code block | `code_block.groupLabel` is the value | the value holds a line break or a `]`, which the label of a fence opener cannot hold (C2-B-117), as in `data-carve-label="a]b"`; the `<pre>` holds anything but one `<code>` |
| `data-carve-xref` | `<a>` | an `xref` whose `key` is the `href` without its leading `#`; the text of the element is generated and is not read (C2-H-096) | the `href` does not start with `#` or holds nothing behind it, or what follows is no cross-reference id (C2-I-096); the element carries `data-carve-ref`, `data-carve-autolink` or `data-carve-footnote-label` |
| `data-carve-caption-number` | a `<span>` inside a `<figcaption>` or a `<caption>` | a `caption_number` node in place of the span; the digits it holds are not read | the span holds an element or carries another attribute |
| `data-carve-div` | `<div>` | a `div` | the `<div>` carries another attribute, since the renderer writes the carrier only on a div with none (C2-H-114); it carries `data-carve-line-block` |
| `data-carve-line-block` | `<div>` with the class `line-block` | a `line_block`: each `<p>` is a stanza, each `<br>` ends a `line`, and an empty `line` stands between two stanzas (C2-A-069, C2-H-043) | the `<div>` lacks the class or holds anything but `<p>` children; it carries `data-carve-div` |
| `data-carve-src` | any | none: the name is removed | never: no fact is read from it |

**C2-H-187** A `<template data-carve-abbreviations>` is read only at the top level of the flow: as a child of the fragment, or of a `<section>` that the importer reads as the section of a heading (C2-H-026). Its text is parsed with the Carve block reader as a document of its own, with no second grammar. When that document holds at least one block and every block is an `abbreviation_def`, those nodes are inserted, in their order, among the children of the document at the place of the template, with their attributes and without `pos` (C2-A-159). Otherwise the template gives no definition.

**C2-H-191** A link definition renders nothing (C2-H-071) and has no carrier, as in 0.1. The importer rebuilds the definitions from the references whose `data-carve-ref` it reads. For each key it makes one `link_reference_definition` whose `href` is the `href` and whose `tooltip` is the `title` of the first `<a>` or `<img>` in document order that carries the key. The rebuilt definitions stand after the last block of the document, in the order in which their keys are first met, and the footnote definitions follow them (C2-H-194). A rebuilt definition has no attributes: the attributes that a definition merged into its references (C2-H-141) are read as attributes of each reference.

**Exception C2-H-198** No definition is rebuilt for a key whose first element is an `<a>` with the `href` `#ID`, where the heading lookup of the key (C2-I-084) finds the heading with the id ID in the imported tree. That reference resolved to the heading and needs no definition. A key that the lookup does not match, such as `d` in `[x][d]` with `[d]: #intro`, gets its definition.

**C2-H-192** Two elements with one key and a different `href` or `title` occur only in HTML that was changed after the render, since every reference of a key resolves to one definition. The first element decides the definition. A later element is still read as a reference with the key, so it resolves through that definition: its own `href` and `title` are not read.

**C2-H-193** HTML holds no trace of three facts of link definitions, so they do not survive: a definition that no reference uses, a later definition of a key that an earlier one holds (C2-B-085), and the place of a definition among the blocks. In the source, `unused-link-reference-definition` (C2-W-106) reports the first and `duplicate-link-reference-definition` the second.

**C2-H-194** A footnote definition renders only as a note of the footnote section (C2-H-089), which holds one note per used footnote, in the order of the footnote numbers. The importer reads each note that carries `data-carve-footnote-label` as a `footnote` whose key is the value and whose blocks are the blocks of the note without its backlinks. These definitions follow the rebuilt link definitions, in the order of the notes. A note that carries `data-carve-inline-footnote` gives no definition: its reference reads back as the inline footnote (C2-H-186). The key and the blocks of every used footnote survive, and so does the place of a `footnotes` directive that places the section (C2-H-158). As for link definitions, an unused footnote definition, a later definition of a key and the place of a definition among the blocks do not survive. `unused-footnote-definition` (C2-W-106) and `duplicate-footnote-definition` report the first two in the source.

Example 51 (unverified, `--roundtrip`)

::: compare

```carve
[a][r] and [b][r], [r][] and [r].

[u]: /unused

[r]: /dest "Title"

Tail.

[r]: /later
```

```html
<p><a href="/dest" title="Title" data-carve-ref="r">a</a> and <a href="/dest" title="Title" data-carve-ref="r">b</a>, <a href="/dest" title="Title" data-carve-ref="r" data-carve-ref-collapsed>r</a> and <a href="/dest" title="Title" data-carve-ref="r" data-carve-ref-shortcut>r</a>.</p>
<p>Tail.</p>
```

:::

Reported: `duplicate-link-reference-definition`.

Importing this HTML gives the four references with their forms and one definition of `r` after the last block, `[r]: /dest "Title"`. The unused definition of `u`, the later definition of `r` and the place of the first one are gone.

Example 52 (unverified, `--roundtrip`)

::: compare

```carve
A[^n], B[^m] and ^[inline] C[^n].

[^u]: Unused.

[^m]: M.

Middle.

[^n]: N.
```

```html
<p>A<a id="fnref1" href="#fn1" role="doc-noteref" data-carve-footnote-label="n"><sup>1</sup></a>, B<a id="fnref2" href="#fn2" role="doc-noteref" data-carve-footnote-label="m"><sup>2</sup></a> and <a id="fnref3" href="#fn3" role="doc-noteref"><sup>3</sup></a> C<a id="fnref1-2" href="#fn1" role="doc-noteref" data-carve-footnote-label="n"><sup>1</sup></a>.</p>
<p>Middle.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1" data-carve-footnote-label="n">
      <p>N.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference 1">↩<sup>1</sup></a> <a href="#fnref1-2" role="doc-backlink" aria-label="Back to reference 2">↩<sup>2</sup></a></p>
    </li>
    <li id="fn2" data-carve-footnote-label="m">
      <p>M.<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn3" data-carve-inline-footnote>
      <p>inline<a href="#fnref3" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Importing this HTML gives the paragraphs `A[^n], B[^m] and ^[inline] C[^n].` and `Middle.`, then `[^n]: N.` and `[^m]: M.` in the order of the notes. The definition of `u` is gone, and so are the places of the two others.

**C2-H-188** Round trip is promised only for HTML that the renderer wrote with `roundtrip` on and that was not changed afterwards. For such HTML the importer recovers each fact that a carrier names. It does not recover what has no carrier: the sidecar facts of C2-H-119 and the facts that HTML and the carriers do not hold.

**C2-H-195** The facts of this table are known not to survive a render with `roundtrip` and an import, in addition to the sidecar facts of C2-H-119 and the definitions of C2-H-193 and C2-H-194. 0.2.0 adds no carrier for them. Each row gives a minimal input, in which `⏎` stands for a line break, and the source that the import gives back as the canonical writer spells it. Rendering that source again gives the same HTML, except for rows 1, 5, 6, 7, 13 and 16.

| Row | Fact | Input | Comes back as |
|---|---|---|---|
| 1 | a carriage return in a text, code or math value | `a`, U+000D, `b` | `a⏎b`: the HTML input stream turns the carriage return into a line feed (C2-H-183), which reads as a soft break |
| 2 | the type of a raw block in the format `html` with `rawHtml` off | ```` ```=html⏎<b>x</b>⏎``` ```` | ```` ```html⏎<b>x</b>⏎``` ````: a code block, as it was written (C2-H-050) |
| 3 | a `non_breaking_space` node | `a\ b` | `a`, U+00A0, `b`: the character in text. A literal U+00A0 writes the same `&nbsp;` (C2-H-002) and survives |
| 4 | a `non_breaking_space` node that starts a line of a line block | `::: \|⏎\ a⏎:::` | `::: \|⏎ a⏎:::`: a leading space, which C2-H-043 writes as the same `&nbsp;` |
| 5 | a soft break directly before a hard break | `a⏎\⏎b` | `a\⏎b`: the line ending before `<br>` is layout |
| 6 | the spacing of a loose list whose items start with no paragraph | `- > q⏎⏎- > r` | `- > q⏎- > r`: a tight list, since no item writes a `<p>` of its own (C2-H-034) |
| 7 | a line feed in the text of a delimited-table cell | ```` {table}⏎```csv⏎x⏎"2⏎3"⏎``` ```` | `\|= x \|⏎\| 2 3 \|`: the line feed reads as a space |
| 8 | the column that supplied an alignment, where a head row exists | `{aligns="center"}⏎\|= a \|⏎\| b \|` | `\|={~} a \|⏎\| b \|`: every cell writes its resolved alignment (C2-H-057), and it comes back as a mark on the header cell, which aligns the column (C2-B-213); `aligns` is gone |
| 9 | a plain div whose first class is a directive kind | `{.toc}⏎:::⏎a⏎:::` | `::: toc⏎a⏎:::`: the directive, which writes the same `<div class="toc">` (C2-H-158) |
| 10 | a span with the class `ext-NAME` | `[x]{.ext-a}` | `:a[x]`: the inline extension `a`, which writes the same `<span class="ext-a">` (C2-H-076) |
| 11 | an authored key `lang` on a span | `[x]{lang=de}` | `[x]{:de}`: `node.lang`, which writes the same `lang` attribute (C2-H-009) |
| 12 | a paragraph that holds only one display math node and has no role, in a supplied tree | the tree of `` $$`more` `` without `role` | `` $$`more` ``: a paragraph of the role `math`, which writes the same element (C2-H-077) |
| 13 | the case of an attribute name | `[s]{Clk=v}` | `[s]{clk=v}`: the HTML parser lowers the case of attribute names (C2-H-183) |
| 14 | a link definition whose destination is the heading its key finds | `[Intro][]⏎⏎[Intro]: #intro⏎⏎{#intro}⏎# Intro` | `[Intro][]⏎⏎{#intro}⏎= Intro`: no definition, by C2-H-198; the reference resolves to the heading |
| 15 | the attributes of a link definition | `[x][r]⏎⏎{.c}⏎[r]: /u` | `[x][r]{.c}⏎⏎[r]: /u`: the attributes stand on the reference (C2-H-191) |
| 16 | the whitespace at the edge of a delimited-table cell | ```` {table}⏎```csv⏎a, d⏎``` ```` | `\|= a \|= d \|`: the cell is written `<th scope="col"> d</th>`, and the import removes the space at the edge of its inline content (C2-M-018) |
| 17 | an authored key with the name of a structural attribute that its element does not generate | `[a](/u){title=x}` | `[a](/u "x")`: the import reads the attribute as the structure it names (C2-H-013); `{type=A}` above `. a` comes back as a list of the style `A` the same way |

**C2-H-196** The list of C2-H-195 is complete as far as known. A tree fact that neither the table of C2-H-186, nor C2-H-119, C2-H-193, C2-H-194 or the table of C2-H-195 names, nor a fact the render does not write (C2-H-188), is expected to survive a render with `roundtrip` and an import of the unchanged HTML. A round trip that loses such a fact is a defect of this specification or of the engine, and the fix is a row in that table or a fix of the engine.

**C2-H-189** With `rawHtml` on, raw HTML is passed through verbatim (C2-H-053), so a document can hold a template or a carrier that the renderer did not make. The importer cannot tell the two apart and reads them alike. A carrier is data and not a grant: reading one never makes the importer trust the HTML around it, and a renderer applies its options and the URL policy to an imported tree as to any other.

**C2-H-190** A sanitizer that removes `<template>` elements or `data-` attributes removes the facts they carry. The rest of the HTML still imports: an element whose carrier was removed is read as it stands.

**C2-H-199** A `<figure>` that holds one block element and then a `<figcaption>`, and that is no figure group, is read as that block with the caption in its `caption` slot when C2-A-082 lets that block carry a caption and it has none yet (any other such figure is a `figure_group`, C2-M-043), and the attributes of the `<figure>` are the block's `attrs`. A panel `<figure class="carve-figure-panel">` is read the same way without its class, and a panel that holds a `<table>` gives that table.

Importing the output of Examples 23 and 42 to 46 gives the reference forms, the ids, the autolink, the cross-reference, the footnote labels, the div and the definitions of their inputs.

## Options

**C2-H-121** Fourteen of the 20 options affect rendering. No option of this section changes the tree, except that `headingIds` controls a resolution result.

**C2-H-122** `mode` is `interactive`, the default, or `static`. Static output is self-contained: an extension renders through its static path, and a diagram or an equation without a build-time renderer falls back to its source as a code block. An unknown value is refused.

**C2-H-168** In static mode with no build-time renderer an inline math node is written as `<code class="language-math">` around its source, with the attributes of the node, and a display math paragraph (C2-H-077) as `<pre><code class="language-math">` around its source and one line feed, as a code block writes its value (C2-A-045), with the attributes of the paragraph on `<pre>`. A `renderers` option that is not empty is refused in 0.2.0, which has no build-time renderer to call.

**C2-H-123** `renderers` maps an extension name to a build-time renderer and is read only in static mode.

**C2-H-124** `symbols` maps a symbol name to its output (C2-H-101). The values are trusted and written verbatim.

**C2-H-125** `labels` replaces the strings the engine writes itself, such as the label of the footnote section and of a backlink. A label is text and is escaped where it is written. A key left out keeps its English default.

**C2-H-126** `social` holds the URL templates and the resolvers for mentions and tags (C2-H-100). Without it, both render as inert spans. It has four fields, each optional, and no other: `mentionUrl` and `tagUrl` are strings, and `resolveMention` and `resolveTag` are functions of the host. A template gives its string with each `{name}` replaced by the name, percent-encoded as UTF-8 with every character encoded except ASCII letters, digits and `-`, `_`, `.`, `!`, `~`, `*`, `'`, `(` and `)`; no other part of the template is read. A resolver takes the name as written and returns a URL, or nothing. For a mention the resolver is asked first and the template is used when it returns nothing; a tag works the same with its own pair. An empty URL is no URL. The URL is a sink of the URL policy (C2-H-159).

**C2-H-127** `sourceLines` adds `data-source-line` (C2-H-016). Default off. `sections` turns section wrapping on or off (C2-H-026). Default on. `smartTypography` selects glyph or source for smart punctuation (C2-H-078). Default on. `roundtrip` adds the carriers (C2-H-112). Default off. `rawHtml` passes raw HTML through (C2-H-053). Default off. The HTML importer reads the same option: off, it drops comments and raw elements (C2-M-066).

**C2-H-128** `urlPolicy` sets which URL schemes pass on `href`, `src` and every other URL sink: a deny list, whose default is the 0.1 list of script schemes and protocol-handler schemes, or an allow list. The option has no off value. The filter also removes blocked attribute names, event handlers among them, and blanks a `style` value that holds a URL function, as in 0.1 (PART 9 section 25). The list of blocked attribute names is `dropped_attributes` in `data/url-policy.json`. C2-H-159 to C2-H-162 state the test and the filter. An object that holds both a deny list and an allow list is refused (C2-H-137); an empty object is the default deny list.

**C2-H-129** `profile` restricts the features a render accepts: `full`, `article`, `comment` or `minimal`, as in 0.1. C2-H-163 and C2-H-164 state what each one accepts. A construct outside the profile renders in its degraded form and is reported. The report has the code `profile-construct-degraded`.

**C2-H-130** `strictLosses` turns every render-loss entry into an error (C2-A-174): the render returns no output.

**C2-H-131** `headingIds` controls generated heading ids (C2-H-022). Its values are `off`, `keep-case`, `lower` and `ascii`, and the default is `keep-case`. With `off` no id is generated, and an authored id is still written.

**C2-H-132** A render loss is an entry of the diagnostics record with the channel for render losses (C2-A-173). The 0.1 loss codes that apply to HTML stay: `raw-format-dropped`, `destination-denied`, `carrier-attribute-dropped`. The catalog lists every code of the channel (C2-W-113). `destination-denied` has the severity error.

**C2-H-159** The URL sinks are the `href` of a link and of an autolink, the `src` of an image, each token of an authored attribute of the list `url_list_attributes` (C2-H-161), and a URL that a `social` template gives (C2-H-126). A destination is tested on a copy: first every character of the list `probe_removes` of `data/url-policy.json` is removed from it, anywhere in the value, so `java` U+0001 `script:` tests as `javascript:`. U+FFFD is on the list because a U+0000 of the source is read as U+FFFD (C2-B-218) before the test. When the rest starts with an ASCII letter, then ASCII letters, digits, `+`, `-` and `.`, and then a colon, that run is the scheme, compared without ASCII case. A destination with no scheme, such as a relative path or a fragment, passes under a deny list and under an allow list. A network-path reference such as `//x.org/p` is one: it takes the scheme of the page, as a relative path does. The `default` of `urlPolicy` in `data/options.json` is the default deny list.

**C2-H-160** Under a deny list a destination fails when its scheme is on the list, and under an allow list when it is not. A failed destination is written as the empty value, `href=""` or `src=""`, and is reported with `destination-denied` once per destination. The link text, the alt text and the visible text of an autolink stay. An authored `href` on a link and an authored `src` on an image are not written: the destination stands, so an attribute block cannot bring back a failed one.

**C2-H-161** On every element, an extension's included, an attribute whose name is in the list `dropped_attributes` of `data/url-policy.json`, compared without ASCII case, is not written: every name that starts with `on`, `srcdoc` and `formaction`. An authored value is written empty when its text before the first colon, with the characters of `probe_removes` removed and in ASCII lower case, is a scheme of the default deny list, whatever `urlPolicy` holds: `{title="Shell: bash"}` gives `title=""`. A value that holds no colon is not tested. An attribute of the list `url_list_attributes` is split at its separators, and the whole value is written empty when any token fails this test or the policy of C2-H-160, or when the unsplit value fails this test: `ping="java script:x"` gives `ping=""`, and so does an `https` URL in `srcset` under an allow list without `https`. An authored value is one written in an attribute block or copied by an extension onto its element. `id` is not tested, and neither is a value the renderer takes from text: a link title, alt text and the label of a task box stay as written. Three places need a word. Classes are tested one by one: an authored class that fails is left out and the others stay, the element's own classes among them. The `lang` field of a supplied tree is tested like an authored value. The expansion of an abbreviation definition is text and is not tested, while `abbr` and `time` written in an attribute block are authored values and are. The default deny list applies to authored values under every policy by intent: such a value is no URL sink that `urlPolicy` governs (C2-H-159), a script or a later tool may still read it as a URL, and the option has no value that turns the filter off (C2-H-128).

Under an allow list a token of `srcset` meets the same policy as the `src` beside it, and a network-path reference has no scheme of its own (C2-H-159, C2-H-161).

Example 55 (unverified, `urlPolicy` set to `{"allow": ["mailto"]}`)

::: compare

```carve
![x](/i.png){srcset="https://x.org/i.png 1x"}

[x](//x.org/p)
```

```html
<img src="/i.png" alt="x" srcset="">
<p><a href="//x.org/p">x</a></p>
```

:::

A browser loads the `background` of a table cell as an image, so it is on the list as well.

Example 58 (unverified, `urlPolicy` set to `{"allow": ["mailto"]}`)

::: compare

```carve
|{background="https://x.org/b.png"} a |
```

```html
<table>
  <tbody>
    <tr><td background="">a</td></tr>
  </tbody>
</table>
```

:::

**C2-H-162** An authored `style` value is written empty when it holds one of the texts of `style_patterns` in `data/url-policy.json`, tested after its CSS escapes are decoded, its whitespace is removed and its ASCII letters are lowered. A backslash and one to six hexadecimal digits decode to that code point and take one whitespace character after them; a backslash and a line break decode to nothing; a backslash and any other character decode to that character. The value that passes is written as the author spelled it.

A CSS image function loads a URL from a bare string, so `image(`, `image-set(` and `src(` blank the value as `url(` does, under every policy (C2-H-128).

Example 57 (unverified, `urlPolicy` set to `{"allow": ["mailto"]}`)

::: compare

```carve
{style="background:image-set(\"https://x.org/a.png\" 1x)"}
Hello
```

```html
<p style="">Hello</p>
```

:::

**C2-H-172** The bidirectional controls U+202A to U+202E and U+2066 to U+2069 are never written between tags: not in text, not in code, and not in text the renderer makes, as a title paragraph, a label paragraph, the text of a cross-reference (C2-H-096), static math (C2-H-168) and a degraded form (C2-H-165). They can make source read in another order than it runs. They stay in the tree and in the canonical form, and an attribute value keeps them; the scheme test removes them from its copy (C2-H-159, `probe_removes`). Raw content that is passed through unescaped is not filtered, and neither is the text of an abbreviation template (C2-H-179), which is data for a reader and not presentation. (carried over from 0.1)

**C2-H-163** A profile decides for each node by its type and its axis, block or inline. A type on the deny list of its axis is outside the profile. Otherwise, when the axis has an allow list, a type is inside exactly when the list names it. Otherwise it is inside. An image paragraph, a code block, a quote or a math block that carries a caption is tested as its `<figure>` (C2-H-062), a type that no allow list names, so under an allow list it is outside and is degraded as a whole. No other rule excludes a type, an unknown one included. The four profiles are the rows of `profiles` in `data/url-policy.json`: `full` accepts everything, `article` everything but raw content, and `comment` and `minimal` the listed types. `comment` writes `rel="nofollow ugc"` on every link. A node that stands deeper than `max_nesting` levels below the document, each block and each inline level counted, is outside the profile like a node of a refused type. An input longer than `max_length` UTF-8 bytes is refused before it is parsed: the render returns an error and no output.

**C2-H-165** The degraded form of a node outside the profile is its plain text. An inline node is written as the plain text of its children; an image as `[img: ALT]`; a no-break space as U+00A0, a hard break and a soft break as one space, a smart punctuation node as its glyph; a footnote reference as `[^` and its key and `]`; a `comment` and a `critic_comment` give no text, so a paragraph that holds only comments still writes nothing (C2-H-019); every other inline node with no children as the writer spells that node on its own (C2-W-116), since a tree holds no source text. These inline forms hold for an inline node that is degraded while its block stays, and for every node inside it at any depth. Inside a block that is degraded as a whole, the plain text is that of C2-H-143 for every node except an image, which keeps `[img: ALT]`, so a `code`, a `literal_inline` and a `math` node give their value. An include is written as the source text of its directive. A block becomes one paragraph of its plain text behind the mark of its kind: for a heading one `#` for each level and a space (the source may have used `=`), `> ` for a quote, `- ` for each item of a list, `---` for a thematic break, one line per table row with ` | ` between the cells and a hard break between the rows, the value without its final line break for a code or raw block, and the title and the blocks joined by single spaces for a div, an admonition and a directive. A block that carries a caption writes it after its degraded form, as one more paragraph of its plain text, in which `caption_number` gives its number (C2-H-143): `^ Figure #: cap` degrades to `Figure 1: cap`, and a figure group with no block still writes its caption. Any other block that holds blocks is written as those blocks in their degraded forms, in order, and any other leaf block as one paragraph of its plain text: a description list gives one paragraph for each term and the degraded blocks of each description, and a block extension the blocks of its fallback. A node that leaves no text is dropped. A degraded node is reported once (C2-H-129), and the nodes inside it are not reported again.

Under `minimal` the editorial comment gives no text, and the math span is written as the writer spells the node (C2-H-165).

Example 48 (unverified, `--profile minimal`)

::: compare

```carve
a {#c#} b $`m`
```

```html
<p>a  b $`m`</p>
```

:::

Reported: `profile-construct-degraded`.

The children of a degraded link take the inline forms too, at every depth: the raw span and the autolink give their spellings, as they would outside the link (C2-H-165).

Example 53 (unverified, `--profile minimal`)

::: compare

```carve
[a `<br>`{=html}](u) b

[<a:b>](u)
```

```html
<p>a `&lt;br&gt;`{=html} b</p>
<p>&lt;a:b&gt;</p>
```

:::

Reported: `profile-construct-degraded`.

```json
[
  {
    "type": "paragraph",
    "children": [
      {
        "type": "link",
        "href": "u",
        "children": [
          { "type": "text", "value": "a " },
          { "type": "raw_inline", "format": "html", "value": "<br>" }
        ]
      },
      { "type": "text", "value": " b" }
    ]
  },
  {
    "type": "paragraph",
    "children": [{ "type": "link", "href": "u", "children": [{ "type": "autolink", "href": "a:b" }] }]
  }
]
```

A heading outside the profile becomes a paragraph, and a paragraph that is the first block of a tight item is written bare (C2-H-034, C2-H-165).

Example 54 (unverified, `--profile minimal`)

::: compare

```carve
- # H
```

```html
<ul>
  <li># H</li>
</ul>
```

:::

Reported: `profile-construct-degraded`.

No built-in profile keeps some footnote references and degrades others: `full` and `article` keep every `footnote_ref` and `inline_footnote`, and `comment` and `minimal` keep none, so the note numbers have no gap under any of them.

**C2-H-166** For `max_nesting` the children of the document stand at level 0, and each block level and each inline level below adds one. A node at a level above the bound is outside the profile; a node at the bound stays, and its children are degraded. A `list_item` counts a level but is never degraded on its own: it keeps its `<li>`, and its blocks are degraded. Degradation comes before C2-H-069: a node at the bound writes its children in their degraded forms, so a soft break beside a comment line among them (C2-H-069) is one space.

**C2-H-167** A link carries at most one `rel` attribute, and none when neither the author nor the profile gives a word. It stands behind `href` and `title` and before the id and the classes, and holds the authored words in their order and then the words of the profile that are not among them: `{rel=me}` under `comment` gives `rel="me nofollow ugc"`. The authored value passes C2-H-161 first, so a value that test empties gives no authored word. An autolink is a link for the profiles: it is allowed where `link` is and takes the same `rel`. A mention or a tag that `social` gives a URL is a link for the profiles too: where `link` is outside the profile it is written as its inert span (C2-H-100), and elsewhere it takes the same `rel`.

**C2-H-164** The lists name 0.2 node types. An inline literal counted as code in 0.1, so `literal_inline` stands in the lists that hold `code`.

Example 30 (generated)

::: compare

```carve
[bad](javascript:alert(1)) <JavaScript:x> [ok](/a#b) ![p](data:image/png;base64,AA)

{title="Shell: bash" onclick="x()" style="color: u\72l(a)"}
Text.
```

```html
<p><a href="">bad</a> <a href="">JavaScript:x</a> <a href="/a#b">ok</a> <img src="" alt="p"></p>
<p title="" style="">Text.</p>
```

:::

Reported: `destination-denied`.

Example 31 (generated, `--profile comment`)

::: compare

```carve
See [docs](https://x.org) and *bold*.
```

```html
<p>See <a href="https://x.org" rel="nofollow ugc">docs</a> and <strong>bold</strong>.</p>
```

:::

Example 32 (generated, `--profile minimal`)

::: compare

```carve
See [docs](https://x.org) and *bold*.
```

```html
<p>See docs and <strong>bold</strong>.</p>
```

:::

Reported: `profile-construct-degraded`.

A degraded captioned block and a degraded table keep their captions as paragraphs, with their numbers (C2-H-165).

Example 39 (unverified, `--profile comment`)

::: compare

```carve
![i](a.png)
^ Figure #: cap

| t |
^ Table #: tc

:::: figure
::::
^ Empty #
```

```html
<p>[img: i]</p>
<p>Figure 1: cap</p>
<p>t</p>
<p>Table 1: tc</p>
<p>Empty 1</p>
```

:::

Reported: `profile-construct-degraded`.

Inside a degraded captioned image and a degraded quote, code and math give their values. The math span in the paragraph, which stays, is degraded on its own and gives its spelling (C2-H-165).

Example 41 (unverified, `--profile minimal`)

::: compare

```carve
![i](a.png)
^ a `x` b $`m`

> q `c` $`n`

p $`k`
```

```html
<p>[img: i]</p>
<p>a x b m</p>
<p>&gt; q c n</p>
<p>p $`k`</p>
```

:::

Reported: `profile-construct-degraded`.

**C2-H-177** Resolution does not read `profile`: a reference to a heading resolves as it does without a profile, and the tree does not change (C2-H-121). The render reads it. A heading outside the profile is degraded (C2-H-165) and writes no element and no id, so a reference link and a cross-reference that resolved to it are written in their unresolved forms (C2-H-085, C2-H-086), as if the heading did not exist. A link that is itself outside the profile is degraded and writes the plain text of its children.

The heading is outside the `comment` profile. Its reference and its cross-reference are written as unresolved text (C2-H-177).

Example 34 (unverified, `--profile comment`)

::: compare

```carve
## Sub *em* `code`

[Sub em code][] and </#Sub-em-code>
```

```html
<p>## Sub em code</p>
<p>[Sub em code][] and &lt;/#Sub-em-code&gt;</p>
```

:::

Reported: `profile-construct-degraded`.

## The option list

**C2-H-137** These are the 20 options, and there are no others. An application may spell a name by the convention of its language. An option that an engine does not offer is refused, not ignored.

| Option | Kind | Type | Default | Defined in |
|---|---|---|---|---|
| `extensions` | parse | list of extensions | empty: the core alone | the extension API; the only option that changes parsing |
| `includes` | parse | include root or resolver, with its limits | none: no directive is expanded (C2-H-133) | the Includes document (`includes.md`, C2-N-003) |
| `headingIds` | resolution | `off`, `keep-case`, `lower` or `ascii` | `keep-case` | C2-H-131 |
| `mode` | render | `interactive` or `static` | `interactive` | C2-H-122 |
| `renderers` | render | map from extension name to renderer | empty | C2-H-123 |
| `symbols` | render | map from symbol name to output | empty | C2-H-124 |
| `labels` | render | map from label key to text | the English strings | C2-H-125 |
| `social` | render | URL templates and resolvers for mentions and tags | none | C2-H-126 |
| `sourceLines` | render | boolean | off | C2-H-127 |
| `sections` | render | boolean | on | C2-H-127 |
| `smartTypography` | render | boolean | on | C2-H-127 |
| `roundtrip` | render | boolean | off | C2-H-127 |
| `rawHtml` | render, import | boolean | off | C2-H-127, C2-M-066 |
| `urlPolicy` | render | deny list or allow list of URL schemes | the 0.1 deny list, listed in `data/options.json` | C2-H-128 |
| `profile` | render | `full`, `article`, `comment` or `minimal` | `full` | C2-H-129 |
| `strictLosses` | render | boolean | off | C2-H-130 |
| `alignTables` | format | boolean | off | C2-W-068 |
| `normalize` | format | boolean | off | C2-W-127 |
| `rules` | lint | map from rule id to on or off | the default state of each rule in the catalog | C2-W-109 |
| `platforms` | lint | list of platform names | empty | C2-W-109 |

Fourteen are render options, counting `headingIds`, which switches a resolution result that the renderer reads. Two are parse options, two are format options and two are lint options. `rawHtml` is read by the HTML importer as well (C2-M-066).

## The clauses of PART 10

| 0.1 clause | Subject | 0.2 |
|---|---|---|
| CARVE-P10-001 | an empty container body | C2-H-008 |
| CARVE-P10-002 | one row per line in every table group | C2-H-055 |
| CARVE-P10-003 to 007 | semantic span attributes | C2-H-075 |
| CARVE-P10-008 | the other semantic names are an extension | C2-H-076 |
| CARVE-P10-009 | task list class and task state | C2-H-032, C2-H-033 |
| CARVE-P10-010 | indentation of an element an extension places | not ported: belongs to the extension contract |
| CARVE-P10-011 | directive classes follow element ownership | not ported: belongs to the extension contract |
| CARVE-P10-012 | a raw block with no payload lines keeps its slot | not ported: HTML shows no difference (C2-H-134) |
| CARVE-P10-013 | an escaped raw block is written as code | C2-H-050 |
| CARVE-P10-014 | `data-delim` | C2-H-031 |
| CARVE-P10-015, 016 | the carriers | C2-H-112 to C2-H-115, five names removed |
| CARVE-P10-017, 021 | import of carriers | ported to the HTML importer: C2-H-120, C2-H-182 to C2-H-190 |
| CARVE-P10-018 | one option for the carriers of every target | C2-H-112; the Markdown target is not in 0.2.0 |
| CARVE-P10-019 | an authored reserved name is dropped | C2-H-116 |
| CARVE-P10-020 | retired in 0.1 | none |

The five attribute ranks of PART 10 section 1 are replaced by the fixed order of C2-H-009.

## Further clauses

**C2-H-174** A task box whose item has no plain text in its direct paragraph or heading children writes no `aria-label` attribute on its checkbox.

**C2-H-175** An `abbr` span with neither an authored `title` nor a nonempty derived abbreviation value writes no `title` attribute. The test is made on the value as written, before the filter of C2-H-161: an authored `abbr` that the filter empties gives `title=""`.

**C2-H-173** The engine exports the scheme test of C2-H-159 and the default deny list of `data/url-policy.json` as public functions and data for every consumer that writes a URL sink. A consumer applies the same test instead of copying the policy.

**C2-H-176** In text content and attribute values, the renderer replaces a character that the HTML input stream rejects with U+FFFD. This includes U+0000, C0 controls other than tab, line feed, form feed and carriage return, U+007F, C1 controls, unpaired surrogates and Unicode noncharacters. A surrogate pair that spells a noncharacter is replaced once. Raw HTML and HTML returned by a host extension renderer remain the host's responsibility.

## Counts

| Section | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Output form | 8 | 2 | 1 | 0 |
| Attributes | 9 | 1 | 3 | 1 |
| Paragraphs, headings and sections | 17 | 1 | 4 | 1 |
| Lists | 9 | 0 | 1 | 4 |
| Description lists | 3 | 0 | 2 | 0 |
| Quotes, divs and their sigil forms | 13 | 0 | 3 | 0 |
| Code and raw content | 9 | 0 | 1 | 1 |
| Tables | 9 | 0 | 1 | 0 |
| Captions and figures | 12 | 0 | 4 | 1 |
| Comments, frontmatter and definitions | 5 | 0 | 1 | 2 |
| Inline elements | 8 | 0 | 1 | 0 |
| Links, images and references | 10 | 1 | 1 | 2 |
| Footnotes | 8 | 0 | 3 | 2 |
| Cross-references and abbreviations | 5 | 1 | 1 | 0 |
| Mentions, tags and symbols | 2 | 0 | 1 | 2 |
| State beyond the current block | 10 | 0 | 0 | 0 |
| Roundtrip carriers | 15 | 0 | 0 | 8 |
| Import | 18 | 1 | 0 | 2 |
| Options | 24 | 0 | 3 | 9 |
| The option list | 1 | 0 | 0 | 0 |
| Further clauses | 4 | 0 | 0 | 0 |
| **Total** | **199** | **7** | **31** | **35** |

The document has 199 clauses, 7 of them marked with the word "Exception", and 66 examples, 31 generated and 35 unverified. The clause count includes the exceptions. Clauses added after the first draft carry the next free number and stand at the end of their section, so the ids are not in document order everywhere.
