---
page: edge-tables
---

## A caption host and a continuation cell read what the block holds

Confirmation-round model fixes (carve#4566, carve#4568, carve#4573). A new continuation cell is a header cell when every other cell is, and a `<` marker counts as the cell it extends (PART 9 §5). A comment renders nothing, so it does not keep a lone image from taking a caption (PART 9R R7). A quote of structural-only lines holds no content, nested quotes and bare fences included (PART 9 §4d).

A `<` marker counts as the header cell it extends, so the new cell is a header cell.

:::::: compare

`````carve
|= a | < |
+ | | c |
`````

```html
<table>
  <thead>
    <tr><th scope="col" colspan="2">a</th><th scope="col">c</th></tr>
  </thead>
</table>
```

::::::

A `<` at the row's first column has no origin and counts as an ordinary cell.

:::::: compare

`````carve
| < |= a |
+ | | c |
`````

```html
<table>
  <tbody>
    <tr><td></td><th scope="row">a</th><td>c</td></tr>
  </tbody>
</table>
```

::::::

A line comment after a lone image leaves it a block image with a caption.

:::::: compare

`````carve
![a](/i) %% c
^ cap
`````

```html
<figure>
  <img src="/i" alt="a">
  <figcaption>cap</figcaption>
</figure>
```

::::::

So does a braced comment glued to it.

:::::: compare

`````carve
![a](/i){%%}
^ cap
`````

```html
<figure>
  <img src="/i" alt="a">
  <figcaption>cap</figcaption>
</figure>
```

::::::

A space before a braced comment still renders, so the image stays inline and the caption is text.

:::::: compare

`````carve
![a](/i) {% c %}
^ cap
`````

```html
<p><img src="/i" alt="a"> 
^ cap</p>
```

::::::

A quote holding only an empty nested quote takes no caption.

:::::: compare

`````carve
> >
^ cap
`````

```html
<blockquote>
  <blockquote>

  </blockquote>
</blockquote>
<p>^ cap</p>
```

::::::

Nor does one holding only a bare fence pair.

:::::: compare

`````carve
> :::
> :::
^ cap
`````

```html
<blockquote>
  <div>

  </div>
</blockquote>
<p>^ cap</p>
```

::::::

A nested quote with content still makes the outer quote captionable.

:::::: compare

`````carve
> >
> > a
^ cap
`````

```html
<figure>
  <blockquote>
    <blockquote><p>a</p></blockquote>
  </blockquote>
  <figcaption>cap</figcaption>
</figure>
```

::::::
