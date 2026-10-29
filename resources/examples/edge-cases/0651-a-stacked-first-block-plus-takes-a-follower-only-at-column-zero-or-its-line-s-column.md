## A stacked first-block plus takes a follower only at column zero or its line's column

On a line of stacked openers, a first-block `+` pulls a block from document column 0 or from the column the line starts at. A block at an inner opener's column is at an intervening column: the `+` is refused and reads like a letter at its column (CARVE-P9-067, carve#3421).

A follower at the inner item's column refuses the quote's `+`, which then folds with it like a letter

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
        <blockquote><p>+
b</p></blockquote>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::

The same follower below a stacked list opener: the inner item stays empty and `b` stays in the outer item

::::::: compare

`````carve
- - +
  b
`````

`````html
<ul>
  <li>
    <ul>
      <li></li>
    </ul>
    b
  </li>
</ul>
`````

:::::::

Nested one level, a follower at the opener line's own column attaches

::::::: compare

`````carve
- a
  - - > +
  b
`````

`````html
<ul>
  <li>a
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
