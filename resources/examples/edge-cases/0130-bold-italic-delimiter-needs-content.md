## Bold-italic delimiter needs content

A bold-italic run `/*...*/` collapses to `<strong><em>...</em></strong>` only when
it wraps content. With nothing between the delimiters, the inner `**` is literal
and only the outer `/.../ ` italic applies -- so `/**/` is an emphasized `**`, not
empty bold-italic.

::: compare

```carve
/**/
```

```html
<p><em>**</em></p>
```

:::

A single space is content for the outer italic but not for the bold pair, so the
`* *` stays literal inside one `<em>`.

::: compare

```carve
/* */
```

```html
<p><em>* *</em></p>
```

:::

With real content, the full bold-italic collapse still applies.

::: compare

```carve
/*x*/
```

```html
<p><strong><em>x</em></strong></p>
```

:::

The outer `/` of the pair takes the same word-boundary guards as a bare `/`: it
does not open after a letter or digit and does not close before one. Once the
combined token fails, each delimiter is read on its own, so the slashes stay text
and the inner `*` pair still makes a bold span.

::: compare

```carve
a/*y*/b
```

```html
<p>a/<strong>y</strong>/b</p>
```

:::
