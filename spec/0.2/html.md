# Carve 0.2: HTML rendering

Status: first draft on `next2`. Nothing in this document is implemented yet.

This document defines how a 0.2 tree becomes HTML. The block and inline chapters say which tree a source gives, `ast.md` defines the tree, and `writer.md` defines the way back to source. It ports PART 10 of the 0.1 grammar and the rendering parts of PART 9 and PART 9R, and applies the 0.2 decisions.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-H-nnn`. `C2-A-nnn`, `C2-B-nnn`, `C2-I-nnn`, `C2-L-nnn` and `C2-W-nnn` name clauses of the AST document, the block and inline chapters, the sidecar document and the writer document. `CARVE-Pn-nnn` names a 0.1 clause.
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

**Exception C2-H-007** A list item whose only block is one paragraph, bare or wrapped, is written on one line. An item with more blocks puts a first paragraph, bare or wrapped, on the line of `<li>` and each later block on its own line.

**C2-H-008** A container whose body renders nothing keeps one empty line between its tags. This holds for a quote, a div, an admonition, a line block, a hard-break block and a figure group, and a body that holds only comments is such a body.

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

**C2-H-009** The attributes of an element are written in one fixed order: the structural attributes of C2-H-010, then `id`, then `class`, then the language, then the keys in the order written, then the render annotation of C2-H-016. The language is written as the `lang` attribute (C2-A-037).

**C2-H-010** A structural attribute is one the element derives from its own marker, destination or resolution: `type`, `start` and `data-delim` on `<ol>`; `data-task-state` on `<li>`; `href` and `title` on `<a>`; `src`, `alt` and `title` on `<img>`; `role` on a footnote reference; `title` on `<abbr>` and `datetime` on `<time>` (C2-H-075); `rowspan`, `colspan` and `scope` on a cell; and, with `roundtrip` on, the carriers of C2-H-112. They are written in the order this clause names them.

**Exception C2-H-011** On a footnote reference the `id` stands before `href`. On a mention or a tag the class stands first.

**C2-H-012** All classes of an element form one `class` value, joined by one space. A base class that the element's kind requires stands first: `task-list`, `math inline` or `math display`, `admonition` and the admonition kind, the name of a div's opener, `carve-figure-group`, `carve-figure-panel`. The classes the author wrote follow in the order written. A class the marker generates stands last: `line-block`. The class `hardbreaks` is a class of the tree and stands where `attrs.classes` has it (C2-A-068). A class that occurs more than once is written once, at its first place; the tree keeps every occurrence.

**C2-H-013** Attribute names compare without regard to ASCII letter case. A structural attribute replaces an authored key of the same name, except where a clause says the authored key wins (C2-H-048, C2-H-075), and an authored key replaces every other generated attribute of the same name. No element carries one name twice. A `lang` key beside the language part of an attribute block, as in `{lang=de :en}`, is such a case: the language part decides, and the key is not written.

**C2-H-014** An attribute whose value is the empty string is written as `name=""`.

**C2-H-015** An authored `align` key with the value `left`, `right` or `center` on a paragraph, a div or a heading is written as `style="text-align: VALUE;"`. An authored `style` on the same element keeps its value and takes the declaration after it. On every other element `align` stays an ordinary attribute. As in 0.1.

**C2-H-016** With `sourceLines` on, each block element carries `data-source-line`, the number of the source line it starts on, counted from 1, as its last attribute. It is structural (C2-H-010): the generated value replaces an authored key of that name.

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

**C2-H-018** A paragraph is `<p>` around its inline content, except where a tightness rule writes it bare (C2-H-034, C2-H-040).

**C2-H-019** A paragraph that holds only comments renders nothing: no element and no empty line (C2-B-140). A paragraph that holds only a braced comment is this case.

**C2-H-020** A paragraph promoted to a block image (C2-B-157, C2-A-136) is written without its `<p>`: the bare `<img>` on its own line. Where the image is an unresolved reference, C2-H-085 writes it as text, and text needs a block around it: the paragraph then keeps its `<p>`.

**C2-H-021** A heading is `<h1>` to `<h6>` by its level. HTML has no element for a level above 6, which only a supplied tree can hold (C2-A-071): such a heading is written as `<div role="heading" aria-level="N">` with its true level, so the level is not lost. It takes its attributes and its id like any heading, and it nests sections by its level (C2-H-026).

**C2-H-022** Unless `headingIds` is `off`, every heading has an id: the id the author wrote, or a generated one. A generated id is the slug of the heading's plain text, computed as in 0.1 (CARVE-P2-004) and stated in C2-H-143 to C2-H-148. With `keep-case` the case is kept and a run of spaces becomes one hyphen. `lower` also folds the slug to lower case, and `ascii` also transliterates it to ASCII, as the two 0.1 switches did.

**C2-H-023** A generated id is a resolution result and is read from `generatedId` (C2-A-134). It is not an authored id: `attrs.id` holds only what the author wrote (C2-A-038), the writer does not write a generated id into the source (C2-W-054), and the carrier `data-carve-generated-id` marks it under `roundtrip`.

**C2-H-024** Generated ids are unique in the document. Authored ids are reserved first, in document order. Generated ids follow in document order, and a slug that is already taken gets the suffix `-2`, then `-3`, and so on. An authored id is written as the author wrote it, also where two nodes carry the same one: the renderer does not change it, each later one is reported (C2-A-039), and a reference to that id resolves to the first node that carries it.

**Exception C2-H-025** The headings of a footnote body take their generated ids after every heading of the document body, in the order of the footnote numbers. A heading in an unused footnote definition takes none.

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

**C2-H-148** A result whose first character is a Unicode number (general category N, not only an ASCII digit) gets the prefix `s-`, and an empty result becomes `s`. This is the slug. A duplicate slug then takes its suffix (C2-H-024), so the suffix follows the prefix: two headings `1` give `s-1` and `s-1-2`.

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

Example 25 (generated, `lowercaseHeadingIds`, which is `headingIds: lower`)

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

## Lists

**C2-H-029** A bullet list is `<ul>`, an ordered list is `<ol>`, and an item is `<li>`.

**C2-H-030** An ordered list carries `type` when its style is not decimal (`a`, `A`, `i` or `I`) and `start` when it does not start at 1.

**C2-H-031** An ordered list whose delimiter is `)` carries `data-delim=")"`. A list with the dot carries no such attribute. Both delimiters are meaning (C2-B-037), so the attribute is written on every render, with `roundtrip` on or off.

**C2-H-032** A task item starts with `<input type="checkbox" disabled aria-label="TEXT">` and one space, where TEXT is the plain text of the paragraphs and headings that are direct children of the item, in order, and is empty when there are none. The input carries `checked` before `disabled` when the mark is `x`. The list of task items carries the base class `task-list`.

**C2-H-033** A task item carries `data-task-state` with its mark (C2-A-060). Of the nine box characters, `x` and `X` both give `x`, the space gives no attribute, and `_`, `/`, `!`, `-`, `>` and `?` give themselves.

**C2-H-034** In a tight list a paragraph is written bare, without `<p>`, only when it is the first block of its item. Every other paragraph of the item gets `<p>` (C2-B-063).

**C2-H-035** In a loose list every paragraph of every item gets `<p>` (C2-B-064).

**C2-H-036** The renderer reads `list.spacing` (C2-A-059) and never derives tightness from blank lines or from the blocks of an item. A list with one item is always tight in a parsed tree (C2-B-062).

**C2-H-037** The bullet character adds nothing to the default output. Under `roundtrip` it is carried by `data-marker` (C2-H-112).

Example 5 (generated)

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
  <li><input type="checkbox" disabled aria-label="open"> open</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="done"> done</li>
  <li data-task-state="-"><input type="checkbox" disabled aria-label="dropped"> dropped</li>
  <li data-task-state="_"><input type="checkbox" disabled aria-label="kept"> kept</li>
  <li data-task-state="/"><input type="checkbox" disabled aria-label="half"> half</li>
  <li data-task-state="!"><input type="checkbox" disabled aria-label="urgent"> urgent</li>
  <li data-task-state="&gt;"><input type="checkbox" disabled aria-label="moved"> moved</li>
  <li data-task-state="?"><input type="checkbox" disabled aria-label="unsure"> unsure</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="Done"> Done</li>
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

## Description lists

**C2-H-038** A description list is `<dl>`, a term is `<dt>`, and a description is `<dd>`.

**C2-H-039** A term holds inline content and never a `<p>`.

**C2-H-040** A description with one block writes a paragraph bare. A description with several blocks gives every paragraph `<p>`, the first one included (C2-B-073, C2-B-077). The rule reads the blocks of the description. A description list has no `spacing` field.

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

**C2-H-051** With `rawHtml` off, a raw span with the format `html` is written as its escaped payload, with no element around it.

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

**C2-H-134** With `rawHtml` on, a raw HTML block whose payload has no line and one whose payload is one blank line both write one empty line. HTML does not show the difference that `value` keeps (C2-A-048).

## Tables

**C2-H-055** A table is `<table>` with `<thead>`, `<tbody>` and `<tfoot>` for its groups. Each group tag stands on its own line and each row is one line: `<tr>`, its cells, `</tr>`. An empty group is not written.

**C2-H-056** A header cell is `<th>` and a data cell is `<td>`. A header cell in the head carries `scope="col"`, and every header cell outside the head carries `scope="row"`.

**C2-H-057** A cell with a resolved alignment (C2-B-213) carries `style="text-align: VALUE;"`. Vertical alignment adds `vertical-align: VALUE;` after it, one space apart. A cell with no alignment carries no `style`. An authored `style` keeps its value and takes the declarations after it.

**C2-H-058** `rowspan` and `colspan` are written only for a count above 1. A cell that a span covers is not written.

**C2-H-059** `widths` gives a `<colgroup>` as in 0.1. C2-H-152 states it.

**Exception C2-H-060** A row span that crosses a group boundary cannot be written with separate groups. In a parsed tree only the boundary between body and foot can be crossed (C2-B-174). The table is then written with one `<tbody>` that holds every row, and cell kind, scope and alignment are still computed from the groups.

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

**C2-H-153** `aligns`, `widths`, `header-rows` and `footer-rows` on a table are read and not written as HTML attributes, also where a value is invalid or has no effect. `header-cols` on a pipe table or a delimited table is written as an ordinary attribute (C2-B-214).

## Captions and figures

**C2-H-062** A captioned image, code block, quote or math block is written as `<figure>` around the block and then `<figcaption>` with the caption.

**C2-H-063** The attribute line of a captioned block applies to the `<figure>`, its id included. The block inside carries only what it generates itself. In the tree these attributes are the `attrs` of the `figure` (C2-A-183).

**C2-H-064** A figure group is `<figure class="carve-figure-group">`. Each panel in it is `<figure class="carve-figure-panel">`, and the caption of the group is the last child of the group.

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

**C2-H-135** The label word of a caption selects its number sequence, as in 0.1 (C2-B-208, C2-H-149). `figure.kind` (C2-A-083) selects it only in a supplied tree whose caption has no label word.

**C2-H-149** Each sequence key (C2-B-208) has its own count, from 1, in document order. Each caption with a mark takes the next number of the sequence of its key. The label words are not a closed list: `Figure`, `Table`, `Listing` and `Equation` have no special meaning, the block under the caption does not select the sequence, and `Fig.`, `figure` and `Figure` count apart. The number is written in place of the mark as a decimal number, and the rest of the caption is written as it stands. A caption without a mark is written as it stands and takes no number.

**C2-H-150** The captions of footnote bodies take their numbers after every caption of the document body, in the order of the footnote numbers. A caption in an unused footnote definition takes none.

**C2-H-170** Captions and numbered equations of one key are counted in document order, a node before the nodes inside it: the caption of a table takes its number before an equation in a cell of that table.

**C2-H-151** In a supplied tree, a display `math` node that carries `numberPrefix` takes the next number of the sequence whose key is its `numberPrefix`, counted together with the captions of that key. The number is written after the math element as ` <span class="equation-number">PREFIX N</span>`. Inline math takes no number. A display math node inside a `figure` or `figure_group` whose caption has a mark takes no number of its own: the nearest such caption around it owns the number. `numberPrefix` has no source spelling, so a parsed tree holds no numbered equation, and `^ Equation #` numbers a caption.

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

