## A quote follower below stacked quote openers in an item is read at its raw column

Below `- > > +` the inner quote owns the `+`. A follower must carry the outer quote's `>` at column 2 and stand at column 4 (CARVE-P9-067, carve#4409). A `>` at column 0 is no such prefix, so the `+` is refused and the line opens its own quote outside the list.

A quote at column 0 is refused and stands outside the list

::::::: compare

`````carve
- > > +
> q
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>+</p></blockquote>
    </blockquote>
  </li>
</ul>
<blockquote><p>q</p></blockquote>
`````

:::::::

A `>` at the item's content column is the outer quote's prefix, so `q` attaches to the inner quote

::::::: compare

`````carve
- > > +
  > q
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>q</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
