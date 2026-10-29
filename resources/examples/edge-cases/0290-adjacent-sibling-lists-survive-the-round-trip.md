## Adjacent sibling lists survive the round trip

Two lists the parser reads as siblings must still read as two after `fmt`.
Nothing separates them but indentation once their markers match, so the writer
keeps one space more on each list than the one before it (PART 11 §1;
`markup-carve/carve#1088`).

::: compare

```carve
1. a

 1. b
```

```html
<ol>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ol>
```

:::

A third list steps again rather than repeating the first offset, which would
put it back in the second list's column.

::: compare

```carve
1. a

 1. b

  1. c
```

```html
<ol>
  <li><p>a</p></li>
  <li><p>b</p></li>
  <li><p>c</p></li>
</ol>
```

:::

Where the marker already separates them nothing is owed, and the control is
that this pair renders the same way with no indentation at all.

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
