---
page: edge-lists
---

## A quote at the content column stays in the item after a refused separator

The separator stays text in the item, and the next line reaches its column (CARVE-P9-083, carve#4501).

::: compare

````carve
- > :: t
: a
  > q
````

```html
<ul>
  <li>
    <blockquote>
      <dl>
        <dt>t</dt>
      </dl>
    </blockquote>
    : a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
```

:::
