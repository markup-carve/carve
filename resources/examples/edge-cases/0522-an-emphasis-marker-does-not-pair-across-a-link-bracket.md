## An emphasis marker does not pair across a link bracket

PART 8 ranks links at 5 and emphasis markers at 7, so a link is resolved before
the emphasis scan reaches it. A slash inside the label is already label text by
then, and the slash outside the bracket has no partner left to pair with, so it
stays literal.

::: compare

`````carve
/[a/](/u)
`````

`````html
<p>/<a href="/u">a/</a></p>
`````

:::

::: compare

`````carve
/a/
`````

`````html
<p><em>a</em></p>
`````

:::

::: compare

`````carve
/[a](/u)/
`````

`````html
<p><em><a href="/u">a</a></em></p>
`````

:::
