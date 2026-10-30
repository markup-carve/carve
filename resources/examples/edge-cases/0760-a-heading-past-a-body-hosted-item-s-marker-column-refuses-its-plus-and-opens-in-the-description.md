## A heading past a body-hosted item's marker column refuses its plus and opens in the description

:::: compare

```carve
:: t
: - +
   # H
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>+</li>
    </ul>
    <h1 id="H">H</h1>
  </dd>
</dl>
```

::::
