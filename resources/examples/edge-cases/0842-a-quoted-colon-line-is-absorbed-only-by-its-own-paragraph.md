---
page: edge-lists
---

## A quoted colon line is absorbed only by its own paragraph

A bare colon line that reaches a quote interrupts the open paragraph there, whatever that paragraph holds (carve#4863). A colon line that reaches only an outer quote is a partial match for an inner quote's paragraph, so it interrupts too, and a line with no quote marker then leaves every quote (carve#4416).

:::: compare

```carve
> e
:::e
> :::
l
```

```html
<blockquote>
  <p>e
:::e</p>
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
  <blockquote>
    <p>e
:::e</p>
    <div>

    </div>
  </blockquote>
</blockquote>
<p>l</p>
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
  <blockquote>
    <p>e
:::e</p>
    <div>

    </div>
  </blockquote>
</blockquote>
<p>l</p>
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
