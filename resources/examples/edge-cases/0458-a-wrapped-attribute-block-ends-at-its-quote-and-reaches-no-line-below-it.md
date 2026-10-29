## A wrapped attribute block ends at its quote and reaches no line below it

An attribute block at the end of a quote ends where the quote ends. A line
below the quote carries no quote marker, so it is not the block's target - the
block is dropped and the line is a top-level paragraph. The WRAPPED spelling of
the block (`{.k` then `#x}` on two quoted lines) used to reach past the quote's
closing boundary and pull that line inside; it now stops at the boundary, exactly
as the equivalent single-line block already does (markup-carve/carve#1956).

::: compare

```carve
> > q
> > {.k
> > #x}
tail
```

```html
<blockquote>
  <blockquote><p>q</p></blockquote>
</blockquote>
<p>tail</p>
```

:::

The single-line spelling of the same block, the control it now matches.

::: compare

```carve
> > q
> > {.k #x}
tail
```

```html
<blockquote>
  <blockquote><p>q</p></blockquote>
</blockquote>
<p>tail</p>
```

:::

When the line below IS still in the quote, both spellings attach the block to
it - the block reaches a line the quote covers, which is the case that stayed the
same.

::: compare

```carve
> > q
> > {.k
> > #x}
> > after
```

```html
<blockquote>
  <blockquote>
    <p>q</p>
    <p class="k" id="x">after</p>
  </blockquote>
</blockquote>
```

:::
