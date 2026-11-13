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

- A *line* is a run of characters up to a line end (C2-B-010). A *blank line* holds only spaces and tabs.
- A *container* is a block that holds other blocks: a quote, a list item, a description, a footnote body, a div. A *leaf* holds text: a paragraph, a heading, a term, a caption, a code block, a table row.
- The *container stack* is the list of containers open at a line, outermost first.
- A *marker* is a list marker, a description mark (`:`), a term mark (`::`) or a footnote definition marker. The *marker column* is the column of its first character. The *content column* is the column of the first content character on the marker line.
- A *prefix* is what a line carries to stay inside an open container: the quote mark for a quote, indent for an item, a description or a footnote body.
- The *indent* of a line is the column of its first character that is not a space or a tab. Indent that remains after the prefixes of the open containers is skipped before the shape of a line is tested, so a heading, a quote, a table row or a list marker may stand at any indent. The clauses that pin a column say so: a definition and a frontmatter opener stand at column 0 (C2-B-081, C2-B-161).
- A marker, a mark or an opener that needs *content* needs at least one character that is not a space or a tab behind it on its line. Spaces and tabs alone are no content, since they are dropped at the end of a line (C2-I-002).

**C2-B-001** The role of a line depends only on that line, the container stack and five facts the scanner keeps about the lines directly above: whether the line is line 1 of the document (C2-B-161), the pending attribute lines (C2-B-090), the number of blank lines directly above (C2-B-052), the block that closed directly above, for a caption (C2-B-146), and the blank lines held back at the end of an opaque body (C2-B-113). No rule reads a line below the current one.

**Exception C2-B-002** A pending attribute line (C2-B-092) is the one line whose role waits for the next line.

**C2-B-003** Columns count code points from 0, starting after the quote marks of the open quotes: column 0 of quoted content is the column directly behind the innermost quote mark and its one space.

**C2-B-004** A leading tab advances the column to the next multiple of 4, for counting only: the bytes are kept as written, also in code.

**C2-B-005** Tab stops count from the start of the line, not from a container's content column.

**C2-B-006** Only a space separates a marker or a quote mark from its content: a marker followed by a tab is text.

**C2-B-007** Indent stripping removes whole characters, so a tab that straddles the strip column is kept.

**C2-B-008** Prefixes are read outside-in, in the order the containers were opened: for a quote inside a list item the quote mark sits past the item's marker.

**C2-B-009** A blank line belongs to no container: the next line that is not blank decides which containers stay open, so an indented line belongs to its item after any number of blank lines. A quote is the exception: a blank line without its mark ends it at once (C2-B-032).

**C2-B-010** A line ends at LF, a CR directly before that LF is not part of the line, and a lone CR is not a line end.

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

The same line is a list item at top level and code inside an open fence (C2-B-001).

Example 5 (generated)

::: compare

````carve
- a
```
- b
```
````

```html
<ul>
  <li>a</li>
</ul>
<pre><code>- b
</code></pre>
```

:::

Column 0 of the quoted content is the column behind `> `, so the marker on line 2 is indented past the marker on line 1 (C2-B-003).

Example 6 (generated)

::: compare

```carve
> - a
>   - b
```

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b</li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::

The tab on line 4 ends at column 4 of the line, which is column 2 of the quoted content. That is the marker column of `b` and not past it, so `c` belongs to the item `a` (C2-B-005).

Example 7 (unverified)

::: compare

```carve
> - a
>   - b
>
> 	c
```

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>b</li>
      </ul>
      <p>c</p>
    </li>
  </ul>
</blockquote>
```

:::

The opener is indented by 2. The tab on line 2 straddles that column, so it is kept (C2-B-007).

Example 8 (unverified)

::: compare

````carve
  ```
	code
  ```
````

```html
<pre><code>	code
</code></pre>
```

:::

## Paragraphs and interrupters

**C2-B-011** A line that opens no other block opens a paragraph.

**C2-B-012** An open paragraph takes every line that is not blank, whatever its indent or prefix, and such a line is a *lazy line*.

**C2-B-013** A paragraph closes at a blank line, at an interrupter or with its container.

An *interrupter* is a line that ends an open paragraph without a blank line. There are six.

**C2-B-014** Interrupter (a): a fence line, which is a run of three or more backticks, tildes, colons or percent signs that opens or closes a fence, a div or a comment block (C2-B-108).

**C2-B-015** Interrupter (b): a list marker with content at an open list's column, or indented past the marker of any item, description or footnote body that encloses the paragraph, also when no list is open there yet.

**C2-B-016** Interrupter (c): a description mark or a term mark with content at an open description list's column, or a definition line at column 0 while a definition is open.

**C2-B-017** Interrupter (d): a caption line (C2-B-146), only when the paragraph so far is exactly one block image line (C2-B-197) or one display math line (C2-B-198).

**Exception C2-B-018** A caption line that does not carry the mark of an open quote, directly below a line of that quote, and owned by the container that holds the quote (C2-B-146), closes the quote and captions it, whatever the quote's last block is, and it is an interrupter when that block is an open paragraph. A caret line that the quote's container does not own, as at column 0 below a quote that sits in a list item, is a lazy line.

**C2-B-019** Interrupter (e): a table row (C2-B-166).

**C2-B-200** Interrupter (f): a thematic break (C2-B-159). A line of three or more stars and nothing else has no reading as prose. Like a fence line it interrupts wherever it stands: at an open list's column it closes the list, and indented past a marker it stays in that item.

**C2-B-020** Interrupters (b) and (c) count only on a line that carries the quote mark of every quote the list or the definition sits in, and a quote inside the item does not count.

**C2-B-021** A list marker line without the quote mark, while the paragraph sits in a quote inside an item, closes that quote: at the list's column it is a sibling item, and indented past the item's marker it opens a nested list in the item.

**Exception C2-B-022** A description list is not a list for interrupter (b): a list marker at its column, directly after term or description text, is a lazy line, and `list-marker-without-blank-line` reports it.

**Exception C2-B-023** A term mark never opens a nested description list without a blank line: directly after paragraph text inside an item it is a lazy line.

**C2-B-024** Every line that is not one of the six interrupters is a lazy line of an open paragraph: a heading, a quote, an attribute line, a definition, an include directive, a `%%` comment, and a list marker where no list is open.

Example 9 (generated)

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

Example 10 (unverified)

::: compare

```carve
Some text
# not a heading
> not a quote
{.x}
```

```html
<p>Some text
# not a heading
&gt; not a quote
{.x}</p>
```

:::

Lazy lines keep their paragraph at any indent.

Example 11 (generated)

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

Example 12 (generated)

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

Example 13 (generated)

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

The list sits in the quote and the marker on line 2 does not carry the quote mark, so it is a lazy line (C2-B-020).

Example 14 (unverified)

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

Example 15 (generated)

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

Example 16 (generated)

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

**C2-B-025** With no paragraph open, a line belongs to the innermost open item, description or footnote body whose marker it is indented past, measured from that item's own marker column, also when the item joined its list at another column (C2-B-054, C2-B-055), and to a quote when it carries the quote mark.

**C2-B-026** A container that does not own the line closes, with every container inside it.

**C2-B-027** The content of an item, a description or a footnote body is stripped by at most its content column.

**C2-B-028** The first line of a nested block sets that block's base column.

**C2-B-029** The content of a fence is stripped by at most the indent of its opener.

**C2-B-030** Right-aligned ordered markers are not supported: a marker left of the list's column, directly after item text, is a lazy line, and `ordered-marker-right-aligned` reports it.

Example 17 (unverified)

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

Example 18 (unverified)

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

Example 19 (unverified)

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

Example 20 (generated)

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

The opener stands at column 4 and sets the base column of the code block (C2-B-028).

Example 21 (generated)

::: compare

````carve
-   ```
    x
     y
    ```
````

```html
<ul>
  <li>
    <pre><code>x
 y