## Comments, frontmatter and definitions

**C2-H-069** A comment renders nothing in every form: line, block and braced. The whitespace around a braced comment stays as written. A comment-only line inside a paragraph or another leaf takes one of the two line breaks around it with it: the break behind it is not written, or the break before it when the content ends with the comment. The tree keeps both breaks.

**C2-H-070** Frontmatter renders nothing.

**C2-H-071** A link definition and an abbreviation definition render nothing. A footnote definition renders only through the footnote section (C2-H-089).

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

**C2-H-133** An include directive that was not expanded is an `include` node (C2-A-181). It renders as a paragraph that holds the directive as text: `{{`, a space, the path, the section and the options in the order of C2-W-058, each after one space, a space and `}}`. It is reported with the code `include-unresolved`. 0.2.0 expands no include, so every directive renders this way.

**C2-H-171** When an unexpanded include is written, an option value that holds a space, a tab, `@` or `}` stands in double quotes, and every other value stands bare. The value is the one the tree holds, so `@cols:"a,,b"`, which is no list of names (C2-B-205), is written `@cols:a,,b`.

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

**C2-H-076** The names `samp`, `var`, `cite` and `dfn` are not core. Without their extension, `[x]{samp}` is a span with the attribute `samp=""`. An inline extension with no renderer is `<span class="ext-NAME">` around its content. The core never turns an extension name into an element name. In 0.2.0 an extension gives core nodes and `inline_extension` nodes. `block_extension` is not part of 0.2.0. An unknown optional extension renders through its fallback and is reported with the code `extension-fallback-rendered`.

