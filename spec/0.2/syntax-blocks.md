# Carve 0.2 Syntax: block structure

Status: freeze candidate 1 of Carve 0.2 on `next2`, frozen with the rest of the core (`STATUS.md`).

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

**C2-B-001** The role of a line depends only on that line, the stack of open blocks and five facts the scanner keeps about the lines directly above. The stack of open blocks is the open containers and, innermost, the open leaf with what its opener set: the kind of the leaf, the first line and the line count of a text leaf (C2-B-017, C2-B-157), the marker column of a heading (C2-B-154), the closer and the opener column of a fence (C2-B-109, C2-B-110), and the rows and head of a table (C2-B-178, C2-B-187). The five facts are: whether the line is line 1 of the document (C2-B-161), the pending attribute lines (C2-B-090), the number of blank lines directly above (C2-B-052), the block that closed directly above, for a caption (C2-B-146), and the blank lines held back at the end of an opaque body (C2-B-113). No rule reads a line below the current one.

**Exception C2-B-002** A pending attribute line (C2-B-092) is the one line whose role waits for the next line.

**C2-B-003** Columns count code points from 0, starting after the quote marks of the open quotes: column 0 of quoted content is the column directly behind the innermost quote mark and its one space.

**C2-B-004** A leading tab advances the column to the next multiple of 4, for counting only: the bytes are kept as written, also in code.

**C2-B-005** Tab stops count from the start of the line, not from a container's content column.

**C2-B-006** Only a space separates a marker or a quote mark from its content: a marker followed by a tab is text.

**C2-B-007** Indent stripping removes whole characters, so a tab that straddles the strip column is kept.

**C2-B-008** Prefixes are read outside-in, in the order the containers were opened: for a quote inside a list item the quote mark sits past the item's marker.

**C2-B-009** A blank line belongs to no container: the next line that is not blank decides which containers stay open, so an indented line belongs to its item after any number of blank lines. A quote is the exception: a blank line without its mark ends it at once (C2-B-032).

**C2-B-218** A U+0000 in the source is read as U+FFFD, in text, in code and in every other value, so a tree from a parse never holds U+0000 (C2-A-044). Offsets count the bytes of the source as it stands. An unpaired surrogate in the string a host passes is read as U+FFFD in the same way and counts three bytes. A source given as bytes is decoded as UTF-8 by the WHATWG decoder: each maximal subpart of an ill-formed sequence is read as one U+FFFD, and offsets still count the source bytes, so the U+FFFD spans the bytes it replaces, and a layout sidecar keeps such a source as bytes (C2-L-056). The bytes `61 FF 62` give the paragraph `a`, U+FFFD, `b`, whose characters span offsets 0 to 1, 1 to 2 and 2 to 3; the bytes `61 E2 82 62` give `a`, one U+FFFD over offsets 1 to 3, and `b`. A source is never refused for its encoding.

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

**C2-B-014** Interrupter (a): a fence line, which is a run of three or more backticks, colons or percent signs that opens or closes a fence, a div or a comment block (C2-B-108).

**C2-B-015** Interrupter (b): a list marker with content at an open list's column continues that list when its marker matches under C2-B-049. A marker left of every open list continues the outermost open list when its marker matches under C2-B-049 and the container that holds that list owns the line (C2-B-025); otherwise it closes the open lists and opens a new one, whatever its value, in the innermost container that owns the line (C2-B-228). A marker indented past an item's, description's or footnote body's marker opens a nested list without a blank line only when it is a bullet, a bare dot or an ordered marker of value 1. Below `- We moved in`, `  2024. It was good` is a lazy line. A nested list starting at another number stands after a blank line or directly on the marker line.

**C2-B-016** Interrupter (c): a description mark or a term mark with content at an open description list's column, or a definition line at column 0 while a definition is open.

**C2-B-017** Interrupter (d): a caption line (C2-B-146), only when the paragraph so far is exactly one block image line (C2-B-197) or one display math line (C2-B-198). A caret line that the container of the paragraph does not own is no caption line and is a lazy line, in an item as in a quote (C2-B-018): below `- ![](a.png)`, a line `^ cap` at column 0 is text of the item's paragraph.

**Exception C2-B-018** A caption line that does not carry the mark of an open quote, directly below a line of that quote, and owned by the container that holds the quote (C2-B-146), closes the quote and captions it, whatever the quote's last block is, and it is an interrupter when that block is an open paragraph. A caret line that the quote's container does not own, as at column 0 below a quote that sits in a list item, is a lazy line.

**C2-B-019** Interrupter (e): a table row (C2-B-166).

**C2-B-200** Interrupter (f): a thematic break (C2-B-159). A line of three or more stars and nothing else has no reading as prose. Like a fence line it interrupts wherever it stands: at an open list's column it closes the list, and indented past a marker it stays in that item.

**C2-B-020** Interrupters (b) and (c) count only on a line that carries the quote mark of every quote the list or the definition sits in, and a quote inside the item does not count.

**C2-B-021** A list marker line without the quote mark, while the paragraph sits in a quote inside an item, closes that quote: at the list's column it is a sibling item, and indented past the item's marker it opens a nested list in the item.

**Exception C2-B-022** A description list is not a list for interrupter (b): a list marker at its column, directly after term or description text, is a lazy line, and `list-marker-without-blank-line` reports it.

**Exception C2-B-023** A term mark never opens a nested description list without a blank line: directly after paragraph text inside an item it is a lazy line.

**C2-B-024** Every line that is not one of the six interrupters is a lazy line of an open paragraph. These lines are no interrupters and so are lazy lines: a heading, a quote, an attribute line, a definition, an include directive, a `%%` comment, and a list marker where no list is open.

Below an open paragraph an attribute line is a lazy line and waits for nothing, and a comment-only line below it is not seen by block structure (C2-B-137): the paragraph of the item takes both lines, and the comment is its child (C2-B-138).

Example 264 (unverified)

::: compare

```carve
. a
{c}
%%
```

```html
<ol>
  <li>a
{c}</li>
</ol>
```

:::

```json
{
  "type": "list",
  "marker": { "kind": "ordered", "style": "1", "delimiter": "." },
  "spacing": "tight",
  "children": [
    {
      "type": "list_item",
      "children": [
        {
          "type": "paragraph",
          "children": [
            { "type": "text", "value": "a" },
            { "type": "soft_break" },
            { "type": "text", "value": "{c}" },
            { "type": "soft_break" },
            { "type": "comment", "form": "line", "value": "" }
          ]
        }
      ]
    }
  ]
}
```

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

**C2-B-029** The content of a fence is stripped by at most the indent of its opener. Where the opener stands left of the content column of its item, the body is stripped by at most the opener's column.

**C2-B-030** A marker left of the list's column, directly after item text, is a sibling item (C2-B-015, C2-B-054), so markers that are right-aligned, as ` 9.` above `10.`, form one list. The list's column is then the column of that sibling's marker: after ` - a` and `- b`, the line ` 2. c` stands past the column of the list and is a lazy line of `b`. `uneven-list-indent` reports the uneven columns, and the formatter writes all markers at one column.

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
  <li>a</li>
  <li>b</li>
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

**C2-B-228** An interrupter closes the open paragraph, and the line is then read as a line with no paragraph open: C2-B-025 decides which containers own it, and an item, a description or a footnote body whose marker it is not indented past closes with every block inside it (C2-B-026). The lists inside a closed body are closed with it, so a list marker continues only a list whose container owns the line (C2-B-015, C2-B-054). This holds for every interrupter and every container whose body is its marker line and the lines indented past its marker. A line that is no interrupter stays a lazy line of the paragraph at any column (C2-B-012).

The paragraph `one` is open in the footnote body. The marker on line 5 is left of every open list, and the footnote does not own a line at column 0, so the footnote closes and the marker opens a list at the top level (C2-B-228).

Example 242 (unverified)

::: compare

```carve
Text[^n].

[^n]: note
  - one
- x
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<ul>
  <li>x</li>
</ul>
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

The marker need not match the list in the note: any value opens the new list (C2-B-015).

Example 243 (unverified)

::: compare

```carve
Text[^n].

[^n]: note
  1. one
