## A continuation marker after a blank line in a loose item

The column-0 marker attaches the flush-left block
below it, whether or not a blank line comes first. The blank does not loosen
the item on its own - this item is loose because of the blank between `a` and
`b`, not because of the one before the marker.

::: compare

```carve
- a

  b

+
c

x
```

```html
<ul>
  <li><p>a</p>
    <p>b</p>
    <p>c</p>
  </li>
</ul>
<p>x</p>
```

:::
