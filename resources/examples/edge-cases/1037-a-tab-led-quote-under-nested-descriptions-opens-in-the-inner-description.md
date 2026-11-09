---
page: edge-definitions
---

## A tab-led quote under nested descriptions opens in the inner description

The quote line is two spaces and a tab. Each description strips its own columns and measures the tab from there, so the quote reaches the inner description's body as its space spelling does and opens a blockquote (PART 9 §24 C5, carve#4085).

::: compare

```carve
:: t
: a
  :: t
  : a
  	> b
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <dl>
      <dt>t</dt>
      <dd>
        <p>a</p>
        <blockquote><p>b</p></blockquote>
      </dd>
    </dl>
  </dd>
</dl>
```

:::
