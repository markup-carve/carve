## A first-block plus refuses a follower at an intervening column

A first-block `+` takes a follower only at its host's marker column, read through the prefixes of the quotes around the host (CARVE-P9-067, carve#3421, carve#4409). A follower at any other column refuses the marker, and the `+` then reads like a letter at its column: the follower folds lazily into the paragraph the `+` starts.

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

A `>` at the inner quote's marker column is no outer prefix, so the follower is refused

::::::: compare

`````carve
> > +
  > q
`````

`````html
<blockquote>
  <blockquote><p>+
q</p></blockquote>
</blockquote>
`````

:::::::

The same lines inside a list item are refused the same way: the follower's `>` stands at document column 4, the inner quote's marker column (carve#3935)

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
      <blockquote><p>+
q</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
