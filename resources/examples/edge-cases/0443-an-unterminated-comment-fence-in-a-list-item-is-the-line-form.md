## An unterminated comment fence in a list item is the line form

PART 0's layout automaton classifies comments before block ownership
(markup-carve/carve#1731): "An opener without an exact-width closer is one `%%`
line comment; later lines are classified normally." PART 9 §28 states the same
rule from the construct side - an opener with no matching closer ahead "does NOT
open a block. The line degrades to a `comment_line`."

So at one column the two spellings cannot answer differently, and PART 9 §24 C3
is why that matters inside an item: its comment exception names both spellings
in one breath. The corpus pinned the substitution at the TOP LEVEL and pinned a
TERMINATED fence at an item's content column, and nothing in the band between -
which is the whole band where a reader can give the degraded fence a third
answer and stay green (markup-carve/carve#1909).

The reported document. `- x` hands out at column 2, the fence is written there
and never closed, so it is one line comment: it ends the paragraph under it, the
column-0 follower leaves the item, and `y` is a document paragraph.

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

The `%%` line form at the same column with the same follower, which is the
answer the substitution requires the row above to have.

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

And the same fence with a closer, so all three spellings at that column answer
alike and the degradation is not what moves the follower.

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

A degraded fence does not CLOSE the item, which is §24 C3's other half. A
follower at the content column is still the item's own text.

::: compare

```carve
- x
  %%%
  y
```

```html
<ul>
  <li>x
    y
  </li>
</ul>
```

:::

The band starts at the content column and does not end there. Past it the fence
is still one line comment.

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

The band MOVES with the content column rather than sitting at 2. An ordered
marker hands out at column 3.

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

A padded marker hands out at column 4.

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

The closer is searched for in the block the opener would have owned, so a run
written after the item has ended closes nothing. The column-0 `y` leaves the
item, the opener above it degrades, and BOTH followers are published rather than
one of them hidden as comment body.

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
<p>y</p>
<p>z</p>
```

:::

§28 matches a closer on EXACT length, so a wider run below the opener is not
one. Both lines degrade and `z` is published.

::: compare

```carve
- x
  %%%
  %%%%
z
```

```html
<ul>
  <li>x</li>
</ul>
<p>z</p>
```

:::

The other direction: a fence that IS closed at that column still hides its body.
A reader that degraded every fence rather than only the unterminated one would
publish `body` here.

::: compare

```carve
- x
  %%%
  body
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