**C2-H-077** A math block is a paragraph that holds nothing but one display math span. The fact is set when the paragraph closes (C2-B-158, C2-B-198) and is the mark `blockMath` (C2-A-184), as for a block image. It is written as `<p>` around the display form of C2-H-072, and it takes a caption (C2-H-062).

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

**C2-H-080** An image is `<img src="URL" alt="ALT">`, with `title` when it has one. `alt` is always written, also when it is empty. A supplied image with no `src` is written with `src=""`, and one with no `alt` with `alt=""`.

**C2-H-081** A link or an autolink inside link text is unwrapped: its content is written and its element is not (C2-A-111).

**C2-H-082** A destination that `urlPolicy` denies is written as the empty string, and the element stays: `<a href="">`. The denial is reported as the render loss `destination-denied`.

**C2-H-083** A link reference resolves against the link definitions, then against the headings (C2-I-081, C2-I-084). A reference that a heading resolves is `<a href="#ID">` with the id of that heading. The first matching heading in document order wins.

**Exception C2-H-084** An image reference never resolves against the headings (C2-I-083).

**C2-H-085** An unresolved reference renders its brackets and its label as literal text and its children as HTML: `[`, the rendered children, `]`, then `[key]` for the form `full` or `[]` for the form `collapsed`. For an image the output is `![`, the `alt` as text, `]` and the same label part. No source form is rebuilt for the children, and nothing is parsed again.

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