2. x
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<ol start="2">
  <li>x</li>
</ol>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ol>
        <li>one</li>
      </ol>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

A description body closes the same way, and the description list closes with it. A list marker directly after description text stays a lazy line (C2-B-022); here the open paragraph is the item text `one`.

Example 244 (unverified)

::: compare

```carve
:: t
: d
  - one
- x
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <ul>
      <li>one</li>
    </ul>
  </dd>
</dl>
<ul>
  <li>x</li>
</ul>
```

:::

Plain text at column 0 is no interrupter, so it is a lazy line of `one` inside the note (C2-B-012).

Example 245 (generated)

::: compare

```carve
Text[^n].

[^n]: note
  - one
x
```

```html
<p>Text<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a>.</p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <ul>
        <li>one
x</li>
      </ul>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

The footnote body does not own a line at column 0, so the list inside it closes with it, and `- x` opens a list at the top level (C2-B-228). The unused definition writes nothing.

Example 258 (unverified)

::: compare

```carve
[^1]: - a
- x
```

```html
<ul>
  <li>x</li>
</ul>
```

:::

```json
[
  {
    "type": "footnote",
    "key": "1",
    "namespace": "footnote",
    "children": [
      {
        "type": "list",
        "marker": { "kind": "bullet", "char": "-" },
        "spacing": "tight",
        "children": [
          {
            "type": "list_item",
            "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "a" }] }]
          }
        ]
      }
    ]
  },
  {
    "type": "list",
    "marker": { "kind": "bullet", "char": "-" },
    "spacing": "tight",
    "children": [
      {
        "type": "list_item",
        "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "x" }] }]
      }
    ]
  }
]
```

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

**Exception C2-B-040** An uppercase marker with a dot, a letter or a roman numeral, needs two spaces before its content, so that an initial or an abbreviation at the start of a paragraph stays text: `A. Smith`, `II. Background` and `MD. Jones` are paragraphs. Every other marker needs one: a lowercase marker, digits, the bare dot, and an uppercase marker with `)`.

**C2-B-041** The list starts at the value of its first marker.

**C2-B-042** The first marker alone fixes the style: digits and the bare dot are one style, decimal, a lone `i` or `I` is roman, any other single letter is alphabetic, and two or more roman letters are roman.

**C2-B-043** The bare dot numbers automatically: it takes the next number, so digits with a dot and the bare dot are siblings in one list. A bare dot is no marker when the text behind its required space starts with another dot and a space, so `. . . and then silence` is a paragraph. A task box behind the space is read only after this test (C2-B-229).

**C2-B-044** A list meant as alphabetic that starts at `i`, and a list meant as roman that starts at `v`, `x`, `l`, `c`, `d` or `m`, split into two lists at the second item, and `ordered-list-kind-split` reports both.

**C2-B-219** A `start` value of more than nine digits is no start value, as a marker of more than nine digits is no marker (C2-B-036): the list keeps the start of its first marker and `start` stays a key.

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

**C2-B-046** A task box is `[`, one of the nine characters space, `x`, `X`, `_`, `/`, `!`, `-`, `>` and `?`, and `]`, directly after the required space of a bullet or ordered marker and followed by one space and at least one further character. Every ordered style and delimiter takes a box under the same conditions.

**C2-B-047** In every other case the brackets are inline content: `- [ ]` and `1. [ ]` with nothing after the box are plain items with that text, and a description mark takes no box.

**C2-B-048** The box character `X` is read as `x`.

Example 42 (unverified)

::: compare

```carve
- [ ] a
- [x] b
- [X] c
- [_] d
```

```html
<ul class="task-list">
  <li class="task" style="list-style: none"><input type="checkbox" disabled aria-label="a"> a</li>
  <li data-task-state="x" class="task" style="list-style: none"><input type="checkbox" checked disabled aria-label="b"> b</li>
  <li data-task-state="x" class="task" style="list-style: none"><input type="checkbox" checked disabled aria-label="c"> c</li>
  <li data-task-state="_" class="task" style="list-style: none"><input type="checkbox" disabled aria-label="d"> d</li>
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

Example 44 (unverified)

::: compare

```carve
1. [x] a
```

```html
<ol class="task-list">
  <li data-task-state="x" class="task"><input type="checkbox" checked disabled aria-label="a"> a</li>
</ol>
```

:::

Example 232 (unverified)

::: compare

```carve
II) [x] a
III) b
```

```html
<ol type="I" start="2" data-delim=")" class="task-list">
  <li data-task-state="x" class="task"><input type="checkbox" checked disabled aria-label="a"> a</li>
  <li>b</li>
</ol>
```

:::

Example 45 (unverified)

::: compare

```carve
- [ ] a
- b
```

```html
<ul class="task-list">
  <li class="task" style="list-style: none"><input type="checkbox" disabled aria-label="a"> a</li>
  <li>b</li>
</ul>
```

:::

**C2-B-229** A marker line is read in three steps. First the marker is tested on the text behind its required space, a task box included, as the bare dot is (C2-B-043). Then a task box is read directly after that space (C2-B-046). Then the content starts behind the box and its space. In `. [x] . x` the text behind the first dot is `[x] . x`, which does not start with a dot, so the dot is a marker, the item has a box, and its content `. x` is a nested ordered list (C2-B-058).

The item has no paragraph, so the box writes no `aria-label` (C2-H-174), and the space behind the box ends its line of HTML (C2-H-032).

Example 246 (unverified)

::: compare

```carve
. [x] . x
```

```html
<ol class="task-list">
  <li data-task-state="x" class="task"><input type="checkbox" checked disabled> 
    <ol>
      <li>x</li>
    </ol>
  </li>
</ol>
```

:::

## Siblings, adjacency and the three-blank-line boundary

**C2-B-049** A list marker at an open list's column is a sibling when it matches the list in bullet character, or in ordered style and delimiter. A task box is a fact of its item and not of the list: items with and without a box are siblings in one list. In 0.1 a boxed item and a plain item never shared a list.

**C2-B-050** A list marker at an open list's column that does not match closes that list and opens a new one.

**C2-B-051** One or two blank lines do not end a bullet list, an ordered list or a description list.

**C2-B-052** Three or more blank lines before a marker at the list's column end the list, and that marker starts a new one.

**C2-B-053** Two lists of the same kind in one container, with nothing between them but fewer than three blank lines and comment-only lines (C2-B-137), are one list. Any other block between them keeps them apart (C2-B-142).

**C2-B-054** Adjacency holds at any column for bullet and ordered lists: with no paragraph open, a marker left of every open list continues the list above it when it matches the outermost open list in kind (C2-B-049) and the container that holds that list owns the line (C2-B-025), and `uneven-list-indent` reports it. A description list has no kind and no adjacency across columns: a term mark or a description mark at another column than the open description list starts a new list.

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

**C2-B-056** A list marker with content, indented past the marker of an item, a description or a footnote body, opens a nested list there without a blank line, when it is a bullet or has the value 1 (C2-B-015): below `- a`, the line `  7. b` is a lazy line.

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

**C2-B-069** A term is one inline leaf: its text starts at the content column of its mark, so spaces and tabs behind the mark's one space are not part of it, and continues like paragraph text.

The term mark, its space and a tab: the tab stands before the content column and is not text of the term (C2-B-069).

Example 261 (unverified)

::: compare

```carve
:: 	x
: d
```

```html
<dl>
  <dt>x</dt>
  <dd>d</dd>
</dl>
```

:::

```json
{
  "type": "definition_list",
  "children": [
    { "type": "definition_term", "children": [{ "type": "text", "value": "x" }] },
    { "type": "definition_description", "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "d" }] }] }
  ]
}
```

**C2-B-070** A fence line or a table row directly below term text is an interrupter, and because a term owns no lines, it closes the description list, whatever its indent.

**C2-B-071** A term owns no lines: after a blank line, a line that is not a description line or a term line at the list's column closes the list, whatever its indent.

**C2-B-072** A description may start with any block on its marker line.

**C2-B-073** A description with one visible block has a bare paragraph. A comment and a definition are not visible blocks (C2-H-040).

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

