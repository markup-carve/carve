---
page: edge-lists
---

## A nested quote after a quoted list leaves a marker line lazy

PART 0 S4 and the block-quote row (carve#5044). A quote interrupts the item's paragraph, so `> c` ends the item and the deepest open paragraph is the nested quote's. A list marker that misses nothing but quotes folds into it.

::: compare

```carve
> - a
> > c
- tail
```

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
  <blockquote><p>c
- tail</p></blockquote>
</blockquote>
```

:::

An ordered item and an ordered tail read the same,

::: compare

```carve
> 1. a
> > c
1. tail
```

```html
<blockquote>
  <ol>
    <li>a</li>
  </ol>
  <blockquote><p>c
1. tail</p></blockquote>
</blockquote>
```

:::

and so does a nested quote one column past the item's marker.

::: compare

```carve
> - a
>  > c
- tail
```

```html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
  <blockquote><p>c
- tail</p></blockquote>
</blockquote>
```

:::

A tail that keeps the outer quote's marker folds into the deepest quote too.

::: compare

```carve
> > - a
> > > c
> - tail
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>a</li>
    </ul>
    <blockquote><p>c
- tail</p></blockquote>
  </blockquote>
</blockquote>
```

:::
