## A quoted term takes no lazy marker or separator

A definition term takes no lazy line (carve#4861). An unprefixed list marker, separator or plain line ends the quote and is read as it would be without it.

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
