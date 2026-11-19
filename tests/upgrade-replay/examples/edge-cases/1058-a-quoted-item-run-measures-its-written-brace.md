---
page: edge-attributes
---

## A quoted item run measures its written brace

On a quoted item's marker line, every multiline continuation must carry the quote prefixes and reach the item's body column. An unprefixed line refuses the run regardless of its written column. A fully prefixed continuation is then compared with the `{` where it was written, past marker-glued attributes and the item's own indentation (CARVE-P2-035, carve#5830, superseding the unprefixed cases of carve#5826).

::: compare

```carve
> -{.a} {.x
         .y}
plain
```

```html
<blockquote>
  <ul>
    <li class="a">{.x
.y}
plain</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> > - {.x
       .y}
plain
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>{.x
.y}
plain</li>
    </ul>
  </blockquote>
</blockquote>
```

:::

::: compare

```carve
>  - {.x
     .y}
plain
```

```html
<blockquote>
  <ul>
    <li>{.x
.y}
plain</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> > - {.x
> >    .y}
plain
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
  </blockquote>
</blockquote>
<p>plain</p>
```

:::
