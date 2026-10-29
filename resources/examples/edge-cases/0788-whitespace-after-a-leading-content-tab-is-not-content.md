## Whitespace after a leading content tab is not content

A tab that begins a list item's content is leading whitespace and is stripped (CARVE-P2-010), and so is every space or tab after it: the first line starts at its first visible character, as it does after a run of spaces (carve#4081).

::: compare

```carve
- 	 e
```

```html
<ul>
  <li>e</li>
</ul>
```

:::

::: compare

```carve
1. 	  *a*
   b
```

```html
<ol>
  <li><strong>a</strong>
b</li>
</ol>
```

:::

::: compare

```carve
> - 	 - x
```

```html
<blockquote>
  <ul>
    <li>- x</li>
  </ul>
</blockquote>
```

:::