</code></pre>
  </li>
</ul>
```

:::

## Block quotes

**C2-B-031** The quote mark is `>` followed by a space or by the end of the line, so `>a` is text.

**C2-B-032** A quote owns a line only when the line carries its mark or is a lazy line, so a blank line without the mark ends the quote, and two quotes separated by a blank line are two quotes.

Example 22 (generated)

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

Example 23 (generated)

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

Example 24 (generated)

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

Example 25 (generated)

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

Example 26 (generated)

::: compare

```carve
>a
```

```html
<p>&gt;a</p>
```

:::

## Bullet lists

**C2-B-033** Every marker needs one space and at least one further character on its line, so a bare marker and a marker without its space are text.

**C2-B-034** A bullet marker is `-` or `*`.

**C2-B-035** The bullet character is part of the list's kind, so an item with the other character starts another list (C2-B-049).

Example 27 (generated)

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

Example 28 (generated)

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

Example 29 (generated)

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

**C2-B-036** An ordered marker is a number of one to nine digits, one ASCII letter, or a roman numeral of two to nine letters, followed by `.` or `)`, or the bare dot `.`, so a bare `)` is never a marker, and a run of ten or more digits or letters is text. A roman numeral is written in one letter case and in its standard form, from 1 to 3999: thousands as up to three `m`, then each lower place as `cm`, `cd` or an optional `d` and up to three `c`, and likewise with `x`, `l`, `c` and with `i`, `v`, `x`. Two or more letters that do not form such a numeral, as in `civil.` or `iiii.`, are text. The 0.1 engine took any run of these letters.

**C2-B-037** The kind of an ordered list is its numbering style and its delimiter.

**C2-B-038** In a roman list a single roman letter is a sibling.

**C2-B-039** In an alphabetic list every single letter is a sibling, `i` included.

**Exception C2-B-040** A marker of one uppercase letter and a dot needs two spaces before its content, so that an initial at the start of a paragraph, as in `A. Smith`, stays text. Every other marker needs one.

**C2-B-041** The list starts at the value of its first marker.

**C2-B-042** The first marker alone fixes the style: digits and the bare dot are one style, decimal, a lone `i` or `I` is roman, any other single letter is alphabetic, and two or more roman letters are roman.

**C2-B-043** The bare dot numbers automatically: it takes the next number, so digits with a dot and the bare dot are siblings in one list.

**C2-B-044** A list meant as alphabetic that starts at `i`, and a list meant as roman that starts at `v`, `x`, `l`, `c`, `d` or `m`, split into two lists at the second item, and `ordered-list-kind-split` reports both.

**C2-B-045** The `start` attribute on the attribute line of an ordered list sets the number of its first item. It is read into the start value of the list and is not kept as a key, so a list written with the attribute and a list whose first marker carries the number give the same tree. Where both are written, the attribute decides. The value is an unsigned decimal integer; on a list of letters or roman numerals it is at least 1. Any other value is no start value and stays an ordinary key. (carried over from 0.1)

Example 30 (generated)

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

Example 31 (generated)

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

Example 32 (generated)

::: compare

```carve
) a
```

```html
<p>) a</p>
```

:::

Example 33 (generated)

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

Example 34 (generated)

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

Example 35 (generated)

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

Example 36 (generated)

::: compare

```carve
A. Smith
```

```html
<p>A. Smith</p>
```

:::

Example 37 (generated)

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

Example 38 (unverified)

::: compare

```carve
1234567890. a
```

```html
<p>1234567890. a</p>
```

:::

In a roman list the single letter `v` is a sibling (C2-B-038).

Example 39 (generated)

::: compare

```carve
iv.  a
v.  b
```

```html
<ol type="i" start="4">
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 40 (generated)

::: compare

```carve
{start=5}
. a
. b
```

```html
<ol start="5">
  <li>a</li>
  <li>b</li>
</ol>
```

:::

Example 41 (unverified)

::: compare

```carve
mmmmmmmmmm) a
```

```html
<p>mmmmmmmmmm) a</p>
```

:::

## Task items

**C2-B-046** A task box is `[`, one of the nine characters space, `x`, `X`, `_`, `/`, `!`, `-`, `>` and `?`, and `]`, directly after a bullet's space and followed by one space and at least one further character.

**C2-B-047** In every other case the brackets are inline content: `- [ ]` with nothing after it is a plain item with that text, and an ordered marker and a description mark take no box.

**C2-B-048** The box character `X` is read as `x`.

Task items and plain items do not share a list (C2-B-049).

Example 42 (generated)

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

Example 43 (generated)

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

Example 44 (generated)

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

Example 45 (generated)

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

**C2-B-049** A list marker at an open list's column is a sibling when it matches the list in bullet character, or in ordered style and delimiter, and in being a task item or not.

**C2-B-050** A list marker at an open list's column that does not match closes that list and opens a new one.

**C2-B-051** One or two blank lines do not end a bullet list, an ordered list or a description list.

**C2-B-052** Three or more blank lines before a marker at the list's column end the list, and that marker starts a new one.

**C2-B-053** Two lists of the same kind in one container, with nothing between them but fewer than three blank lines and comment-only lines (C2-B-137), are one list. Any other block between them keeps them apart (C2-B-142).

**C2-B-054** Adjacency holds at any column for bullet and ordered lists: with no paragraph open, a marker left of every open list continues the list above it when it matches the outermost open list in kind (C2-B-049), and `uneven-list-indent` reports it. A description list has no kind and no adjacency across columns: a term mark or a description mark at another column than the open description list starts a new list.

**Exception C2-B-055** A marker between the columns of two open lists joins the deeper list, and `list-marker-below-content-column` reports it.

Example 46 (generated)

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

