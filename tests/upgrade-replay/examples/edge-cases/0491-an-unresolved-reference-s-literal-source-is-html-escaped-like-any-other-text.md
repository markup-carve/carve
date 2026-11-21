## An unresolved reference's literal source is HTML-escaped like any other text

PART 10 SS2 escapes `&`, `<` and `>` in text content, and a no-break space is
the one exception: it serializes as `&nbsp;`, matching an escaped space and a
line block's preserved indentation (markup-carve/carve#2168). An unresolved
reference falls back to its literal source (PART 9R R1), and that source is
text content like any other -- the fallback used to splice it in unescaped.

::: compare

```carve
[ x][]

![ x][]
```

```html
<p>[&nbsp;x][]</p>
<p>![&nbsp;x][]</p>
```

:::

The same escaping reaches the label and an attribute block on an unresolved
reference, not only the bracket text.

::: compare

```carve
[x][a & b]

[x][]{title="a & b"}
```

```html
<p>[x][a &amp; b]</p>
<p>[x][]{title="a &amp; b"}</p>
```

:::

CONTROL. Plain source needs no escaping and renders unchanged.

::: compare

```carve
[x][]
```

```html
<p>[x][]</p>
```

:::
