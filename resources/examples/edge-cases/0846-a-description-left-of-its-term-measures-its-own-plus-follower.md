---
page: edge-lists
---

## A description left of its term measures its own plus follower

A description has no list column: it is measured from its own line, even when its term stands further right. So a line one column past a first-block `+` at column 0 stands at an intervening column, and the `+` refuses it, as it does when the term is at column 0 too.

::: compare

```carve
 :: t
: +
 h
```

```html
<dl>
  <dt>t</dt>
  <dd></dd>
</dl>
<p>h</p>
```

:::

A line at the description's own body column still reaches it.

::: compare

```carve
  :: t
: +
  h
```

```html
<dl>
  <dt>t</dt>
  <dd>h</dd>
</dl>
```

:::
