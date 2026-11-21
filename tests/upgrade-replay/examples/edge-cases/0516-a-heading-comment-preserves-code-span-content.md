## A heading comment preserves code-span content

`CARVE-P9-041` excludes code spans and raw inline from trailing comment
recognition. The heading reads those spans before looking for an outside `%%`,
so their content and the text after them survive. The heading id is derived
from the preserved rendered text.

The final two cases recognize a comment at the start of the heading's text
and keep a tab followed by `%%` as content (CARVE-P9-041, carve#3013).

::: compare

`````carve
# a `x %% b` c
`````

`````html
<section id="a-x-b-c">
  <h1>a <code>x %% b</code> c</h1>
</section>
`````

:::

::: compare

`````carve
# a ``x ` %% b`` c
`````

`````html
<section id="a-x-b-c">
  <h1>a <code>x ` %% b</code> c</h1>
</section>
`````

:::

::: compare

`````carve
{#raw-heading}
# a `x %% b`{=html} c
`````

`````html
<section id="raw-heading">
  <h1>a x %% b c</h1>
</section>
`````

:::

::: compare

`````carve
# a `x %% b` c %% hidden
`````

`````html
<section id="a-x-b-c">
  <h1>a <code>x %% b</code> c</h1>
</section>
`````

:::

::: compare

`````carve
> # a `x %% b` c
`````

`````html
<blockquote>
  <h1 id="a-x-b-c">a <code>x %% b</code> c</h1>
</blockquote>
`````

:::

::: compare

`````carve
# a !`x %% b` c
`````

`````html
<section id="a-x-b-c">
  <h1>a x %% b c</h1>
</section>
`````

:::

::: compare

`````carve
# %% hidden
`````

`````html
<section id="s">
  <h1></h1>
</section>
`````

:::

::: compare

`````carve
# a	%% hidden
`````

`````html
<section id="a-hidden">
  <h1>a	%% hidden</h1>
</section>
`````

:::
