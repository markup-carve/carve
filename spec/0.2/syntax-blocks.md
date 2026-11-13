# Carve 0.2 Syntax: block structure

Status: first draft on `next2`. Nothing in this chapter is implemented yet.

This chapter defines how the lines of a Carve document form blocks. Inline content, HTML rendering, the tree and the writer have their own documents. Where a clause states rendered output, it does so because the output is the only visible sign of a block decision.

Conventions:

- A clause is a paragraph that starts with an id of the form `C2-B-nnn`. The prefix is new in 0.2. No 0.1 clause id is reused.
- A clause that starts with the word "Exception" is a carve-out from a more general clause, or a named interaction between two constructs. Exceptions are counted at the end of the chapter.
- Each example is a `compare` container that holds the Carve input and the expected HTML. The line above it gives its number and its status. *Generated* means the HTML was produced by the 0.1 reference engine, because the 0.2 rule equals 0.1 behavior for that input. *Unverified* means the HTML was written by hand from the clauses and has not been run through any engine.
- "Lint" and "diagnostic" name reports. They never change the blocks.

## Preliminaries

Terms:

- A *line* is a run of characters up to a line end. A line ends at LF; a CR directly before that LF is not part of the line, and a lone CR is not a line end. A *blank line* holds only spaces and tabs.
- A *container* is a block that holds other blocks: a quote, a list item, a description, a footnote body, a div. A *leaf* holds text: a paragraph, a heading, a term, a caption, a code block, a table row.
- The *container stack* is the list of containers open at a line, outermost first.
- A *marker* is a list marker, a description mark (`:`), a term mark (`::`) or a footnote definition marker. The *marker column* is the column of its first character. The *content column* is the column of the first content character on the marker line.
- A *prefix* is what a line carries to stay inside an open container: the quote mark for a quote, indent for an item, a description or a footnote body.
- The *indent* of a line is the column of its first character that is not a space or a tab.

**C2-B-001** The role of a line depends only on that line and the container stack.

**Exception C2-B-002** A pending attribute line (C2-B-070) is the one line whose role waits for the next line.

**C2-B-003** Columns count code points from 0, starting after the quote marks of the open quotes: column 0 of quoted content is the column directly behind the innermost quote mark and its one space.

**C2-B-004** A leading tab advances the column to the next multiple of 4, for counting only: the bytes are kept as written, also in code.

**C2-B-005** Tab stops count from the start of the line, not from a container's content column.

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

**C2-B-013** Interrupter (a): a fence line, which is a run of three or more backticks, tildes, colons or percent signs that opens or closes a fence, a div or a comment block (C2-B-080).

**C2-B-014** Interrupter (b): a list marker with content at an open list's column, or indented past the marker of any item, description or footnote body that encloses the paragraph, also when no list is open there yet.

**C2-B-015** Interrupter (c): a description mark or a term mark with content at an open description list's column, or a definition line at column 0 while a definition is open.

**C2-B-016** Interrupter (d): a caption line (C2-B-101), only when the paragraph so far holds nothing but an image.

**Exception C2-B-017** A caption line is also an interrupter when the paragraph is the last block of an open quote and the line does not carry that quote's mark: the line closes the quote and captions it.

**C2-B-018** Interrupter (e): a table row (C2-B-114).

Every other line is a lazy line: a heading, a quote, a thematic break, an attribute line, a definition, an include directive, a `%%` comment, and a list marker where no list is open.

**C2-B-019** Interrupters (b) and (c) count only on a line that carries the quote mark of every quote the list or the definition sits in; a quote inside the item does not count.

**C2-B-020** A list marker line without the quote mark, while the paragraph sits in a quote inside an item, closes that quote: at the list's column it is a sibling item, and indented past the item's marker it opens a nested list in the item.

**Exception C2-B-021** A description list is not a list for interrupter (b): a list marker at its column, directly after term or description text, is a lazy line, with lint.

**Exception C2-B-022** A term mark never opens a nested description list without a blank line: directly after paragraph text inside an item it is a lazy line.

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

The list sits in the quote and the marker on line 2 does not carry the quote mark, so it is a lazy line (C2-B-019).

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

