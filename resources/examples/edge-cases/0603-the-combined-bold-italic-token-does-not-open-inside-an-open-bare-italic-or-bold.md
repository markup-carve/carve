## The combined bold-italic token does not open inside an open bare italic or bold

The combined token holds an italic and a bold, and PART 9 §9 allows no bare
same-type nesting, so it does not open while a bare `/` or `*` span is open.
Its first `/` cannot close either (whitespace precedes it), so it is text, the
`*` pair is bold, and the `/` after it closes the outer italic:

::: compare

```carve
/a /*x*/ b/
```

```html
<p><em>a /<strong>x</strong></em> b/</p>
```

:::

The same holds inside a bare bold. The `*` after the text `/` cannot close
(a letter follows it) and cannot open (a bold is open), so the next `*` closes
the outer bold:

::: compare

```carve
*a /*x*/ b*
```

```html
<p><strong>a /*x</strong>/ b*</p>
```

:::

With no italic or bold open, the token forms as usual:

::: compare

```carve
/*x*/ and /b/
```

```html
<p><strong><em>x</em></strong> and <em>b</em></p>
```

:::

A braced span nests inside a bare span of its own kind:

::: compare

```carve
/a {/*x*/} b/
```

```html
<p><em>a <em><strong>x</strong></em> b</em></p>
```

:::
