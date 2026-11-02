---
page: edge-lists
---

## A multi-line paragraph of only braced comments is an invisible line

CARVE-P9-042, PART 9 §17 L1b and L3 (carve#4799). A paragraph holding only braced comments renders nothing, whatever its line count, so list tightness, the sibling skip and the `+` read it as they read a `%%` line. After `- +` it is skipped, and the blank behind it refuses the `+`, which is then a letter that the comment line folds into.

:::::: compare

`````carve
- +
{% c %}

# H
`````

```html
<ul>
  <li>+
</li>
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
  <li>Body.</li>
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