The list does not sit in the quote, so line 2 is a sibling item.

Example 12 (generated)

::: compare

```carve
- > q
- b
```

```html
<ul>
  <li>
    <blockquote><p>q</p></blockquote>
  </li>
  <li>b</li>
</ul>
```

:::

## Container ownership and stripping

**C2-B-023** With no paragraph open, a line belongs to the innermost open item, description or footnote body whose marker it is indented past, measured from that item's own marker column, also when the item joined its list at another column (C2-B-046, C2-B-047), and to a quote when it carries the quote mark.

**C2-B-024** A container that does not own the line closes, with every container inside it.

**C2-B-025** The content of an item, a description or a footnote body is stripped by at most its content column.

**C2-B-026** The first line of a nested block sets that block's base column.

**C2-B-027** The content of a fence is stripped by at most the indent of its opener.

Right-aligned ordered markers are not supported: a marker left of the list's column, directly after item text, is a lazy line. Lint reports it.

Example 13 (unverified)

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

Example 14 (unverified)

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

Example 15 (unverified)

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

Example 16 (generated)

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

**C2-B-028** The quote mark is `>` followed by a space or by the end of the line; `>a` is text.

**C2-B-029** A quote owns a line only when the line carries its mark or is a lazy line, so a blank line without the mark ends the quote, and two quotes separated by a blank line are two quotes.

Example 17 (generated)

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

Example 18 (generated)

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

Example 19 (generated)

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

Example 20 (generated)

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

Example 21 (generated)

::: compare

```carve
>a
```

```html
<p>&gt;a</p>
```

:::

## Bullet lists

**C2-B-030** Every marker needs one space and at least one further character on its line; a bare marker and a marker without its space are text.

**C2-B-031** A bullet marker is `-` or `*`.

**C2-B-032** The bullet character is part of the list's kind, so an item with the other character starts another list (C2-B-041).

Example 22 (generated)

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

Example 23 (generated)

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

Example 24 (generated)

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

**C2-B-033** An ordered marker is a number of one to nine digits, a letter or a roman numeral, followed by `.` or `)`, or the bare dot `.`; a bare `)` is never a marker, and a run of ten or more digits is text.

**C2-B-034** The kind of an ordered list is its numbering style and its delimiter, and the first marker alone fixes the style: digits and the bare dot are one style, decimal, a lone `i` or `I` is roman, any other single letter is alphabetic, and two or more roman letters are roman.

**C2-B-035** In a roman list a single roman letter is a sibling.

**C2-B-036** In an alphabetic list every single letter is a sibling, `i` included.

**Exception C2-B-037** A letter marker or a roman marker with a dot needs two spaces before its content.

**C2-B-038** The list starts at the value of its first marker, and the bare dot numbers automatically: it takes the next number, so digits with a dot and the bare dot are siblings in one list.

A list meant as alphabetic that starts at `i`, and a list meant as roman that starts at `v`, `x`, `l`, `c`, `d` or `m`, split into two lists at the second item. Lint reports both. The `start` attribute keeps its 0.1 definition.

Example 25 (generated)

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

Example 26 (generated)

::: compare

```carve
1. a
. b
```

```html
<ol>
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 27 (generated)

::: compare

```carve
) a
```

```html
<p>) a</p>
```

:::

Example 28 (generated)

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

Example 29 (generated)

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

Example 30 (generated)

::: compare

```carve
h.  x
i.  y
```

```html
<ol type="a" start="8">
  <li>x</li>
  <li>y</li>
