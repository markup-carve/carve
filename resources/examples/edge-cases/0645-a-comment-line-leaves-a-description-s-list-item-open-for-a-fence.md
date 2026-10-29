## A comment line leaves a description's list item open for a fence

An invisible line does not choose the next line's owner (PART 9 §10 I5). A fence after a comment line in a description's list item stays in that item, as it would with no comment line between (carve#3518).

A line comment before the fence

::::::: compare

`````carve
:: t
: 1. para
 %% c
```
x
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>para</li>
    </ol>
  </dd>
</dl>
<pre><code>x
</code></pre>
`````

:::::::

A delimited comment before the fence

::::::: compare

`````carve
:: t
: 1. para
 %%%
 c
 %%%
```
x
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <ol>
      <li>para</li>
    </ol>
  </dd>
</dl>
<pre><code>x
</code></pre>
`````

:::::::
