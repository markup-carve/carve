---
page: edge-lists
---

## A multi-line paragraph of only braced comments is an invisible line

CARVE-P9-042, CARVE-P9-013 and PART 9 §17 L3 (carve#4799) applies when the braced comment run forms. Its block-position continuations must pass the opening `{` column (CARVE-P2-035). A refused run is visible paragraph text, so the historical unindented example below no longer behaves as an invisible lead.

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

:::::: compare

`````carve
- {% c
  d %}

  Body.
`````

```html
<ul>
  <li>{% c
d %}
    Body.
  </li>
</ul>
```

::::::

:::::: compare

`````carve
- a

{% c
d %}

- b
`````

```html
<ul>
  <li><p>a</p></li>
  <li><p>b</p></li>
</ul>
```

::::::