</ol>
```

:::

Example 31 (generated)

::: compare

```carve
i. a
```

```html
<p>i. a</p>
```

:::

Example 32 (generated)

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

Example 33 (unverified)

::: compare

```carve
1234567890. a
```

```html
<p>1234567890. a</p>
```

:::

## Task items

**C2-B-039** A task box is `[`, one of the nine characters space, `x`, `X`, `_`, `/`, `!`, `-`, `>` and `?`, and `]`, directly after a bullet's space and followed by one space and at least one further character.

**C2-B-040** In every other case the brackets are inline content: `- [ ]` with nothing after it is a plain item with that text, and an ordered marker and a description mark take no box.

Task items and plain items do not share a list (C2-B-041). `X` is read as `x`.

Example 34 (generated)

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

Example 35 (generated)

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

Example 36 (generated)

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

Example 37 (generated)

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

**C2-B-041** A list marker at an open list's column is a sibling when it matches the list in bullet character, or in ordered style and delimiter, and in being a task item or not.

**C2-B-042** A list marker at an open list's column that does not match closes that list and opens a new one.

**C2-B-043** One or two blank lines do not end a bullet list, an ordered list or a description list.

**C2-B-044** Three or more blank lines before a marker at the list's column end the list, and that marker starts a new one.

**C2-B-045** Two lists of the same kind in one container, with fewer than three blank lines between them, are one list.

**C2-B-046** Adjacency holds at any column: with no paragraph open, a marker left of every open list continues the list above it when it matches the outermost open list in kind (C2-B-041), with lint on the uneven indent.

**Exception C2-B-047** A marker between the columns of two open lists joins the deeper list, with lint.

Example 38 (generated)

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

Example 39 (generated)

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

Example 40 (generated)

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

Example 41 (generated)

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

One list. Without the blank line, line 3 would be a lazy line of `a`.

Example 42 (generated)

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

The first item holds a heading, so no paragraph is open at line 2, and the two items are siblings by adjacency.

Example 43 (unverified)

::: compare

```carve
  - = a
- b
```

```html
<ul>
  <li>
    <h1 id="a">a</h1>
  </li>
  <li>b</li>
</ul>
```

:::

## Nested lists and the marker line

**C2-B-048** A list marker with content, indented past the marker of an item, a description or a footnote body, opens a nested list there without a blank line; an ordered child may start at any number.

**C2-B-049** An item may start with any block: the block opener stands directly after the marker, on the marker line.

**C2-B-050** A marker line that holds another marker with content has a nested list as the item's first block; `- -` is an item with the text `-`.

**C2-B-051** A line that starts with `+` is text unless it is a table continuation row (C2-B-123).

A second block of an item stands after a blank line, indented past the marker (C2-B-023). A bare marker is text (C2-B-030), so the empty item is spelled with a comment (C2-B-094). A spaced run such as `- - -` reads as nested markers that end in a lone hyphen; lint names the 0.1 meaning.

Example 44 (generated)

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

Example 45 (generated)

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

Example 46 (generated)

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

Example 47 (generated)

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

Example 48 (unverified)

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

Example 49 (generated)

::: compare

```carve
+ a
```

```html
<p>+ a</p>
```

:::

## Tightness

**C2-B-052** A list is loose only when a blank line stands between two of its items; a blank line counts for the list whose sibling follows it, and a list with one item is tight.

**C2-B-053** In a tight list a paragraph is rendered bare only when it is the item's first block; every other paragraph of the item gets `<p>`.

**C2-B-054** In a loose list every paragraph of every item gets `<p>`.

There is no `{loose}` attribute.

The outer list is loose, the inner one tight.

Example 50 (generated)

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

Example 51 (unverified)

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

Example 52 (unverified)

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

Example 53 (generated)

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

**C2-B-055** A term line (`::`) and a description line (`:`) at the list's column form a description list.

**C2-B-056** An entry with terms only is valid, and a description line with no term above it is text.

**C2-B-057** A term is one inline leaf: its text continues like paragraph text, and it takes no block opener.

**C2-B-058** A fence line or a table row directly below term text is an interrupter, and because a term owns no lines, it closes the description list, whatever its indent.

**C2-B-059** A term owns no lines: after a blank line, a line that is not a description line or a term line at the list's column closes the list, whatever its indent.

**C2-B-060** A description may start with any block on its marker line, and its further blocks are indented past its mark.

**C2-B-061** A description with one block has a bare paragraph; in a description with several blocks every paragraph gets `<p>`.

Below description text a fence line or a table row is an interrupter as in any paragraph: at the list's column it closes the list (C2-B-024), and indented past the description mark it stays in the description. Entries continue across one or two blank lines (C2-B-043). A nested description list starts on a description's marker line, or after a blank line, indented past the mark.

One entry with two descriptions:

Example 54 (unverified)

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

Example 55 (unverified)

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

Example 56 (generated)

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

Example 57 (generated)

::: compare

```carve
: x
```

```html
<p>: x</p>
```

:::

Example 58 (generated)

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

Example 59 (generated)

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

Example 60 (generated)

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

Example 61 (generated)

::: compare

````carve
:: term
```
code
```
````

```html
<dl>
  <dt>term</dt>
