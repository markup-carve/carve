## A quoted term takes a lazy line

A term is an ordinary line wherever it is written, so an unmarked plain line
after it folds into the term, under a quote, a quoted item or an item-hosted
quote alike (`CARVE-P2-028`, markup-carve/carve-js#2860).

::: compare

```carve
> :: t
tail
```

```html
<blockquote>
  <dl>
    <dt>t
tail</dt>
  </dl>
</blockquote>
```

:::

::: compare

```carve
> - :: t
tail
```

```html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t
tail</dt>
      </dl>
    </li>
  </ul>
</blockquote>
```

:::

::: compare

```carve
- > :: term
tail
```

```html
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>term
tail</dt>
      </dl>
    </blockquote>
  </li>
</ul>
```

:::
