---
page: edge-definitions
---

## A nested item without a quote keeps three verse spaces

::: compare

```carve
- a
  - a
  	::: |
    	 z
  	:::
```

```html
<ul>
  <li>a
    <ul>
      <li>a
        <div class="line-block">
          <p>&nbsp;&nbsp;&nbsp;z</p>
        </div>
      </li>
    </ul>
  </li>
</ul>
```

:::
