## A non-ASCII letter does not block a bare delimiter

The boundary guard uses ASCII letters and digits. The same delimiter stays literal after or before an ASCII letter.

:::: compare

```carve
é*x* y and a*x* y
y *x*é and y *x*a
```

```html
<p>é<strong>x</strong> y and a*x* y
y <strong>x</strong>é and y *x*a</p>
```

::::
