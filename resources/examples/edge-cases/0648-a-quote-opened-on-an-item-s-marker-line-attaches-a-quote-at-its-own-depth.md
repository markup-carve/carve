## A quote opened on an item's marker line attaches a quote at its own depth

A `> +` under a stacked quote opened on a list item's or description's first line reads like its top-level twin: the attached quote nests in the quote the `+` names (CARVE-P9-033, carve#3421).

The marker-line form

::::::: compare

`````carve
- > > q
  > +
  > > r
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <p>q</p>
        <blockquote><p>r</p></blockquote>
      </blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::

The outer quote names the marker

::::::: compare

`````carve
- > > > q
  > +
  > > r
`````

`````html
<ul>
  <li>
    <blockquote>
      <blockquote>
        <blockquote><p>q</p></blockquote>
        <blockquote><p>r</p></blockquote>
      </blockquote>
    </blockquote>
  </li>
</ul>
`````

:::::::

A quote opened on a description's first line, with an indented opener

::::::: compare

`````carve
:: t
: > > q
  > +
  > > r
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote>
      <blockquote>
        <p>q</p>
        <blockquote><p>r</p></blockquote>
      </blockquote>
    </blockquote>
  </dd>
</dl>
`````

:::::::
