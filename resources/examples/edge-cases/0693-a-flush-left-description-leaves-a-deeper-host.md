## A flush-left description leaves a deeper host

The same boundary applies when the div sits in a nested list item.

::: compare

```carve
- a
  - b
    ::: box
    :: sub
: def
```

```html
<ul>
  <li>a
    <ul>
      <li>b
        <div class="box">
          <dl>
            <dt>sub</dt>
          </dl>
        </div>
      </li>
    </ul>
  </li>
</ul>
<p>: def</p>
```

:::
