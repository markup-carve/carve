## A below-column marker after a comment, where no paragraph is open

A comment closes the paragraph. At the content column it retains nothing
(`CARVE-P0-009` X1, `CARVE-P9-053`), so a following below-column marker starts
a separate list.

::: compare

```carve
- a
  %%%
  x
  %%%
 - s
```

```html
<ul>
  <li>a</li>
  <li>s</li>
</ul>
```

:::

Ordered markers follow the same column rule:

::: compare

```carve
- a
  %%%
  x
  %%%
 1. o
```

```html
<ul>
  <li>a</li>
</ul>
<ol>
  <li>o</li>
</ol>
```

:::

A heading-shaped line below the content column is also paragraph text:

::: compare

```carve
- a
  %%%
  x
  %%%
 # h
```

```html
<ul>
  <li>a</li>
</ul>
<section id="h">
  <h1>h</h1>
</section>
```

:::

CONTROL, and the one that shows this is the mechanism rather than a coincidence
about comments: with the paragraph still OPEN the fold is available and the
marker is lazy item text, as C3 says. Deleting the comment fence from the first
document inverts its answer.

::: compare

```carve
- a
  b
 - s
```

```html
<ul>
  <li>a
b</li>
  <li>s</li>
</ul>
```

:::

CONTROL. A BLOCK QUOTE leaves its own paragraph open, so the fold is available
there too and the marker folds into the quote - the same rule reaching a third
answer purely on whether a paragraph is open:

::: compare

```carve
- a
  > q
 - s
```

```html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
  <li>s</li>
</ul>
```

:::
