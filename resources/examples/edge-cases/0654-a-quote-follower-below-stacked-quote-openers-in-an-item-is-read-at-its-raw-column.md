## A quote follower below stacked quote openers in an item is read at its raw column

Below `- > > +` the first-block `+` takes a follower at column 0 or at the opener line's own column (CARVE-P9-067). A `>` at column 0 is no prefix of the quotes at columns 2 and 4, so it opens a quote that attaches and nests inside the innermost quote. A `>` at column 2 is at an intervening column: the `+` is refused and the line folds into its text (carve#3421).

A quote at column 0 attaches and nests three quotes deep

::::::: compare

`````carve
- > > +
> q
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <blockquote><p>q</p></blockquote>
      </blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::

A quote at the item's content column is refused, and `q` folds into the `+` text

::::::: compare

`````carve
- > > +
  > q
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>+
q</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
