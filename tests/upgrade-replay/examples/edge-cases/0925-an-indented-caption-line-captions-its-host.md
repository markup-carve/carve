---
page: edge-tables
---

## An indented caption line captions its host

carve#4796. Leading space stops no line form at any level (PART 0 S3), and a caption is one of those line forms, so a `^ ` line indented past its host still captions it.

:::::: compare

`````carve
| a |
  ^ cap
`````

```html
<table>
  <caption>cap</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

::::::

An image takes it the same way.

:::::: compare

`````carve
![a](/i)
  ^ cap
`````

```html
<figure>
  <img src="/i" alt="a">
  <figcaption>cap</figcaption>
</figure>
```

::::::
