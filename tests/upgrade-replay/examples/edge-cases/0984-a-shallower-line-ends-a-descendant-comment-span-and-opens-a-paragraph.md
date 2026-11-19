---
page: edge-lists
---

## A shallower line ends a descendant comment span and opens a paragraph

PART 0 S1 ends an open comment span when a non-comment line misses its owner's column. Under PART 0 S4, that line opens a paragraph in the surviving item, and the next plain line continues it. The depth of the marker stack does not change that decision.

::: compare

````carve
- - - x
      %%%%
    b
z
````

```html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>x</li>
        </ul>
        b
z
      </li>
    </ul>
  </li>
</ul>
```

:::
