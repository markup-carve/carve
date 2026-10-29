## A column-0 line after a container's last block, when that block left no paragraph open

PART 1 S4's *NO OPEN PARAGRAPH, NO LAZY LINE* is pinned above for an empty
quote, which reads as though EMPTINESS were the property doing the work. It is
not. The parameter S4 names is whether any container in the open stack holds an
**open paragraph**, and a block that leaves none leaves none wherever it was
written: `- # H` puts a heading in the item exactly as an indented `# H` would.

So a flush-left line after a heading, a table, a break, a comment, a definition
or an attribute block ends the item, and each of these is the same derivation a
block quote already got in every engine (markup-carve/carve#1280).

A heading is a bounded title. Nothing is open after it:

::: compare

```carve
- # H
tail
```

```html
<ul>
  <li>
    <h1 id="H">H</h1>
  </li>
</ul>
<p>tail</p>
```

:::

The block quote spelling of the same document, which every engine already read
this way. The two containers are one rule, and this is the pair that says so:

::: compare

```carve
> # H
tail
```

```html
<blockquote>
  <h1 id="H">H</h1>
</blockquote>
<p>tail</p>
```

:::

A table ends at its last row:

::: compare

```carve
- | a | b |
tail
```

```html
<ul>
  <li>
    <table>
      <tbody>
        <tr><td>a</td><td>b</td></tr>
      </tbody>
    </table>
  </li>
</ul>
<p>tail</p>
```

:::

A thematic break holds nothing at all:

::: compare

```carve
- ---
tail
```

```html
<ul>
  <li>
    <hr>
  </li>
</ul>
<p>tail</p>
```

:::

A comment is invisible, and invisible is not open. The item renders empty rather
than absorbing the line below it:

::: compare

```carve
- %% c
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::

The fence spelling of a comment answers the same way. Its closer travels with
its opener, and what follows the closer is outside the item:

::: compare

````carve
- %%%
c
%%%
tail
````

```html
<ul>
  <li></li>
</ul>
<p>c</p>
<p>tail</p>
```

:::

A link reference definition is metadata. Ending the item disposes of the line
BELOW it, never of the definition itself - §17 L6 collects that from wherever it
was written, and the use below still resolves:

::: compare

```carve
- [r]: /u
tail

[r][]
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
<p><a href="/u">r</a></p>
```

:::

A footnote definition, the same both ways:

A footnote body takes a lazy line like every container (markup-carve/carve#3885), so the unmarked line below folds into the note:
::: compare

```carve
- [^f]: t
tail

see[^f]
```

```html
<ul>
  <li></li>
</ul>
<p>see<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>t
tail<a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
```

:::

An attribute block opens no paragraph either, so it never reaches the line below
- the item ends first, and the attribute is left unconsumed:

::: compare

```carve
- {.k}
tail
```

```html
<ul>
  <li></li>
</ul>
<p>tail</p>
```

:::

A sibling marker after the same shape still opens a sibling, which is the
control for "the item ended" rather than "the item swallowed something":

::: compare

```carve
- # H
- next
```

```html
<ul>
  <li>
    <h1 id="H">H</h1>
  </li>
  <li>next</li>
</ul>
```

:::

The question is asked of a quote RECURSIVELY, so a quote is not automatically an
open paragraph either - what decides is the block the quote itself ends on:

::: compare

```carve
- > # H
tail
```

```html
<ul>
  <li>
    <blockquote>
      <h1 id="H">H</h1>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

:::

### The two that still fold, because a paragraph IS open

The rule has one parameter, so the controls are the documents where that
parameter has the other value. A nested quote's trailing paragraph is open, and
the line folds into it:

::: compare

```carve
- > q
tail
```

```html
<ul>
  <li>
    <blockquote><p>q
tail</p></blockquote>
  </li>
</ul>
```

:::

And plain lead text is the ordinary lazy continuation, untouched by any of this:

::: compare

```carve
- a
tail
```

```html
<ul>
  <li>a
tail</li>
</ul>
```

:::

### The unmatched item's last block may itself be a list

The clause binds "even where the unmatched container is a LIST ITEM whose last
block is a container", and a nested list is that container. So the question is
asked of the nested item's own last block, recursively, exactly as it is asked
of a quote's - and it is asked however deep the nesting runs.

Read as prose instead, the marker line answers "paragraph" every time, and the
tell is that depth 1 comes out right while depth 2 does not
(markup-carve/carve#1342). The outer item's last block here is a list whose
item ends on a heading, so nothing is open and `tail` is a document paragraph:

::: compare

```carve
- - # H
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <h1 id="H">H</h1>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

A comment as the nested item's only block reaches the same answer by the same
route, which is how one knows the depth and not the construct is what was
missing:

::: compare

```carve
- - %% c
tail
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

Depth 3 is the document that locates it. An implementation that unwraps one
level and then stops folds `tail` into the MIDDLE item rather than closing all
three, so this pair distinguishes "the rule recurses" from "the rule was applied
once":

::: compare

```carve
- - - # H
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <h1 id="H">H</h1>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

The nested list need not be written on the marker line. A sub-list opened at the
item's content column is the same last block, and leaves the same nothing open:

::: compare

```carve
- a
  - # H
tail
```

```html
<ul>
  <li>a
    <ul>
      <li>
        <h1 id="H">H</h1>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
```

:::

The controls are the same three documents with a paragraph restored at the
bottom of the stack. A nested item holding plain text folds, at any depth:

::: compare

```carve
- - a
tail
```

```html
<ul>
  <li>
    <ul>
      <li>a
tail</li>
    </ul>
  </li>
</ul>
```

:::

So does a nested item ending on a quote that CARRIES a paragraph - the
recursion has to pass through both containers to reach it:

::: compare

```carve
- - > q
tail
```

```html
<ul>
  <li>
    <ul>
      <li>
        <blockquote><p>q
tail</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
```

:::

And the content-column spelling folds too when its sub-item is prose:

::: compare

```carve
- a
  - b
tail
```

```html
<ul>
  <li>a
    <ul>
      <li>b
tail</li>
    </ul>
  </li>
</ul>
```

:::

### An attribute line at the item's content column closes the paragraph too

§10 I5 makes a block-attribute line an interrupter, so an item whose last
content line is one holds no open paragraph and the same clause ends it. The
attribute was written against a container that ends before the flush-left line
arrives, so it reaches nothing and is dropped - it does not travel down to the
line below (markup-carve/carve#1342):

::: compare

```carve
- a
  {.x}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

Separating the attribute line with a blank changes nothing. The blank does not
loosen the item either, because an attribute block renders nothing and §17 L1
asks for a second PARAGRAPH:

::: compare

```carve
- a

  {.x}
tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

The control is what the attribute does reach: a line at the content column is
inside the item, the container has not ended, and the attribute attaches to the
paragraph it introduces:

::: compare

```carve
- a
  {.x}
  more
```

```html
<ul>
  <li>a
    <p class="x">more</p>
  </li>
</ul>
```

:::

The quote spelling of the same shape is pinned under *A floating attribute is
scoped to the container that holds it* below, and every engine already read it
that way. That the two containers disagreed is what makes the item spelling a
defect rather than a second reading.

### A continuation-row SHAPE is prose until a table is above it

Every construct above answers S4 by its shape, and one construct cannot. §5 T6
says a table "cannot BEGIN with a continuation row", so a `+ ...|` line reached
where no table is open is not a row at all - it is ordinary paragraph text.
*A continuation row needs a body row* pins that already at the document level,
where the row that cannot attach renders as a paragraph.

A marker line is its container's FIRST block, so nothing is ever above it, and
the line is prose there by construction. The item below publishes it as prose -
and then, read by shape alone, told S4 it was a table row, so the item held no
open paragraph and `tail` left it. Prose where it renders, a row where it is
asked about (markup-carve/carve#1345):

::: compare

```carve
- + a |
tail
```

```html
<ul>
  <li>+ a |
tail</li>
</ul>
```

:::

The nested spelling reaches the same first block by the same peel the heading
above uses, and answers the same way:

::: compare

```carve
- - + a |
tail
```

```html
<ul>
  <li>
    <ul>
      <li>+ a |
tail</li>
    </ul>
  </li>
</ul>
```

:::

At the item's CONTENT COLUMN there is a line above, so the question is real
rather than settled by position - and a paragraph is not a table. The line joins
that paragraph, and `tail` joins it too:

::: compare

```carve
- a
  + b |
tail
```

```html
<ul>
  <li>a
+ b |
tail</li>
</ul>
```

:::

A definition body is the third container that asks, and it asks about its last
line. As that body's only line, the shape is prose for the marker line's reason:

::: compare

```carve
:: t
:  + a |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>+ a |
tail</dd>
</dl>
```

:::

And a line above it is not enough - what the rule wants above it is a TABLE:

::: compare

```carve
:: t
:  a
   + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>a
+ b |
tail</dd>
</dl>
```

:::

Through a QUOTE the body's last line is asked the same question one container
in, and the quote holds a paragraph rather than a table - so the shape is prose
there too, and the lazy line reaches all the way down:

::: compare

```carve
:: t
:  > a
   > + b |
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>a
+ b |
tail</p></blockquote>
  </dd>
</dl>
```

:::
