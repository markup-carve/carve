## An opener under a quote in a nested host opens at one column only

PART 0 [CARVE-P0-021] folds a block opener into a surviving quote's open
paragraph at every column but the host's own content column. PART 0
[CARVE-P0-004] rebases a RECOGNIZED opener, and past the content column a line
is one only where no open paragraph can take it as text; PART 0 [CARVE-P0-011]
is why that column itself always opens. The item's content column is 2 and the
quote's is 4, so column 2 is the control and 1, 3, 4 and 8 all fold. A raw fence
earns its own documents: folded, its payload reaches the page inside a code
span, while an opener there drops a format the target does not match under
PART 9 [CARVE-P9-040], so the band decides whether authored text is published or
gone (carve#2607).

::: compare

````carve
- a
  > q
  ```js
  c
  ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <pre><code class="language-js">c
</code></pre>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
 ```js
 c
 ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
<pre><code class="language-js">c
</code></pre>
````

:::

::: compare

````carve
- a
  > q
   ```js
   c
   ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <pre><code class="language-js">c
</code></pre>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
    ```js
    c
    ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <pre><code class="language-js">c
</code></pre>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
        ```js
        c
        ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <pre><code class="language-js">c
</code></pre>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
   # h
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <h1 id="h">h</h1>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
   ---
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <hr>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
   | c |
   |---|
   | 1 |
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <table>
      <thead>
        <tr><th scope="col">c</th></tr>
      </thead>
      <tbody>
        <tr><td>1</td></tr>
      </tbody>
    </table>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
   ```=latex
   \r
   ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
  </li>
</ul>
````

:::

::: compare

````carve
- a
  > q
   ```=html
   <b>r</b>
   ```
````

````html
<ul>
  <li>a
    <blockquote><p>q</p></blockquote>
    <b>r</b>
  </li>
</ul>
````

:::

::: compare

````carve
x[^1]

[^1]: > q
   ```js
   c
   ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <pre><code class="language-js">c
</code></pre>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
x[^1]

[^1]: > q
   ```=latex
   \r
   ```
````

````html
<p>x<a id="fnref1" href="#fn1" role="doc-noteref"><sup>1</sup></a></p>
<section role="doc-endnotes" aria-label="Footnotes">
  <hr>
  <ol>
    <li id="fn1">
      <blockquote><p>q</p></blockquote>
      <p><a href="#fnref1" role="doc-backlink" aria-label="Back to reference">↩</a></p>
    </li>
  </ol>
</section>
````

:::

::: compare

````carve
:: t
: > q
   ```js
   c
   ```
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <blockquote><p>q</p></blockquote>
    <pre><code class="language-js">c
</code></pre>
  </dd>
</dl>
````

:::
