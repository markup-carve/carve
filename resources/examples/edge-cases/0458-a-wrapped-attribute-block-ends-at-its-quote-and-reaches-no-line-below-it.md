## A wrapped attribute block ends at its quote and reaches no line below it

An attribute block at the end of a quote ends where the quote ends. These
historical wrapped inputs place the second line at or below the opening `{`
column after the quote marker. CARVE-P2-035 therefore reads the whole brace run
as paragraph text. A valid wrapped block still cannot attribute a line outside
its quote (markup-carve/carve#1956).

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
#x}
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
#x}
after</p></blockquote>
</blockquote>
```

:::