Example 47 (generated)

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

Example 48 (generated)

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

Example 49 (generated)

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

Example 50 (generated)

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

Example 51 (unverified)

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

**C2-B-056** A list marker with content, indented past the marker of an item, a description or a footnote body, opens a nested list there without a blank line.

**C2-B-057** An item may start with any block: the block opener stands directly after the marker, on the marker line.

**C2-B-058** A marker line that holds another marker with content has a nested list as the item's first block.

**C2-B-059** A line that starts with `+` is text unless it is a table continuation row (C2-B-175).

**C2-B-060** An ordered nested list may start at any number.

**C2-B-061** A marker line whose second marker has no content holds that marker as text: `- -` is an item with the text `-`.

A second block of an item stands after a blank line, indented past the marker (C2-B-025). A bare marker is text (C2-B-033), so the empty item is spelled with a comment (C2-B-136). A spaced run such as `- - -` reads as nested markers that end in a lone hyphen (C2-B-058, C2-B-061), and `deprecated-spaced-thematic-break` reports it.

Example 52 (generated)

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

Example 53 (generated)

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

Example 54 (generated)

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

Example 55 (generated)

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

Example 56 (unverified)

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

Example 57 (generated)

::: compare

```carve
+ a
```

```html
<p>+ a</p>
```

:::

## Tightness

**C2-B-062** A list is loose only when a blank line stands between two of its items, so a list with one item is tight.

**C2-B-063** In a tight list a paragraph is rendered bare only when it is the item's first block, and every other paragraph of the item gets `<p>`.

**C2-B-064** In a loose list every paragraph of every item gets `<p>`.

**C2-B-065** A blank line counts for the list whose sibling follows it.

**C2-B-066** There is no `{loose}` attribute: the key `loose` on a list has no effect on tightness, and `deprecated-loose-attribute` reports it.

The outer list is loose, the inner one tight.

Example 58 (generated)

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

Example 59 (unverified)

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

Example 60 (unverified)

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

Example 61 (generated)

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

The key has no effect, and the list stays tight (C2-B-066).

Example 62 (unverified)

::: compare

```carve
{loose}
- a
- b
```

```html
<ul loose="">
  <li>a</li>
  <li>b</li>
</ul>
```

:::

## Description lists

**C2-B-067** A term line (`::`) and a description line (`:`) at the list's column form a description list.

**C2-B-068** An entry with terms only is valid.

**C2-B-069** A term is one inline leaf: its text continues like paragraph text.

**C2-B-070** A fence line or a table row directly below term text is an interrupter, and because a term owns no lines, it closes the description list, whatever its indent.

**C2-B-071** A term owns no lines: after a blank line, a line that is not a description line or a term line at the list's column closes the list, whatever its indent.

**C2-B-072** A description may start with any block on its marker line.

**C2-B-073** A description with one block has a bare paragraph.

**C2-B-074** A description line with no term above it is text.

**C2-B-075** A term takes no block opener: a quote mark or a list marker after the term mark is term text.

**C2-B-076** The further blocks of a description are indented past its mark.

**C2-B-077** In a description with several blocks every paragraph gets `<p>`.

**C2-B-078** Below description text a fence line or a table row is an interrupter as in any paragraph: at the list's column it closes the list (C2-B-026), and indented past the description mark it stays in the description.

**C2-B-079** A nested description list starts on a description's marker line, or after a blank line, indented past the mark.

**C2-B-080** One or two blank lines between a term and its description, between two descriptions or between two entries do not end the list (C2-B-051) and do not change what it renders.

One entry with two descriptions:

Example 63 (unverified)

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

Example 64 (unverified)

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

Example 65 (generated)

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

Example 66 (generated)

::: compare

```carve
: x
```

```html
<p>: x</p>
```

:::

Example 67 (generated)

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

Example 68 (generated)

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

Example 69 (generated)

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

Example 70 (generated)

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

Example 71 (generated)

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

Example 72 (generated)

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

After the blank line, line 3 is neither a description line nor a term line, so it closes the list at any indent (C2-B-071).

Example 73 (generated)

::: compare

```carve
:: t

  x
```

```html
<dl>
  <dt>t</dt>
</dl>
<p>x</p>
```

:::

Example 74 (generated)

::: compare

```carve
:: t

: d

: d2
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
  <dd>d2</dd>
</dl>
```

:::

The quote mark after the term mark is term text (C2-B-075).

Example 75 (generated)

::: compare

```carve
:: > q
: d
```

```html
<dl>
  <dt>&gt; q</dt>
  <dd>d</dd>
</dl>
```

:::

A nested description list on the marker line of a description (C2-B-079):

Example 76 (generated)

::: compare

```carve
:: t
: :: inner
  : innerd
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <dl>
      <dt>inner</dt>
      <dd>innerd</dd>
    </dl>
  </dd>
</dl>
```

:::

The list marker on line 3 is a lazy line (C2-B-022).

Example 77 (unverified)

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

Lines 2 and 3 are lazy lines (C2-B-023).

Example 78 (unverified)

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

**C2-B-081** A definition stands at column 0 outside every container, so a definition-shaped line inside a container is text, and `definition-in-container` reports it.

**C2-B-082** A footnote definition is `[^label]:`, a space and content on the same line. The label follows the rules of a footnote reference label (C2-I-087): it may hold spaces, and it holds no unescaped bracket.

**C2-B-083** A link definition is one line: `[label]:`, one or more spaces, a destination without spaces and an optional quoted title, so a label and a colon followed by nothing or only spaces is text. The label does not start with `^`: that shape is tested first and is a footnote definition (C2-B-082).

**C2-B-084** An abbreviation definition is one line: `*[label]:` with a label of one or more ASCII letters and digits, a space, and a plain-text expansion that is not empty.

**C2-B-085** For a duplicate label the first definition wins, and `duplicate-footnote-definition`, `duplicate-link-reference-definition` or `duplicate-abbreviation-definition` reports the later one.

**C2-B-086** Every paragraph of a footnote body gets `<p>`.

**C2-B-087** The body of a footnote definition is the content on its marker line and the blocks indented past its marker. The marker line may start with any block, as the marker line of an item does (C2-B-057): `[^n]: > q` holds a quote.

**C2-B-088** References resolve after block parsing, so a reference may stand before its definition.

**C2-B-089** Anything but spaces and tabs after the URL or the title of a link definition makes the line text.

A definition line directly after a paragraph line is a lazy line (C2-B-012) unless it is a sibling of an open definition (C2-B-016). A definition takes an attribute line (C2-B-095).

Example 79 (generated)

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

Example 80 (generated)

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

Example 81 (generated)

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

Example 82 (generated)

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

Example 83 (generated)

::: compare

```carve
*[HTML]: Hyper Text Markup Language

HTML is plain.
```

