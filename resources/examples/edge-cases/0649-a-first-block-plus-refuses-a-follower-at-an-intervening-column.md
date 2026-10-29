## A first-block plus refuses a follower at an intervening column

A first-block `+` pulls a block from column 0, from the opener line's own column, or from the column of the quote it opens (CARVE-P9-067, carve#3421). A follower at any other column refuses the marker, and the `+` then reads like a letter at its column: the follower folds lazily into the paragraph the `+` starts.

A stacked list and quote opener refuses a follower one column in, and the `+` folds with it

::::::: compare

`````carve
- > +
 b
`````

`````html
<ul>
  <li>
    <blockquote><p>+
b</p></blockquote>
  </li>
</ul>
`````

:::::::

In a nested item, a follower left of the opener line's column is refused

::::::: compare

`````carve
- a
  - > +
 b
`````

`````html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote><p>+
b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

In a nested item, a follower between the opener line's column and the quote's column is refused

::::::: compare

`````carve
- a
  - > +
   b
`````

`````html
<ul>
  <li>a
    <ul>
      <li>
        <blockquote><p>+
b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

A quote line at the inner quote's marker column is the follower, read with the outer quote's prefix

::::::: compare

`````carve
> > +
  > q
`````

`````html
<blockquote>
  <blockquote><p>q</p></blockquote>
</blockquote>
`````

:::::::

The same lines inside a list item: the follower's `>` stands at document column 4, the inner quote's marker column (carve#3935)

::::::: compare

`````carve
- a
  > > +
    > q
`````

`````html
<ul>
  <li>a
    <blockquote>
      <blockquote><p>q</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
