# Carve 0.2 Syntax: block structure

Status: first draft on `next2`. Nothing in this chapter is implemented yet.

This chapter defines how the lines of a Carve document form blocks. Inline content, HTML rendering, the tree and the writer have their own documents. Where a clause states rendered output, it does so because the output is the only visible sign of a block decision.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-B-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused.
- A clause that starts with the word "Exception" is a carve-out from a more general clause, or a named interaction between two constructs. Exceptions are counted at the end of the chapter.
- `(pending confirmation)` marks a statement that is recommended and not yet confirmed.
- Each example is a `compare` container that holds the Carve input and the expected HTML. The line above it gives its number and its status. *Generated* means the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. *Unverified* means the HTML was written by hand from the clauses and has not been run through any engine.
- "Lint" and "diagnostic" name reports. They never change the blocks.

## Preliminaries

Terms:

- A *line* is a run of characters up to a line ending. A *blank line* holds only spaces and tabs.
- A *container* is a block that holds other blocks: a quote, a list item, a description, a footnote body, a div. A *leaf* holds text: a paragraph, a heading, a term, a caption, a code block, a table row.
- The *container stack* is the list of containers open at a line, outermost first.
- A *marker* is a list marker, a description mark (`:`), a term mark (`::`) or a footnote definition marker. The *marker column* is the column of its first character. The *content column* is the column of the first content character on the marker line.
- A *prefix* is what a line carries to stay inside an open container: the quote mark for a quote, indent for an item, a description or a footnote body.
- The *indent* of a line is the column of its first character that is not a space or a tab.

**C2-B-001** The role of a line depends only on that line and the container stack.

**Exception C2-B-002** A pending attribute line (C2-B-065) is the one line whose role waits for the next line.

**C2-B-003** Columns count code points from 0, starting after the quote marks of the open quotes.

**C2-B-004** A leading tab advances the column to the next multiple of 4, for counting only: the bytes are kept as written, also in code.

**C2-B-005** Tab stops count from the start of the line, not from a container's content column. (pending confirmation)

**C2-B-006** Only a space separates a marker or a quote mark from its content: a marker followed by a tab is text.

**C2-B-007** Indent stripping removes whole characters, so a tab that straddles the strip column is kept.

**C2-B-008** Prefixes are read outside-in, in the order the containers were opened: for a quote inside a list item the quote mark sits past the item's marker.

**C2-B-009** A blank line belongs to no container: the next line that is not blank decides which containers stay open, so an indented line belongs to its item after any number of blank lines.

The second paragraph below starts with a tab, which counts as indent to column 4.

Example 1 (unverified)

::: compare

```carve
- a

	b
```

```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
```

:::

Example 2 (generated)

::: compare

```carve
-	a
```

```html
<p>-	a</p>
```

:::

The quote mark of a quote inside an item stands past the item's marker.

Example 3 (generated)

::: compare

```carve
- > a
  > b
```

```html
<ul>
  <li>
    <blockquote><p>a
b</p></blockquote>
  </li>
</ul>
```

:::

Example 4 (unverified)

::: compare

```carve
- a



  b
```

```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
```

:::

## Paragraphs and interrupters

**C2-B-010** A line that opens no other block opens a paragraph.

**C2-B-011** An open paragraph takes every line that is not blank, whatever its indent or prefix; such a line is a *lazy line*.

**C2-B-012** A paragraph closes at a blank line, at an interrupter or with its container.

An *interrupter* is a line that ends an open paragraph without a blank line. There are five.

**C2-B-013** Interrupter (a): a fence line, which is a run of three or more backticks, tildes, colons or percent signs that opens or closes a fence, a div or a comment block (C2-B-074).

**C2-B-014** Interrupter (b): a list marker with content at an open list's column, or indented past the marker of the item, description or footnote body the paragraph sits in, also when no list is open there yet.

**C2-B-015** Interrupter (c): a description mark or a term mark with content at an open description list's column, or a definition line at column 0 while a definition is open.

**C2-B-016** Interrupter (d): a caption line (C2-B-094), only when the paragraph so far holds nothing but an image.

**C2-B-017** Interrupter (e): a table row (C2-B-105).

Every other line is a lazy line: a heading, a quote, a thematic break, an attribute line, a definition, an include directive, a `%%` comment, and a list marker where no list is open.

**C2-B-018** Interrupters (b) and (c) count only on a line that carries the quote mark of every quote the paragraph sits in.

**Exception C2-B-019** A list marker line that carries an item's indent and no quote mark, while the paragraph sits in a quote inside that item, closes the quote and opens a nested list in the item.

**Exception C2-B-020** A description list is not a list for interrupter (b): a list marker at its column, directly after term or description text, is a lazy line, with lint.

**Exception C2-B-021** A term mark never opens a nested description list without a blank line: directly after paragraph text inside an item it is a lazy line.

Example 5 (generated)

::: compare

```carve
Some text
= not a heading
- not a list
```

```html
<p>Some text
= not a heading
- not a list</p>
```

:::

Example 6 (unverified)

::: compare

```carve
Some text
# not a heading
> not a quote
***
{.x}
```

```html
<p>Some text
# not a heading
&gt; not a quote
***
{.x}</p>
```

:::

Lazy lines keep their paragraph at any indent.

Example 7 (generated)

::: compare

```carve
- a
  b
 c
d
```

```html
<ul>
  <li>a
b
c
d</li>
</ul>
```

:::

Example 8 (generated)

::: compare

````carve
text
```
code
```
````

```html
<p>text</p>
<pre><code>code
</code></pre>
```

:::

Example 9 (generated)

::: compare

```carve
text
| a | b |
```

```html
<p>text</p>
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

The marker on line 2 does not carry the quote mark, so it is a lazy line (C2-B-018).

Example 10 (unverified)

::: compare

```carve
> - a
- b
```

```html
<blockquote>
  <ul>
    <li>a
- b</li>
  </ul>
</blockquote>
```

:::

Example 11 (generated)

::: compare

```carve
- > q
  - child
```

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
```

:::

## Container ownership and stripping

**C2-B-022** With no paragraph open, a line belongs to the innermost open item, description or footnote body whose marker it is indented past, measured from the marker column, and to a quote when it carries the quote mark.

**C2-B-023** A container that does not own the line closes, with every container inside it.

**C2-B-024** The content of an item, a description or a footnote body is stripped by at most its content column.