</dl>
<pre><code>code
</code></pre>
```

:::

Example 62 (generated)

::: compare

```carve
:: t
: d
| a |
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

Example 63 (generated)

::: compare

````carve
:: t
: d
  ```
  code
  ```
````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <pre><code>code
</code></pre>
  </dd>
</dl>
```

:::

The list marker on line 3 is a lazy line (C2-B-021).

Example 64 (unverified)

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

Lines 2 and 3 are lazy lines (C2-B-022).

Example 65 (unverified)

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

**C2-B-062** A definition stands at column 0 outside every container; a definition-shaped line inside a container is text, with lint.

**C2-B-063** A footnote definition is `[^label]:`, a space and content on the same line; its body is that content and the blocks indented past its marker.

**C2-B-064** A link definition is one line: `[label]:`, a space, a URL without spaces, which may be empty, and an optional quoted title.

**C2-B-065** An abbreviation definition is one line: `*[label]:` with a label without spaces, a space, and a plain-text expansion that is not empty.

**C2-B-066** For a duplicate label the first definition wins, with a warning.

**C2-B-067** Every paragraph of a footnote body gets `<p>`.

References resolve after block parsing. A definition line directly after a paragraph line is a lazy line, with lint, unless it is a sibling of an open definition (C2-B-015). A definition takes an attribute line (C2-B-073). Anything after the URL or the title of a link definition makes the line text.

Example 66 (generated)

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

Example 67 (generated)

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

Example 68 (generated)

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

Example 69 (generated)

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

Example 70 (generated)

::: compare

```carve
*[HTML]: Hyper Text Markup Language