**C2-B-083** A link definition is one line: `[label]:`, one or more spaces, a destination and an optional title, so a label and a colon followed by nothing or only spaces is text. The destination and the title are those of an inline link tail (C2-I-067, C2-I-068), except that the destination holds at least one character: a run without whitespace, then optionally exactly one space and a title in double or in single quotes, then only spaces. So `[a]: /u 'T'` has a title, in `[a]: /u"T"` and in `[a]: "T"` the quotes are part of the destination, and `[a]: /u  "T"` with two spaces is text. The label does not start with `^`: that shape is tested first and is a footnote definition (C2-B-082).

**C2-B-084** An abbreviation definition is one line: `*[label]:` with a label of one or more ASCII letters and digits, a space, and a plain-text expansion that is not empty. Exactly one space separates the colon from the expansion: every character after it belongs to the expansion, a leading space or tab included, except the spaces and tabs at the end of the line.

The expansion starts after the one separator space, so the second space is its first character (C2-B-084).

Example 241 (unverified)

::: compare

```carve
*[HTML]:  Hyper Text

HTML
```

```html
<p><abbr title=" Hyper Text">HTML</abbr></p>
```

:::

**C2-B-085** For a duplicate label the first definition wins, and `duplicate-footnote-definition`, `duplicate-link-reference-definition` or `duplicate-abbreviation-definition` reports the later one.

The first definition of `n` wins and renders; the later one stays in the tree, and resolution visits it like every other node (C2-A-025, C2-A-135), so its link carries `href`.

Example 262 (unverified)

::: compare

```carve
x[^n]

[^n]: a
[^n]: [x][d]

[d]: /u
```

```html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>a<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

```json
[
  {
    "type": "paragraph",
    "children": [{ "type": "text", "value": "x" }, { "type": "footnote_ref", "key": "n", "namespace": "footnote", "number": 1 }]
  },
  { "type": "footnote", "key": "n", "namespace": "footnote", "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "a" }] }] },
  {
    "type": "footnote",
    "key": "n",
    "namespace": "footnote",
    "children": [
      {
        "type": "paragraph",
        "children": [{ "type": "link", "key": "d", "namespace": "link", "refForm": "full", "href": "/u", "children": [{ "type": "text", "value": "x" }] }]
      }
    ]
  },
  { "type": "link_reference_definition", "key": "d", "namespace": "link", "href": "/u" }
]
```

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

**C2-B-097** An attribute line is a line like any other for ownership, so one that its container does not own closes that container (C2-B-026). It is neither a blank line nor a comment-only line, so two lists with an attribute line between them are not one list (C2-B-053).

**C2-B-098** The order inside a brace block is fixed in the tree and the output: the id, then the classes, then the language, then the keys, classes and keys each as written.

**C2-B-099** A key named `id` or `class`, in any ASCII letter case, folds into the id or the classes at parse time.

**C2-B-100** A brace block on a marker line closes on that line.

**C2-B-101** The attributes of an item or a cell abut the marker, as in `-{.i} b`.

**C2-B-102** Consecutive attribute lines merge into one.

**C2-B-103** The language part of a brace block, as in `{:en}`, is shorthand for the node's language field and is not a key.

**C2-B-104** When a brace block or a merged run of them holds several ids, the last id written wins.

**C2-B-105** An attribute block after an admonition name or after a fence language does not stop the block from opening, and `fence-opener-fallback` reports it with severity error.

**C2-B-106** The attributes of a link definition are merged into every link that uses it, and the link's own values win.

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

**C2-B-108** A run of three or more backticks opens a code fence; a run of tildes opens nothing and is text, where 0.1 and Markdown read it as a second fence character. A code block that holds a backtick fence takes a longer run (C2-B-110). Further, a run of three or more colons opens or closes a div, and a run of three or more percent signs opens a comment block. Text behind the percent run on the opener line, without the spaces and tabs before it, is the first line of the comment's value, as in 0.1.

**C2-B-109** The closer has the opener's character and at least its length, on a line owned by the same container, with no further column test.

**C2-B-110** The closer of a code fence and of a comment block is a bare run: a run followed by other text is content of the body.

**C2-B-111** An unclosed code fence, div or comment block ends with its container and never turns back into text, and `unclosed-code-fence`, `unclosed-container-fence` or `unclosed-comment-fence` reports it with severity error.

**C2-B-112** The body of a code fence is code and the body of a comment block is hidden: neither is read for blocks or inline content.

**C2-B-113** Blank lines at the end of an unclosed code fence, comment block or line block are not part of its body, so a trailing blank line never changes the tree.

**C2-B-114** The body of a code fence and of a comment block is opaque until its closer or the end of its container.

**C2-B-115** The body of a div is read as blocks.

**C2-B-116** A code fence whose info string is `=` directly followed by a format name is a raw block: its body goes to an output of that format as written and is not code (carried over from 0.1).

**C2-B-222** The value of a code block is its body lines, with one line feed after each line, including the last line when the end of input closes an unclosed fence. Trailing blank lines of an unclosed fence remain excluded under C2-B-113.

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

**C2-B-117** After the run, a code fence opener holds an optional language word, an optional quoted title and an optional label in brackets, in that order. A label in brackets, here and on a div opener (C2-B-119), is the text between `[` and the first `]` behind it (`bracket_label` in `data/line-shapes.json`), so it holds no `]`, and it holds no line break, since an opener is one line.

**Exception C2-B-118** A backtick run whose info string holds a backtick is not an opener.

**C2-B-119** After the run, a div opener holds an optional name or sigil, an optional quoted title and an optional label in brackets, in that order. A name stands after one or more spaces behind the run, like a sigil (C2-B-196): a name glued to the run, as in `:::note`, makes the line text. A title or a label may stand with no name before it, after one or more spaces behind the run as a name does: `:::  "T"` opens a div with a title, and `:::[x]` is text. Behind those spaces a sigil starts a sigil div also when further words are glued to it, and C2-B-122 reports the words: `::: >a` opens a quote fence. When neither a name, a sigil, a title nor a label starts there, the line still opens an anonymous div, and C2-B-122 reports what follows the spaces: `::: *` and `::: {.x}` open a div with no name. Such a line never closes a div (C2-B-125).

**C2-B-120** The quoted title of a code fence renders like a `title` attribute, which is also accepted on an attribute line. In the tree they are two things, the `title` field and a key (C2-A-032), and where both are written the key wins in HTML (C2-H-048). The quoted title of a div, an admonition or a directive is the `title` field of that node and renders as its title paragraph (C2-H-042). Its value, the text between the quotes, is an inline content of one line, read once the opener is split into its parts, so a `%%` after whitespace in it starts a line comment that ends at the closing quote (C2-I-023).

**C2-B-121** The label in brackets is metadata for a group extension, such as the tab label of a code group. On a code fence it renders nothing in the core (carried over from 0.1); on a div, an admonition and a directive the core writes it as a label paragraph (C2-H-154). It is a string in the tree (C2-A-187).

**C2-B-122** An unquoted title or further words in the info string do not stop the block from opening, and `fence-title-syntax` reports them. A raw fence (C2-B-116) and a sigil div (C2-B-196) take no title and no label: what follows the format or the sigil is further words in this sense, is not kept in the tree, and is reported. The 0.1 engine read such a line as text. A second space behind the backtick run leaves the opener with no language (the empty option of `code_fence_opener` in `data/line-shapes.json`), so what follows is further words: ```` ```  b ```` opens a code block with no language and `b` is reported.

Only spaces separate the parts of an opener (C2-B-006): behind a tab the quoted title is further words, reported and not kept (C2-B-122).

Example 263 (unverified)

::: compare

````carve
```js	"T"
x
```
````

```html
<pre><code class="language-js">x
</code></pre>
```

:::

```json
{ "type": "code_block", "value": "x\n", "syntax": "js" }
```

The backtick is the only fence character of a code block: a tilde run is text (C2-B-108).

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

Example 125 (unverified)

::: compare

```carve
~~~
code
~~~
```

```html
<p>~~~
code
~~~</p>
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

Example 127 (unverified)

::: compare

````carve
```a`b
x
````

```html
<p>```a`b
x</p>
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