**C2-H-139** An attribute block that is attached to an unresolved reference is written after it as text, as one brace block in the fixed order: id, classes, language, keys.

**C2-H-141** The attributes of a link definition are merged into every link and image that resolves through it. The classes of the definition come first and the classes of the reference follow. An id and a key of the reference win over those of the definition.

## Footnotes

**C2-H-087** Footnotes are numbered from 1 in the order of their first reference in the document. A labeled footnote and an inline footnote share the one sequence. A later reference to the same label reuses its number. References in the body of the document are numbered first, in document order; references that stand inside a note are numbered after them, note by note in the order of the notes' numbers.

**C2-H-088** A footnote reference is `<a id="fnrefN" href="#fnN" role="doc-noteref"><sup>N</sup></a>`. The second and later references to one note have the ids `fnrefN-2`, `fnrefN-3`, and so on. An id the author wrote on the reference replaces the generated one, and the backlink of the note points to it.

**C2-H-089** The footnotes are written in one section: `<section role="doc-endnotes" aria-label="LABEL">`, then `<hr>`, then `<ol>` with one `<li id="fnN">` per note in number order. LABEL is the `endnotes` string of `labels`.

**C2-H-090** Every paragraph of a footnote body gets `<p>` (C2-B-086). The body of an inline footnote is one paragraph.

**C2-H-091** The backlinks are appended to the last paragraph of the note, or stand in a paragraph of their own when the note does not end with a paragraph. A note with one reference has one backlink, `<a href="#fnrefN" role="doc-backlink" aria-label="LABEL">↩</a>`. A note with several has one per reference, each with `<sup>K</sup>` after the glyph and `LABEL K` as its label, joined by one space.

**C2-H-092** A footnote definition that no reference uses is not written.

**C2-H-093** The section stands at the end of the document, after the last block. A top-level `::: footnotes` directive (C2-A-066) moves it to the place of that directive. A `::: footnotes` directive inside a container places nothing and renders as `<div class="footnotes">`. As in 0.1 (CARVE-P9-073).

**C2-H-094** With no numbered footnote in the document, no section is written.

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

## Cross-references and abbreviations

