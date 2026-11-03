## A blank line loosens an item only when a paragraph follows it

The section title names the reading carve#5015 withdrew with PART 9 §17 L2. A
blank line now loosens an item whatever block follows it: §17 L1 asks whether
the item holds a blank-line-separated block after an earlier visible block of
its own, and a container counts as much as a paragraph. carve#1622 found
carve-js and carve-php disagreeing about the container, and these rows pin the
plain shapes. A tight list's HTML cannot show a paragraph boundary INSIDE a
container, but it does show the lead's `<p>` wrapper, so an ordinary pair can see
the difference at the item.

A paragraph after the blank: the item is loose, and every item of the list wraps.

::: compare

```carve
- x

  y
- z
```

```html
<ul>
  <li><p>x</p>
    <p>y</p>
  </li>
  <li><p>z</p></li>
</ul>
```

:::

The same blank line above a container, which is carve#1622's shape: the item is
loose too, and the lead is wrapped. The div's own blank line is the div's.

::: compare

```carve
- x

  ::: d
  a

  b
  :::
- z
```

```html
<ul>
  <li><p>x</p>
    <div class="d">
      <p>a</p>
      <p>b</p>
    </div>
  </li>
  <li><p>z</p></li>
</ul>
```

:::

A quote in the same position, because the rule is not about the div
specifically:

::: compare

```carve
- x

  > q
- z
```

```html
<ul>
  <li><p>x</p>
    <blockquote><p>q</p></blockquote>
  </li>
  <li><p>z</p></li>
</ul>
```

:::
