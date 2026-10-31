---
page: edge-definitions
---

## An unclosed fence in a description body keeps its trailing blank line

PART 0 S2 (carve#4033). A blank line reaches every frame, so the fence keeps it when the description ends, as a list item's fence does (row 291).

:::::: compare

`````carve
:: t
: ```
  code

after
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code>code

</code></pre>
  </dd>
</dl>
<p>after</p>
```

::::::
