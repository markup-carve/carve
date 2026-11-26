## Adjacent strong spans use HTML only where their delimiters merge

PART 11 §8c requires Markdown delimiters where they read back as the same
construct. Two adjacent strong spans need an HTML fallback for the second span
because the two delimiter runs otherwise merge into one strong span.

::: compare

```carve
{*a*}{*b*}
```

```html
<p><strong>a</strong><strong>b</strong></p>
```

:::
