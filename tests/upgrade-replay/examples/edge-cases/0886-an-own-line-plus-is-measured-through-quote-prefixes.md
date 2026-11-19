---
page: edge-definitions
---

## An own-line plus is measured through quote prefixes

CARVE-P9-067 (carve#4710, carve#4697). An own-line `+` is measured through the quote prefixes on its line: under an indented outer prefix it does not reach an inner quote whose marker stands at another column of the outer content, and under a note it does not reach a marker-line quote at the note's body column. Both refused `+` lines fold as text.

::: compare

````carve
>  > x
 > +
 > q
````

````html
<blockquote>
  <blockquote><p>x
+
q</p></blockquote>
</blockquote>
````

:::

::: compare

````carve
>    >
   > +
   > q
````

````html
<blockquote>
  <blockquote>

  </blockquote>
  <p>+
q</p>
</blockquote>
````

:::

::: compare

````carve
[^f]: > a
  +
  b

[^f]
````

````html
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>a
+
b</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
