## An unresolved image reference stays literal

With no matching definition the image renders as the text the author typed, exactly as an unresolved link reference does.

::: compare

```carve
![moon][gone]
```

```html
<p>![moon][gone]</p>
```

:::
