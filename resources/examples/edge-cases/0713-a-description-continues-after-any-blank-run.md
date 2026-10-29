## A description continues after any blank run

One blank line before a block at the description body column keeps the block in the description:

::: compare

```carve
:: t
: d

    > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::

The same column owns the block after two blank lines:

::: compare

```carve
:: t
: d


    > q
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <blockquote><p>q</p></blockquote>
  </dd>
</dl>
```

:::