**C2-B-025** The first line of a nested block sets that block's base column.

**C2-B-026** The content of a fence is stripped by at most the indent of its opener.

Right-aligned ordered markers are not supported: a marker left of the list's column, directly after item text, is a lazy line. Lint reports it.

Example 12 (unverified)

::: compare

```carve
- a

  b

c
```

```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
<p>c</p>
```

:::

One column past the marker column is enough.

Example 13 (unverified)

::: compare

```carve
- a

 b
```

```html
<ul>
  <li>a
    <p>b</p>
  </li>
</ul>
```

:::

Example 14 (unverified)

::: compare

```carve
 9. a
10. b
```

```html
<ol start="9">
  <li>a
10. b</li>
</ol>
```

:::

Example 15 (generated)

::: compare

````carve
  ```
  a
    b
 c
  ```
````

```html
<pre><code>a
  b
c
</code></pre>
```

:::

## Block quotes

**C2-B-027** The quote mark is `>` followed by a space or by the end of the line; `>a` is text.

**C2-B-028** A quote owns a line only when the line carries its mark or is a lazy line, so a blank line without the mark ends the quote, and two quotes separated by a blank line are two quotes.

Example 16 (generated)

::: compare

```carve
> a
b
```

```html
<blockquote><p>a
b</p></blockquote>
```

:::

Example 17 (generated)

::: compare

```carve
> a
>
> b
```

```html
<blockquote>
  <p>a</p>
  <p>b</p>
</blockquote>
```

:::

Example 18 (generated)

::: compare

```carve
> a

> b
```

```html
<blockquote><p>a</p></blockquote>
<blockquote><p>b</p></blockquote>
```

:::

Example 19 (generated)

::: compare

```carve
> > a
```

```html
<blockquote>
  <blockquote><p>a</p></blockquote>
</blockquote>
```

:::

Example 20 (generated)

::: compare

```carve
>a
```

```html
<p>&gt;a</p>
```

:::

## Bullet lists

**C2-B-029** Every marker needs one space and at least one further character on its line; a bare marker and a marker without its space are text.

**C2-B-030** A bullet marker is `-` or `*`.

**C2-B-031** The bullet character is part of the list's kind, so an item with the other character starts another list (C2-B-039).

Example 21 (generated)

::: compare

```carve
* a
* b
```

```html
<ul>
  <li>a</li>
  <li>b</li>
</ul>
```

:::

Example 22 (generated)

::: compare

```carve
- a
* b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::

Example 23 (generated)

::: compare

```carve
-a

-

1.

*
```

```html
<p>-a</p>
<p>-</p>
<p>1.</p>
<p>*</p>
```

:::

## Ordered lists

**C2-B-032** An ordered marker is a number of one to nine digits, a letter, a roman numeral or nothing, followed by `.` or `)`; a run of ten or more digits is text.

**C2-B-033** The kind of an ordered list is its numbering style and its delimiter, and the first marker alone fixes the style: a lone `i` or `I` is roman, any other single letter is alphabetic, and two or more roman letters are roman.

**C2-B-034** In a roman list a single roman letter is a sibling.

**Exception C2-B-035** A letter marker or a roman marker with a dot needs two spaces before its content.

**C2-B-036** The list starts at the value of its first marker, and the bare dot numbers automatically.

A list meant as alphabetic that starts at `i`, and a list meant as roman that starts at `v`, `x`, `l`, `c`, `d` or `m`, split into two lists at the second item. Lint reports both. The `start` attribute keeps its 0.1 definition.

Example 24 (generated)

::: compare

```carve
. a
. b
```

```html
<ol>
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 25 (generated)

::: compare

```carve
3. a
4. b
```

```html
<ol start="3">
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 26 (generated)

::: compare

```carve
i.  a
ii.  b
```

```html
<ol type="i">
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 27 (generated)

::: compare

```carve
i. a
```

```html
<p>i. a</p>
```

:::

Example 28 (generated)

::: compare

```carve
1. a
2) b
```

```html
<ol>
  <li>a</li>
</ol>
<ol start="2" data-delim=")">
  <li>b</li>
</ol>
```

:::

Example 29 (unverified)

::: compare

```carve
1234567890. a
```

```html
<p>1234567890. a</p>
```

:::

## Task items

**C2-B-037** A task box is `[`, one of the nine characters space, `x`, `X`, `_`, `/`, `!`, `-`, `>` and `?`, and `]`, directly after a bullet's space and followed by one space and at least one further character.

**C2-B-038** In every other case the brackets are inline content: `- [ ]` with nothing after it is a plain item with that text, and an ordered marker and a description mark take no box.

Task items and plain items do not share a list (C2-B-039). `X` is read as `x`.

Example 30 (generated)

::: compare

```carve
- [ ] a
- [x] b
- [X] c
- [_] d
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a"> a</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="b"> b</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="c"> c</li>
  <li data-task-state="_"><input type="checkbox" disabled aria-label="d"> d</li>
</ul>
```

:::

Example 31 (generated)

::: compare

```carve
- [ ]
```

```html
<ul>
  <li>[ ]</li>
</ul>
```

:::

Example 32 (generated)

::: compare

```carve
1. [x] a
```

```html
<ol>
  <li>[x] a</li>
</ol>
```

:::

Example 33 (generated)

::: compare

```carve
- [ ] a
- b
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="a"> a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::

## Siblings, adjacency and the three-blank-line boundary

**C2-B-039** A list marker at an open list's column is a sibling when it matches the list in bullet character, or in ordered style and delimiter, and in being a task item or not.

**C2-B-040** A list marker at an open list's column that does not match closes that list and opens a new one.

**C2-B-041** One or two blank lines do not end a bullet list, an ordered list or a description list.

**C2-B-042** Three or more blank lines before a marker at the list's column end the list, and that marker starts a new one.

**C2-B-043** Two lists of the same kind in one container, with fewer than three blank lines between them, are one list.

**Exception C2-B-044** A marker between the columns of two open lists joins the deeper list, with lint.

Example 34 (generated)

::: compare

```carve
- a


- b
```

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

:::

Example 35 (generated)

::: compare

```carve
- a



- b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::

Example 36 (generated)

::: compare

```carve
- a
1. b
```

```html
<ul>
  <li>a</li>
</ul>
<ol>
  <li>b</li>
</ol>
```

