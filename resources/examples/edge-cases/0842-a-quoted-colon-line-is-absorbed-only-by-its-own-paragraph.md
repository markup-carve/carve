---
page: edge-lists
---

## A quoted colon line is absorbed only by its own paragraph

A lazy line is one of the paragraph's lines, so a quoted bare colon line under it is absorbed and the paragraph stays open (CARVE-P9-016). A colon line that reaches only an outer quote is a partial match for an inner quote's paragraph, so it interrupts (CARVE-P9-017), and a line with no quote marker then leaves every quote (carve#4416).

:::: compare

```carve
> e
:::e
> :::
l
```

```html
<blockquote><p>e
:::e
:::
l</p></blockquote>
```

::::

:::: compare

```carve
> > e
> :::e
> :::
l
```

```html
<blockquote>
  <blockquote><p>e
:::e</p></blockquote>
  <div>

  </div>
</blockquote>
<p>l</p>
```

::::

:::: compare

```carve
> > e
> :::e
> > :::
l
```

```html
<blockquote>
  <blockquote><p>e
:::e
:::
l</p></blockquote>
</blockquote>
```

::::

:::: compare

```carve
> > e
:::e
> > :::
l
```

```html
<blockquote>
  <blockquote><p>e
:::e
:::
l</p></blockquote>
</blockquote>
```

::::

:::: compare

```carve
> > > e
:::e
> > :::
l
```

```html
<blockquote>
  <blockquote>
    <blockquote><p>e
:::e</p></blockquote>
    <div>

    </div>
  </blockquote>
</blockquote>
<p>l</p>
```

::::
