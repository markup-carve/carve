---
page: edge-lists
---

## Paragraphs after a closed marker-line child loosen the item

PART 9 §17 L1 (carve#4734). A line below a marker-line child that its open paragraph cannot take ends the child, so two blank-separated paragraphs after it belong to the outer item and make it loose.

::: compare

```carve
- - :::
  p

    q
```

```html
<ul>
  <li>
    <ul>
      <li>
        <div>

        </div>
      </li>
    </ul>
    <p>p</p>
    <p>q</p>
  </li>
</ul>
```

:::

::: compare

```carve
- - # h
  p

    q
```

```html
<ul>
  <li>
    <ul>
      <li>
        <h1 id="h">h</h1>
      </li>
    </ul>
    <p>p</p>
    <p>q</p>
  </li>
</ul>
```

:::

::: compare

````carve
- - ```
  p

    q
````

```html
<ul>
  <li>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
    <p>p</p>
    <p>q</p>
  </li>
</ul>
```

:::