:::

Example 37 (generated)

::: compare

```carve
- a
    - b
  - c
```

```html
<ul>
  <li>a
    <ul>
      <li>b</li>
      <li>c</li>
    </ul>
  </li>
</ul>
```

:::

## Nested lists and the marker line

**C2-B-045** A list marker with content, indented past the marker of an item, a description or a footnote body, opens a nested list there without a blank line; an ordered child may start at any number.

**C2-B-046** An item may start with any block: the block opener stands directly after the marker, on the marker line.

**C2-B-047** A marker line that holds another marker with content has a nested list as the item's first block; `- -` is an item with the text `-`.

**C2-B-048** A line that starts with `+` is text unless it is a table continuation row (C2-B-113).

A second block of an item stands after a blank line, indented past the marker (C2-B-022). A bare marker is text (C2-B-029), so the empty item is spelled with a comment (C2-B-088). A spaced run such as `- - -` reads as nested markers that end in a lone hyphen; lint names the 0.1 meaning.

Example 38 (generated)

::: compare

```carve
- item text
  - child
  3. also a child list
```

```html
<ul>
  <li>item text
    <ul>
      <li>child</li>
    </ul>
    <ol start="3">
      <li>also a child list</li>
    </ol>
  </li>
</ul>
```

:::

Example 39 (generated)

::: compare

```carve
- > quote in the item

  second block of the item
```

```html
<ul>
  <li>
    <blockquote><p>quote in the item</p></blockquote>
    <p>second block of the item</p>
  </li>
</ul>
```

:::

Example 40 (generated)

::: compare

```carve
- - a
```

```html
<ul>
  <li>
    <ul>
      <li>a</li>
    </ul>
  </li>
</ul>
```

:::

Line 2 is a bare marker and therefore a lazy line.

Example 41 (generated)

::: compare

```carve
- a
-
- c
```

```html
<ul>
  <li>a
-</li>
  <li>c</li>
</ul>
```

:::

Example 42 (unverified)

::: compare

```carve
- - -
```

```html
<ul>
  <li>
    <ul>
      <li>-</li>
    </ul>
  </li>
</ul>
```

:::

Example 43 (generated)

::: compare

```carve
+ a
```

```html
<p>+ a</p>
```

:::

## Tightness

**C2-B-049** A list is loose only when a blank line stands between two of its items; a blank line counts for the list whose sibling follows it, and a list with one item is tight.

**C2-B-050** In a tight list a paragraph is rendered bare only when it is the item's first block; every other paragraph of the item gets `<p>`.

**C2-B-051** In a loose list every paragraph of every item gets `<p>`.

There is no `{loose}` attribute.

The outer list is loose, the inner one tight.

Example 44 (generated)

::: compare

```carve
- a
  - b

- c
```

```html
<ul>
  <li><p>a</p>
    <ul>
      <li>b</li>
    </ul>
  </li>
  <li><p>c</p></li>
</ul>
```

:::

The blank line stands inside the first item, not between two items.

Example 45 (unverified)

::: compare

```carve
- a

  b
- c
```

```html
<ul>
  <li>a
    <p>b</p>
  </li>
  <li>c</li>
</ul>
```

:::

Example 46 (unverified)

::: compare

````carve
- one
- two

  ```
  code
  ```
````

```html
<ul>
  <li>one</li>
  <li>two
    <pre><code>code
</code></pre>
  </li>
</ul>
```

:::

Neither item starts with a paragraph, so no paragraph is bare.

Example 47 (generated)

::: compare

````carve
- > q

  p
- ```
  code
  ```
  p2
````

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
    <p>p</p>
  </li>
  <li>
    <pre><code>code
</code></pre>
    <p>p2</p>
  </li>
</ul>
```

:::

## Description lists

**C2-B-052** A term line (`::`) and a description line (`:`) at the list's column form a description list; an entry with terms only is valid, and a description line with no term above it is text.

**C2-B-053** A term is one inline leaf: its text continues like paragraph text until a description line or a term line at the list's column, and it takes no block opener.

**C2-B-054** A term owns no lines: after a blank line, a line that is not a description line or a term line at the list's column closes the list, whatever its indent.

**C2-B-055** A description may start with any block on its marker line, and its further blocks are indented past its mark.

**C2-B-056** A description with one block has a bare paragraph; in a description with several blocks every paragraph gets `<p>`.

Entries continue across one or two blank lines (C2-B-041). A nested description list starts on a description's marker line, or after a blank line, indented past the mark.

One entry with two descriptions:

Example 48 (unverified)

::: compare

```carve
:: term
more term text
: first description

: second description
```

```html
<dl>
  <dt>term
more term text</dt>
  <dd>first description</dd>
  <dd>second description</dd>
</dl>
```

:::

Example 49 (unverified)

::: compare

```carve
:: term
   indented line
: desc
```

```html
<dl>
  <dt>term
indented line</dt>
  <dd>desc</dd>
</dl>
```

:::

Example 50 (generated)

::: compare

```carve
:: t
:: u
: d
```

```html
<dl>
  <dt>t</dt>
  <dt>u</dt>
  <dd>d</dd>
</dl>
```

:::

Example 51 (generated)

::: compare

```carve
: x
```

```html
<p>: x</p>
```

:::

Example 52 (generated)

::: compare

```carve
:: t
: > quote
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>quote</p></blockquote>
  </dd>
</dl>
```

:::

Example 53 (generated)

::: compare

```carve
:: t
: d

  second paragraph
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <p>second paragraph</p>
  </dd>
</dl>
```

:::

Example 54 (generated)

::: compare

```carve
:: t
: d

not indented
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>not indented</p>
```

:::

The list marker on line 3 is a lazy line (C2-B-020).

Example 55 (unverified)

::: compare

```carve
:: t
: d
- x
```

```html
<dl>
  <dt>t</dt>
  <dd>d
- x</dd>
</dl>
```

:::

Lines 2 and 3 are lazy lines (C2-B-021).

Example 56 (unverified)

::: compare

```carve
- a
  :: term
  : def
```

```html
<ul>
  <li>a
