---
page: edge-inline
---

## A quote before a span closer closes

CARVE-P3-023 R1 reads the next source character after a dash or slash, and a span's closing delimiter is not that character: the quote closes as at the end of a paragraph (carve#4318).

:::: compare

````carve
*"Wait-"*
````

```html
<p><strong>“Wait-”</strong></p>
```

::::

:::: compare

````carve
_"Wait-"_
````

```html
<p><u>“Wait-”</u></p>
```

::::

:::: compare

````carve
{+"Wait-"+}
````

```html
<p><ins>“Wait-”</ins></p>
```

::::

:::: compare

````carve
*"Wait/"*
````

```html
<p><strong>“Wait/”</strong></p>
```

::::

