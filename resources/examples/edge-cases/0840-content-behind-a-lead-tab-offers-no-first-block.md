---
page: edge-lists
---

## Content behind a lead tab offers no first block

A tab that begins an item's content is leading whitespace (CARVE-P2-010), and what follows it is paragraph text whatever it spells (corpus 684, 736). So a `+` behind that tab is a letter at every nesting depth, the paragraph it starts stays open, and a lazy line folds into it. No enclosing collector reads a first-block `+` through the tab.

:::: compare

```carve
- - 	+
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

:::: compare

```carve
- - 	+
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

:::: compare

```carve
 - 	+
>
```

```html
<ul>
  <li>+</li>
</ul>
<blockquote>

</blockquote>
```

::::

:::: compare

```carve
> - 	- +
x
```

```html
<blockquote>
  <ul>
    <li>- +
x</li>
  </ul>
</blockquote>
```

::::

:::: compare

```carve
- 	> +
x
```

```html
<ul>
  <li>&gt; +
x</li>
</ul>
```

::::
