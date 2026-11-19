## A wrapped attribute line opened at a container's column is one construct

A block attribute opened at a container's column remains one construct only when every continuation passes its opening `{` column (CARVE-P2-035). The historical closer and token lines below fall short, so the runs become paragraph text. A deeper continuation retains the one-line attribute reading.

A closer at column 0 refuses the attribute run

::::::: compare

`````carve
- a
  {.c
}
para
`````

`````html
<ul>
  <li>a
{.c
}
para</li>
</ul>
`````

:::::::

A closer at column 1 also falls short of the opening column

::::::: compare

`````carve
- a
  {.c
 }
para
`````

`````html
<ul>
  <li>a
{.c
}
para</li>
</ul>
`````

:::::::

A token continuation at column 0 also refuses the run

::::::: compare

`````carve
- a
  {.c
.d}
para
`````

`````html
<ul>
  <li>a
{.c
.d}
para</li>
</ul>
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
  <li><p>a</p>
    <p>{.c
}
para</p>
  </li>
</ul>
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
  <dd>d
{.c
}
para</dd>
</dl>
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
      <li>b
{.c
}
para</li>
    </ul>
  </li>
</ul>
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
      <li>a
{.c
}
para</li>
    </ul>
  </dd>
</dl>
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
      <li>a
{.c
}
para</li>
    </ul>
  </dd>
</dl>
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
    <li>a
{.c
}
para</li>
  </ul>
</blockquote>
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
