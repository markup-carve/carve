## A block-attribute line inside a quote ends the paragraph above it

§10 I5 lists the block-attribute line among the invisible constructs that interrupt an open paragraph, and that holds inside a container as much as at the top level: the paragraph ends, and the attributes attach to the block that follows.

::: compare

```carve
> a
> {.c}
> text
```

```html
<blockquote>
  <p>a</p>
  <p class="c">text</p>
</blockquote>
```

:::
