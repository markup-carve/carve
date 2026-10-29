## A description keeps a list marker below its hosted footnote

:::: compare

```carve
:: t
:  [^q]: note
    * child
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>child
tail</li>
    </ul>
  </dd>
</dl>
```

::::