:: term
: def</li>
</ul>
```

:::

## Definitions

A *definition* is a footnote definition, a link definition or an abbreviation definition.

**C2-B-057** A definition stands at column 0 outside every container; a definition-shaped line inside a container is text, with lint.

**C2-B-058** A footnote definition is `[^label]:`, a space and content on the same line; its body is that content and the blocks indented past its marker.

**C2-B-059** A link definition is one line: `[label]:`, a space, a URL without spaces, which may be empty, and an optional quoted title.

**C2-B-060** An abbreviation definition is one line: `*[label]:` with a label without spaces, a space, and a plain-text expansion that is not empty.

**C2-B-061** For a duplicate label the first definition wins, with a warning; references resolve after block parsing.

**C2-B-062** Every paragraph of a footnote body gets `<p>`.

A definition line directly after a paragraph line is a lazy line, with lint, unless it is a sibling of an open definition (C2-B-015). A definition takes an attribute line (C2-B-068). Anything after the URL or the title of a link definition makes the line text.

Example 57 (generated)

::: compare

```carve
Text[^n] here.

[^n]: The note.
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> here.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>The note.<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Example 58 (generated)

::: compare

```carve
Text[^n].

[^n]: note
  - one
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ul>
        <li>one</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Line 4 is a sibling of the open definition and ends its paragraph.

Example 59 (generated)

::: compare

```carve
One[^a] two[^b].

[^a]: first
[^b]: second
```

```html
<p>One<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a> two<a id="fnref2" href="#fn2" role="doc-noteref"><sup>2</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>first<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
    <li id="fn2">
      <p>second<a href="#fnref2" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

Example 60 (generated)

::: compare

```carve
[^a]:
  body
```

```html
<p>[^a]:
body</p>
```

:::

Example 61 (generated)

::: compare

```carve
*[HTML]: Hyper Text Markup Language

HTML is plain.
```

```html
<p><abbr title="Hyper Text Markup Language">HTML</abbr> is plain.</p>
```

:::

Example 62 (unverified)

::: compare

```carve
[l]: /one
[l]: /two

[x][l]
```

```html
<p><a href="/one">x</a></p>
```

:::

Example 63 (unverified)

::: compare

```carve
text
[a]: /u

[x][a]
```

```html
<p>text
[a]: /u</p>
<p>[x][a]</p>
```

:::

Example 64 (unverified)

::: compare

```carve
- [a]: /u

[x][a]
```

```html
<ul>
  <li>[a]: /u</li>
</ul>
<p>[x][a]</p>
```

:::

## Attribute lines

**C2-B-063** An attribute line is one or more glued brace blocks `{...}`, alone on its line.

**C2-B-064** An attribute line applies to the block that starts on the next line and is owned by the same container; there is no column test.

**C2-B-065** An attribute line is held pending until the next line: a block takes it, and otherwise it becomes a closed one-line paragraph before the next line is classified.

**C2-B-066** Glued brace blocks merge, and consecutive attribute lines merge.

**C2-B-067** Glued attribute blocks after an inline host merge in the same way. (pending confirmation)

**C2-B-068** Every block takes an attribute line, a definition and a `%%%` comment block included.

**Exception C2-B-069** A caption takes no attribute line.

**Exception C2-B-070** An attribute line that its container does not own closes that container like any other line, and two lists with an attribute line between them are not adjacent (C2-B-043).

**C2-B-071** The order inside a brace block is fixed in the tree and the output: the id, then the classes, then the keys, classes and keys each as written.

**C2-B-072** A key named `id` or `class`, in any ASCII letter case, folds into the id or the classes at parse time, and the last id written wins. (pending confirmation)

**C2-B-073** A brace block on a marker line closes on that line; the attributes of an item or a cell abut the marker, as in `-{.i} b`.

Directly after a paragraph line an attribute line is a lazy line, with lint. A blank line between an attribute line and a block leaves the attribute line without a block. An attribute block after an admonition name or after a fence language is an error diagnostic; the block still opens. The attributes of a link definition are merged into every link that uses it, and the link's own values win.

Example 65 (generated)

::: compare

```carve
{.x}
para
```

```html
<p class="x">para</p>
```

:::

Example 66 (generated)

::: compare

```carve
{#a}{.b}
para
```

```html
<p id="a" class="b">para</p>
```

:::

Example 67 (generated)

::: compare

```carve
{.a}
{.b}
para
```

```html
<p class="a b">para</p>
```

:::

Two lists, with the class on the second:

Example 68 (generated)

::: compare

```carve
- a

{.x}
- b
```

```html
<ul>
  <li>a</li>
</ul>
<ul class="x">
  <li>b</li>
</ul>
```

:::

Example 69 (generated)

::: compare

```carve
-{.i} b
```

```html
<ul>
  <li class="i">b</li>
</ul>
```

:::

Example 70 (unverified)

::: compare

```carve
text
{.x}
```

```html
<p>text
{.x}</p>
```

:::

The attribute line belongs to the item and finds no block there, so it becomes a paragraph of the item before line 4 is read.

Example 71 (unverified)

::: compare

```carve
- a

  {.x}
b
```

```html
<ul>
  <li>a
    <p>{.x}</p>
  </li>
</ul>
<p>b</p>
```

:::

Example 72 (unverified)

::: compare

```carve
{.x}

para
```

```html
<p>{.x}</p>
<p>para</p>
```

:::

The comment block takes the attribute line and renders nothing.

Example 73 (unverified)

::: compare

```carve
{.c}
%%%
hidden
%%%
para
```

```html
<p>para</p>
```

:::

Example 74 (unverified)

::: compare

```carve
{k=v .c #i}
para
```

```html
<p id="i" class="c" k="v">para</p>
```

:::

Example 75 (unverified)

::: compare

```carve
{Class=x #a #b}
para
```

```html
<p id="b" class="x">para</p>
```

:::

Example 76 (unverified)

::: compare

```carve
{.c}
[b]: /u

[x][b]
```

```html
<p><a href="/u" class="c">x</a></p>
```

:::

Example 77 (generated)

::: compare

```carve
[span]{.a}{#i}
```

```html
<p><span class="a" id="i">span</span></p>
```

:::

## Fences, divs and comment blocks

**C2-B-074** A run of three or more backticks or tildes opens a code fence, a run of three or more colons opens or closes a div, and a run of three or more percent signs opens a comment block.

**C2-B-075** The closer has the opener's character and at least its length, on a line owned by the same container; there is no further column test.

**C2-B-076** The closer of a code fence and of a comment block is a bare run: a run followed by other text is content.

**C2-B-077** An unclosed code fence, div or comment block ends with its container and never turns back into text.

