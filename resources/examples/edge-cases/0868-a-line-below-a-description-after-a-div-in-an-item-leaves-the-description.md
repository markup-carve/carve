---
page: edge-model-followups
---

## A line below a description after a div in an item leaves the description

PART 9 §24 C3 (carve#4591). A closed div leaves no paragraph open, so the line closes the body.

:::::: compare

`````carve
:: t
: - :::
    :::
 q
`````

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <div>

        </div>
      </li>
    </ul>
  </dd>
</dl>
<p>q</p>
```

::::::
