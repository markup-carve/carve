## Emphasis edge cases

Two emphasis spans of the same kind sit side by side without merging.

::: compare

```carve
*a* and *b*
```

```html
<p><strong>a</strong> and <strong>b</strong></p>
```

:::

A code span inside emphasis is preserved.

::: compare

```carve
*a `x` b*
```

```html
<p><strong>a <code>x</code> b</strong></p>
```

:::

Different-kind delimiters sit adjacent without interfering.

::: compare

```carve
~old~ =new=
```

```html
<p><s>old</s> <mark>new</mark></p>
```

:::

Trailing punctuation after a closer is literal.

::: compare

```carve
*a, b*!
```

```html
<p><strong>a, b</strong>!</p>
```

:::
