---
page: edge-definitions
---

## An unclosed fence under a description paragraph in a note holds no paragraph

CARVE-P9-083 and PART 9 §10 I4 (carve#4627). A fence opener interrupts the description's paragraph without looking for a closer and runs to the end of its container. An open fence is no paragraph, so a column-zero line below the note's body column has nothing to continue and leaves the note.

::: compare

````carve
[^0]: :: t
  : d
    ```
z

[^0]
````

````html
<p>z</p>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
        <dd>
          <p>d</p>
          <pre><code></code></pre>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
[^0]: :: t
  : d
    ```
- z

[^0]
````

````html
<ul>
  <li>z</li>
</ul>
<p><a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <dl>
        <dt>t</dt>
        <dd>
          <p>d</p>
          <pre><code></code></pre>
        </dd>
      </dl>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::
