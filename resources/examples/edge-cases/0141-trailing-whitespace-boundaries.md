## Trailing whitespace boundaries

The trailing-whitespace strip (paragraph, NORMATIVE) removes whitespace at the end of the paragraph's SOURCE line before rendering. It does not touch spaces a construct produces during rendering, so a paragraph whose entire content is an all-space verbatim span keeps those spaces.

::: compare

```carve
!`  `
```

```html
<p>  </p>
```

:::

The same holds for a lone all-space code span, which keeps its `<code>` wrapper.

::: compare

```carve
`  `
```

```html
<p><code>  </code></p>
```

:::

... and for lone all-space math.

::: compare

```carve
$`  `
```

```html
<p><span class="math inline" role="math">\(  \)</span></p>
```

:::

A trailing NO-BREAK SPACE is content, not trailing whitespace: it is left in place and rendered as a character entity. Only ASCII whitespace is stripped.

::: compare

```carve
A trailing no-break space 
```

```html
<p>A trailing no-break space&nbsp;</p>
```

:::