**C2-B-078** The body of a code fence is code and the body of a comment block is hidden; neither is read for blocks or inline content. The body of a div is read as blocks.

Example 78 (generated)

::: compare

``````carve
```
code
`````
``````

```html
<pre><code>code
</code></pre>
```

:::

Example 79 (generated)

::: compare

`````carve
````
```
````
`````

```html
<pre><code>```
</code></pre>
```

:::

Example 80 (generated)

::: compare

````carve
```
code
``` not a closer
```
````

````html
<pre><code>code
``` not a closer
</code></pre>
````

:::

Example 81 (generated)

::: compare

````carve
```
code
````

```html
<pre><code>code
</code></pre>
```

:::

The fence ends with its item at line 3.

Example 82 (generated)

::: compare

```carve
- ```
  code
after
```

```html
<ul>
  <li>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>after</p>
```

:::

The closer is not tested for its column.

Example 83 (unverified)

::: compare

````carve
```
code
  ```
````

```html
<pre><code>code
</code></pre>
```

:::

Example 84 (generated)

::: compare

```carve
::: note
text
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p>text</p>
</aside>
```

:::

Example 85 (generated)

::: compare

```carve
%%%
hidden
%%%
after
```

```html
<p>after</p>
```

:::

## The fence opener and titles

**C2-B-079** After the run, a code fence opener holds an optional language word and an optional quoted title, and a div opener holds an optional name or sigil and an optional quoted title.

**Exception C2-B-080** A backtick run whose info string holds a backtick is not an opener.

The backtick is the canonical fence character; the tilde is accepted. The quoted title is another spelling of the `title` attribute, which is also accepted on an attribute line. An unquoted title or further words in the info string are a diagnostic, and the block still opens.

Example 86 (generated)

::: compare

````carve
```python "src/app.py"
code
```
````

```html
<pre title="src/app.py"><code class="language-python">code
</code></pre>
```

:::

Example 87 (generated)

::: compare

```carve
~~~
code
~~~
```

```html
<pre><code>code
</code></pre>
```

:::

Example 88 (generated)

::: compare

```carve
::: note "Title"
text
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">Title</p>
  <p>text</p>
</aside>
```

:::

Example 89 (generated)

::: compare

````carve
```a`b
x
````

```html
<p><code>a`b
x</code></p>
```

:::

## Sigil divs

A *sigil div* is a div whose opener names how its body is read: `::: |` is a line block, `::: \` a hard-break block, `::: >` a quote fence.

**C2-B-081** The body of a line block is one leaf that recognizes only prefixes and the closer: every other line is a line of text.

**C2-B-082** A hard-break block and a quote fence are containers, and their bodies are read as blocks.

**C2-B-083** A bare colon run closes the innermost open div it is long enough for, and otherwise opens an anonymous div.

**C2-B-084** A colon run followed by a name or a sigil always opens a div, at any length.

A stray `:::` at column 0 below an item follows from these clauses: the item closes (C2-B-023), no div is open, and an anonymous div opens at top level. This is an error diagnostic.

Example 90 (unverified)

::: compare

```carve
::: |
- not a list
%% text, not a comment
:::
```

```html
<div class="line-block">
  <p>- not a list<br>
%% text, not a comment</p>
</div>
```

:::

Example 91 (generated)

::: compare

```carve
::: |
Roses are red
  Violets are blue
:::
```

```html
<div class="line-block">
  <p>Roses are red<br>
&nbsp;&nbsp;Violets are blue</p>
</div>
```

:::

Example 92 (generated)

::: compare

```carve
::: \
one
two
:::
```

```html
<div class="hardbreaks">
  <p>one<br>
two</p>
</div>
```

:::

Example 93 (generated)

::: compare

```carve
::: >
quoted

second
:::
```

```html
<blockquote>
  <p>quoted</p>
  <p>second</p>
</blockquote>
```

:::

Example 94 (generated)

::: compare

```carve
:::: note
::: tip
inner
:::
outer
::::
```

```html
<aside class="admonition note" aria-label="Note">
  <aside class="admonition tip" aria-label="Tip">
    <p>inner</p>
  </aside>
  <p>outer</p>
</aside>
```

:::

The bare run on line 2 is too short for the open div, so it opens an anonymous div.

Example 95 (generated)

::: compare

```carve
::::
:::
x
:::
::::
```

```html
<div>
  <div>
    <p>x</p>
  </div>
</div>
```

:::

Example 96 (generated)

::: compare

```carve
- ::: note
  text
:::
after
```

```html
<ul>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>text</p>
    </aside>
  </li>
</ul>
<div>
  <p>after</p>
</div>
```

:::

## Comments

Carve has three comment forms: the line form `%%`, the braced form `{% ... %}` and the block form `%%%`. The block form is a fence (C2-B-074, C2-B-075), and its node is owned by its container.

**C2-B-085** The line form is `%%` at the start of a line or after whitespace: it runs to the end of the line, it is an inline token, and it is never an interrupter; elsewhere `%%` is text.

**Exception C2-B-086** In a table row the cells are split first, so a line comment inside a cell ends at its cell.

**Exception C2-B-087** In the body of a code fence `%%` is code, and in the body of a line block it is text.

**C2-B-088** After a list marker, a quote mark, a description mark, a term mark or a heading marker, a comment counts as content: the block opens and holds the comment and no text.

**Exception C2-B-089** A *comment-only line*, a line that holds nothing but a line comment, is skipped by ownership, by a pending attribute line, by the count of blank lines and by the end of a table, and it does not separate a caption from its block.

**C2-B-090** The comment of a comment-only line is a child of the open leaf when one is open, and otherwise of the innermost open container, whatever the line's indent.

**C2-B-091** Only the line form makes a comment-only line: a line that holds only a braced comment is a paragraph that renders nothing. (pending confirmation)

**C2-B-092** Block rules classify lines first, so a braced comment that would span an interrupter line is left unclosed and stays text, with a lint warning. (pending confirmation)

**C2-B-093** A `%%%` block at column 0 between two list items ends the first list and sits at top level, so there are two lists. (pending confirmation)

One paragraph, with the comment inside it:

Example 97 (generated)

::: compare

```carve
- one
  %% todo
  two
```

```html
<ul>
  <li>one
