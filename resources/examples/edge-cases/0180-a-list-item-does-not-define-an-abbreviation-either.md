## A list item does not define an abbreviation either

The same rule holds for every container, not just the block quote: the definition line stays visible text and expands nothing.

::: compare

```carve
- *[HTML]: Hyper Text

The HTML spec.
```

```html
<ul>
  <li>*[HTML]: Hyper Text</li>
</ul>
<p>The HTML spec.</p>
```

:::
