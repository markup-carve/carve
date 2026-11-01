---
page: edge-lists
---

## A braced comment line after a plus is the attached paragraph

PART 9 §17 L3 and CARVE-P9-042 (carve#4544, carve#4799). The section name predates the superseding ruling on carve#4799 and is append-only. A paragraph of only braced comments renders nothing, so the `+` skips it as it skips `%% c` and attaches the heading.

:::::: compare

`````carve
- +
{% c %}
# H
`````

```html
<ul>
  <li>
    <h1 id="H">H</h1>
  </li>
</ul>
```

::::::