**C2-H-095** A cross-reference resolves against the ids of headings and of numbered captions, without case folding (C2-I-097).

**C2-H-096** A resolved cross-reference is `<a href="#ID">` around generated text. For a heading the text is the plain text of the heading. For a numbered caption it is the label word and the number, such as `Figure 1`. 0.2.0 renders this default text for every cross-reference: a `form` (C2-A-116) that an extension or a supplied tree set is kept in the tree and selects no other text in the core.

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

**C2-H-100** A mention is `<span class="mention"><strong>@NAME</strong></span>` and a tag is `<span class="tag"><strong>#NAME</strong></span>`. When `social` gives a URL for it, the outer element is `<a class="mention" href="URL">` or `<a class="tag" href="URL">`.

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

## State beyond the current block

A renderer that writes each block as soon as it is parsed needs the following state. Each clause names what has to be known before a byte of the affected element can be written.

**C2-H-102** *Definitions.* Link, footnote and abbreviation definitions stand anywhere at the top level, also after their uses. A streaming renderer buffers every leaf that holds a reference or, for abbreviations, every leaf, until the end of the document, unless the caller supplies the definitions in advance.

**C2-H-103** *Id collision counter.* The set of authored ids of the whole document is needed before the first generated id is final (C2-H-024). A streaming renderer buffers from the first heading without an authored id to the end of the document, or runs a first pass that collects the authored ids.

**C2-H-104** *Forward references.* A heading reference, a cross-reference and a caption number in a cross-reference can point at a block further down. They resolve only at the end of the document.

**C2-H-105** *Footnotes.* The number of a note is known at its first reference (C2-H-087), so a reference can be written at once when the definitions are known. The note bodies and their backlinks are buffered to the place of the section, and a `::: footnotes` div above the last reference has to wait for the end.

**C2-H-106** *Tightness.* Whether a list is loose is known only when the list closes (C2-B-191). A streaming renderer buffers each top-level list as a whole, because the first item's `<p>` depends on a blank line that may follow the last item but one.

**C2-H-107** *Captions.* A caption line follows its block (C2-B-146), and it decides whether a `<figure>` wraps the block and whether a table has a `<caption>` as its first child. A streaming renderer holds back each image, table, code block, quote, math block and figure group until the next line is read.

**C2-H-108** *Sections.* A section closes at the next heading of the same or a lower level number, or at the end. Its opening tag needs only the heading, so sections need a stack and no buffer.

**C2-H-109** *Description wrapping.* Whether the first paragraph of a description is bare is known only when the description closes (C2-H-040).

**C2-H-110** *Task lists and table groups.* The `task-list` class, the head of a table and the fallback of C2-H-060 are known when the list or the table closes.

**C2-H-111** A renderer may buffer more than these clauses require. Its output has to equal the output of a renderer that works from the finished tree. 0.2.0 defines no streaming renderer with weaker guarantees.

## Roundtrip carriers

**C2-H-112** With `roundtrip` on, the renderer adds attributes that carry tree facts HTML has no spelling for. The option adds these attributes and changes nothing else. It is off by default.

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
| `data-carve-autolink` | `<a>` | the link is an autolink | stays |
| `data-carve-footnote-label` | the reference `<a>`, the note `<li>` | the footnote key | stays |
| `data-carve-inline-footnote` | the note `<li>` | the note is an inline footnote | stays |
| `data-carve-raw` | `<span>` | a raw span and its format | stays |
| `data-carve-escaped` | `<span>` | one escaped character | goes: `escaped_text` is not a node type (C2-A-041) |
| `data-carve-abbreviations` | `<template>` | the abbreviation definitions, one per line | stays |
| `data-carve-col-widths` | `<table>` | the dash widths of a separator row | goes: the separator row is cut and `table.separatorWidths` is deleted |
| `data-carve-label` | `<pre>` | the label of a code fence | stays |
| `data-carve-tight` | `<ul>`, `<ol>` | the list is tight | stays; written on every tight list (C2-H-138) |
| `data-carve-xref` | `<a>` | the link is a cross-reference | stays |
| `data-carve-caption-number` | `<span>` | the caption number mark | stays |
| `data-carve-div` | `<div>` | a div with no other attribute | stays |
| `data-carve-line-block` | `<div>` | a line block | stays |
| `data-carve-substitution` | `<span>` | a substitution node | goes: a replacement is a `delete` and an `insert` (C2-A-097) |
| `data-carve-src` | none | reserved, never written | stays reserved |