HTML is plain.
```

```html
<p><abbr title="Hyper Text Markup Language">HTML</abbr> is plain.</p>
```

:::

Example 71 (unverified)

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

Example 72 (unverified)

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

Example 73 (unverified)

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

**C2-B-068** An attribute line is one or more glued brace blocks `{...}`, alone on its line.

**C2-B-069** An attribute line applies to the block that starts on the next line and is owned by the same container; there is no column test.

**C2-B-070** An attribute line is held pending until the next line: a block takes it, and otherwise it becomes a closed one-line paragraph before the next line is classified.

**C2-B-071** Glued brace blocks merge, and consecutive attribute lines merge.

**C2-B-072** Glued attribute blocks after an inline host merge in the same way.

**C2-B-073** Every block takes an attribute line, a definition and a `%%%` comment block included.

**Exception C2-B-074** A caption takes no attribute line.

**Exception C2-B-075** An attribute line that its container does not own closes that container like any other line, and two lists with an attribute line between them are not adjacent (C2-B-045).

**C2-B-076** The order inside a brace block is fixed in the tree and the output: the id, then the classes, then the keys, classes and keys each as written.

**C2-B-077** A key named `id` or `class`, in any ASCII letter case, folds into the id or the classes at parse time, and the last id written wins.

**C2-B-078** A brace block on a marker line closes on that line.

**C2-B-079** The attributes of an item or a cell abut the marker, as in `-{.i} b`.

Directly after a paragraph line an attribute line is a lazy line, with lint. A blank line between an attribute line and a block leaves the attribute line without a block. An attribute block after an admonition name or after a fence language is an error diagnostic; the block still opens. The attributes of a link definition are merged into every link that uses it, and the link's own values win.

Example 74 (generated)

::: compare

```carve
{.x}
para
```

```html
<p class="x">para</p>
```

:::

Example 75 (generated)

::: compare

```carve
{#a}{.b}
para
```

```html
<p id="a" class="b">para</p>
```

:::

Example 76 (generated)

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

Example 77 (generated)

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

Example 78 (generated)

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

Example 79 (unverified)

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

Example 80 (unverified)

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

Example 81 (unverified)

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

Example 82 (unverified)

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

Example 83 (unverified)

::: compare

```carve
{k=v .c #i}
para
```

```html
<p id="i" class="c" k="v">para</p>
```

:::

Example 84 (unverified)

::: compare

```carve
{Class=x #a #b}
para
```

```html
<p id="b" class="x">para</p>
```

:::

Example 85 (unverified)

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

Example 86 (generated)

::: compare

```carve
[span]{.a}{#i}
```

```html
<p><span class="a" id="i">span</span></p>
```

:::

## Fences, divs and comment blocks

**C2-B-080** A run of three or more backticks or tildes opens a code fence, a run of three or more colons opens or closes a div, and a run of three or more percent signs opens a comment block.

**C2-B-081** The closer has the opener's character and at least its length, on a line owned by the same container; there is no further column test.

**C2-B-082** The closer of a code fence and of a comment block is a bare run: a run followed by other text is content.

**C2-B-083** An unclosed code fence, div or comment block ends with its container and never turns back into text; blank lines at the end of an unclosed code fence are not part of its body, so a trailing blank line never changes the tree.

**C2-B-084** The body of a code fence is code and the body of a comment block is hidden; neither is read for blocks or inline content, and each is opaque until its closer or the end of its container. The body of a div is read as blocks.

Example 87 (generated)

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

Example 88 (generated)

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

Example 89 (generated)

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

Example 90 (generated)

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

Example 91 (generated)

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

The blank line before `after` is not code.

Example 92 (unverified)

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

Example 93 (unverified)

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

Example 94 (generated)

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

Example 95 (generated)

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

**C2-B-085** After the run, a code fence opener holds an optional language word and an optional quoted title, and a div opener holds an optional name or sigil and an optional quoted title.

**Exception C2-B-086** A backtick run whose info string holds a backtick is not an opener.

The backtick is the canonical fence character; the tilde is accepted. The quoted title is another spelling of the `title` attribute, which is also accepted on an attribute line. An unquoted title or further words in the info string are a diagnostic, and the block still opens.

Example 96 (generated)

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

Example 97 (generated)

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

Example 98 (generated)

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

Example 99 (generated)

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

**C2-B-087** The body of a line block is one leaf that recognizes only prefixes and the closer: every other line is a line of text.

**C2-B-088** A hard-break block and a quote fence are containers, and their bodies are read as blocks.

**C2-B-089** A bare colon run closes the innermost open div it is long enough for, and otherwise opens an anonymous div.

**C2-B-090** A colon run followed by a name or a sigil always opens a div, at any length.

A stray `:::` at column 0 below an item follows from these clauses: the item closes (C2-B-024), no div is open, and an anonymous div opens at top level. This is an error diagnostic.

Example 100 (unverified)

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

Example 101 (generated)

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

Example 102 (generated)

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

Example 103 (generated)

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

Example 104 (generated)

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

Example 105 (generated)

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

Example 106 (generated)

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

Carve has three comment forms: the line form `%%`, the braced form `{% ... %}` and the block form `%%%`. The block form is a fence (C2-B-080, C2-B-081), and its node is owned by its container.

**C2-B-091** The line form is `%%` at the start of a line or after whitespace: it runs to the end of the line, it is an inline token, and it is never an interrupter; elsewhere `%%` is text.

**Exception C2-B-092** In a table row the cells are split first, so a line comment inside a cell ends at its cell.

**Exception C2-B-093** In the body of a code fence a `%%` line is code and never a comment, also when the fence is unclosed or sits in a list item, and the clause on comment-only lines (C2-B-095) does not apply there; in the body of a line block `%%` is text.

**C2-B-094** After a list marker, a quote mark, a description mark, a term mark or a heading marker, a comment counts as content: the block opens, or stays open, and holds the comment as a comment node and no paragraph, on the first line of a quote as on a later one.

**Exception C2-B-095** A *comment-only line*, a line that holds nothing but a line comment, is skipped by ownership, by a pending attribute line, by the count of blank lines and by the end of a table, and it does not separate a caption from its block.

**C2-B-096** The comment of a comment-only line, and a comment that stands alone after a marker or a quote mark, is a child of the open leaf when one is open, and otherwise a comment node of the innermost open container, whatever the line's indent.

**C2-B-097** Only the line form makes a comment-only line: a line that holds only a braced comment is a paragraph.

**C2-B-098** A paragraph that holds only comments counts as content of its container and renders nothing: no empty paragraph element is written.

**C2-B-099** Block rules classify lines first, so a braced comment that would span an interrupter line is left unclosed and stays text, with a lint warning.

**C2-B-100** A `%%%` block at column 0 between two list items ends the first list and sits at top level, so there are two lists.

One paragraph, with the comment inside it:

Example 107 (generated)

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

Example 108 (generated)

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

Example 109 (generated)

::: compare

```carve
a%% b
```

```html
<p>a%% b</p>
```

:::

The comment-only line does not end the list.

Example 110 (generated)

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

Example 111 (generated)

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

Example 112 (unverified)

::: compare

```carve
> %% c
```

```html
<blockquote></blockquote>
```

:::

Example 113 (generated)

::: compare

```carve
> a
>
> %% c
```

```html
<blockquote><p>a</p></blockquote>
```

:::

Example 114 (generated)

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

The fence in the item is unclosed. Line 3 belongs to the item, so it is code.

Example 115 (generated)

::: compare

```carve
- ```
  code
  %% c
after
```

```html
<ul>
  <li>
    <pre><code>code
%% c
</code></pre>
  </li>
</ul>
<p>after</p>
```

:::

Line 2 is an interrupter, so the braced comment does not close.

Example 116 (generated)

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

Example 117 (unverified)

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

Example 118 (generated)

::: compare

```carve
- {% c %}
```

```html
<ul>
  <li></li>
</ul>
```

:::

The paragraph on line 3 is the second block of the first item and renders nothing. No blank line stands between the two items, so the list is tight.

Example 119 (unverified)

::: compare

```carve
- a

  {% c %}
- b
```

```html
<ul>
  <li>a</li>
  <li>b</li>
</ul>
```

:::

The braced comment on line 2 is a paragraph, so it ends the table. The `%%` form would not.

Example 120 (unverified)

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

**C2-B-101** A caption line is `^`, one or more spaces and content, directly below its block with no blank line and owned by the same container as that block; there is no column test.

**C2-B-102** A caption attaches to one of six blocks: an image, a table, a code block, a quote, a math block or a figure group.

**C2-B-103** A caption is paragraph-like: its text takes lazy lines and ends as a paragraph does, so a second caption line directly below a caption continues the first.

After a blank line or below any other block a caption line is text, with lint. Under ordinary paragraph text it is a lazy line (C2-B-016). Below a quote that ends in a paragraph, a caption line without the quote's mark closes the quote and captions it (C2-B-017); with the mark it is a lazy line of that paragraph. Inside an item or a quote a caption line carries that container's indent or mark like any other line.

Example 121 (generated)

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

Example 122 (generated)

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

Example 123 (generated)

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

Example 124 (generated)

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

Example 125 (generated)

::: compare

```carve
> q
^ Attr
```

```html
<figure>
  <blockquote><p>q</p></blockquote>
  <figcaption>Attr</figcaption>
</figure>
```

:::

Example 126 (generated)

::: compare

```carve
$$`x^2`
^ Equation
```

```html
<figure>
  <p><span class="math display" role="math">\[x^2\]</span></p>
  <figcaption>Equation</figcaption>
</figure>
```

:::

Example 127 (generated)

::: compare

```carve
::: figure
![a](a.png)
![b](b.png)
:::
^ Two images
```

```html
<figure class="carve-figure-group">
  <p><img src="a.png" alt="a">
<img src="b.png" alt="b"></p>
  <figcaption>Two images</figcaption>
</figure>
```

:::

Example 128 (generated)

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

Example 129 (unverified)

::: compare

```carve
| a |
^ one
^ two
```

```html
<table>
  <caption>one
^ two</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

Example 130 (unverified)

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

Example 131 (generated)

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

Example 132 (generated)

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

**C2-B-104** A heading is one to six `=`, one space and at least one further character that is not a space; seven or more markers or a bare marker run are text.

**C2-B-105** `#` is accepted in place of `=`.

**C2-B-106** Everything after that space is inline content: trailing marker characters and a brace block are heading text.

**C2-B-107** A heading is one line, and the next line starts a new block.

A heading's attributes stand on the line above it (C2-B-069). A heading may stand on a marker line or after a quote mark (C2-B-049). Directly after a paragraph line a heading line is a lazy line. `=` and `#` may mix in one document, with a lint note.

Example 133 (unverified)

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

Example 134 (generated)

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

Example 135 (unverified)

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

Example 136 (generated)

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

Example 137 (unverified)

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

Example 138 (unverified)

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

Example 139 (generated)

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

**C2-B-108** An include directive, `{{ ... }}` alone on its line, is a block of one line and not an interrupter.

**C2-B-109** A block image stays a paragraph while its lines are read, and the paragraph is promoted when it closes holding nothing but one image.

A heading (C2-B-107) and a table row (C2-B-114) are one line each as well. The shape of the directive keeps its 0.1 definition. The reference engine that generated the two include examples reports the include as unresolved and prints the directive.

Example 140 (generated)

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

Example 141 (generated)

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

Example 142 (generated)

::: compare

```carve
![alt](a.png)
```

```html
<img src="a.png" alt="alt">
```

:::

Example 143 (generated)

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

**C2-B-110** A thematic break is a line that holds three or more `*` and nothing else; indent is allowed.

A run of hyphens or underscores and the spaced forms are not thematic breaks. They are text, or nested markers for `- - -` (C2-B-050), and lint reports a line that holds only hyphens or underscores. Directly after a paragraph line a star run is a lazy line.

Example 144 (generated)

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

Example 145 (generated)

::: compare

```carve
  *****
```

```html
<hr>
```

:::

Example 146 (generated)

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

Example 147 (unverified)

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

Example 148 (unverified)

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

**C2-B-111** Line 1 opens frontmatter when it is exactly `---` at column 0, optionally followed by a format word and by trailing spaces; only a byte-order mark may come before it, and a longer run of hyphens is text.

**C2-B-112** The closer is a line that is exactly `---` plus trailing spaces.

**C2-B-113** An unclosed frontmatter block runs to the end of the document, with an error diagnostic.

The opener is taken without a scan for the closer. A document that starts with a thematic break writes `***`.

Example 149 (generated)

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

Example 150 (generated)

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

Example 151 (generated)

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

**C2-B-114** A table row is a line that starts with a pipe after the prefixes and ends with a pipe, with at least two pipes; a pipe alone on a line is text.

**C2-B-115** After its closing pipe a row may carry a row attribute, which is a brace block glued to that pipe or one space after it, and a trailing line comment; the row still ends with a pipe.

**C2-B-116** A line that starts with a pipe and does not end with one is text: the table ends there, and the next row starts a new table, with lint.

**C2-B-117** Cells are split before their content is read: a pipe is not a separator when it is escaped or when it stands between a backtick run and its matching closing run on the same line.

**C2-B-118** A table ends at the first line that is neither a row nor a continuation row.

**C2-B-119** A cell prefix is the optional header cell mark `|=`, then an optional glued brace block, then one space; in that brace block the alignment mark comes first.

**C2-B-120** A cell that holds only a span mark, `<` or `^`, joins the cell to its left or the cell above; spans resolve backward only.

**C2-B-121** A failed span is an empty cell.

**Exception C2-B-122** A row span does not cross the head boundary.

**C2-B-123** A continuation row starts with `+` and ends with a pipe, directly below a row or a continuation row, and each fragment joins the cell above it.

**C2-B-124** A fragment past the last column forms a new cell.

**Exception C2-B-125** Without the closing pipe a `+` line is text and ends the table.

**C2-B-126** The head of a table is its leading rows made only of header cells.

**C2-B-127** `header-rows` sets the head of a delimited table and of a list-table; on a pipe table it has no effect on the head, with lint.

**C2-B-128** A delimited table, a `csv` or `tsv` fence that the `table` attribute marks, is always a table.

**C2-B-129** An unclosed quote in a delimited table runs to the end of the fence body, with an error diagnostic: its cell holds everything after the quote character, line breaks and separators included, without the final line ending.

`aligns`, `widths`, `header-cols` and `footer-rows` keep their 0.1 definitions. A fragment of a continuation row reads no cell prefix, no span mark and no row attribute. A row is an interrupter (C2-B-018).

Example 152 (generated)

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

Example 153 (generated)

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

Example 154 (unverified)

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

Example 155 (generated)

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

Example 156 (generated)

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

Example 157 (generated)

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

Example 158 (generated)

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

Example 159 (generated)

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

Example 160 (generated)

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

Example 161 (generated)

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

Example 162 (generated)

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

Example 163 (unverified)

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

Example 164 (generated)

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

Example 165 (generated)

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

Example 166 (generated)

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

Example 167 (generated)

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

The quote on line 4 never closes, so the last cell holds the rest of the body.

Example 168 (unverified)

::: compare

````carve
{table}
```csv
a,b
1,"2
3,4
```
````

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2
3,4</td></tr>
  </tbody>
</table>
```

:::

## The fallback rule

A line that is not a valid opener is text (C2-B-010).

**C2-B-130** Whether a line is an opener is decided on that line alone and never by whether a closer follows, so a construct with a closer of its own always opens (C2-B-083).

**C2-B-131** Nesting stops at depth 200, blocks and inlines together: each open quote, list, item, description, footnote body and div counts one, each open inline node counts one, and past the cap an opener is text.

Example 169 (generated)

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

Example 170 (generated)

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

Example 171 (generated)

::: compare

```carve
%%%
hidden
```

```html
```

:::

## Facts set at close

**C2-B-132** Four facts are set on a node when its block closes and are not roles of a line: the promotion of a block image (C2-B-109), the attachment of a caption (C2-B-102), the tightness of a list (C2-B-052) and the footer rows of a table (C2-B-127).

A streaming writer therefore buffers one paragraph, one captioned block, one list or one table.

The last row becomes the footer when the table closes.

Example 172 (generated)

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

Example 173 (generated)

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

Budget: about 130 block clauses and at most 25 exceptions.

| Construct | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Preliminaries | 9 | 1 | 2 | 2 |
| Paragraphs and interrupters | 13 | 3 | 6 | 2 |
| Container ownership and stripping | 5 | 0 | 1 | 3 |
| Block quotes | 2 | 0 | 5 | 0 |
| Bullet lists | 3 | 0 | 3 | 0 |
| Ordered lists | 6 | 1 | 8 | 1 |
| Task items | 2 | 0 | 4 | 0 |
| Siblings, adjacency and the three-blank-line boundary | 7 | 1 | 5 | 1 |
| Nested lists and the marker line | 4 | 0 | 5 | 1 |
| Tightness | 3 | 0 | 2 | 2 |
| Description lists | 7 | 0 | 8 | 4 |
| Definitions | 6 | 0 | 5 | 3 |
| Attribute lines | 12 | 2 | 6 | 7 |
| Fences, divs and comment blocks | 5 | 0 | 7 | 2 |
| The fence opener and titles | 2 | 1 | 4 | 0 |
| Sigil divs | 4 | 0 | 6 | 1 |
| Comments | 10 | 3 | 10 | 4 |
| Captions | 3 | 0 | 10 | 2 |
| Headings | 4 | 0 | 3 | 4 |
| One-line constructs | 2 | 0 | 4 | 0 |
| Thematic break | 1 | 0 | 3 | 2 |
| Frontmatter | 3 | 0 | 3 | 0 |
| Tables | 16 | 2 | 14 | 3 |
| The fallback rule | 2 | 0 | 3 | 0 |
| Facts set at close | 1 | 0 | 2 | 0 |
| **Total** | **132** | **14** | **129** | **44** |

The chapter has 132 clauses against a budget of about 130, and 14 exceptions against a budget of 25. The clause count includes the exceptions.

## Not covered

This draft has no example for a list-table or for the depth cap. The whole-table attributes, the shape of the include directive and the `start` attribute are referred to their 0.1 definitions. No question found while writing is open: the eight of the first draft are ruled and written into the clauses above.
