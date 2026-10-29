## The combined bold-italic token does not open or close inside a word

`bold_italic` opens with `bare_opener('/')` and closes with `bare_closer('/')`, so
a letter or digit against its outer `/` stops the combined token exactly as it
stops a plain `/`. The opener fails after a letter:

::: compare

```carve
a/*y*/ b
```

```html
<p>a/<strong>y</strong>/ b</p>
```

:::

and the closer fails before one:

::: compare

```carve
a /*y*/b
```

```html
<p>a /<strong>y</strong>/b</p>
```

:::

A digit counts the same way on either side:

::: compare

```carve
2/*a*/ and /*b*/3
```

```html
<p>2/<strong>a</strong>/ and /<strong>b</strong>/3</p>
```

:::

Paths and globs keep every character. The inner `*` pair is an ordinary bold
span, and a second `*` opener while bold is open is text (PART 9 §9 E3):

::: compare

```carve
Run src/*test*/fixtures now
```

```html
<p>Run src/<strong>test</strong>/fixtures now</p>
```

:::

::: compare

```carve
see lib/*.js and src/*foo*/bar
```

```html
<p>see lib/<strong>.js and src/*foo</strong>/bar</p>
```

:::

A `*/` before a letter is not a closer, so the nearest valid one closes the token
and the rejected pair is content:

::: compare

```carve
/*a*/b c*/
```

```html
<p><strong><em>a*/b c</em></strong></p>
```

:::

Intraword emphasis takes the forced form, which has no word boundary (PART 9 §22):

::: compare

```carve
a{/*y*/}b
```

```html
<p>a<em><strong>y</strong></em>b</p>
```

:::

At a word boundary the combined token forms as before:

::: compare

```carve
/*a*/ b
```

```html
<p><strong><em>a</em></strong> b</p>
```

:::
