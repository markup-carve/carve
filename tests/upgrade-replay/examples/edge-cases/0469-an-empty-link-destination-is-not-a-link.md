## An empty link destination is not a link

The generated fixture name keeps its earlier corpus identifier. Under
CARVE-P3-024, an explicit empty destination is a link or image. One ASCII space before a
quoted title gives the empty destination a title.

::: compare

```carve
[x]()
```

```html
<p><a href="">x</a></p>
```

:::

::: compare

```carve
![x]()
```

```html
<img src="" alt="x">
```

:::

::: compare

```carve
[x]( "t")
```

```html
<p><a href="" title="t">x</a></p>
```

:::
