---
page: edge-lists
---

## A braced comment line after a plus is the attached paragraph

PART 9 §17 L3 and CARVE-P9-042 (carve#4544). The `+` skips invisible block lines such as `%% c`, but a `{% c %}` line is a paragraph holding an inline comment. The `+` attaches that paragraph, and the heading after it is not attached.

:::::: compare

`````carve
- +
{% c %}
# H
`````

```html
<ul>
  <li></li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

::::::
