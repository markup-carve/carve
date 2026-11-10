---
page: edge-lists
---

## A description keeps lazy text after a refused fence

The short continuation refuses the brace run. The fence-shaped follower stays in the description paragraph, which owns the following column-zero line (CARVE-P2-035, PART 0 S4, carve#5763).

::: compare

````carve
:: t
: {.x
  }
  ```
plain
````

```html
<dl>
  <dt>t</dt>
  <dd>{.x
}
<code>
plain</code></dd>
</dl>
```

:::
