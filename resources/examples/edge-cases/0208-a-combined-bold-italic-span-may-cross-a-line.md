## A combined bold-italic span may cross a line

`/*…*/` is one construct (`bold_italic`), and like any inline span it folds across the lines of its paragraph. The nesting is the same either way: strong outside emphasis. Nothing pinned the multi-line form, and the oracle inverted it there - pairing the two delimiters separately gives emphasis outside strong.

::: compare

```carve
/*multi
line*/
```

```html
<p><strong><em>multi
line</em></strong></p>
```

:::
