---
page: edge-definitions
---

## A quoted nested item keeps three verse spaces

::: compare

```carve
> - a
>   - a
>   	::: |
>     	 z
>   	:::
```

```html
<blockquote>
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
</blockquote>
```

:::
