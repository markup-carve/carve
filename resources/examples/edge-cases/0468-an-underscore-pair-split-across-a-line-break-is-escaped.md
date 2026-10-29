## An underscore pair split across a line break is escaped

PART 11 §8a M1b. The underscore's pair condition reads the whole inline content
of the block, because a Markdown reader pairs emphasis across a line break
inside a paragraph.

::: compare

```carve
/x/_y
z_ w
```

```html
<p><em>x</em>_y
z_ w</p>
```

:::
