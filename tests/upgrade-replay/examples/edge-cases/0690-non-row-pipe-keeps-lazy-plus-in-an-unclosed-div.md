## Non-row pipe keeps lazy plus in an unclosed div

An open paragraph inside the div keeps the flush-left line in the item and div.

::: compare

```carve
- a
  ::: box
  | x | y | Ω
+ c
```

```html
<ul>
  <li>a
    <div class="box">
      <p>| x | y | Ω
+ c</p>
    </div>
  </li>
</ul>
```

:::
