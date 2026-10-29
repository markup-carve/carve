## An unreferenced footnote definition takes its links out of the render

:::: compare

```carve
[^u]: see [x](#nope)

Body.
```

```html
<p>Body.</p>
```

::::