```html
<p><abbr title="Hyper Text Markup Language">HTML</abbr> is plain.</p>
```

:::

A label with any other character makes the line text.

Example 84 (generated)

::: compare

```carve
*[a-b]: x
```

```html
<p>*[a-b]: x</p>
```

:::

Example 85 (unverified)

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

Example 86 (unverified)

::: compare

```carve
[a]:

[x][a]
```

```html
<p>[a]:</p>
<p>[x][a]</p>
```

:::

Example 87 (unverified)

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

Example 88 (unverified)

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

The word after the destination makes line 1 text (C2-B-089).

Example 89 (generated)

::: compare

```carve
[a]: /u extra

[x][a]
```

```html
<p>[a]: /u extra</p>
<p>[x][a]</p>
```

:::

## Attribute lines

**C2-B-090** An attribute line is one or more glued brace blocks `{...}`, alone on its line, each a valid attribute block (C2-I-028 to C2-I-034). A line of braces that is no valid block, such as a braced inline form alone on its line, is text.

**C2-B-091** An attribute line applies to the block that starts on the next line and is owned by the same container, with no column test.

**C2-B-092** An attribute line is held pending until the next line: a block takes it, and otherwise it becomes a closed paragraph before the next line is classified.

**C2-B-093** Glued brace blocks merge into one.

**C2-B-094** Glued attribute blocks after an inline host merge in the same way.

**C2-B-095** Every block takes an attribute line, a definition and a `%%%` comment block included.

**Exception C2-B-096** A caption takes no attribute line.

**Exception C2-B-097** An attribute line that its container does not own closes that container like any other line, and two lists with an attribute line between them are not adjacent (C2-B-053).

**C2-B-098** The order inside a brace block is fixed in the tree and the output: the id, then the classes, then the language, then the keys, classes and keys each as written.

**C2-B-099** A key named `id` or `class`, in any ASCII letter case, folds into the id or the classes at parse time.

**C2-B-100** A brace block on a marker line closes on that line.

**C2-B-101** The attributes of an item or a cell abut the marker, as in `-{.i} b`.

**C2-B-102** Consecutive attribute lines merge into one.

**C2-B-103** The language part of a brace block, as in `{:en}`, is shorthand for the node's language field and is not a key.

**C2-B-104** When a brace block or a merged run of them holds several ids, the last id written wins.

**C2-B-105** An attribute block after an admonition name or after a fence language does not stop the block from opening, and `fence-opener-fallback` reports it with severity error.

**C2-B-106** The attributes of a link definition are merged into every link that uses it, and the link's own values win.

**C2-B-107** The attribute line above a captioned block applies to the captioned whole: to the table for a table, and to the figure for every other target (carried over from 0.1).

**C2-B-192** Consecutive attribute lines that no block takes, because a blank line or the end of their container follows, become one closed paragraph that holds every one of those lines as text.

**C2-B-193** A brace block with no content, alone on a line, is text and not an attribute line.

**C2-B-194** A description mark and a term mark take no abutting brace block: `:{.c}` and `::{.c}` are not marks, so the line is text.

Directly after a paragraph line an attribute line is a lazy line (C2-B-012), and `block-opener-without-blank-line` reports it. A blank line between an attribute line and a block leaves the attribute line without a block (C2-B-091, C2-B-092).

Example 90 (generated)

::: compare

```carve
{.x}
para
```

```html
<p class="x">para</p>
```

:::

Example 91 (generated)

::: compare

```carve
{#a}{.b}
para
```

```html
<p id="a" class="b">para</p>
```

:::

Example 92 (generated)

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

Example 93 (generated)

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

Example 94 (generated)

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

Example 95 (unverified)

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

Example 96 (unverified)

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

Example 97 (unverified)

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

Example 98 (unverified)

::: compare

```carve
{.a}
{.b}

para
```

```html
<p>{.a}
{.b}</p>
<p>para</p>
```

:::

Example 99 (generated)

::: compare

```carve
{}
para
```

```html
<p>{}
para</p>
```

:::

Example 100 (generated)

::: compare

```carve
::{.c} t
: d
```

```html
<p>::{.c} t
: d</p>
```

:::

The comment block takes the attribute line and renders nothing.

Example 101 (unverified)

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

Example 102 (unverified)

::: compare

```carve
{k=v .c #i}
para
```

```html
<p id="i" class="c" k="v">para</p>
```

:::

Example 103 (unverified)

::: compare

```carve
{k=v :en .c #i}
para
```

```html
<p id="i" class="c" lang="en" k="v">para</p>
```

:::

Example 104 (unverified)

::: compare

```carve
{Class=x #a #b}
para
```

```html
<p id="b" class="x">para</p>
```

:::

Example 105 (unverified)

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

Example 106 (unverified)

::: compare

```carve
[span]{.a}{#i}
```

```html
<p><span id="i" class="a">span</span></p>
```

:::

The caption takes no attribute line, so line 2 becomes a paragraph, and line 3 then stands below a paragraph and is text (C2-B-096).

Example 107 (unverified)

::: compare

```carve
| a |
{.x}
^ cap
```

```html
<table>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
<p>{.x}</p>
<p>^ cap</p>
```

:::

An attribute line may stand on a marker line. The paragraph of the item takes it.

Example 108 (generated)

::: compare

```carve
- {.c}
  para
```

```html
<ul>
  <li><p class="c">para</p></li>
</ul>
```

:::

The brace block does not close on the marker line, so it is text (C2-B-100).

Example 109 (generated)

::: compare

```carve
- {.c
  x}
```

```html
<ul>
  <li>{.c
x}</li>
</ul>
```

:::

Example 110 (generated)

::: compare

```carve
{#f .c}
| a |
^ cap
```

```html
<table id="f" class="c">
  <caption>cap</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

Example 111 (generated)

::: compare

````carve
{#f .c}
```
code
```
^ cap
````

```html
<figure id="f" class="c">
  <pre><code>code
</code></pre>
  <figcaption>cap</figcaption>
