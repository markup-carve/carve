---
page: edge-tables
---

## A quote holding only braced comments is not a caption host

CARVE-P9-080 (carve#4799). A paragraph of only braced comments holds no content for the host test, so the caret line is a paragraph. The quote keeps its empty paragraph (PART 9 comments).

:::::: compare

`````carve
> {% c %}
^ cap
`````

```html
<blockquote><p></p></blockquote>
<p>^ cap</p>
```

::::::
