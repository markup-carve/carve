---
page: edge-lists
---

## A line below a bare run a paragraph absorbed in a div folds into it

PART 0 S4. The invalid opener is text, and the bare run of another width opens a div inside the open one, so the line below leaves the list (carve#4415, carve#4863).

:::::: compare

`````carve
- :::
  :::e
  ::::
l
`````

```html
<ul>
  <li>
    <div>
      <p>:::e</p>
      <div>

      </div>
    </div>
  </li>
</ul>
<p>l</p>
```

::::::

One level deeper, after a paragraph.

:::::: compare

`````carve
- o

  :::
  :::e
  ::::
l
`````

```html
<ul>
  <li>o
    <div>
      <p>:::e</p>
      <div>

      </div>
    </div>
  </li>
</ul>
<p>l</p>
```

::::::