</figure>
```

:::

The fence opens, and the attribute block after the language is reported (C2-B-105).

Example 112 (generated)

::: compare

````carve
```js {.x}
code
```
````

```html
<pre><code class="language-js">code
</code></pre>
```

:::

## Fences, divs and comment blocks

**C2-B-108** A run of three or more backticks or tildes opens a code fence, a run of three or more colons opens or closes a div, and a run of three or more percent signs opens a comment block. Text behind the percent run on the opener line, without the spaces and tabs before it, is the first line of the comment's value, as in 0.1.

**C2-B-109** The closer has the opener's character and at least its length, on a line owned by the same container, with no further column test.

**C2-B-110** The closer of a code fence and of a comment block is a bare run: a run followed by other text is content of the body.

**C2-B-111** An unclosed code fence, div or comment block ends with its container and never turns back into text, and `unclosed-code-fence`, `unclosed-container-fence` or `unclosed-comment-fence` reports it with severity error.

**C2-B-112** The body of a code fence is code and the body of a comment block is hidden: neither is read for blocks or inline content.

**C2-B-113** Blank lines at the end of an unclosed code fence or comment block are not part of its body, so a trailing blank line never changes the tree.

**C2-B-114** The body of a code fence and of a comment block is opaque until its closer or the end of its container.

**C2-B-115** The body of a div is read as blocks.

**C2-B-116** A code fence whose info string is `=` directly followed by a format name is a raw block: its body goes to an output of that format as written and is not code (carried over from 0.1).

**C2-B-195** `comment-fence-closer-with-text` reports a percent run followed by other text in the body of a comment block.

Example 113 (generated)

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

Example 114 (generated)

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

Example 115 (generated)

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

Example 116 (generated)

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

Example 117 (generated)

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

Example 118 (unverified)

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

Example 119 (unverified)

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

Example 120 (generated)

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

Example 121 (generated)

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

Raw HTML is off by default, so the raw block is written as a code block (C2-B-116).

Example 122 (unverified)

::: compare

````carve
```=html
<b>x</b>
```
````

```html
<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;
</code></pre>
```

:::

Line 3 is content of the comment block, and line 4 closes it (C2-B-110).

Example 123 (unverified)

::: compare

```carve
%%%
x
%%% not a closer
%%%
after
```

```html
<p>after</p>
```

:::

## The fence opener and titles

**C2-B-117** After the run, a code fence opener holds an optional language word, an optional quoted title and an optional label in brackets, in that order.

**Exception C2-B-118** A backtick run whose info string holds a backtick is not an opener.

**C2-B-119** After the run, a div opener holds an optional name or sigil, an optional quoted title and an optional label in brackets, in that order. A name stands after one or more spaces behind the run, like a sigil (C2-B-196): a name glued to the run, as in `:::note`, makes the line text. A title or a label may stand with no name before it.

**C2-B-120** The quoted title of a code fence renders like a `title` attribute, which is also accepted on an attribute line. In the tree they are two things, the `title` field and a key (C2-A-032), and where both are written the key wins in HTML (C2-H-048). The quoted title of a div, an admonition or a directive is the `title` field of that node and renders as its title paragraph (C2-H-042).

**C2-B-121** The label in brackets is metadata for a group extension, such as the tab label of a code group, and renders nothing in the core (carried over from 0.1).

**C2-B-122** An unquoted title or further words in the info string do not stop the block from opening, and `fence-title-syntax` reports them. A raw fence (C2-B-116) and a sigil div (C2-B-196) take no title and no label: what follows the format or the sigil is further words in this sense, is not kept in the tree, and is reported. The 0.1 engine read such a line as text.

The backtick is the canonical fence character, and the tilde is accepted (C2-B-108).

Example 124 (generated)

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

Example 125 (generated)

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

Example 126 (generated)

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

Example 127 (generated)

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

Example 128 (generated)

::: compare

````carve
```php "t" [Composer]
code
```
````

```html
<pre title="t"><code class="language-php">code
</code></pre>
```

:::

The unquoted word after the language is reported, and the fence opens (C2-B-122).

Example 129 (generated)

::: compare

````carve
```js title
code
```
````

```html
<pre><code class="language-js">code
</code></pre>
```

:::

## Sigil divs

A *sigil div* is a div whose opener names how its body is read: `::: |` is a line block, `::: \` a hard-break block, `::: >` a quote fence (C2-B-196).

**C2-B-123** The body of a line block is one leaf that recognizes only prefixes and the closer: every other line is a line of text.

**C2-B-124** A hard-break block and a quote fence are containers, and their bodies are read as blocks.

**C2-B-125** A bare colon run closes the innermost open div it is long enough for, and otherwise opens an anonymous div.

**C2-B-126** A colon run followed by a name or a sigil always opens a div, at any length.

**C2-B-127** The name of a div decides what it is: `note`, `tip`, `warning`, `danger`, `info`, `success`, `example` and `quote` give an admonition, `figure` with no title and no label gives a figure group, and with one of them a plain div with the class `figure`, `bibliography`, `footnotes`, `glossary`, `index`, `references` and `toc` give a directive, and every other name gives a plain div with that name as a class, and names are compared as written (carried over from 0.1).

**C2-B-128** The classes of a div stand in one order: the name of a plain div first, then the classes of its attribute line as written, then the class of a sigil opener, `line-block` or `hardbreaks`, last.

**C2-B-129** A hard-break block is the same as a bare div whose attribute line holds `hardbreaks` as its last class and whose lines each end in a hard break.

**C2-B-130** A line of a line block keeps the spaces that lead it after the strip (C2-B-027) as content (carried over from 0.1).

**C2-B-131** A blank line in a line block ends a stanza, and the next line starts a new one (carried over from 0.1).

**C2-B-132** A stray `:::` at column 0 below an item with an unclosed div closes the item (C2-B-026) and opens an anonymous div at top level (C2-B-125), and `unclosed-container-fence` reports it with severity error.

**C2-B-196** A sigil stands after one or more spaces behind the colon run: without the space the line is not a sigil div opener and is text.

Example 130 (unverified)

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

Example 131 (generated)

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

Example 132 (generated)

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

Example 133 (generated)

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

Example 134 (generated)

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

Example 135 (generated)

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

Example 136 (generated)

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

Example 137 (generated)

::: compare

```carve
::: spoiler
x
:::
```

```html
<div class="spoiler">
  <p>x</p>
</div>
```

:::

Example 138 (generated)

::: compare

```carve
{.x}
::: spoiler
x
:::
```

```html
<div class="spoiler x">
  <p>x</p>
</div>
```

:::

Example 139 (generated)

::: compare

```carve
{.x}
::: \
a
b
:::
```

```html
<div class="x hardbreaks">
  <p>a<br>
b</p>
</div>
```

:::

Two stanzas, and two leading spaces on line 3:

Example 140 (generated)

::: compare

```carve
::: |
one
  two

three
:::
```

```html
<div class="line-block">
  <p>one<br>
&nbsp;&nbsp;two</p>
  <p>three</p>
