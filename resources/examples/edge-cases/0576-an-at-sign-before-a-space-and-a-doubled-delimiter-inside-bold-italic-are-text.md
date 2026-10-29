## An at sign before a space and a doubled delimiter inside bold italic are text

An `@` not followed by a word character is ordinary text. A doubled delimiter
run inside bold italic stays literal.

:::: compare

```carve
a @ b
```

```html
<p>a @ b</p>
```

::::

:::: compare

```carve
/*a // b*/
```

```html
<p><strong><em>a // b</em></strong></p>
```

::::