**C2-B-225** A language word, a div name and a raw format name are each the longest run of their characters (refs `language_word`, `div_name` and `raw_format` in `data/line-shapes.json`). A raw format name starts with an ASCII letter and goes on with ASCII letters, digits, `_` and `-`. The first character behind the run that is not one of them ends the run; it is part of no name. Where it is not a space, a brace block there is an attribute block (C2-B-105) and any other character starts further words (C2-B-122). So `::: glossary>` opens the directive `glossary`, ```` ```js} ```` opens a code block with the language `js`, and ```` ```=html~ ```` opens a raw block with the format `html`, and `fence-title-syntax` reports `>`, `}` and `~`.

A name ends at the first character outside its set. What is glued behind it is reported and does not stop the block (C2-B-225, C2-B-105).

Example 233 (unverified)

::: compare

`````carve
::: glossary>
q
:::

```js}
code
```

```=html~
<b>x</b>
```

::: note{.x}
n
:::
`````

```html
<div class="glossary">
  <p>q</p>
</div>
<pre><code class="language-js">code
</code></pre>
<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;
</code></pre>
<aside class="admonition note" aria-label="Note">
  <p>n</p>
</aside>
```

:::

The title of a div is inline content, so its `%%` starts a comment that ends at the closing quote (C2-B-120).

Example 254 (unverified)

::: compare

```carve
::: note "a %% b"
c
:::
```

```html
<aside class="admonition note" aria-labelledby="adm-1">
  <p class="admonition-title" id="adm-1">a</p>
  <p>c</p>
</aside>
```

:::

```json
{
  "type": "admonition",
  "kind": "note",
  "title": [{ "type": "text", "value": "a" }, { "type": "comment", "form": "line", "value": "b" }],
  "children": [{ "type": "paragraph", "children": [{ "type": "text", "value": "c" }] }]
}
```

Two spaces after the run: the fence opens with no language, and the word is reported (C2-B-122).

Example 237 (unverified)

::: compare

````carve
```  b
text
```
````

```html
<pre><code>text
</code></pre>
```

:::

A title and a label with no name stand after one or more spaces; glued to the run, the line is text (C2-B-119).

Example 238 (unverified)

::: compare

```carve
:::  "T"
x
:::

::: [l]
z
:::

:::[x] y
```

```html
<div>
  <p class="admonition-title">T</p>
  <p>x</p>
</div>
<div>
  <p class="div-label">l</p>
  <p>z</p>
</div>
<p>:::[x] y</p>
```

:::

The first opener starts with the quote sigil, so it opens a quote fence; the second starts with no name, sigil, title or label, so it opens an anonymous div. `fence-title-syntax` reports `a` and `*` (C2-B-119, C2-B-122).

Example 240 (unverified)

::: compare

```carve
::: >a
x
:::

::: *
y
:::
```

```html
<blockquote><p>x</p></blockquote>
<div>
  <p>y</p>
</div>
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

**Exception C2-B-137** A *comment-only line*, a line that holds nothing but a line comment while no opaque body is open, is not a line for block structure. Ownership is tested first: where the container of an open opaque body does not own the line, that container closes with the body (C2-B-026, C2-B-111), and the line is then a comment-only line. Such a line is not seen by block structure: no rule that opens, continues, interrupts or closes a block sees it, and it counts neither as a content line nor as a blank line. So whatever its indent it closes no container, no heading and no table, a pending attribute line waits across it, it adds nothing to a count of blank lines, and it separates no caption from its block. Its comment is placed by C2-B-138.

**C2-B-138** The comment of a comment-only line, and a comment that stands alone after a marker or a quote mark, is a child of the open leaf when one is open, and otherwise a comment node of the innermost open container, whatever the line's indent.

**C2-B-139** Only the line form makes a comment-only line: a line that holds only a braced comment is a paragraph.

**C2-B-140** A paragraph that holds only comments and the breaks between them counts as content of its container and renders nothing: no empty paragraph element is written.

Example 266 (unverified)

::: compare

```carve
a

{%%}
{%%}

b
```

```html
<p>a</p>
<p>b</p>
```

:::

The middle paragraph holds two braced comments and the soft break between them, and renders nothing.

**C2-B-141** Block rules classify lines first, so a braced comment that would span an interrupter line is left unclosed and stays text, and `unclosed-braced-comment` reports it.

**C2-B-142** A `%%%` block at column 0 between two list items ends the first list and sits at top level, so there are two lists.

**C2-B-143** A line comment is an inline token and never an interrupter.

**Exception C2-B-144** In the body of a line block `%%` is text, and `comment-line-in-line-block` reports it.

**C2-B-145** A marker followed by a comment is the only spelling of an empty item, description, term or heading: there is no sentinel for an empty body.

**C2-B-199** The lint control comments and the region markers of an include are line comments that a tool reads, and their shapes keep their 0.1 definitions (carried over from 0.1). C2-B-215 to C2-B-217 state them.

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

**C2-B-215** A lint control comment is a line comment whose `%%` is followed by exactly one space and then by one of the keywords `carve-lint-disable-line`, `carve-lint-disable-next-line`, `carve-lint-disable` and `carve-lint-enable`. The keyword ends the comment, or is followed by spaces or commas and a list of rule ids separated by spaces or commas. No id means every rule. A keyword with another character glued to it, and a `%%` followed by two spaces, give no control comment. A control comment may stand on a comment-only line or behind content. It is a comment like any other: it renders nothing and changes no block. Text of this shape in a code span, a code block, raw content, a braced comment or a comment block controls nothing.

**C2-B-216** `carve-lint-disable-line` suppresses the named rules for the findings reported on its own line, and `carve-lint-disable-next-line` for those on the next line, also where that line belongs to another container. `carve-lint-disable` suppresses them from its own line to the end of the document, and `carve-lint-enable` lifts that from its own line. For each rule, the last of these two that names it, or names no rule, decides. An enable does not lift a line scope. A finding counts at the line it reports. In an included file the line scopes count the lines of that file, and a document scope ends with the file.

**C2-B-217** A region marker of an include is a line that holds, after optional spaces and tabs, a line comment whose content is `#region` and a name, or `#endregion` and an optional name, and after that only spaces and tabs. Spaces and tabs may stand between `%%` and the keyword and between the keyword and the name. The name is an ASCII letter or `_`, then ASCII letters, digits, `_` and `-`. The keywords are case-sensitive. A keyword run on by a letter, a digit or `_`, as in `#regional`, makes no marker; run on by any other character, as in `#region-x`, it makes a malformed marker, which an expansion reports. A `%%%` run opens a comment block and is never a marker. A marker renders nothing; what a region selects is the expansion's job.

Example 231 (generated)

::: compare

```carve
%% #region intro
%% carve-lint-disable-next-line empty-link-destination
See [a]().

See [b](). %% carve-lint-disable-line

See [c]().
%% #endregion intro
```

```html
<p>See <a href="">a</a>.</p>
<p>See <a href="">b</a>.</p>
<p>See <a href="">c</a>.</p>
```

:::

The `%%` line at column 0 is not owned by the item, so the item closes with its open fence, and the line is then a comment-only line of the document (C2-B-137). The indented `b` that follows opens a paragraph, since no list is open.

Example 256 (unverified)

::: compare

````carve
- ```
  a
%% c
  b
````

```html
<ul>
  <li>
    <pre><code>a
</code></pre>
  </li>
