## A hosted quote's first-block plus attaches any non-list block at column zero

Reversed by carve#4409: below `> - > +` a block at column 0 lacks the host quote's prefix, so the `+` is refused (CARVE-P9-067). The unprefixed line ends the host quote (§10 I5) and the block stands outside it.

A heading at column 0 stands outside the host quote

::::::: compare

`````carve
> - > +
# h
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote><p>+</p></blockquote>
    </li>
  </ul>
</blockquote>
<section id="h">
  <h1>h</h1>
</section>
`````

:::::::

A table row at column 0 stands outside the host quote

::::::: compare

`````carve
> - > +
| c |
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote><p>+</p></blockquote>
    </li>
  </ul>
</blockquote>
<table>
  <tbody>
    <tr><td>c</td></tr>
  </tbody>
</table>
`````

:::::::

A stacked opener on a sibling item's line refuses the heading the same way

::::::: compare

`````carve
> - a
> - > +
# h
`````

`````html
<blockquote>
  <ul>
    <li>a</li>
    <li>
      <blockquote><p>+</p></blockquote>
    </li>
  </ul>
</blockquote>
<section id="h">
  <h1>h</h1>
</section>
`````

:::::::
