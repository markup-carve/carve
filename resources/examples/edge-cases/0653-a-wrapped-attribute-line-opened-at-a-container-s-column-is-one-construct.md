## A wrapped attribute line opened at a container's column is one construct

A block attribute opened at a container's column is one construct, and its continuation lines may sit at any column (PART 0, `block_attributes`). It reads like the one-line `{.c}` at that column: the attribute reaches no block and the line below it is outside the container (carve#3421).

A closer at column 0 ends the attribute the item opened, and `para` stays at document level

::::::: compare

`````carve
- a
  {.c
}
para
`````

`````html
<ul>
  <li>a</li>
</ul>
<p>para</p>
`````

:::::::

A closer at column 1 reads the same

::::::: compare

`````carve
- a
  {.c
 }
para
`````

`````html
<ul>
  <li>a</li>
</ul>
<p>para</p>
`````

:::::::

A continuation line holding more of the attribute reads the same

::::::: compare

`````carve
- a
  {.c
.d}
para
`````

`````html
<ul>
  <li>a</li>
</ul>
<p>para</p>
`````

:::::::

A blank line before the attribute changes nothing

::::::: compare

`````carve
- a

  {.c
}
para
`````

`````html
<ul>
  <li>a</li>
</ul>
<p>para</p>
`````

:::::::

The description twin reads the same

::::::: compare

`````carve
:: t
: d
  {.c
}
para
`````

`````html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>para</p>
`````

:::::::

In a nested list the attribute is one construct for the outer item too, and `para` stays at document level

::::::: compare

`````carve
- a
  - b
    {.c
}
para
`````

`````html
<ul>
  <li>a
    <ul>
      <li>b</li>
    </ul>
  </li>
</ul>
<p>para</p>
`````

:::::::

A nested item in a definition body leaves the following paragraph at document level

::::::: compare

`````carve
:: t
: - a
    {.c
}
para
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>para</p>
`````

:::::::

A nested item after a blank line in a definition body does the same

::::::: compare

`````carve
:: t
: d

  - a
    {.c
}
para
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <ul>
      <li>a</li>
    </ul>
  </dd>
</dl>
<p>para</p>
`````

:::::::

A quoted nested item keeps its prefix on the closer

::::::: compare

`````carve
> - a
>   {.c
> }
para
`````

`````html
<blockquote>
  <ul>
    <li>a</li>
  </ul>
</blockquote>
<p>para</p>
`````

:::::::

A closer that drops the quote prefix stays literal text

::::::: compare

`````carve
> - a
>   {.c
}
para
`````

`````html
<blockquote>
  <ul>
    <li>a
{.c
}
para</li>
  </ul>
</blockquote>
`````

:::::::
