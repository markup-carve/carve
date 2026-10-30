## A continuation marker attaches a block only at its owner's marker column

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
      <li>+
x</li>
    </ul>
  </li>
</ul>
```

::::

Column 2 is the inner item's marker column, so the inner item takes the paragraph.

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

Column 1 is no marker column: the `+` is refused and the line folds into it.

:::: compare

```carve
* * +
 x
```

```html
<ul>
  <li>
    <ul>
      <li>+
x</li>
    </ul>
  </li>
</ul>
```

::::

At one level, column 0 is the marker column and attaches. The item's content
column is refused, so the line folds into the `+` (carve#4409).

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
  <li>+
x</li>
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
column, so only a column-0 block could attach. The line at column 2 refuses it:
the `+` is a letter in the sub-list item's open paragraph, and the line folds in
after it (carve#4409).

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