</div>
```

:::

Example 141 (generated)

::: compare

```carve
:::|
a
```

```html
<p>:::|
a</p>
```

:::

## Comments

Carve has three comment forms: the line form `%%`, the braced form `{% ... %}` and the block form `%%%`. The block form is a fence (C2-B-108, C2-B-109), and its node is owned by its container.

**C2-B-133** The line form is `%%` at the start of a line or after whitespace, it runs to the end of the line, and elsewhere `%%` is text.

**Exception C2-B-134** In a table row the cells are split first, so a line comment inside a cell ends at its cell.

**Exception C2-B-135** In every opaque body, which is the body of a code fence, a raw block or a comment block, a `%%` line is content and never a comment, also when the block is unclosed or sits in a list item, and the clause on comment-only lines (C2-B-137) does not apply there.

**C2-B-136** After a list marker, a quote mark, a description mark, a term mark or a heading marker, a comment counts as content: the block opens, or stays open, and holds the comment as a comment node and no paragraph, on the first line of a quote as on a later one.

**Exception C2-B-137** A *comment-only line*, a line that holds nothing but a line comment, is skipped by ownership, by a pending attribute line, by the count of blank lines and by the end of a table, and it does not separate a caption from its block.

**C2-B-138** The comment of a comment-only line, and a comment that stands alone after a marker or a quote mark, is a child of the open leaf when one is open, and otherwise a comment node of the innermost open container, whatever the line's indent.

**C2-B-139** Only the line form makes a comment-only line: a line that holds only a braced comment is a paragraph.

**C2-B-140** A paragraph that holds only comments counts as content of its container and renders nothing: no empty paragraph element is written.

**C2-B-141** Block rules classify lines first, so a braced comment that would span an interrupter line is left unclosed and stays text, and `unclosed-braced-comment` reports it.

**C2-B-142** A `%%%` block at column 0 between two list items ends the first list and sits at top level, so there are two lists.

**C2-B-143** A line comment is an inline token and never an interrupter.

**Exception C2-B-144** In the body of a line block `%%` is text, and `comment-line-in-line-block` reports it.

**C2-B-145** A marker followed by a comment is the only spelling of an empty item, description, term or heading: there is no sentinel for an empty body.

**C2-B-199** The lint control comments and the region markers of an include are line comments that a tool reads, and their shapes keep their 0.1 definitions (carried over from 0.1).

One paragraph, with the comment inside it:

Example 142 (generated)

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

Example 143 (generated)

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

Example 144 (generated)

::: compare

```carve
a%% b
```

```html
<p>a%% b</p>
```

:::

The comment-only line does not end the list.

Example 145 (generated)

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

Example 146 (generated)

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

Example 147 (generated)

::: compare

```carve
> %% c
```

```html
<blockquote>

</blockquote>
```

:::

Example 148 (generated)

::: compare

```carve
:: %% c
: d
```

```html
<dl>
  <dt></dt>
  <dd>d</dd>
</dl>
```

:::

The comment on line 3 stands after a blank line at column 0. It is skipped by ownership, the list stays open, and its node belongs to the first item, which HTML does not show (C2-B-138).

Example 149 (generated)

::: compare

```carve
- one

%% c
- two
```

```html
<ul>
  <li><p>one</p></li>
  <li><p>two</p></li>
</ul>
```

:::

Example 150 (generated)

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

Example 151 (generated)

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

Example 152 (generated)

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

Line 3 is not owned by the item, so it ends the item and with it the unclosed fence, and it is then a comment at top level. `unclosed-code-fence` reports the fence.

Example 153 (unverified)

::: compare

```carve
- ```
  code
%% c
  more
```

```html
<ul>
  <li>
    <pre><code>code
</code></pre>
  </li>
</ul>
<p>more</p>
```

:::

Line 2 is an interrupter, so the braced comment does not close.

Example 154 (generated)

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

Example 155 (unverified)

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

Example 156 (generated)

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

Example 157 (unverified)

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

Example 158 (unverified)

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

**C2-B-146** A caption line is `^`, one or more spaces and content, directly below its block with no blank line and owned by the same container as that block, with no column test.

**C2-B-147** A caption attaches to one of six blocks: an image, a table, a code block, a quote, a math block or a figure group.

**C2-B-148** A caption is paragraph-like: its text takes lazy lines and ends as a paragraph does, so a second caption line directly below a caption continues the first.

**C2-B-149** After a blank line or below any other block a caption line is text, and `unattached-caption` reports it.

**C2-B-150** The first bare `#` in a caption's text is the caption number mark, and the sequences and the label word that selects one keep their 0.1 definition (carried over from 0.1).

Under ordinary paragraph text a caption line is a lazy line (C2-B-017). Directly below a line of a quote, a caption line without the quote's mark closes the quote and captions it (C2-B-018). With the mark it belongs to the quote, where it is a lazy line of an open paragraph. Inside an item or a quote a caption line carries that container's indent or mark like any other line.

Example 159 (generated)

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

Example 160 (generated)

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

Example 161 (generated)

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

Example 162 (generated)

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

Example 163 (generated)

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

The quote ends in a list, and the caption still attaches to the quote.

Example 164 (generated)

::: compare

```carve
> - a
^ cap
```

```html
<figure>
  <blockquote>
    <ul>
      <li>a</li>
    </ul>
  </blockquote>
  <figcaption>cap</figcaption>
</figure>
```

:::

Example 165 (generated)

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

Example 166 (generated)

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

Example 167 (generated)

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

Example 168 (unverified)

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

Example 169 (unverified)

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

Example 170 (generated)

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

Example 171 (generated)

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

Example 172 (generated)

::: compare

```carve
| a |
^ Table #: one
```

```html
<table>
  <caption>Table 1: one</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

## Headings

**C2-B-151** A heading is one to six `=`, one space and at least one further character that is not a space or a tab, so seven or more markers or a bare marker run are text.

**C2-B-152** `#` is accepted in place of `=`.

**C2-B-153** Everything after that space is inline content: trailing marker characters and a brace block are heading text.

**C2-B-154** A heading holds its marker line and every line directly below it that is indented past the column of its marker, each joined by a soft break, or by a hard break where the line above ends in a backslash (C2-I-102). Such a continuation line is read like a lazy line of a paragraph, so every interrupter of a paragraph interrupts a heading too (C2-B-014 to C2-B-020, C2-B-200): a fence line, a table row and a thematic break anywhere, and inside an item a list marker that is indented past the item's marker. A blank line ends the heading. A line that is not indented past the marker starts a new block, a comment-only line included: it closes the heading and its comment belongs to the container (C2-B-138). So text directly below a heading is a paragraph and two headings need no blank line between them. In 0.1 a heading was one line and an indented line below it was a paragraph.

Example 226 (unverified)

::: compare

```carve
== A long heading that
   continues here
and a paragraph
```

```html
<section id="A-long-heading-that-continues-here">
  <h2>A long heading that
continues here</h2>
  <p>and a paragraph</p>
</section>
```

:::

**C2-B-155** `=` and `#` may mix in one document, and `heading-marker-mixed` reports it.

A heading's attributes stand on the line above it (C2-B-091). A heading may stand on a marker line or after a quote mark (C2-B-057). Directly after a paragraph line a heading line is a lazy line (C2-B-024).

Example 173 (unverified)

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

Example 174 (generated)

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

