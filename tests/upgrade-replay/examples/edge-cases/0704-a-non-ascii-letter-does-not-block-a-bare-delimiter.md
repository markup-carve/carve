## A non-ASCII letter does not block a bare delimiter

The heading preserves this row's original name. The ruling in carve#4806 supersedes its old assertion: the boundary guard uses Unicode letters and numbers, and a delimiter beside a letter stays literal in any script.

:::: compare

```carve
é*x* y and a*x* y
y *x*é and y *x*a
```

```html
<p>é*x* y and a*x* y
y *x*é and y *x*a</p>
```

::::