two</li>
</ul>
```

:::

Example 98 (generated)

::: compare

```carve
text %% trailing
more
```

```html
<p>text
more</p>
```

:::

Example 99 (generated)

::: compare

```carve
a%% b
```

```html
<p>a%% b</p>
```

:::

The comment-only line does not end the list.

Example 100 (generated)

::: compare

```carve
- a
%% c
- b
```

```html
<ul>
  <li>a</li>
  <li>b</li>
</ul>
```

:::

The empty item:

Example 101 (generated)

::: compare

```carve
- %% empty
```

```html
<ul>
  <li></li>
</ul>
```

:::

Example 102 (generated)

::: compare

````carve
```
%% not a comment
```
````

```html
<pre><code>%% not a comment
</code></pre>
```

:::

Line 2 is an interrupter, so the braced comment does not close.

Example 103 (generated)

::: compare

```carve
- a {% c
- b %}
```

```html
<ul>
  <li>a {% c</li>
  <li>b %}</li>
</ul>
```

:::

Example 104 (unverified)

::: compare

```carve
- a
%%%
x
%%%
- b
```

```html
<ul>
  <li>a</li>
</ul>
<ul>
  <li>b</li>
</ul>
```

:::

The braced comment on line 2 is a paragraph, so it ends the table. The `%%` form would not.

Example 105 (unverified)

::: compare

```carve
| a |
{% c %}
| b |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<table>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::

## Captions

**C2-B-094** A caption line is `^`, one or more spaces and content, directly below its block with no blank line and owned by the same container as that block; there is no column test.

**C2-B-095** A caption attaches to one of six blocks: an image, a table, a code block, a quote, a math block or a figure group; after a blank line or below any other block the line is text, with lint.

**C2-B-096** A caption is paragraph-like: its text takes lazy lines and ends as a paragraph does.

Under ordinary paragraph text a caption line is a lazy line (C2-B-016). Inside an item or a quote a caption line carries that container's indent or mark like any other line.

Example 106 (generated)

::: compare

```carve
![alt](a.png)
^ Cap
```

```html
<figure>
  <img src="a.png" alt="alt">
  <figcaption>Cap</figcaption>
</figure>
```

:::

Example 107 (generated)

::: compare

```carve
| a |
^ Table
```

```html
<table>
  <caption>Table</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

Example 108 (generated)

::: compare

````carve
```
code
```
^ Listing
````

```html
<figure>
  <pre><code>code
</code></pre>
  <figcaption>Listing</figcaption>
</figure>
```

:::

Example 109 (generated)

::: compare

```carve
::: >
q
:::
^ Attr
```

```html
<figure>
  <blockquote><p>q</p></blockquote>
  <figcaption>Attr</figcaption>
</figure>
```

:::

Example 110 (generated)

::: compare

```carve
text
^ not a caption
```

```html
<p>text
^ not a caption</p>
```

:::

Example 111 (unverified)

::: compare

```carve
![a](a.png)

^ cap
```

```html
<img src="a.png" alt="a">
<p>^ cap</p>
```

:::

Example 112 (generated)

::: compare

```carve
- | a |
  ^ in the item
```

```html
<ul>
  <li>
    <table>
      <caption>in the item</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
  </li>
</ul>
```

:::

Example 113 (generated)

::: compare

```carve
| a |
  ^ indented caption
```

```html
<table>
  <caption>indented caption</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

## Headings

**C2-B-097** A heading is one to six `=`, one space and at least one further character that is not a space; `#` is accepted in place of `=`, and seven or more markers or a bare marker run are text.

**C2-B-098** Everything after that space is inline content: trailing marker characters and a brace block are heading text.

**C2-B-099** A heading is one line, and the next line starts a new block.

A heading's attributes stand on the line above it (C2-B-064). A heading may stand on a marker line or after a quote mark (C2-B-046). Directly after a paragraph line a heading line is a lazy line. `=` and `#` may mix in one document, with a lint note.

Example 114 (unverified)

::: compare

```carve
= Title
text
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>text</p>
</section>
```

:::

Example 115 (generated)

::: compare

```carve
# Title
text
```

```html
<section id="Title">
  <h1>Title</h1>
  <p>text</p>
</section>
```

:::

A level 4 heading with the text `Title ==`:

Example 116 (unverified)

::: compare

```carve
==== Title ==
```

```html
<section id="Title">
  <h4>Title ==</h4>
</section>
```

:::

Example 117 (generated)

::: compare

```carve
# A {.c}
```

```html
<section id="A-c">
  <h1>A {.c}</h1>
</section>
```

:::

Example 118 (unverified)

::: compare

```carve
=

======= seven
```

```html
<p>=</p>
<p>======= seven</p>
```

:::

Example 119 (unverified)

::: compare

```carve
{#top .big}
== Section
```

```html
<section id="top">
  <h2 class="big">Section</h2>
</section>
```

:::

Example 120 (generated)

::: compare

```carve
- # In an item
```

```html
<ul>
  <li>
    <h1 id="In-an-item">In an item</h1>
  </li>
</ul>
```

:::

## One-line constructs

**C2-B-100** An include directive, `{{ ... }}` alone on its line, is a block of one line and not an interrupter.

**C2-B-101** A block image stays a paragraph while its lines are read, and the paragraph is promoted when it closes holding nothing but one image.

A heading (C2-B-099) and a table row (C2-B-105) are one line each as well. The shape of the directive keeps its 0.1 definition. The reference engine that generated the two include examples reports the include as unresolved and prints the directive.

Example 121 (generated)

::: compare

```carve
{{ data.csv @code:csv }}
next line
```

```html
<p>{{ data.csv @code:csv }}</p>
<p>next line</p>
```

:::

Example 122 (generated)

::: compare

```carve
text
{{ part.crv }}
```

```html
<p>text
{{ part.crv }}</p>
```

:::

Example 123 (generated)

::: compare

```carve
![alt](a.png)
```

```html
<img src="a.png" alt="alt">
```

:::

Example 124 (generated)

::: compare

```carve
![alt](a.png)
next line
```

```html
<p><img src="a.png" alt="alt">
next line</p>
```

:::

## Thematic break

**C2-B-102** A thematic break is a line that holds three or more `*` and nothing else; indent is allowed.

A run of hyphens or underscores and the spaced forms are not thematic breaks. They are text, or nested markers for `- - -` (C2-B-047), and lint reports a line that holds only hyphens or underscores. Directly after a paragraph line a star run is a lazy line.