</ul>
<p>b</p>
```

:::

```json
[
  {
    "type": "list",
    "marker": { "kind": "bullet", "char": "-" },
    "spacing": "tight",
    "children": [{ "type": "list_item", "children": [{ "type": "code_block", "value": "a\n" }] }]
  },
  { "type": "comment", "form": "line", "value": "c" },
  { "type": "paragraph", "children": [{ "type": "text", "value": "b" }] }
]
```

The attribute line reaches no block, so at the end of the quote it is a paragraph of text (C2-B-192). That paragraph stands on the line above the comment, so it comes first among the children of the quote (C2-A-145).

Example 257 (unverified)

::: compare

```carve
> {.a}
%% x
```

```html
<blockquote><p>{.a}</p></blockquote>
```

:::

```json
{
  "type": "block_quote",
  "children": [
    { "type": "paragraph", "children": [{ "type": "text", "value": "{.a}" }] },
    { "type": "comment", "form": "line", "value": "x" }
  ]
}
```

## Captions

**C2-B-146** A caption line is `^`, one or more spaces and content, directly below its block with no blank line and owned by the same container as that block, with no column test.

**C2-B-147** A caption attaches to one of six blocks: an image, a table, a code block, a quote, a math block or a figure group. A code include, an include whose valid options hold `code`, takes a caption too, which its expansion gives to the block it becomes (C2-N-073).

**C2-B-148** A caption is paragraph-like: its text takes lazy lines and ends as a paragraph does, so a second caption line directly below a caption continues the first.

**C2-B-149** After a blank line or below any other block a caption line is text, and `unattached-caption` reports it.

A raw block is not one of the six blocks of C2-B-147, so the caret line below it is text (C2-B-149).

Example 265 (unverified)

::: compare

````carve
```=html
<b>x</b>
```
^ cap
````

```html
<pre><code class="language-html">&lt;b&gt;x&lt;/b&gt;
</code></pre>
<p>^ cap</p>
```

:::

```json
[
  { "type": "raw_block", "format": "html", "value": "<b>x</b>\n" },
  { "type": "paragraph", "children": [{ "type": "text", "value": "^ cap" }] }
]
```

**C2-B-150** The first bare `#` in a caption's text is the caption number mark, and the sequences and the label word that selects one keep their 0.1 definition (carried over from 0.1). C2-B-207 and C2-B-208 state the mark and the label, and C2-H-149 to C2-H-151 the numbering.

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

**C2-B-207** The mark is the first `#` in the top-level inline content of a caption that is followed by whitespace, `:`, `.`, the end of the caption or a character that cannot start a tag name (C2-I-092). A `#` before a tag-name character is a tag or text, so `#1` is text. `\#` is a literal `#`. A `#` inside inline markup, such as emphasis, a link or a span, is no mark. Every `#` after the mark is text.

**C2-B-208** The label of a caption with a mark is its inline content before the mark, without trailing whitespace. Its sequence key is the plain text of the label, computed as for a heading (C2-H-143), except that a symbol gives the text the caption writes for it (C2-H-101). So `*Figure* #` and `Figure #` have the key `Figure`, a comment in the label changes no key, and `^ #` has the empty key. Keys are compared exactly, case included.

## Headings

**C2-B-151** A heading is one to six `=`, one space and at least one further character that is not a space or a tab, so seven or more markers or a bare marker run are text.

**C2-B-152** `#` is accepted in place of `=`.

**C2-B-153** Everything after that space is inline content: trailing marker characters and a brace block are heading text.

**C2-B-154** A heading holds its marker line and every line directly below it that is indented past the column of its marker, each joined by a soft break, or by a hard break where the line above ends in a backslash (C2-I-102). A continuation line is a lazy line of the heading as of a paragraph (C2-B-012), so it ends where a paragraph ends (C2-B-013): at a blank line and at every interrupter (C2-B-014 to C2-B-020, C2-B-200), which are a fence line, a table row and a thematic break anywhere, and inside an item a list marker that is indented past the item's marker. Ownership comes first, as for every line (C2-B-025, C2-B-026), and the column is counted behind the marks of the open quotes (C2-B-003): a line that lacks the mark of an open quote closes that quote, so below `> > # H` the line `>   cont` is a paragraph of the outer quote. A line that is not indented past the marker starts a new block; a comment-only line is no such line (C2-B-137), so its comment is a child of the heading (C2-B-138) and an indented line below it still continues the heading. So text directly below a heading is a paragraph and two headings need no blank line between them. In 0.1 a heading was one line and an indented line below it was a paragraph.

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

A comment-only line at column 0 does not close the heading, and its comment renders nothing (C2-H-069).

Example 248 (unverified)

::: compare

```carve
= Title
%% note
  continues
```