Example 175 (unverified)

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

Example 176 (generated)

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

Example 177 (unverified)

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

Example 178 (unverified)

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

Example 179 (generated)

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

**C2-B-156** An include directive, `{{ ... }}` alone on its line, is a block of one line and not an interrupter, and the shape of the directive is carried over from 0.1.

**C2-B-157** A block image stays a paragraph while its lines are read, and the paragraph is promoted when it closes as exactly one block image line (C2-B-197). Comment-only lines below that line do not count (C2-B-137), for a block image as for a math block (C2-B-158).

**C2-B-158** A paragraph that closes as exactly one display math line (C2-B-198) is a math block, a fact set at close like the promotion of a block image.

**C2-B-197** A block image line is decided by its shape and not by inline parsing: the line consists of exactly one image form, `![alt](destination)` or `![alt][label]`, optional attribute blocks glued to it (C2-I-039), and trailing spaces. An image whose form runs over a line ending is not such a line.

**C2-B-198** A display math line is decided by its shape and not by inline parsing: the line consists of exactly one display math span, `$$` glued to a code span, optional attribute blocks glued to it, and trailing spaces. A span that closes on a later line is not such a line.

A table row (C2-B-166) is one line as well; a heading may continue on indented lines (C2-B-154). The reference engine that generated the two include examples reports the include as unresolved and prints the directive.

Example 180 (generated)

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

Example 181 (generated)

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

Example 182 (generated)

::: compare

```carve
![alt](a.png)
```

```html
<img src="a.png" alt="alt">
```

:::

Example 183 (generated)

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

Example 184 (generated)

::: compare

```carve
![a](a.png){.c}
```

```html
<img src="a.png" alt="a" class="c">
```

:::

Two images on one line are not a block image line, so the paragraph stays.

Example 185 (generated)

::: compare

```carve
![a](a.png) ![b](b.png)
```

```html
<p><img src="a.png" alt="a"> <img src="b.png" alt="b"></p>
```

:::

Example 186 (generated)

::: compare

```carve
$$`x^2`
```

```html
<p><span class="math display" role="math">\[x^2\]</span></p>
```

:::

Example 187 (generated)

::: compare

```carve
$$`x^2`
more
```

```html
<p><span class="math display" role="math">\[x^2\]</span>
more</p>
```

:::

## Thematic break

**C2-B-159** A thematic break is a line that holds three or more `*` and nothing else but trailing spaces and tabs, at any indent.

**C2-B-160** A run of hyphens or underscores and the spaced forms are not thematic breaks: they are text, or nested markers for `- - -` (C2-B-058), and `thematic-break-spelling` or `deprecated-spaced-thematic-break` reports them.

Directly after a paragraph line a star run is an interrupter (C2-B-200).

Example 188 (generated)

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

Example 189 (generated)

::: compare

```carve
  *****
```

```html
<hr>
```

:::

Example 190 (generated)

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

Example 191 (generated)

::: compare

```carve
text
***
```

```html
<p>text</p>
<hr>
```

:::

Example 192 (unverified)

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

**C2-B-161** Line 1 opens frontmatter when it is exactly three hyphens at column 0, optionally followed by a format name, glued or after one space, and then by trailing spaces and tabs.

**C2-B-162** The closer is a line that is exactly `---` plus trailing spaces and tabs.

**C2-B-163** An unclosed frontmatter block runs to the end of the document, and `unclosed-frontmatter` reports it with severity error.

**C2-B-164** The format name is `yaml`, `toml` or `json`, glued to the hyphens as in `---toml` or after one space as in `--- toml`, like the language of a code fence (C2-B-117); the glued form is canonical. Any other word leaves the line text. Without a name the format is YAML, for which the bare opener is the canonical form.

**C2-B-165** Only a byte-order mark may come before the opener, and a longer run of hyphens on line 1 is text.

The opener is taken without a scan for the closer (C2-B-189). A document that starts with a thematic break writes `***`.

Example 193 (generated)

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

Example 194 (generated)

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

Example 195 (generated)

::: compare

```carve
---
title: x

text
```

```html
```

:::

Example 196 (generated)

::: compare

```carve
---toml
a = 1
---

text
```

```html
<p>text</p>
```

:::

A byte-order mark stands before the opener (C2-B-165).

Example 197 (generated)

::: compare bom

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

Four hyphens on line 1 do not open frontmatter. The three lines are a paragraph, and a run of four hyphens in text is two en dashes.

Example 198 (unverified)

::: compare

```carve
----
title: x
----
```

```html
<p>––
title: x
––</p>
```

:::

## Tables

**C2-B-166** A table row is a line that starts with a pipe after the prefixes and ends with a pipe, after which only a row attribute and a line comment may follow (C2-B-167), with at least two pipes, so a pipe alone on a line is text. The closing pipe is a separator under C2-B-169: a line whose last pipe is escaped or stands inside a code span is not a row. The 0.1 engine read an escaped last pipe as the closer.

**C2-B-167** After its closing pipe a row may carry a row attribute, which is a brace block glued to that pipe or one space after it, and a trailing line comment.

**C2-B-168** A line that starts with a pipe and does not end as C2-B-166 says is text: the table ends there, the next row starts a new table, and `table-shaped-paragraph` reports the line.

**C2-B-169** Cells are split before their content is read: a pipe is not a separator when it is escaped or when it stands between a backtick run and its matching closing run on the same line.

**C2-B-170** A table ends at the first line that is neither a row nor a continuation row.

**C2-B-171** A cell prefix is the optional header cell mark `|=`, then an optional glued brace block. The space behind it is optional: `|=a|` is a header cell that holds `a`. Spaces and tabs at the start and at the end of a cell are padding and not content.

**C2-B-172** A cell that holds only a span mark, `<` or `^`, joins the cell to its left or the cell above.

**C2-B-173** A failed span is an empty cell.

**Exception C2-B-174** A row span does not cross the head boundary.

**C2-B-175** A continuation row starts with `+` and ends with a pipe, directly below a row or a continuation row. A comment-only line between them is skipped and does not break the adjacency (C2-B-137).

**C2-B-176** A fragment past the last column forms a new cell.

**Exception C2-B-177** Without the closing pipe a `+` line is text and ends the table.

**C2-B-178** The head of a table is its leading rows made only of header cells.

**C2-B-179** `header-rows` sets the number of head rows of a delimited table and of a list-table.

**C2-B-180** A delimited table, a `csv` or `tsv` fence that the `table` attribute marks, is always a table, and `delimited-table-malformed` reports bad quoting with severity error.

**C2-B-181** An unclosed quote in a delimited table runs to the end of the fence body, and `delimited-table-malformed` reports it with severity error: its cell holds everything after the quote character, line breaks and separators included, without the final line ending.

