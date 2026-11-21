---
page: edge-definitions
---

## A second tab keeps two verse spaces

::: compare

```carve
> - a
>   - a
>   	::: |
> 		z
>   	:::
```

```html
<blockquote>
  <ul>
    <li>a
      <ul>
        <li>a
          <div class="line-block">
            <p>&nbsp;&nbsp;z</p>
          </div>
        </li>
      </ul>
    </li>
  </ul>
</blockquote>
```

:::
