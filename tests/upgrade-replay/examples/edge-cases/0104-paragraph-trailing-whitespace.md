## Paragraph trailing whitespace

Whitespace at the end of a paragraph's final line is stripped before rendering (CommonMark / Djot): `abc ` renders without the trailing space. An interior two-space hard break is unaffected.

::: compare

```carve
abc 
```

```html
<p>abc</p>
```

:::
