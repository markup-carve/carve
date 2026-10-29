## A partial braced opener before a terminal backslash

A braced opener without its matching closer remains text. The final backslash creates a hard break.

::: compare

```carve
{*}\
```

```html
<p>{*}<br>
</p>
```

:::
