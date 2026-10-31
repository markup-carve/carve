---
page: edge-blocks
---

## An indented caret line after a quote paragraph that starts with a caret folds into it

PART 9 §10 I7 and CARVE-P2-008 (carve#4217). An indented caret line opens no block and folds into the open quote paragraph, whatever that paragraph starts with.

:::::: compare

`````carve
> ^ x
 ^ cap
`````

```html
<blockquote><p>^ x
^ cap</p></blockquote>
```

::::::

The same after a plain paragraph.

:::::: compare

`````carve
> a
 ^ cap
`````

```html
<blockquote><p>a
^ cap</p></blockquote>
```

::::::
