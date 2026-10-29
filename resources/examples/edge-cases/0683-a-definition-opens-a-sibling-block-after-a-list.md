## A definition opens a sibling block after a list

The quote reaches the description content column after its nested item.

::: compare

```carve
:: term
: - a

   > c
```

```html
<dl>
  <dt>term</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
    <blockquote><p>c</p></blockquote>
  </dd>
</dl>
```

:::
