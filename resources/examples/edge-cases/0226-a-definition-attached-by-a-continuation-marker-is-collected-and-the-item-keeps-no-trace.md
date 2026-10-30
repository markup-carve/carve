## A definition attached by a + continuation marker is collected, and the item keeps no trace

The maintainer overruled this row's title (carve#4449): a definition is invisible, so the `+` test reads the line after it (CARVE-P9-067). A blank there refuses the `+`, which shows as a letter, and the definition is still collected.

::: compare

```carve
- a
+
[r]: /u

see [t][r]
```

```html
<ul>
  <li>a
+</li>
</ul>
<p>see <a href="/u">t</a></p>
```

:::
