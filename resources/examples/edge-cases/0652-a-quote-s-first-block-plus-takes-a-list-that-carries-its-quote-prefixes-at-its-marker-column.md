## A quote's first-block plus takes a list that carries its quote prefixes at its marker column

Reversed by carve#4409: a list attaches in every host except a list item (CARVE-P9-067), so a quote's `+` takes a list at its marker column that carries the prefixes of the quotes around it. A list line without them refuses the `+`, which reads like a letter, and folds into its paragraph.

Inside a host quote's list item, a list with every prefix at the nested quote's marker column attaches

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
        <blockquote>
          <ul>
            <li>s</li>
          </ul>
        </blockquote>
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
