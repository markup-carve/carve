---
page: edge-tables
---

## A quote holding only braced comments is not a caption host

carve#4799. A paragraph of only braced comments renders nothing (PART 9 comments), so the quote holds nothing and the caret line is a paragraph.

:::::: compare

`````carve
> {% c %}
^ cap
`````

```html
<blockquote>

</blockquote>
<p>^ cap</p>
```

::::::
