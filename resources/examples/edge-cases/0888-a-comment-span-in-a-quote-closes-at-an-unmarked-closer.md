---
page: edge-blocks
---

## A comment span in a quote closes at an unmarked closer

A `%%%` opener in a quote whose exact-width closer stands below the quote's column opens a span: S1 tests the open span's closer before ownership, so the body stays hidden and the quote continues after it (CARVE-P0-005, CARVE-P9-060, carve#4721). With no closer at all the opener is one `%%` line comment and the next line renders, as at document level.

:::: compare

```carve
> %%%
> secret
%%%
```

```html
<blockquote>

</blockquote>
```

::::

:::: compare

```carve
> %%%
> secret
%%%
> more
```

```html
<blockquote><p>more</p></blockquote>
```

::::

:::: compare

```carve
> %%%
> secret
  %%%
after
```

```html
<blockquote>

</blockquote>
<p>after</p>
```

::::

:::: compare

```carve
> > %%%
> > secret
%%%
```

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
```

::::

:::: compare

```carve
> > %%%
> > secret
%%%
> more
```

```html
<blockquote>
  <blockquote>

  </blockquote>
  <p>more</p>
</blockquote>
```

::::

:::: compare

```carve
> %%%
> secret
```

```html
<blockquote><p>secret</p></blockquote>
```

::::
