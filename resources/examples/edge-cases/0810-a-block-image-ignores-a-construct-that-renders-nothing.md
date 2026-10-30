---
page: edge-links
---

## A block image ignores a construct that renders nothing

A paragraph whose whole content resolves to a single image is a block image, and a construct that renders nothing, such as a braced comment, does not count as content (CARVE-P9R-007). That holds for a reference image as for an inline one, and with block attributes on the line above.

:::: compare

```carve
{.c}
{%%}![a](x.png)
```

```html
<img src="x.png" alt="a" class="c">
```

::::

:::: compare

```carve
{%%}![a][r]

[r]: y.png
```

```html
<img src="y.png" alt="a">
```

::::

:::: compare

```carve
{.c}
![a][r]{%%}

[r]: y.png
```

```html
<img src="y.png" alt="a" class="c">
```

::::
