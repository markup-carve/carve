## A lazy colon-shaped line in a quote paragraph keeps no indentation

A line with no `>` prefix below an open quote paragraph folds into it as a lazy line (PART 0 O3). Its leading whitespace is stripped like that of any other paragraph continuation line, so a colon-shaped line keeps none of it, whatever its width (carve#3493).

A colon-shaped lazy line below a quote paragraph that starts with colon-shaped text

::::::: compare

`````carve
> :  d
   :  b
`````

`````html
<blockquote><p>:  d
:  b</p></blockquote>
`````

:::::::

The same lazy line after a marker-line term ends at the quote's column

::::::: compare

`````carve
> - :: t
> :  d
   :  b
`````

`````html
<blockquote>
  <ul>
    <li>
      <dl>
        <dt>t</dt>
      </dl>
    </li>
  </ul>
  <p>:  d
:  b</p>
</blockquote>
`````

:::::::

Six spaces of indentation are stripped the same way

::::::: compare

`````carve
> :  d
      :  b
`````

`````html
<blockquote><p>:  d
:  b</p></blockquote>
`````

:::::::