```html
<section id="Title-continues">
  <h1>Title
continues</h1>
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

**C2-B-156** An include directive, `{{ ... }}` alone on its line, is a block of one line and not an interrupter, and the shape of the directive is carried over from 0.1. C2-B-201 to C2-B-206 state it, and the Includes document (`includes.md`) states its expansion.

**C2-B-157** A block image stays a paragraph while its lines are read, and the paragraph is promoted when it closes as exactly one block image line (C2-B-197). A comment-only line is not a line of the paragraph (C2-B-137, C2-B-138), so comment-only lines below that line leave it one line, for a block image as for a math block (C2-B-158).

**C2-B-158** A paragraph that closes as exactly one display math line (C2-B-198) is a math block, a fact set at close like the promotion of a block image.

**C2-B-197** A block image line is decided by its shape and not by inline parsing: the line consists of exactly one image form, `![alt](destination)`, `![alt][label]` or the collapsed `![alt][]`, optional attribute blocks glued to it (C2-I-039), and trailing spaces. The label, which in the collapsed form is the alt text, must be a label under C2-I-079, so `![ ][]` is no such line. An image whose form runs over a line ending is not such a line.

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

**C2-B-201** An include directive is `{{`, one or more spaces, a path, an optional section, zero or more options, one or more spaces and `}}`, with only spaces and tabs after it on the line. Spaces before the section and before each option are optional: `{{ a.crv#s@shift:1 }}` is a directive. A tab is not such a space, so `{{` followed by a tab is text. The closing `}}` is the first one outside a quoted path and a quoted value, so a quoted run may hold `}}`.

**C2-B-202** A path is bare or quoted. A bare path is one or more characters, none of them a space, `#`, `@`, `}`, `"` or `“` (U+201C), so a bare path ends at the section or at the first option. A double-quoted path is `"`, one or more characters and `"`: a backslash takes the next character with it, and an unescaped `"` and a line end do not occur. Its value is read like a quoted attribute value (C2-I-033): a backslash before an ASCII punctuation character is dropped, and a backslash before any other character stays, so `"a\.crv"` names `a.crv` and `"notes\new.crv"` names `notes\new.crv`. A path in curly quotes, `“`, one or more characters other than `”` and `”`, is read as written, with no escape. An empty path in any form makes the line text (`empty-include-path`).

**C2-B-203** A section is `#` and a name: an ASCII letter, digit or `_`, then ASCII letters, digits, `_` and `-`. A directive holds at most one section. The section names a heading or a block of the included file by its id; selecting it is the expansion's job (C2-N-027 to C2-N-031).

**C2-B-204** An option is `@`, a key and, optionally, `:` and a value. The key is an ASCII letter or `_`, then ASCII letters, digits, `_` and `-`. An unquoted value is one or more characters that are not `@`, `}`, a space, a tab or a line end, so an unquoted value ends at the next option: `@shift:1@lines:1-8` is two options. A value that starts with `"` or `'` is a quoted value as in C2-I-033, and may hold `@`, spaces and `}}`. Outside `cols`, quoting a value only delimits it: `@lines:"1-2"` is `@lines:1-2`.

**C2-B-205** The six keys and the shape of each value are listed in `data/include-options.json`. `lines` and `rows` take a range `N-M`: two decimal numbers without a leading zero, the first at least 1 and not greater than the second. `region` takes an ASCII letter or `_`, then ASCII letters, digits, `_` and `-`. `cols` takes a range or a double-quoted list of column names separated by commas, in which each name is not empty and a backslash takes the next character. `shift` takes `auto` or a decimal integer of one to nine digits with an optional `+` or `-`, as a list marker has at most nine digits (C2-B-219); a longer number is outside the shape. `code` stands alone or takes a language: one or more ASCII letters, digits and `-`, `_`, `+`, `#`, `.`, `/`.

**C2-B-206** The basic shape of a directive is `{{`, a path, at most one section, any number of options of the form `@key` or `@key:value`, and `}}`, alone on its line, as C2-B-201 to C2-B-204 spell them. Every line of the basic shape is an include directive: the keys and the value shapes of C2-B-205 do not change the block. An option is invalid when its key is not one of the six, when its value is outside the shape of its key, when it has no value and `data/include-options.json` needs one, or when its key stood earlier in the directive. An invalid option has no effect on the tree: the node keeps it as written (C2-A-181), `include-option-invalid` reports it, and the expansion leaves an include that holds one unexpanded (C2-N-025). Whether two selection options may stand together, and every other rule about the content an include brings in, belong to the expansion (C2-N-024).

Example 227 (unverified)

::: compare

```carve
{{ "my file.crv"   #Intro @shift:1 @lines:1-5 }}
```

```html
<p>{{ "my file.crv" #Intro @lines:1-5 @shift:1 }}</p>
```

:::

An option out of shape and an unknown key leave the include, and the node keeps both as written (C2-B-206).

Example 228 (unverified)

::: compare

```carve
{{ a.crv @shift:x @size:2 }}
```

```html
<p>{{ a.crv @shift:x @size:2 }}</p>
```

:::

Nine digits are a shift; ten are outside the shape, so the option is invalid and kept as written (C2-B-205, C2-B-206).

Example 236 (unverified)

::: compare

```carve
{{ a.crv @shift:-123456789 }}

{{ a.crv @shift:1234567890 }}
```

```html
<p>{{ a.crv @shift:-123456789 }}</p>
<p>{{ a.crv @shift:1234567890 }}</p>
```

:::

A collapsed image whose alt text holds only a space has no label (C2-I-079), so the line is no block image line and the caret line is a lazy line of the paragraph (C2-B-197).

Example 255 (unverified)

::: compare

```carve
![ ][]
^ cap
```

```html
<p>![ ][]
^ cap</p>
```

:::

```json
{
  "type": "paragraph",
  "children": [
    { "type": "text", "value": "![ ][]" },
    { "type": "soft_break" },
    { "type": "text", "value": "^ cap" }
  ]
}
```

`code` takes a language of one or more characters, so an empty quoted value is outside its shape: the option is invalid and kept as written (C2-B-205, C2-B-206).

Example 259 (unverified)

::: compare

```carve
{{ a.crv @code:"" }}
```

```html
<p>{{ a.crv @code:"" }}</p>
```

:::

```json
{ "type": "include", "path": "a.crv", "invalid": ["@code:\"\""] }
```

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

**C2-B-164** The format name is one word: a lowercase ASCII letter, then lowercase ASCII letters, digits and hyphens. It stands glued to the hyphens, as in `---toml`, or after one space, as in `--- toml`, like the language of a code fence (C2-B-117); the glued form is canonical. Any word of that shape is a format name; `yaml`, `toml` and `json` are the usual ones, and the parser does not read the body for any of them. The word is the only thing on the line: a second word, an uppercase letter or two spaces leave the line text. Without a name the format is YAML, for which the bare opener is the canonical form. As in 0.1.

**C2-B-165** Only a byte-order mark may come before the opener, and a longer run of hyphens on line 1 is text. A byte-order mark at the start of the source is not content: it is skipped before line 1 is read, whatever line 1 holds, and offsets count its bytes (C2-A-141). It is no code point of line 1, so the first character behind it has the column it would have without the mark.

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

**C2-B-166** A table row is a line that starts with a pipe after the prefixes and ends with a pipe, after which only a row attribute and a line comment may follow (C2-B-167), with at least two pipes, so a pipe alone on a line is text. The closing pipe is a separator under C2-B-169: a line whose last pipe is escaped or stands inside a code span is not a row. The closing pipe is the last pipe of the line, also where a line comment stands before it: `| a | b | %% note | x` does not end with a pipe and is text (C2-B-168). The 0.1 engine read an escaped last pipe as the closer. A row of hyphens and colons, the separator row of a Markdown table, is an ordinary body row: it marks no head and sets no alignment (C2-A-095).

**C2-B-167** After its closing pipe a row may carry a row attribute, which is a brace block glued to that pipe or one space after it, and a trailing line comment. The comment stands after whitespace, as C2-B-133 requires: `| a |%% x` and `||%%` do not end with a pipe and are text (C2-B-168). The comment stands in the tree as a comment-only line directly below the row would (C2-A-086).

**C2-B-168** A line that starts with a pipe and does not end as C2-B-166 says is text: the table ends there, the next row starts a new table, and `table-shaped-paragraph` reports the line.

**C2-B-169** Cells are split before their content is read: a pipe is not a separator when it is escaped or when it stands between a backtick run and its matching closing run on the same line.

**C2-B-223** Every cell is a separate inline content, and so is every fragment of a continuation row (C2-B-184). An inline construct never crosses a cell boundary or a row, so a backtick run whose closing run is not in its cell or fragment is text (C2-I-017).

**C2-B-224** An escaped pipe is a literal pipe in cell text before inline parsing, including a link destination, an image destination, an image label and a reference label. The list is complete: in a code span `\|` stays two characters, and in other cell text it is an ordinary escape. The key of a reference label in a cell holds `|`; outside a cell it holds `\|` (C2-I-079).

**C2-B-170** A table ends at the first line that is neither a row nor a continuation row.

**C2-B-171** A cell prefix is the optional header cell mark `|=`, then an optional run of glued brace blocks, merged into one (C2-B-093). The space behind it is optional: `|=a|` is a header cell that holds `a`. Spaces and tabs at the start and at the end of a cell are padding and not content.

**C2-B-172** A cell that holds only a span mark, `<` or `^`, joins the cell to its left or the cell above when that cell stands in the same group of the table (C2-B-174). A `<` in the first column, a `<` whose left cell is covered by a row span from above, a `^` in the first row of its group and a `^` below a cell that spans more than one column join nothing (C2-B-173): in `|a|<|` above `|^|b|`, the `^` is the text of its cell.

**C2-B-173** A span mark that joins nothing is an ordinary cell that holds the mark as text, and `table-span-marker-blocked` reports it. Its prefix applies as on any cell (C2-B-171): `|= ^ |` in the first row is a header cell that holds `^`.

**C2-B-174** The head, the body and the foot are the groups of a table, and no span crosses from one into another. For the head test (C2-B-178) a `<` with a cell to its left and a `^` below a cell of one column are part of that cell and add no cell to their row, but such a mark with the header mark counts as a header cell; any other span mark counts as the cell it is. So `|= H | < |` is a head row, and below `|= H |` the row `| ^ |` has no header cell and is none. The prefix of a mark that joins is kept for nothing else, and `table-span-marker-attribute` reports a brace block in it, and a header mark on it that does not make its row a head row, as on `|= ^ |` below `| a |`.

**C2-B-175** A continuation row starts with `+` and ends with a pipe, directly below a row or a continuation row. A comment-only line between them does not break the adjacency (C2-B-137).

**C2-B-176** A fragment past the last column forms a new cell.

**Exception C2-B-177** Without the closing pipe a `+` line is text and ends the table.

**C2-B-178** The head of a table is its leading rows that have a header cell and no other cell (C2-B-174).

**C2-B-179** `header-rows` sets the number of head rows of a delimited table and of a list-table. C2-B-209 and C2-B-210 state its default and its value.

**C2-B-180** A delimited table, a `csv` or `tsv` fence that the `table` attribute marks, is always a table, and `delimited-table-malformed` reports bad quoting with severity error.

**C2-B-181** An unclosed quote in a delimited table runs to the end of the fence body, and `delimited-table-malformed` reports it with severity error: its cell holds everything after the quote character, line breaks and separators included, without the final line ending.

**C2-B-182** In the brace block of a cell prefix the alignment mark, `<`, `>` or `~`, comes first. The mark is not a part of the attribute grammar (C2-I-029): it is read before the parts, only in a cell prefix, and a block that holds nothing but the mark, as in `|={>} x |`, is valid there.

**C2-B-183** Spans resolve backward only: a span mark never joins a cell to its right or below.

**C2-B-184** Each fragment of a continuation row joins the cell of its column in the row above, and an empty fragment adds nothing. Each fragment is an inline content by itself (C2-B-223), so every inline form opens and closes inside one physical row, and an opener whose closer is not in its own fragment is text, as at the end of a cell. The cell holds the nodes of its fragments in order, with one space of text between two fragments: `` `a `` continued by `` b` `` is the text `` `a b` ``. Span marks are read from the first line of the row; a fragment whose column holds a span mark joins the cell that covers that column once spans are resolved, and under a span mark that joins nothing it joins the cell that holds the mark (C2-B-173).

**C2-B-185** A fragment of a continuation row reads no cell prefix, no span mark and no row attribute.

**C2-B-186** On a pipe table `header-rows` has no effect on the head, and `deprecated-table-attribute` reports it.

**C2-B-187** `footer-rows` makes the last rows of a table its footer, counted among the rows below the head only: a head row is never a footer row, and a count larger than the rows below the head takes them all. In 0.1 a lone header row became the footer. `header-cols` keeps its 0.1 definition, and `aligns` and `widths` keep theirs except that a list with an invalid entry now has no effect at all. C2-B-210 to C2-B-214 and C2-B-227 state them.

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

Example 209 (unverified)

::: compare

```carve
| a | b |
| < | c |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>&lt;</td><td>c</td></tr>
  </tbody>
</table>
```

:::

The left cell of the `<` is covered by the row span of `a`, so the `<` joins nothing and is the text of its cell (C2-B-172).

Example 252 (unverified)

::: compare

```carve
| a | b |
| ^ | < |
```

```html
<table>
  <tbody>
    <tr><td rowspan="2">a</td><td>b</td></tr>
    <tr><td>&lt;</td></tr>
  </tbody>
</table>
```

:::

```json
{
  "type": "table",
  "columns": [{ "type": "table_column" }, { "type": "table_column" }],
  "children": [
    {
      "type": "table_body",
      "children": [
        {
          "type": "table_row",
          "children": [
            {
              "type": "table_cell",
              "header": false,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "a" }] }],
              "rowspan": 2
            },
            {
              "type": "table_cell",
              "header": false,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "b" }] }]
            }
          ]
        },
        {
          "type": "table_row",
          "children": [
            { "type": "table_cell", "header": false, "span": "rowspan", "children": [] },
            {
              "type": "table_cell",
              "header": false,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "<" }] }]
            }
          ]
        }
      ]
    }
  ]
}
```

The row of a bare `^` has no header cell, so it is a body row (C2-B-174). The row span would cross from the head into the body, so the mark joins nothing and is the text of its cell.

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
    <tr><td>^</td></tr>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

A `^` with the header mark in the first row is a header cell that holds the mark. The foot starts a group, so its `^` joins nothing either (C2-B-173, C2-B-174).

Example 250 (unverified)

::: compare

```carve
{footer-rows=1}
|= ^ |= A |
| 1 | 2 |
| ^ | 3 |
```

```html
<table>
  <thead>
    <tr><th scope="col">^</th><th scope="col">A</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
  <tfoot>
    <tr><td>^</td><td>3</td></tr>
  </tfoot>
</table>
```

:::

The `^` stands in the first row, so it joins nothing and is a data cell; the row then has a cell that is no header cell and is a body row (C2-B-173, C2-B-178).

Example 260 (unverified)

::: compare

```carve
|=|^|
```

```html
<table>
  <tbody>
    <tr><th scope="row"></th><td>^</td></tr>
  </tbody>
</table>
```

:::

```json
{
  "type": "table",
  "columns": [{ "type": "table_column" }, { "type": "table_column" }],
  "children": [
    {
      "type": "table_body",
      "children": [
        {
          "type": "table_row",
          "children": [
            {
              "type": "table_cell",
              "header": true,
              "children": [{ "type": "cell_paragraph", "children": [] }]
            },
            {
              "type": "table_cell",
              "header": false,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "^" }] }]
            }
          ]
        }
      ]
    }
  ]
}
```

With the header mark the row of a `^` is a head row, so the mark joins the header cell above it. The covered row writes no cell (C2-H-058), and the mark stays in the tree as an empty cell (C2-A-092).

Example 251 (unverified)

::: compare

```carve
|= H |
|= ^ |
| a |
```

```html
<table>
  <thead>
    <tr><th rowspan="2" scope="col">H</th></tr>
    <tr></tr>
  </thead>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

```json
{
  "type": "table",
  "columns": [{ "type": "table_column" }],
  "children": [
    {
      "type": "table_head",
      "children": [
        {
          "type": "table_row",
          "children": [
            {
              "type": "table_cell",
              "header": true,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "H" }] }],
              "rowspan": 2
            }
          ]
        },
        {
          "type": "table_row",
          "children": [{ "type": "table_cell", "header": false, "span": "rowspan", "children": [] }]
        }
      ]
    },
    {
      "type": "table_body",
      "children": [
        {
          "type": "table_row",
          "children": [
            {
              "type": "table_cell",
              "header": false,
              "children": [{ "type": "cell_paragraph", "children": [{ "type": "text", "value": "a" }] }]
            }
          ]
        }
      ]
    }
  ]
}
```

A brace block on a mark that joins is kept nowhere: the tree is that of Example 251, and `table-span-marker-attribute` reports the block (C2-B-174).

Example 253 (unverified)

::: compare

```carve
|= H |
|={.x} ^ |
| a |
```

```html
<table>
  <thead>
    <tr><th rowspan="2" scope="col">H</th></tr>
    <tr></tr>
  </thead>
  <tbody>
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