Example 125 (generated)

::: compare

```carve
a

***

b
```

```html
<p>a</p>
<hr>
<p>b</p>
```

:::

Example 126 (generated)

::: compare

```carve
  *****
```

```html
<hr>
```

:::

Example 127 (generated)

::: compare

```carve
- ***
```

```html
<ul>
  <li>
    <hr>
  </li>
</ul>
```

:::

Example 128 (unverified)

::: compare

```carve
text
***
```

```html
<p>text
***</p>
```

:::

Example 129 (unverified)

::: compare

```carve
a

___

b
```

```html
<p>a</p>
<p>___</p>
<p>b</p>
```

:::

## Frontmatter

**C2-B-103** Line 1 opens frontmatter when it is exactly `---` at column 0, optionally followed by a format word and by trailing spaces; only a byte-order mark may come before it, and a longer run of hyphens is text.

**C2-B-104** The closer is a line that is exactly `---` plus trailing spaces; an unclosed frontmatter block runs to the end of the document, with an error diagnostic.

The opener is taken without a scan for the closer. A document that starts with a thematic break writes `***`.

Example 130 (generated)

::: compare

```carve
---
title: x
---

text
```

```html
<p>text</p>
```

:::

Example 131 (generated)

::: compare

```carve
---
---

text
```

```html
<p>text</p>
```

:::

Example 132 (generated)

::: compare

```carve
---
title: x

text
```

```html
```

:::

## Tables

**C2-B-105** A table row is a line that starts with a pipe after the prefixes and ends with a pipe, with at least two pipes; a pipe alone on a line is text.

**C2-B-106** After its closing pipe a row may carry a row attribute, which is a brace block glued to that pipe or one space after it, and a trailing line comment; the row still ends with a pipe.

**C2-B-107** A line that starts with a pipe and does not end with one is text: the table ends there, and the next row starts a new table, with lint.

**C2-B-108** Cells are split before their content is read: a pipe is not a separator when it is escaped or when it stands between a backtick run and its matching closing run on the same line.

**C2-B-109** A table ends at the first line that is neither a row nor a continuation row.

**C2-B-110** A cell prefix is the optional header cell mark `|=`, then an optional glued brace block, then one space; in that brace block the alignment mark comes first.

**C2-B-111** A cell that holds only a span mark, `<` or `^`, joins the cell to its left or the cell above; spans resolve backward only, and a failed span is an empty cell.

**Exception C2-B-112** A row span does not cross the head boundary.

**C2-B-113** A continuation row starts with `+` and ends with a pipe, directly below a row or a continuation row: each fragment joins the cell above it, and a fragment past the last column forms a new cell.

**Exception C2-B-114** Without the closing pipe a `+` line is text and ends the table.

**C2-B-115** The head of a table is its leading rows made only of header cells.

**C2-B-116** `header-rows` sets the head of a delimited table and of a list-table; on a pipe table it has no effect on the head, with lint. `aligns`, `widths`, `header-cols` and `footer-rows` keep their 0.1 definitions.

**C2-B-117** A delimited table, a `csv` or `tsv` fence that the `table` attribute marks, is always a table, with a diagnostic for bad quoting.

A fragment of a continuation row reads no cell prefix, no span mark and no row attribute. A row is an interrupter (C2-B-017).

Example 133 (generated)

::: compare

```carve
|= A |= B |
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col">A</th><th scope="col">B</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

Example 134 (generated)

::: compare

```carve
| 1 | 2 |{.r}
```

```html
<table>
  <tbody>
    <tr class="r"><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

Example 135 (unverified)

::: compare

```carve
| 1 | 2 | {.r} %% note
```

```html
<table>
  <tbody>
    <tr class="r"><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

Example 136 (generated)

::: compare

```carve
| a | b |
| c | d
| e | f |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<p>| c | d</p>
<table>
  <tbody>
    <tr><td>e</td><td>f</td></tr>
  </tbody>
</table>
```

:::

Example 137 (generated)

::: compare

```carve
| a |
|
| b |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>|</p>
<table>
  <tbody>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::

Example 138 (generated)

::: compare

```carve
| `a | b` | c |
```

```html
<table>
  <tbody>
    <tr><td><code>a | b</code></td><td>c</td></tr>
  </tbody>
</table>
```

:::

Example 139 (generated)

::: compare

```carve
| a %% c | b |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
```

:::

Example 140 (generated)

::: compare

```carve
| a |
%% c
| b |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::

Example 141 (generated)

::: compare

```carve
|={>} A |={.x} B |
|{<} 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col" style="text-align: right;">A</th><th scope="col" class="x">B</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: left;">1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

Example 142 (generated)

::: compare

```carve
| a | < |
| b | c |
| ^ | d |
```

```html
<table>
  <tbody>
    <tr><td colspan="2">a</td></tr>
    <tr><td rowspan="2">b</td><td>c</td></tr>
    <tr><td>d</td></tr>
  </tbody>
</table>
```

:::

Example 143 (generated)

::: compare

```carve
| a | b |
| < | c |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td></td><td>c</td></tr>
  </tbody>
</table>
```

:::

The row span would cross the head boundary, so it fails.

Example 144 (unverified)

::: compare

```carve
|= H |
| ^ |
| a |
```

```html
<table>
  <thead>
    <tr><th scope="col">H</th></tr>
  </thead>
  <tbody>
    <tr><td></td></tr>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

Example 145 (generated)

::: compare

```carve
|= A |= B |
| 1 | 2 |
+ a | b |
```

```html
<table>
  <thead>
    <tr><th scope="col">A</th><th scope="col">B</th></tr>
  </thead>
  <tbody>
    <tr><td>1 a</td><td>2 b</td></tr>
  </tbody>
</table>
```

:::

Example 146 (generated)

::: compare

```carve
| 1 | 2 |
+ a | b | c |
```

```html
<table>
  <tbody>
    <tr><td>1 a</td><td>2 b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

Example 147 (generated)

::: compare

```carve
| 1 | 2 |
+ note
```

```html
<table>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
<p>+ note</p>
```

:::

Example 148 (generated)

::: compare

````carve
{table}
```csv
a,b
1,2
```
````

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

## The fallback rule

**C2-B-118** A line that is not a valid opener is text (C2-B-010); whether a line is an opener is decided on that line alone and never by whether a closer follows, so a construct with a closer of its own always opens (C2-B-077).

