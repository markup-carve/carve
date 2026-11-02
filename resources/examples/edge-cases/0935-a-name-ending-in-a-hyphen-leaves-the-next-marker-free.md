---
page: edge-inline
---

## A name ending in a hyphen leaves the next marker free

PART 9 §7. A marker written right after a mention or tag name opens nothing when the name ends in a word character (`#a#b`). A name may end in `-`, which is no word character, so the next marker opens its own mention or tag, as it does after any other `-`.

::: compare

````carve
x #a-#b and @a-@b
````

```html
<p>x <span class="tag"><strong>#a-</strong></span><span class="tag"><strong>#b</strong></span> and <span class="mention"><strong>@a-</strong></span><span class="mention"><strong>@b</strong></span></p>
```

:::

A run of hyphens and a mixed sigil read the same way, while a name ending in a letter still holds the marker after it as text.

::: compare

````carve
See #a--#b-#c, #a-@b and #a#b
````

```html
<p>See <span class="tag"><strong>#a--</strong></span><span class="tag"><strong>#b-</strong></span><span class="tag"><strong>#c</strong></span>, <span class="tag"><strong>#a-</strong></span><span class="mention"><strong>@b</strong></span> and <span class="tag"><strong>#a</strong></span>#b</p>
```

:::
