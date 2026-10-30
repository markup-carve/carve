---
page: edge-lists
---

## A description marker line without a paragraph gives the next line no lazy host

CARVE-P0-011, PART 1 S4 and CARVE-P9-067 (carve#4305). The item twin ends the body the same way.

:::: compare

````carve
- a

  :: T
  : # h
after
````

```html
<ul>
  <li>a
    <dl>
      <dt>T</dt>
      <dd>
        <h1 id="h">h</h1>
      </dd>
    </dl>
  </li>
</ul>
<p>after</p>
```

::::
