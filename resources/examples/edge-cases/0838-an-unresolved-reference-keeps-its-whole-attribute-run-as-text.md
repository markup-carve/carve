---
page: edge-links
---

## An unresolved reference keeps its whole attribute run as text

An unresolved reference degrades to its literal source (CARVE-P9R-004 and PART 9R), and no element remains for a glued block to attach to. Every block of the run stays in the text, not only the first (carve#4320).

:::: compare

```carve
[a][a]{.c}{#i}
```

```html
<p>[a][a]{.c}{#i}</p>
```

::::

:::: compare

```carve
[a][b]{.c}{.d}
```

```html
<p>[a][b]{.c}{.d}</p>
```

::::

:::: compare

```carve
x[a][a]{key=v}{#i}
```

```html
<p>x[a][a]{key=v}{#i}</p>
```

::::

:::: compare

```carve
[a][]{#i}{.c}
```

```html
<p>[a][]{#i}{.c}</p>
```

::::
