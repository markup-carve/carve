## A frontmatter opener's rest is a format token or nothing

After the optional space, `frontmatter_open` takes only `frontmatter_format = (letter | digit)+`, with `letter` ASCII only. Any other rest leaves the line as text, and the closing `---` is a thematic break (carve#4386).

:::: compare

```carve
--- <
k: v
---
p
```

```html
<p>— &lt;
k: v</p>
<hr>
<p>p</p>
```

::::

:::: compare

```carve
--- yaml x
k: v
---
p
```

```html
<p>— yaml x
k: v</p>
<hr>
<p>p</p>
```

::::

:::: compare

```carve
--- é
k: v
---
```

```html
<p>— é
k: v</p>
<hr>
```

::::
