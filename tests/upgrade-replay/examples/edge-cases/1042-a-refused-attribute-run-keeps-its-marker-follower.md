---
page: edge-lists
---

## A refused attribute run keeps its marker follower

The closer fails the brace-column test. The following marker opens a nested list under ordinary item ownership (CARVE-P2-035, carve#5830).

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
    <ul>
      <li>q</li>
    </ul>
  </li>
</ul>
```

:::
