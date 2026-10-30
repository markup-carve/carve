## A quoted term takes no lazy marker or separator

A definition term continues lazily only with plain text. An unprefixed list
marker ends the quote and reads as it would without it, and so does a `: `
separator when the quote holds the term directly, at any quote depth and column
(`[B-term-keep]`, markup-carve/carve#4300).

::: compare

```carve
> - :: t
 - x
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
<ul>
  <li>x</li>
</ul>
```

:::

::: compare

```carve
> :: t
 : d
```

```html
<blockquote>
  <dl>
    <dt>t</dt>
  </dl>
</blockquote>
<p>: d</p>
```

:::

::: compare

```carve
> > :: t
 : d
```

```html
<blockquote>
  <blockquote>
    <dl>
      <dt>t</dt>
    </dl>
  </blockquote>
</blockquote>
<p>: d</p>
```

:::
