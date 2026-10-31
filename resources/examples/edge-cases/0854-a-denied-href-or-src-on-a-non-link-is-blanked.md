---
page: edge-attributes
---

## A denied href or src on a non-link is blanked

CARVE-P9-054: an authored value on the denylist is blanked (carve#4458).

:::: compare

````carve
{src=javascript:x}
p
````

```html
<p src="">p</p>
```

::::

:::: compare

````carve
[a]{href=javascript:x}
````

```html
<p><span href="">a</span></p>
```

::::
