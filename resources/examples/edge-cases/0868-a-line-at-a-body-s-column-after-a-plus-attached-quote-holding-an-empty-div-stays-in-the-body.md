---
page: edge-lists
---

## A line at a body's column after a plus-attached quote holding an empty div stays in the body

PART 0 S4 and CARVE-P9-067 (carve#4385). The div holds no paragraph, so the unprefixed line cannot fold lazily and cannot reach a host inside the quote; the quote ends and the line stays with the item or description at its content column.

:::::: compare

`````carve
- +
> :::
  x
`````

```html
<ul>
  <li>
    <blockquote>
      <div>

      </div>
    </blockquote>
    x
  </li>
</ul>
```

::::::

:::::: compare

`````carve
:: t
: +
> :::
  x
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <div>

      </div>
    </blockquote>
    <p>x</p>
  </dd>
</dl>
```

::::::
