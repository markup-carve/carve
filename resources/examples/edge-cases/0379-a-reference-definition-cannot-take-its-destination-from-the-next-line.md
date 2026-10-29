## A reference definition cannot take its destination from the next line

The destination belongs to the same physical line as the label. A bare
definition has an empty destination; lazy list collection cannot supply the
next line as a URL.

:::: compare

```carve
* [d]: 
 :::
```

```html
<ul>
  <li></li>
</ul>
<div>

</div>
```

::::

Ordinary lazy text after the same empty definition remains visible too.

::: compare

```carve
* [d]: 
 text
```

```html
<ul>
  <li></li>
</ul>
<p>text</p>
```

:::

A non-empty destination on the definition line remains a definition. The
following below-column fence-shaped line then lies outside the item.

:::: compare

```carve
* [d]: /u
 :::
```

```html
<ul>
  <li></li>
</ul>
<div>

</div>
```

::::
