---
page: edge-lists
---

## A plus-attached div in a list item ends at the next sibling marker

CARVE-P9-084 (carve#4717). A frame does not look ahead for its closer. A div a `+` attaches in a list item ends where its host's next sibling marker stands, whether or not a later `:::` exists, so `- b` is a sibling item and the last `:::` opens a new div after the list.

:::::: compare

`````carve
- +
:::
- b
:::
`````

```html
<ul>
  <li>
    <div>

    </div>
  </li>
  <li>b</li>
</ul>
<div>

</div>
```

::::::

An admonition with body text under an ordered item reads the same.

:::::: compare

`````carve
1. +
::: note
x
2. b
:::
`````

```html
<ol>
  <li>
    <aside class="admonition note" aria-label="Note">
      <p>x</p>
    </aside>
  </li>
  <li>b</li>
</ol>
<div>

</div>
```

::::::