Five carriers go: `data-char`, `data-carve-id-slot`, `data-carve-escaped`, `data-carve-col-widths` and `data-carve-substitution`.

**C2-H-115** The reserved names are the 17 names of this table that stay or are new. The set is a list, not a prefix: another `data-carve-` name is an ordinary authored attribute.

**C2-H-116** With `roundtrip` on, an authored attribute with a reserved name is dropped on every element and reported as the render loss `carrier-attribute-dropped`. With it off, the attribute passes through.

**C2-H-117** A presence carrier is written as the bare attribute name, with no value. A reader takes the name as presence and does not compare a value.

**C2-H-118** `data-task-state`, `data-delim` and the `task-list` class are not carriers. Every render writes them (C2-H-031 to C2-H-033).

**C2-H-119** The quote form, the form of a hard-break block, the numbering form of an ordered list, continuation rows, the table form and the verbatim text of a reference are sidecar facts (C2-L-016 to C2-L-023) and have no carrier. Source that is imported back from HTML is written with the defaults of C2-L-030 to C2-L-041.

**C2-H-120** How an importer reads the carriers (CARVE-P10-017, CARVE-P10-021) is part of the importer, which is not in 0.2.0. The names of C2-H-115 are fixed now so that 0.2.0 output can be read back later.

The 0.1 engine writes three of these carriers with the value `1`. The expected output has the bare names of C2-H-117.

Example 23 (unverified)

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

**C2-H-140** Under `roundtrip` a resolved reference written in the collapsed form carries the presence carrier `data-carve-ref-collapsed` beside `data-carve-ref`. A reference in the full form carries `data-carve-ref` alone.

## Options

**C2-H-121** Fourteen of the 19 options affect rendering. No option of this section changes the tree, except that `headingIds` controls a resolution result.

**C2-H-122** `mode` is `interactive`, the default, or `static`. Static output is self-contained: an extension renders through its static path, and a diagram or an equation without a build-time renderer falls back to its source as a code block. An unknown value is refused.

**C2-H-168** In static mode with no build-time renderer an inline math node is written as `<code class="language-math">` around its source, with the attributes of the node, and a display math paragraph (C2-H-077) as `<pre><code class="language-math">` around its source, with the attributes of the paragraph on `<pre>`. A `renderers` option that is not empty is refused in 0.2.0, which has no build-time renderer to call.

**C2-H-123** `renderers` maps an extension name to a build-time renderer and is read only in static mode.

**C2-H-124** `symbols` maps a symbol name to its output (C2-H-101). The values are trusted and written verbatim.

**C2-H-125** `labels` replaces the strings the engine writes itself, such as the label of the footnote section and of a backlink. A label is text and is escaped where it is written. A key left out keeps its English default.

**C2-H-126** `social` holds the URL templates and the resolvers for mentions and tags (C2-H-100). Without it, both render as inert spans.

**C2-H-127** `sourceLines` adds `data-source-line` (C2-H-016). Default off. `sections` turns section wrapping on or off (C2-H-026). Default on. `smartTypography` selects glyph or source for smart punctuation (C2-H-078). Default on. `roundtrip` adds the carriers (C2-H-112). Default off. `rawHtml` passes raw HTML through (C2-H-053). Default off.

**C2-H-128** `urlPolicy` sets which URL schemes pass on `href`, `src` and every other URL sink: a deny list, whose default is the 0.1 list of script schemes and protocol-handler schemes, or an allow list. The option has no off value. The filter also removes blocked attribute names, event handlers among them, and blanks a `style` value that holds a URL function, as in 0.1 (PART 9 section 25). The list of blocked attribute names is a data file in `resources/`. C2-H-159 to C2-H-162 state the test and the filter.

**C2-H-129** `profile` restricts the features a render accepts: `full`, `article`, `comment` or `minimal`, as in 0.1. C2-H-163 and C2-H-164 state what each one accepts. A construct outside the profile renders in its degraded form and is reported. The report has the code `profile-construct-degraded`.

**C2-H-130** `strictLosses` turns every render-loss entry into an error (C2-A-174): the render returns no output.

**C2-H-131** `headingIds` controls generated heading ids (C2-H-022). Its values are `off`, `keep-case`, `lower` and `ascii`, and the default is `keep-case`. With `off` no id is generated, and an authored id is still written.

