---
page: edge-lists
---

## A separator below a term after an item paragraph leaves its quote

The same reading with a paragraph before the term as without one: the line misses the quote and the term holds no fold (carve#4861).

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
