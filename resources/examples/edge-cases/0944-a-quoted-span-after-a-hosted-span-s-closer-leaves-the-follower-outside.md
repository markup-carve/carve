---
page: edge-lists
---

## A quoted span after a hosted span's closer leaves the follower outside

A `%%%` span opened on a quoted item's or description's marker line closes at an exact-width run below the host's column (PART 9 §28, carve#4994). The next `%%%` at the quote's column opens a span in the quote. A follower that supplies no `>` misses the quote, so it ends that span (PART 0 S1) and, with no paragraph open, is read outside the quote at every quote depth (carve#5026). The last case is the control: a third run closes the quote's span, so its next line is a quote paragraph and the follower folds into it.

::: compare

```carve
> > - %%%
> > %%%
> > %%%
> > x
t
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
  </blockquote>
</blockquote>
<p>t</p>
```

:::

::: compare

```carve
> - %%%
> %%%
> %%%
> x
t
```

```html
<blockquote>
  <ul>
    <li></li>
  </ul>
</blockquote>
<p>t</p>
```

:::

::: compare

```carve
> > > 1. %%%%
> > > %%%%
> > > %%%%
> > > x
- t
```

```html
<blockquote>
  <blockquote>
    <blockquote>
      <ol>
        <li></li>
      </ol>
    </blockquote>
  </blockquote>
</blockquote>
<ul>
  <li>t</li>
</ul>
```

:::

::: compare

```carve
> :: d
> : %%%
> %%%
> %%%
> x
: t
```

```html
<blockquote>
  <dl>
    <dt>d</dt>
    <dd></dd>
  </dl>
</blockquote>
<p>: t</p>
```

:::

::: compare

```carve
> > - - %%%
> >  %%%
> > %%%
> > x
> - t
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li>
        <ul>
          <li></li>
        </ul>
      </li>
    </ul>
  </blockquote>
  <ul>
    <li>t</li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
> > - %%%
> > %%%
> > %%%
> > %%%
> > x
t
```

```html
<blockquote>
  <blockquote>
    <ul>
      <li></li>
    </ul>
    <p>x
t</p>
  </blockquote>
</blockquote>
```

:::