**C2-H-132** A render loss is an entry of the diagnostics record with the channel for render losses (C2-A-173). The 0.1 loss codes that apply to HTML stay: `raw-format-dropped`, `destination-denied`, `carrier-attribute-dropped`. The catalog lists every code of the channel (C2-W-113). `destination-denied` has the severity error.

**C2-H-159** The URL sinks are the `href` of a link and of an autolink, the `src` of an image, and a URL that a `social` template gives (C2-H-126). A destination is tested on a copy: first every character of the list `probe_removes` of `data/url-policy.json` is removed from it, anywhere in the value, so `java` U+0001 `script:` tests as `javascript:`. U+FFFD is on the list because a U+0000 of the source is read as U+FFFD (C2-B-218) before the test. When the rest starts with an ASCII letter, then ASCII letters, digits, `+`, `-` and `.`, and then a colon, that run is the scheme, compared without ASCII case. A destination with no scheme, such as a relative path or a fragment, passes under a deny list and under an allow list. The `default` of `urlPolicy` in `data/options.json` is the default deny list.

**C2-H-160** Under a deny list a destination fails when its scheme is on the list, and under an allow list when it is not. A failed destination is written as the empty value, `href=""` or `src=""`, and is reported with `destination-denied` once per destination. The link text, the alt text and the visible text of an autolink stay. An authored `href` on a link and an authored `src` on an image are not written: the destination stands, so an attribute block cannot bring back a failed one.

**C2-H-161** On every element, an extension's included, an attribute whose name is in the list `dropped_attributes` of `data/url-policy.json`, compared without ASCII case, is not written: every name that starts with `on`, `srcdoc` and `formaction`. An authored value is written empty when its text before the first colon, with the characters of `probe_removes` removed and in ASCII lower case, is a scheme of the default deny list, whatever `urlPolicy` holds: `{title="Shell: bash"}` gives `title=""`. An attribute of the list `url_list_attributes` is split at its separators, and the whole value is written empty when any token fails this test or when the unsplit value fails it: `ping="java script:x"` gives `ping=""`. An authored value is one written in an attribute block or copied by an extension onto its element. `id` is not tested, and neither is a value the renderer takes from text: a link title, alt text and the label of a task box stay as written.

**C2-H-162** An authored `style` value is written empty when it holds one of the texts of `style_patterns` in `data/url-policy.json`, tested after its CSS escapes are decoded, its whitespace is removed and its ASCII letters are lowered. A backslash and one to six hexadecimal digits decode to that code point and take one whitespace character after them; a backslash and a line break decode to nothing; a backslash and any other character decode to that character. The value that passes is written as the author spelled it.

**C2-H-172** The bidirectional controls U+202A to U+202E and U+2066 to U+2069 are never written between tags: not in text, not in code, and not in text the renderer makes, as a title paragraph, a label paragraph, the text of a cross-reference (C2-H-096), static math (C2-H-168) and a degraded form (C2-H-165). They can make source read in another order than it runs. They stay in the tree and in the canonical form, and an attribute value keeps them; the scheme test removes them from its copy (C2-H-159, `probe_removes`). Raw content that is passed through unescaped is not filtered. (carried over from 0.1)

**C2-H-163** A profile decides for each node by its type and its axis, block or inline. A type on the deny list of its axis is outside the profile. Otherwise, when the axis has an allow list, a type is inside exactly when the list names it. Otherwise it is inside. No other rule excludes a type, an unknown one included. The four profiles are the rows of `profiles` in `data/url-policy.json`: `full` accepts everything, `article` everything but raw content, and `comment` and `minimal` the listed types. `comment` writes `rel="nofollow ugc"` on every link. A node that stands deeper than `max_nesting` levels below the document, each block and each inline level counted, is outside the profile like a node of a refused type. An input longer than `max_length` UTF-8 bytes is refused before it is parsed: the render returns an error and no output.

**C2-H-165** The degraded form of a node outside the profile is its plain text. An inline node is written as the plain text of its children; an image as `[img: ALT]`; a no-break space as U+00A0, a hard break and a soft break as one space, a smart punctuation node as its glyph; a footnote reference and every other inline node with no children as its source text. An include is written as the source text of its directive. A block becomes one paragraph of its plain text behind the mark of its kind: one `#` for each level and a space for a heading, whatever marker the source used, `> ` for a quote, `- ` for each item of a list, `---` for a thematic break, one line per table row with ` | ` between the cells and a hard break between the rows, the value for a code or raw block, and the title and the blocks joined by single spaces for a div. Any other block that holds blocks is written as those blocks in their degraded forms, in order, and any other leaf block as one paragraph of its plain text: a description list gives one paragraph for each term and the degraded blocks of each description. A node that leaves no text is dropped. A degraded node is reported once (C2-H-129), and the nodes inside it are not reported again.

