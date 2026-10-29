## A continuation marker attaches only a flush-left block

A `+` at an open marker column attaches one block starting at that column. A block at another column follows ordinary ownership rules (markup-carve/carve#3421).

:::: compare

```carve
* * +
x
```

```html
<ul>
  <li>
    <ul>
      <li>x</li>
    </ul>
  </li>
</ul>
```

::::

At the outer item's content column, the paragraph belongs to the outer item;
the inner item stays empty.

:::: compare

```carve
* * +
  x
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
    x
  </li>
</ul>
```

::::

A column below every open container ends both items and leaves the paragraph at
document level.

:::: compare

```carve
* * +
 x
```

```html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
  </li>
</ul>
<p>x</p>
```

::::

The single-level controls are unchanged: column 0 attaches, while the item's
own content column reaches the item through the ordinary column rule.

:::: compare

```carve
- +
x
```

```html
<ul>
  <li>x</li>
</ul>
```

::::

:::: compare

```carve
- +
  x
```

```html
<ul>
  <li>x</li>
</ul>
```

::::

The `+` at the nested item's marker column interrupts its paragraph and
attaches `c` to that item (markup-carve/carve#3421).

::: compare

```carve
- a
  - b
  +
  c
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        c
      </li>
    </ul>
  </li>
</ul>
```

:::

The same reading one column out. The marker sits at the outer item's marker
column, so only a column-0 block could attach; the payload at column 2 is placed
by its own column, which leaves it in the sub-list item whose paragraph is still
open. The output is byte-identical to the same document without the marker line
(markup-carve/carve#2322).

::: compare

```carve
- x
  - L
+
  p
```

```html
<ul>
  <li>x
    <ul>
      <li>L
+
p</li>
    </ul>
  </li>
</ul>
```

:::

The `+` at column 1 matches no open marker column, so it reaches the output as
ordinary text (markup-carve/carve#3421).

::: compare

```carve
- x
  - L
 +
```

```html
<ul>
  <li>x
    <ul>
      <li>L
+</li>
    </ul>
  </li>
</ul>
```

:::