A code span cannot cross rows: each backtick is text in its own fragment (C2-B-184).

Example 249 (unverified)

::: compare

```carve
| `a | 1 |
+ b` | 2 |
```

```html
<table>
  <tbody>
    <tr><td>`a b`</td><td>1 2</td></tr>
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
<table>
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

**C2-B-209** The head of a delimited table is its first row unless `header-rows` gives a count (C2-B-210). A count N makes the first N rows the head, and 0 gives a table with no head. A count larger than the number of rows is the number of rows, so every row is in the head, and `table-row-count-clamped` reports the count.

**C2-B-221** The tree holds the effective partition of C2-B-209 in its groups and no count (C2-A-088). The sidecar records the effective count as `headerRows` (C2-L-057), and the writer writes that count (C2-W-066): `header-rows=5` on a table of two rows gives the tree of `header-rows=2`, a head of both rows and no body. `footer-rows` counts on a delimited table as on a pipe table, from the last row upward and only below the head (C2-B-187), so where the two counts together exceed the rows the head takes its rows first: `header-rows=2 footer-rows=2` on three rows gives a head of two rows and a footer of one.

**C2-B-210** The value of `header-rows` and of `footer-rows` is a count: one or more decimal digits. An empty value counts as 1. A count is valid only in this form. Any other value is invalid, and the attribute then has no effect: the table keeps the partition it has without the attribute. A valid count takes effect also where it equals the default or selects no row.

**C2-B-211** `aligns` is a list of entries separated by commas. The entry at position N sets the horizontal alignment of column N, and spaces around an entry are ignored. An entry is `left`, `right` or `center` and sets `align` of that `table_column`. The whole value is checked before any entry is applied: every entry, one past the last column included, must have this form, and an empty or malformed entry makes the whole value invalid, so that it sets no column. Entries past the last column set nothing. Fewer entries than columns are valid: the remaining columns stay unset, and `table-column-arity` reports it.

**C2-B-212** `widths` is a list of entries separated by commas, by position like `aligns`, and its whole value is checked in the same way before any entry is applied (C2-B-211). An entry is a decimal number greater than 0 and at most 100. It is a percentage of the table width, and sets `width` of that `table_column` to the number divided by 100: `25` gives `0.25`. An empty entry or any other entry makes the whole value invalid, so that it sets no column. Entries past the last column set nothing, and fewer entries are valid. The widths need not total 100; `table-width-total` reports a total above 100.

**C2-B-220** A decimal number in a `widths` entry is one or more ASCII digits, optionally followed by a dot and one or more ASCII digits. `30.5` and `5` are entries; `.5`, `5.`, `1e1` and `+5` are not, and such an entry makes the value invalid (C2-B-212).

**C2-B-213** The alignment of a cell is resolved for each axis on its own. The cell's own alignment mark (C2-B-182) wins. Then comes the mark of the header cell in the head that starts in the cell's column, then the `aligns` entry of that column. Otherwise the cell has no alignment. A mark on any other cell applies to that cell only, and a header cell that spans several columns gives its mark only to the column it starts in. Where a head mark and an `aligns` entry both set a column, `table-column-overlap` reports it. The vertical axis has no table attribute: only cell marks set it, and a `valigns` key on a table is an ordinary key, not one of the table attributes of `data/table-marks.json`.

**C2-B-214** `header-cols` has no effect on a pipe table or a delimited table: there it is an ordinary key. The list-table extension reads it.

**C2-B-227** A table reads `aligns`, `widths`, `header-rows` and `footer-rows` from its `attrs`. A key whose value is valid and that applies to the table form is removed from `attrs` once its effect is recorded in the tree, in the groups or in the column fields (C2-A-088, C2-A-089). A valid count that the table clamps (C2-B-187, C2-B-209) is consumed too. A key whose value is invalid (C2-B-210 to C2-B-212), and `header-rows` on a pipe table (C2-B-186), has no effect and stays in `attrs`. Lint reports a kept invalid value as `table-attribute-invalid`; `deprecated-table-attribute` reports `header-rows` on a pipe table.

Example 229 (generated)

::: compare

```carve
{aligns="left,left,center" widths="25,25"}
|={>} Name |={<} Qty |= Note |
| tea |{~} 2 | hot |
| milk | 3 | cold |
```

```html
<table>
  <colgroup>
    <col style="width: 25%;">
    <col style="width: 25%;">
    <col>
  </colgroup>
  <thead>
    <tr><th scope="col" style="text-align: right;">Name</th><th scope="col" style="text-align: left;">Qty</th><th scope="col" style="text-align: center;">Note</th></tr>
  </thead>
  <tbody>
    <tr><td style="text-align: right;">tea</td><td style="text-align: center;">2</td><td style="text-align: center;">hot</td></tr>
    <tr><td style="text-align: right;">milk</td><td style="text-align: left;">3</td><td style="text-align: center;">cold</td></tr>
  </tbody>
