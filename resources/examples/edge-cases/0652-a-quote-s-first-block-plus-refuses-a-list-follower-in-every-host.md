## A quote's first-block plus refuses a list follower in every host

The first-block form takes one non-list block (CARVE-P9-067). A list below a quote's first-block `+` is refused in every host: the `+` reads like a letter and the list line folds into its paragraph, as `> q` / `> > +` / `> - s` reads at document level (carve#3421).

Inside a host quote's list item, a nested quote's `+` above a list stays text, as in the item and quote twins

::::::: compare

`````carve
> - > q
>   > > +
>   > - s
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote>
        <p>q</p>
        <blockquote><p>+
- s</p></blockquote>
      </blockquote>
    </li>
  </ul>
</blockquote>
`````

:::::::

A quote opened on an item's marker line inside a host quote refuses a column-0 list

::::::: compare

`````carve
> - > +
- s
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote><p>+
- s</p></blockquote>
    </li>
  </ul>
</blockquote>
`````

:::::::

A stacked quote opener in an item refuses a list at the item's column

::::::: compare

`````carve
- > > +
  - s
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>+
- s</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
