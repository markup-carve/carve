## The column of the quote that owns a first-block plus stays eligible at every depth

The column of the quote that owns the `+` is its marker column and is eligible at every stacking depth, as it is for `- > +`, when the follower carries the prefixes of any quotes around it (CARVE-P9-067, carve#3421, carve#4409). A follower at an inner item's column stays refused (corpus 651).

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

Below stacked quote openers the innermost quote owns the `+`, and a follower at its column without the outer quote's prefix is refused

::::::: compare

`````carve
- > > +
    b
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote><p>+
b</p></blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::
