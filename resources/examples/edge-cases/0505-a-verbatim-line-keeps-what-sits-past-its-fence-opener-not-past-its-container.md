## A verbatim line keeps what sits past its fence opener, not past its container

`CARVE-P11-016` measures a whitespace-only code line's residue from the FENCE
OPENER's own column. A container's content column is the same number only where
the fence is written flush at it, and every earlier case in this family was, so
three rounds of fixes to this path left the over-indented reading standing
([carve#2420](https://github.com/markup-carve/carve/issues/2420)).

An item's content column is 2 and the fence opens at 4, so the six-space line
keeps the two columns past the opener rather than the four past the item.

::: compare

````carve
- item

    ```
    a
      
    b
    ```
````

````html
<ul>
  <li>item
    <pre><code>a
  
b
</code></pre>
  </li>
</ul>
````

:::

The guard against over-keeping: the same fence, and a line no wider than the
opener's own column. That is an empty code line, and the item's narrower
content column does not turn it into two spaces.

::: compare

````carve
- item

    ```
    a
    
    b
    ```
````

````html
<ul>
  <li>item
    <pre><code>a

b
</code></pre>
  </li>
</ul>
````

:::

A footnote body's content column is 4 and the fence opens at 6. This is the
shape the ticket reproduces.

::: compare

````carve
x[^1]

[^1]: note

      ```
      a
        
      b
      ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <pre><code>a
  
b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

The footnote guard. Four of the line's columns sit inside the body and none past
the opener, so the code line is empty.

::: compare

````carve
x[^1]

[^1]: note

      ```
      a
      
      b
      ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <p>note</p>
      <pre><code>a

b
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
