## A quoted term takes a lazy line

A term is one line (carve#4861), so an unmarked plain line after it ends the quote, the quoted item or the item-hosted quote it misses and is a paragraph there.

::: compare

```carve
> :: t
tail
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<p>tail</p>
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
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<p>tail</p>
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
        <dt>term</dt>
      </dl>
    </blockquote>
  </li>
</ul>
<p>tail</p>
```

:::