**C2-B-119** Nesting stops at depth 200, blocks and inlines together: past it an opener is text.

Example 149 (generated)

::: compare

```carve
-a

>c

:d

=======
```

```html
<p>-a</p>
<p>&gt;c</p>
<p>:d</p>
<p>=======</p>
```

:::

Example 150 (generated)

::: compare

```carve
::: note
text
```

```html
<aside class="admonition note" aria-label="Note">
  <p>text</p>
</aside>
```

:::

Example 151 (generated)

::: compare

```carve
%%%
hidden
```

```html
```

:::

## Facts set at close

**C2-B-120** Four facts are set on a node when its block closes and are not roles of a line: the promotion of a block image (C2-B-101), the attachment of a caption (C2-B-095), the tightness of a list (C2-B-049) and the footer rows of a table (C2-B-116).

A streaming writer therefore buffers one paragraph, one captioned block, one list or one table.

The last row becomes the footer when the table closes.

Example 152 (generated)

::: compare

```carve
{footer-rows=1}
| a |
| b |
| c |
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
    <tr><td>b</td></tr>
  </tbody>
  <tfoot>
    <tr><td>c</td></tr>
  </tfoot>
</table>
```

:::

The list is loose from its first item, though the blank line comes after it.

Example 153 (generated)

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

## Counts

Budget: at most 120 block clauses and at most 25 exceptions.

| Construct | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Preliminaries | 9 | 1 | 2 | 2 |
| Paragraphs and interrupters | 12 | 3 | 5 | 2 |
| Container ownership and stripping | 5 | 0 | 1 | 3 |
| Block quotes | 2 | 0 | 5 | 0 |
| Bullet lists | 3 | 0 | 3 | 0 |
| Ordered lists | 5 | 1 | 5 | 1 |
| Task items | 2 | 0 | 4 | 0 |
| Siblings, adjacency and the three-blank-line boundary | 6 | 1 | 4 | 0 |
| Nested lists and the marker line | 4 | 0 | 5 | 1 |
| Tightness | 3 | 0 | 2 | 2 |
| Description lists | 5 | 0 | 5 | 4 |
| Definitions | 6 | 0 | 5 | 3 |
| Attribute lines | 11 | 2 | 6 | 7 |
| Fences, divs and comment blocks | 5 | 0 | 7 | 1 |
| The fence opener and titles | 2 | 1 | 4 | 0 |
| Sigil divs | 4 | 0 | 6 | 1 |
| Comments | 9 | 3 | 7 | 2 |
| Captions | 3 | 0 | 7 | 1 |
| Headings | 3 | 0 | 3 | 4 |
| One-line constructs | 2 | 0 | 4 | 0 |
| Thematic break | 1 | 0 | 3 | 2 |
| Frontmatter | 2 | 0 | 3 | 0 |
| Tables | 13 | 2 | 14 | 2 |
| The fallback rule | 2 | 0 | 3 | 0 |
| Facts set at close | 1 | 0 | 2 | 0 |
| **Total** | **120** | **14** | **115** | **38** |

The chapter has 120 clauses against a budget of 120, and 14 exceptions against a budget of 25. The clause count includes the exceptions. It is within the budget on both counts, with no room left for clauses. Several clauses join two statements with a semicolon or a colon, so a recount with the rubric of one atomic statement per rule will give a higher number.

## Open questions found while writing

These cases are not decided by the clauses above, or are decided two ways. None is decided here.

### Q1. A caption below a `>` quote that ends in a paragraph

```carve
> q
^ Attr
```

- Reading A: the paragraph `q` is open and holds no image, so the caret line is a lazy line (C2-B-011, C2-B-016). A `>` quote that ends in a paragraph can then never take a caption; only a quote fence can.
- Reading B: the quote is a caption target (C2-B-095), so the caret line ends the paragraph and the quote and attaches. That needs a sixth interrupter or an exception to interrupter (d).

### Q2. A second caption line directly below a caption

```carve
| a |
^ one
^ two
```

- Reading A: a caption is paragraph-like (C2-B-096) and holds no image, so line 3 is a lazy line of the caption.
- Reading B, from the small-cases file: a caption line directly below a caption ends the first one and is a text paragraph, as in 0.1.

### Q3. A sibling marker while the paragraph sits in a quote inside the item

```carve
- > q
- b
```

- Reading A: line 2 does not carry the quote mark, so interrupter (b) does not count (C2-B-018) and the line is a lazy line of `q`.
- Reading B: the exception for a quote inside an item (C2-B-019) extends to a sibling marker, and the list has two items, as in 0.1.

### Q4. An interrupter directly below term text

````carve
:: term
```
code
```
````

- Reading A: term text continues like paragraph text, so the fence opener is an interrupter. A term owns no lines, so the list closes and the code block is at top level.
- Reading B: only a description line or a term line ends term text (C2-B-053), and line 2 is term text.

The same question holds for a table row below a term.

### Q5. A lone `i` in an alphabetic list

```carve
h.  x
i.  y
```

- Reading A: the first marker fixes the style (C2-B-033), any single letter matches an alphabetic list, and this is one list.
- Reading B: a lone `i` is roman wherever it stands, so line 2 starts a second list. The plan states the mirror case for roman lists only (C2-B-034).

### Q6. What a paragraph that holds only a braced comment renders, and whether it counts as a block

```carve
- a

  {% c %}
- b
```

- Reading A: the paragraph is a block of the item and renders nothing at all, so the item shows one bare paragraph.
- Reading B: it renders an empty `<p>`.

This depends on pending point (d). Under either reading the same paragraph separates a caption from its block and ends a table.

### Q7. A marker left of every open list, after a blank line

```carve
  - a

- b
```

- Reading A: the first list closes (C2-B-023), a new list opens at column 0, and the two are adjacent lists of one kind, so they are one list (C2-B-043). The list then has two marker columns, and the clause on siblings (C2-B-039) does not say which one later markers are tested against.
- Reading B: two lists.

Without the blank line, line 3 is a lazy line under both readings.

### Q8. The cells of a delimited table with bad quoting

````carve
{table}
```csv
a,b
1,"2
```
````

A delimited table is always a table (C2-B-117). The plan does not say what the cell after the unclosed quote holds: the rest of the line, the rest of the fence body, or the text with the quote character kept.
