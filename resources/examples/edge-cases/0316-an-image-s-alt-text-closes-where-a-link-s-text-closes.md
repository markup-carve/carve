## An image's alt text closes where a link's text closes

An image has the same three forms as a link, and PART 3 says only the leading
`!` and the `<img src>` output differ. The bracketed run is not one of the
things that differ: the alt text ends at the MATCHING `]`, by the same
balanced, escape- and literal-span-aware scan that closes link text. So an
alt text may hold a bracket, at any depth, in every form and in every host
that re-parses the run.

What the run does NOT share with link text is its content model. `alt` is an
HTML attribute, so nothing inside is inline-parsed. ASCII punctuation
escapes resolve in its scalar value; backtick delimiters remain literal text.

::: compare

```carve
a ![t[z]][r] b

[r]: /i.png
```

```html
<p>a <img src="/i.png" alt="t[z]"> b</p>
```

:::

::: compare

```carve
a ![t[z]](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t[z]"> b</p>
```

:::

Nesting is unbounded, and a trailing attribute block still attaches to the
resolved image.

::: compare

```carve
a ![t[z[q]]][r]{.c} b

[r]: /i.png
```

```html
<p>a <img src="/i.png" alt="t[z[q]]" class="c"> b</p>
```

:::

An escape and a code span both keep their `]` out of the close, and both
reach the attribute as the bytes the author wrote.

::: compare

```carve
a ![t\]z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t]z"> b</p>
```

:::

::: compare

```carve
a ![t`]`z](/i.png) b
```

```html
<p>a <img src="/i.png" alt="t`]`z"> b</p>
```

:::

An UNBALANCED `]` still closes the run where it stands, which leaves a
reference tail with nothing in front of it and the whole line literal.

::: compare

```carve
a ![t]z][r] b

[r]: /i.png
```

```html
<p>a ![t]z][r] b</p>
```

:::

The hosts that re-read the run agree with the inline pass. A paragraph whose
whole content is one reference image is captionable however its alt text is
spelled, and an image inside link text is still an image.

::: compare

```carve
![t[z]][r]
^ cap

[r]: /i.png
```

```html
<figure>
  <img src="/i.png" alt="t[z]">
  <figcaption>cap</figcaption>
</figure>
```

:::

::: compare

```carve
a [x ![t[z]][r] y](/u) b

[r]: /i.png
```

```html
<p>a <a href="/u">x <img src="/i.png" alt="t[z]"> y</a> b</p>
```

:::