**C2-H-166** For `max_nesting` the children of the document stand at level 0, and each block level and each inline level below adds one. A node at a level above the bound is outside the profile; a node at the bound stays, and its children are degraded.

**C2-H-167** A link carries at most one `rel` attribute, and none when neither the author nor the profile gives a word. It stands behind `href` and `title` and before the id and the classes, and holds the authored words in their order and then the words of the profile that are not among them: `{rel=me}` under `comment` gives `rel="me nofollow ugc"`. The authored value passes C2-H-161 first, so a value that test empties gives no authored word. An autolink is a link for the profiles: it is allowed where `link` is and takes the same `rel`.

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

## The option list

**C2-H-137** These are the 19 options, and there are no others. An application may spell a name by the convention of its language. An option that an engine does not offer is refused, not ignored.

| Option | Kind | Type | Default | Defined in |
|---|---|---|---|---|
| `extensions` | parse | list of extensions | empty: the core alone | the extension API; the only option that changes parsing |
| `includes` | parse | include root or resolver, with its limits | none: no directive is expanded (C2-H-133) | the Includes document |
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
| `rawHtml` | render | boolean | off | C2-H-127 |
| `urlPolicy` | render | deny list or allow list of URL schemes | the 0.1 deny list, listed in `data/options.json` | C2-H-128 |
| `profile` | render | `full`, `article`, `comment` or `minimal` | `full` | C2-H-129 |
| `strictLosses` | render | boolean | off | C2-H-130 |
| `alignTables` | format | boolean | off | C2-W-068 |
| `rules` | lint | map from rule id to on or off | the default state of each rule in the catalog | C2-W-109 |
| `platforms` | lint | list of platform names | empty | C2-W-109 |

Fourteen are render options, counting `headingIds`, which switches a resolution result that the renderer reads. Two are parse options, one is a format option and two are lint options.

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
| CARVE-P10-017, 021 | import of carriers | not ported: importers are not in 0.2.0 (C2-H-120) |
| CARVE-P10-018 | one option for the carriers of every target | C2-H-112; the Markdown target is not in 0.2.0 |
| CARVE-P10-019 | an authored reserved name is dropped | C2-H-116 |
| CARVE-P10-020 | retired in 0.1 | none |

The five attribute ranks of PART 10 section 1 are replaced by the fixed order of C2-H-009.

## Open

One point is open.

1. **The gate for this document.** The plan asks for one and states none. A candidate: every example of this document and of the Syntax chapters passes in phase 4, and no rendered byte depends on a sidecar.

## Counts

| Section | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Output form | 8 | 2 | 1 | 0 |
| Attributes | 9 | 1 | 1 | 1 |
| Paragraphs, headings and sections | 17 | 1 | 3 | 0 |
| Lists | 9 | 0 | 2 | 2 |
| Description lists | 3 | 0 | 1 | 0 |
| Quotes, divs and their sigil forms | 13 | 0 | 3 | 0 |
| Code and raw content | 9 | 0 | 1 | 0 |
| Tables | 9 | 1 | 1 | 0 |
| Captions and figures | 12 | 0 | 4 | 0 |
| Comments, frontmatter and definitions | 5 | 0 | 1 | 0 |
| Inline elements | 8 | 0 | 1 | 0 |
| Links, images and references | 10 | 1 | 1 | 2 |
| Footnotes | 8 | 0 | 1 | 0 |
| Cross-references and abbreviations | 5 | 1 | 1 | 0 |
| Mentions, tags and symbols | 2 | 0 | 1 | 0 |
| State beyond the current block | 10 | 0 | 0 | 0 |
| Roundtrip carriers | 11 | 0 | 0 | 1 |
| Options | 23 | 0 | 3 | 0 |
| The option list | 1 | 0 | 0 | 0 |
| **Total** | **172** | **7** | **26** | **6** |

The document has 172 clauses, 7 of them marked with the word "Exception", and 32 examples, 26 generated and 6 unverified. The clause count includes the exceptions. Clauses added after the first draft carry the next free number and stand at the end of their section, so the ids are not in document order everywhere.
