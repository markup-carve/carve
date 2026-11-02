## Wrapped definition term continuation below the content column strips leading whitespace

A term is one line (carve#4861). A line below the item content column that follows a `:: term` line misses the item, finds no open paragraph, and ends the item. Its leading whitespace is stripped as any paragraph's is.

At column 1, one below the content column 2:

::: compare

```carve
- one
  :: term
 wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
    </dl>
  </li>
</ul>
<p>wrapped</p>
```

:::

At column 0, flush left, the same document:

::: compare

```carve
- one
  :: term
wrapped
```

```html
<ul>
  <li>one
    <dl>
      <dt>term</dt>
    </dl>
  </li>
</ul>
<p>wrapped</p>
```

:::
