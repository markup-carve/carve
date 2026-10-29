## A degraded comment fence leaves a lazy follower where the line form does

§28 says an opener with no exact-width closer ahead opens NO block and becomes
a line comment. At or past the content column, both forms close the item's
paragraph and retain nothing (`CARVE-P0-009` X1, `CARVE-P9-053`). A following
below-column line opens a document paragraph.

Section 443 pins the band where the follower sits at column 0 or at the content
column; section 445 pins the container's own column 0. These rows show
a below-column line outside the item and a lazy continuation of a paragraph
opened at the content column.

The reported document. `- x` hands out at column 2, the unterminated fence is
written there, and `y` at column 1 is below the column and opens a document
paragraph.

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

The `%% z` line form at the same coordinates, which is the answer the
substitution requires the row above to have.

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

The other lazy shape: a body line inside the item, then a flush-left
continuation of the paragraph it opened.

::: compare

```carve
- x
  %%%
  body
y
```

```html
<ul>
  <li>x
    body
y
  </li>
</ul>
```

:::

Its line-form control.

::: compare

```carve
- x
  %% z
  body
y
```

```html
<ul>
  <li>x
    body
y
  </li>
</ul>
```

:::

The band moves with the CONTENT column, not with column 2. An ordered marker
hands out at 3, so the fence is at 3 and the below-column follower at 2 opens
a document paragraph.

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

A padded marker hands out at 4.

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

Past the content column it is still one line comment, and the follower opens
a document paragraph.

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

A fence that DOES close is not reached by §28 at all - it is an ordinary comment
block. At the content column it ends the paragraph under it and retains
nothing, so the below-column follower opens a document paragraph
(`CARVE-P0-009` X1, `CARVE-P9-053`).

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

And the host control. A block quote is reached by its MARKER, so an unmarked
line below it is outside the quote whatever it is; both spellings end the quote
and publish the follower, and a fix that made a degraded fence keep the follower
everywhere would break this row.

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
