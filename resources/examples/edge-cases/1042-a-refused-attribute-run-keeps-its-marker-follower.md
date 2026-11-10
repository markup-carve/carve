---
page: edge-lists
---

## A refused attribute run keeps its marker follower

The closer is short of the opening brace. The following marker continues the refused run's paragraph (CARVE-P2-035, carve#5752).

::: compare

```carve
- {.x
 }
  - q
```

```html
<ul>
  <li>{.x
}
- q</li>
</ul>
```

:::
