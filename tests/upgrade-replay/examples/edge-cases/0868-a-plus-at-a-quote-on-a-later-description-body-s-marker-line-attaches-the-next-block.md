---
page: edge-definitions
---

## A plus at a quote on a later description body's marker line attaches the next block

PART 9 §17 L3 and L4, CARVE-P0-024 (carve#4232). A lone `+` at the marker column of an open quote gives the quote its next block, whichever body of the description holds the quote.

:::::: compare

`````carve
:: t
: d
: > a
  +
  para
`````

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
  <dd>
    <blockquote>
      <p>a</p>
      <p>para</p>
    </blockquote>
  </dd>
</dl>
```

::::::