</table>
```

:::

One malformed entry makes each list invalid, so no column is set and both keys stay in `attrs`. No key is written as an HTML attribute (C2-B-227, C2-H-153).

Example 239 (unverified)

::: compare

```carve
{aligns=right,x widths=25,,25 footer-rows=two .t}
| a | b |
| c | d |
```

```html
<table class="t">
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>c</td><td>d</td></tr>
  </tbody>
</table>
```

:::

Example 230 (unverified)

:::: compare

````carve
{table}
```csv
Name,Price
tea,2
```

{table header-rows=0}
```csv
a,b
```

{table header-rows=5}
```csv
a,b
c,d
```
````

```html
<table>
  <thead>
    <tr><th scope="col">Name</th><th scope="col">Price</th></tr>
  </thead>
  <tbody>
    <tr><td>tea</td><td>2</td></tr>
  </tbody>
</table>
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
  </tbody>
</table>
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b</th></tr>
    <tr><th scope="col">c</th><th scope="col">d</th></tr>
  </thead>
</table>
```

::::

A pipe table and a delimited table with the same cells in the same groups give equal trees, also where the delimited table declares its partition (C2-A-088, C2-L-023): Examples 267 and 268 have the same tree and the same HTML. The count `0` is a fact of the sidecar of Example 268 (C2-L-057).

Example 267 (unverified)

::: compare

```carve
| a | b |
| 1 | 2 |
```

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

Example 268 (unverified)

::: compare

````carve
{table header-rows=0}
```csv
a,b
1,2
```
````

```html
<table>
  <tbody>
    <tr><td>a</td><td>b</td></tr>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

**C2-B-226** The body of a delimited table is read as records, in the manner of RFC 4180. The separator is a comma for `csv` and a tab for `tsv`. The language word is matched as written, so a `CSV` fence is a code block that keeps its attribute. A line ending ends a row, except inside quotes. A cell that starts with `"` is quoted up to the next `"` that is not doubled: a doubled `""` stands for one `"`, and separators and line endings inside are part of the cell; what stands between the closing quote and the next separator or line ending is added to the cell as written. A `"` anywhere else is an ordinary character. Cells are not trimmed. A cell is plain text: no inline form is read in it, and its `cell_paragraph` holds one `text` node (C2-A-215), or none for an empty cell. A separator always starts another cell, so a row that ends in one has an empty last cell. An empty line is a row of one empty cell, except that one empty line at the end of the body is dropped. An empty body has no rows.

The cells keep their spaces and their stars, a doubled quote is one quote, and a quoted cell holds a line break (C2-B-226).

Example 234 (unverified)

::: compare

`````carve
{table}
```csv
a,"b ""q"" c", d
*x*,

"m
n"x,y

```

{table}
```CSV
a,b
```

{table}
```tsv
a	b,c
```
`````

```html
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b "q" c</th><th scope="col"> d</th></tr>
  </thead>
  <tbody>
    <tr><td>*x*</td><td></td></tr>
    <tr><td></td></tr>
    <tr><td>m
nx</td><td>y</td></tr>
  </tbody>
</table>
<pre table=""><code class="language-CSV">a,b
</code></pre>
<table>
  <thead>
    <tr><th scope="col">a</th><th scope="col">b,c</th></tr>
  </thead>
</table>
```

:::

A trailing comment after a row attribute and after a bare closing pipe leaves the line a row (C2-B-167). The comments are in the tree and write nothing.

Example 235 (unverified)

::: compare

```carve
| 1 | 2 |{.r} %% note
| 3 | 4 | %% n2
```

```html
<table>
  <tbody>
    <tr class="r"><td>1</td><td>2</td></tr>
    <tr><td>3</td><td>4</td></tr>
  </tbody>
</table>
```

:::

## The fallback rule

A line that is not a valid opener is text (C2-B-011).

**C2-B-189** Whether a line is an opener is decided on that line alone and never by whether a closer follows, so a construct with a closer of its own always opens (C2-B-111).

**C2-B-190** Block nesting stops at depth 200: each open quote, list, item, description list, description, footnote body and div counts one, and while 200 are open an opener of one more is text. Inline nodes do not count; inline content has its own limit (C2-I-118). A marker that opens two containers at once, a list and its item or a description list and its first description, is tested as one: when both do not fit, the whole marker is text and neither opens.

Example 247 (unverified)

The input is one line of 201 quote marks, each `>` and one space, followed by `x`. The first 200 marks open 200 nested quotes. The last mark is text, so the innermost quote holds `<p>&gt; x</p>`. With 200 marks it holds `<p>x</p>`.

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
| Preliminaries | 11 | 1 | 4 | 4 |
| Paragraphs and interrupters | 15 | 3 | 6 | 3 |
| Container ownership and stripping | 7 | 0 | 3 | 7 |
| Block quotes | 2 | 0 | 5 | 0 |
| Bullet lists | 3 | 0 | 3 | 0 |
| Ordered lists | 11 | 1 | 10 | 2 |
| Task items | 4 | 0 | 1 | 5 |
| Siblings, adjacency and the three-blank-line boundary | 7 | 1 | 5 | 1 |
| Nested lists and the marker line | 6 | 0 | 5 | 1 |
| Tightness | 5 | 0 | 2 | 3 |
| Description lists | 14 | 0 | 12 | 5 |
| Definitions | 9 | 0 | 7 | 6 |
| Attribute lines | 20 | 1 | 12 | 11 |
| Fences, divs and comment blocks | 11 | 0 | 7 | 4 |
| The fence opener and titles | 7 | 1 | 4 | 8 |
| Sigil divs | 11 | 0 | 11 | 1 |
| Comments | 17 | 4 | 14 | 7 |
| Captions | 7 | 0 | 12 | 3 |
| Headings | 5 | 0 | 3 | 6 |
| One-line constructs | 11 | 0 | 8 | 5 |
| Thematic break | 2 | 0 | 4 | 1 |
| Frontmatter | 5 | 0 | 5 | 1 |
| Tables | 35 | 1 | 18 | 17 |
| The fallback rule | 2 | 0 | 3 | 1 |
| Facts set at close | 1 | 0 | 2 | 0 |
| **Total** | **228** | **13** | **166** | **102** |

The chapter has 228 clauses, and 13 exceptions against a budget of 25. The clause count includes the exceptions. Clause ids are stable: a clause added after id 191 takes the next free number and stands at the end of its section, so ids are not in document order from there on.

## Not covered

The chapter has no example for a list-table or for a lone CR.
