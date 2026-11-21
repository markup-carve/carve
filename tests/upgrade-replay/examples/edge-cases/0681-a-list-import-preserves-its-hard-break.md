## A list import preserves its hard break

A backslash at the end of an item line keeps the break before lazy continuation.

::: compare

```carve
- a\
b
```

```html
<ul>
  <li>a<br>
b</li>
</ul>
```

:::
