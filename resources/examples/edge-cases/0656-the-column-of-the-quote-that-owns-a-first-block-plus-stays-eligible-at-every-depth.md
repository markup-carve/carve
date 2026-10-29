## The column of the quote that owns a first-block plus stays eligible at every depth

Next to column 0 and the opener line's own column, the column of the quote that owns the `+` is eligible at every stacking depth, as it is for `- > +` (CARVE-P9-067, carve#3421). A follower at an inner item's column stays refused (corpus 651).

A follower at the quote's column below `- - > +` attaches

::::::: compare

`````carve
- - > +
    b
`````

`````html
<ul>
  <li>
    <ul>
      <li>
        <blockquote><p>b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

One level deeper, a follower at the quote's column attaches too

::::::: compare

`````carve
- - - > +
      b
`````

`````html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <blockquote><p>b</p></blockquote>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

Below stacked quote openers the innermost quote owns the `+`, so a follower at its column attaches

::::::: compare

`````carve
- > > +
    b
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>b</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
