## A stacked first-block plus takes a follower only at its innermost opener's marker column

On a line of stacked openers the innermost opener owns the `+`, and only its marker column takes a follower (CARVE-P9-067, carve#4409). Column 0 and the line's own column have no reach of their own. At any other column the `+` is refused and reads like a letter at its column (carve#3421).

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

The same follower below a stacked list opener stands at the inner item's marker column and attaches

::::::: compare

`````carve
- - +
  b
`````

`````html
<ul>
  <li>
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
`````

:::::::

Nested one level, a follower at the opener line's own column is refused, since the quote owns the `+`

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
            <blockquote><p>+
b</p></blockquote>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
`````

:::::::
