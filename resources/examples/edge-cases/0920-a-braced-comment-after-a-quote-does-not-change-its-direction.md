---
page: edge-inline
---

## A braced comment after a quote does not change its direction

PART 3 quote direction R1 (carve#4719). A braced inline comment counts as nothing on either side of a quote, so a comment after a quote that follows a dash leaves the quote closing, as it closes without the comment.

:::::: compare

`````carve
"a-"{%%}
`````

```html
<p>“a-”</p>
```

::::::

A comment before a space or punctuation reads the same, and a comment before a digit leaves an apostrophe.

:::::: compare

`````carve
"Wait---"{% c %} he said. '{%%}90s
`````

```html
<p>“Wait—” he said. ’90s</p>
```

::::::
