---
page: edge-lists
---

## A list marker inside an item ends a caption like a paragraph

CARVE-P2-021 (carve#4060). A caption ends the same way an open paragraph does, and its item 3 defers list markers to PART 9 §10 I2: inside a list item a marker interrupts the paragraph, so it ends the caption and opens a sublist.

:::::: compare

`````carve
- > q
  ^ p
  - b
`````

```html
<ul>
  <li>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>p</figcaption>
    </figure>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

::::::

A table caption ends the same way.

:::::: compare

`````carve
- | a |
  ^ p
  - b
`````

```html
<ul>
  <li>
    <table>
      <caption>p</caption>
      <tbody>
        <tr><td>a</td></tr>
      </tbody>
    </table>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

::::::

A marker one column past the item's content column ends a quote's caption too, as it ends the item's paragraph and a table's caption.

:::::: compare

`````carve
- > q
  ^ p
   - b
`````

```html
<ul>
  <li>
    <figure>
      <blockquote><p>q</p></blockquote>
      <figcaption>p</figcaption>
    </figure>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
```

::::::
