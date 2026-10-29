## A flush-left description leaves a nested term's host

A description opener below a list item's content column cannot bind to a term inside its unclosed div.

::: compare

```carve
- a
  ::: box
  :: sub
: def
```

```html
<ul>
  <li>a
    <div class="box">
      <dl>
        <dt>sub</dt>
      </dl>
    </div>
  </li>
</ul>
<p>: def</p>
```

:::
