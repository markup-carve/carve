## A description body whose own block is a fence keeps no line below its column

CARVE-P9-083 ends the body below its content column, and its `A NON-OPENER
STILL FOLDS` arm is conditioned on a paragraph being open above the line. A
body whose own block is a fence leaves none, so a flush-left non-opener has
nothing to reach and the body ends at the opener. The fence holds nothing and
the line below it is classified in the surviving context, which is the
document, where the trailing run interrupts that paragraph and opens an empty
code block.

::: compare

````carve
:: t
: ```
code
```
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <pre><code></code></pre>
  </dd>
</dl>
<p>code</p>
<pre><code></code></pre>
````

:::
