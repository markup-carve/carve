## A definition attached by a + continuation marker is collected, and the item keeps no trace

The `+` continuation marker (§17 L3/L4) attaches a block at the container's marker column. A definition follows the same rule, and the marker leaves no rendered content (carve#665; markup-carve/carve#3421).

::: compare

```carve
- a
+
[r]: /u

see [t][r]
```

```html
<ul>
  <li>a</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::