**C2-B-182** In the brace block of a cell prefix the alignment mark, `<`, `>` or `~`, comes first. The mark is not a part of the attribute grammar (C2-I-029): it is read before the parts, only in a cell prefix, and a block that holds nothing but the mark, as in `|={>} x |`, is valid there.

**C2-B-183** Spans resolve backward only: a span mark never joins a cell to its right or below.

**C2-B-184** Each fragment of a continuation row joins the cell of its column in the row above, with one space between the cell's text and the fragment, and an empty fragment adds nothing. Span marks are read from the first line of the row; a fragment whose column holds a span mark joins the cell that covers that column once spans are resolved, and under a span mark that fails it joins the empty cell the mark leaves (C2-B-173).

**C2-B-185** A fragment of a continuation row reads no cell prefix, no span mark and no row attribute.

**C2-B-186** On a pipe table `header-rows` has no effect on the head, and `deprecated-table-attribute` reports it.

**C2-B-187** `footer-rows` makes the last rows of a table its footer, counted among the rows below the head only: a head row is never a footer row, and a count larger than the rows below the head takes them all. In 0.1 a lone header row became the footer. `aligns`, `widths` and `header-cols` keep their 0.1 definitions (carried over from 0.1).

**C2-B-188** A list-table is a div named `list-table` whose body is a list of rows: the list-table extension defines it, it gives the same table as a pipe table, and this chapter does not restate it (carried over from 0.1).

A row is an interrupter (C2-B-019).

Example 199 (generated)

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

Example 200 (generated)

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

Example 201 (unverified)

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

Example 202 (generated)

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

Example 203 (generated)

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

Example 204 (generated)

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

Example 205 (generated)

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

Example 206 (generated)

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

Example 207 (generated)

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

Example 208 (generated)

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

Example 209 (generated)

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

Example 210 (unverified)

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

Example 211 (generated)

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

Example 212 (generated)

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

Example 213 (generated)

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

Example 214 (generated)

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

The first fragment is empty and adds nothing. The second joins with one space.

Example 215 (generated)

::: compare

```carve
| 1 | 2 |
+ | b |
```

```html
<table>
  <tbody>
    <tr><td>1</td><td>2 b</td></tr>
  </tbody>
</table>
```

:::

Example 216 (generated)

::: compare

```carve
| a \| b | c |
```

```html
<table>
  <tbody>
    <tr><td>a | b</td><td>c</td></tr>
  </tbody>
</table>
```

:::

Example 217 (generated)

::: compare

````carve
{table header-rows=2}
```csv
a,b
c,d
1,2
```
````

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
    <tr><th scope="col">c</th><th scope="col">d</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

The fragments hold a caret and a less-than sign as text, not as span marks (C2-B-185).

Example 218 (generated)

::: compare

```carve
| 1 | 2 |
+ ^ | < |
```

```html
<table>
  <tbody>
    <tr><td>1 ^</td><td>2 &lt;</td></tr>
  </tbody>
</table>
```

:::

The key does not make a head on a pipe table (C2-B-186).

Example 219 (unverified)

::: compare

```carve
{header-rows=1}
| a |
| b |
```

```html
<table header-rows="1">
  <tbody>
    <tr><td>a</td></tr>
    <tr><td>b</td></tr>
  </tbody>
</table>
```

:::

The quote on line 4 never closes, so the last cell holds the rest of the body.

Example 220 (unverified)

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

A line that is not a valid opener is text (C2-B-011).

**C2-B-189** Whether a line is an opener is decided on that line alone and never by whether a closer follows, so a construct with a closer of its own always opens (C2-B-111).

**C2-B-190** Nesting stops at depth 200, blocks and inlines together: each open quote, list, item, description list, description, footnote body and div counts one, each open inline node counts one, and past the cap an opener is text. A marker that opens two containers at once, a list and its item or a description list and its first description, is tested as one: when both do not fit, the whole marker is text and neither opens.

Example 221 (generated)

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

Example 222 (generated)

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

Example 223 (generated)

::: compare

```carve
%%%
hidden
```

```html
```

:::

## Facts set at close

**C2-B-191** Five facts are set on a node when its block closes and are not roles of a line: the promotion of a block image (C2-B-157), a math block (C2-B-158), the attachment of a caption (C2-B-147), the tightness of a list (C2-B-062) and the footer rows of a table (C2-B-187).

A streaming writer therefore buffers one paragraph, one captioned block, one list or one table.

The last row becomes the footer when the table closes.

Example 224 (generated)

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

Example 225 (generated)

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

Budget: at most 25 exceptions. Every normative statement of the chapter has a clause id.

| Construct | Clauses | Exceptions | Examples generated | Examples unverified |
|---|---|---|---|---|
| Preliminaries | 10 | 1 | 4 | 4 |
| Paragraphs and interrupters | 15 | 3 | 6 | 2 |
| Container ownership and stripping | 6 | 0 | 2 | 3 |
| Block quotes | 2 | 0 | 5 | 0 |
| Bullet lists | 3 | 0 | 3 | 0 |
| Ordered lists | 10 | 1 | 10 | 2 |
| Task items | 3 | 0 | 4 | 0 |
| Siblings, adjacency and the three-blank-line boundary | 7 | 1 | 5 | 1 |
| Nested lists and the marker line | 6 | 0 | 5 | 1 |
| Tightness | 5 | 0 | 2 | 3 |
| Description lists | 14 | 0 | 12 | 4 |
| Definitions | 9 | 0 | 7 | 4 |
| Attribute lines | 21 | 2 | 12 | 11 |
| Fences, divs and comment blocks | 10 | 0 | 7 | 4 |
| The fence opener and titles | 6 | 1 | 6 | 0 |
| Sigil divs | 11 | 0 | 11 | 1 |
| Comments | 14 | 4 | 13 | 4 |
| Captions | 5 | 0 | 12 | 2 |
| Headings | 5 | 0 | 3 | 5 |
| One-line constructs | 5 | 0 | 8 | 0 |
| Thematic break | 2 | 0 | 3 | 2 |
| Frontmatter | 5 | 0 | 5 | 1 |
| Tables | 23 | 2 | 18 | 4 |
| The fallback rule | 2 | 0 | 3 | 0 |
| Facts set at close | 1 | 0 | 2 | 0 |
| **Total** | **200** | **15** | **169** | **57** |

The chapter has 200 clauses, which is the accepted size, and 15 exceptions against a budget of 25. The clause count includes the exceptions. Clause ids are stable: a clause added after id 191 takes the next free number and stands at the end of its section, so ids are not in document order from there on.

## Not covered

This draft has no example for a list-table, for the depth cap or for a lone CR. The whole-table attributes, the shape of the include directive and the `start` attribute are referred to their 0.1 definitions. No question found while writing is open: the eight of the first draft are ruled and written into the clauses above.
