---
page: edge-inline
---

## A literal bracket run is a typography region

A bracket run that stays literal is a region like a span, so a hyphen run at the start of its content followed by a non-whitespace character stays literal under CARVE-P3-021 (markup-carve/carve#4551).

::: compare

```carve
a [--x] y and a [---x] y
```

```html
<p>a [--x] y and a [---x] y</p>
```

:::

A parenthesis opens no region, but an opening `(` after whitespace counts as whitespace for the same test (markup-carve/carve#4813).

::: compare

```carve
a (--x) y
```

```html
<p>a (--x) y</p>
```

:::

At the end of the region nothing follows the run, so it converts as at the end of a span.

::: compare

```carve
[x--] y
```

```html
<p>[x–] y</p>
```

:::

An unbalanced `[` is text and opens no region, so the run after it converts.

::: compare

```carve
a [--x y
```

```html
<p>a [–x y</p>
```

:::
