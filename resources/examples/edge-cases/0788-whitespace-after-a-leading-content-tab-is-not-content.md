## Whitespace after a leading content tab is not content

A tab that begins a list item's content is content, and so is every space or tab after it (CARVE-P2-010, carve#4610). The separator is the space before the tab; the item's text keeps the whole run. The section title names the reading carve#4610 replaced and stays as the corpus name.

::: compare

```carve
- 	 e
```

```html
<ul>
  <li>	 e</li>
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
  <li>	  <strong>a</strong>
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
    <li>	 - x</li>
  </ul>
</blockquote>
```

:::
