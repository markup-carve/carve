## Invisible content and image promotion

An invisible inline construct does not prevent an image-only paragraph from
becoming a block image (CARVE-P9R-007, markup-carve/carve#3709).

::: compare

```carve
{%%}![alt](x.png)
```

```html
<img src="x.png" alt="alt">
```

:::

The same rule applies when a line comment precedes the image.

::: compare

```carve
%% hidden
![alt](x.png)
```

```html
<img src="x.png" alt="alt">
```

:::
