## A continuation marker after a blank line in the item

§17 L3 conditions the marker on its COLUMN and on nothing else - not on the item being tight, and not on what the item already holds. The corpus reached it only in a tight item, so an engine could recognize it there and drop it once a blank line had appeared, which is what carve-php did (carve-php#925): the marker came out as literal text inside the paragraph it was meant to end, and the block it should have attached folded in with it.

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
