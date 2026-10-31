---
page: edge-lists
---

## A separator below a term after an item paragraph leaves its quote

The same reading with a paragraph before the term as without one (carve#4300, carve#4432, carve#4500).

::: compare

````carve
> - ::
>   :: t
   : a
````

```html
<blockquote>
  <ul>
    <li>::
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
</blockquote>
<p>: a</p>
```

:::
