---
page: edge-lists
---

## An indented closer protects a refused run's fence follower

The fence follower's indented closer keeps an intervening quote marker in the refused run's paragraph (CARVE-P2-035, carve#5600).

::: compare

````carve
{.x
.y}
```
wa
> q
  ```
````

```html
<p>{.x
.y}
<code>
wa
&gt; q
</code></p>
```

:::
