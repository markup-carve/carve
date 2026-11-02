---
page: edge-definitions
---

## An invalid colon opener past a description's content column absorbs the bare run

PART 0 S4. The invalid opener is text. The bare run interrupts the paragraph and opens a div, so the line below has nothing to fold into (carve#4112, carve#4863).

:::::: compare

`````carve
:: t
: m
   :::e
  :::
l
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>m
:::e</p>
    <div>

    </div>
  </dd>
</dl>
<p>l</p>
```

::::::
