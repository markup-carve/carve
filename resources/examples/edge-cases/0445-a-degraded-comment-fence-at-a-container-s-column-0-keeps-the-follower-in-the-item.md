## A degraded comment fence at a container's column 0 keeps the follower in the item

PART 9 §28 says an opener with no matching closer ahead does not open a block:
the line degrades to a `comment_line`. That is a CLASSIFICATION, and §24 C3's
comment exception names both spellings in one breath - a comment "does not close
the ITEM either: a following line still belongs to the item rather than parsing
at document level". So a degraded fence at a container's own column 0 leaves the
frame open exactly as the `%%` line form does
(markup-carve/carve#1903).

Section 443 pins the band at and past the item's CONTENT column. This is the
column below it that was left open while the question was undecided.

The reported document. Nothing closes the `%%%`, so it is one line comment: it
ends the paragraph under `x` and leaves the item open, and `y` is the item's
second paragraph rather than a document one.

::: compare

```carve
- x
%%%
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

The `%%` line form at the same column, which is the answer the substitution
requires the row above to have.

::: compare

```carve
- x
%% z
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

A TERMINATED fence at that column is a different line: it is a comment BLOCK
written at the document's own opener column, and it ends the item. This is the
row a reader that degrades every fence rather than only the unterminated one
would break.

::: compare

```carve
- x
%%%
%%%
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

The band is not the bullet's. An ordered marker hands out at column 3 and its
frame's column 0 is still 0.

::: compare

```carve
1. x
%%%
y
```

```html
<ol>
  <li>x</li>
</ol>
<p>y</p>
```

:::

Nor does it move with the CONTENT column: a padded marker puts the content at 4
and the fence is still at the frame's column 0.

::: compare

```carve
-   x
%%%
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

Every container's own column 0, at every depth. Inside a nested item the frame's
column 0 is the outer item's content column, and the fence written there is the
inner item's degraded comment.

::: compare

```carve
- - x
  %%%
  y
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
    y
  </li>
</ul>
```

:::

A wider unterminated run degrades the same way - what matters is that no closer
of its own length follows, not how long it is.

::: compare

```carve
- x
%%%%
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

§28 matches a closer on EXACT length, so a wider run below the opener is not
one. Both lines are line comments and the follower is still the item's.

::: compare

```carve
- x
%%%
%%%%
y
```

```html
<ul>
  <li>x</li>
</ul>
<p>y</p>
```

:::

The closer is looked for AHEAD, not on the next line. A fence closed two lines
down opens a real block, hides what it swallowed, and ends the item at the
document's own opener column - the row a reader that degrades on "no closer
immediately below" would break.

::: compare

```carve
- x
%%%
y
%%%
z
```

```html
<ul>
  <li>x</li>
</ul>
<p>z</p>
```

:::

The item is not the only frame the degraded fence leaves open. The LIST is open
too, so a sibling marker below it is the same list's second item rather than a
new list.

::: compare

```carve
- x
%%%
- y
```

```html
<ul>
  <li>x</li>
  <li>y</li>
</ul>
```

:::

The exception is §24 C3's, so it is about ITEM ownership. A block quote has no
such clause: a comment at column 0 below it ends the quote in BOTH spellings,
and a fix that read §28's substitution as "a degraded fence never closes
anything" would break this row.

::: compare

```carve
> x
%%%
y
```

```html
<blockquote><p>x</p></blockquote>
<p>y</p>
```

:::
