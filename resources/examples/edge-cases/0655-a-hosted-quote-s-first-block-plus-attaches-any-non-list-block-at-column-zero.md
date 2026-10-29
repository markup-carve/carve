## A hosted quote's first-block plus attaches any non-list block at column zero

Below `> - > +` the first-block `+` pulls a non-list block at column 0 into the inner quote whatever its kind, as it already pulls a paragraph line (CARVE-P9-033, CARVE-P9-067). The pull takes precedence over the host quote ending at an unprefixed line (§10 I5, carve#3421).

A heading at column 0 attaches to the inner quote

::::::: compare

`````carve
> - > +
# h
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote>
        <h1 id="h">h</h1>
      </blockquote>
    </li>
  </ul>
</blockquote>
`````

:::::::

A table row at column 0 attaches to the inner quote

::::::: compare

`````carve
> - > +
| c |
`````

`````html
<blockquote>
  <ul>
    <li>
      <blockquote>
        <table>
          <tbody>
            <tr><td>c</td></tr>
          </tbody>
        </table>
      </blockquote>
    </li>
  </ul>
</blockquote>
`````

:::::::

A stacked opener on a sibling item's line pulls the heading the same way

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
      <blockquote>
        <h1 id="h">h</h1>
      </blockquote>
    </li>
  </ul>
</blockquote>
`````

:::::::
