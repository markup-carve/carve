## A wrapped attribute block ends at its quote and reaches no line below it

These historical continuations fail CARVE-P2-035, so the brace opener is literal and later lines follow ordinary quote ownership. A valid prefixed attribute still cannot attach outside its quote.

::: compare

```carve
> > q
> > {.k
> > #x}
tail
```

```html
<blockquote>
  <blockquote><p>q
{.k
<span class="tag"><strong>#x</strong></span>}
tail</p></blockquote>
</blockquote>
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
  <blockquote><p>q
{.k
<span class="tag"><strong>#x</strong></span>}
after</p></blockquote>
</blockquote>
```

:::
