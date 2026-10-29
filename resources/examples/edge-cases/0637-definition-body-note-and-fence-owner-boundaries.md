## Definition body, note, and fence owner boundaries

These examples pin the ruled owner columns in carve#3446, carve#3448, and carve#3452.

A tabbed fence opens in a definition body, and a closer that reaches the body closes it

::::::: compare

`````carve
:: t
: a
	```
  ```
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code></code></pre>
  </dd>
</dl>
`````

:::::::

A closer below the definition body opens a fence of its own after the body

::::::: compare

`````carve
:: t
: a
	```
 ```
`````

`````html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code></code></pre>
  </dd>
</dl>
<pre><code></code></pre>
`````

:::::::

An invisible footnote keeps a marker at its body column

::::::: compare

`````carve
. d
   [^n]: e
     - a
`````

`````html
<ol>
  <li>d</li>
</ol>
`````

:::::::

A marker below the invisible footnote body belongs to the list item

::::::: compare

`````carve
. d
   [^n]: e
    - a
`````

`````html
<ol>
  <li>d
    <ul>
      <li>a</li>
    </ul>
  </li>
</ol>
`````

:::::::

A later closer at a definition fence base owns its payload

::::::: compare

`````carve
:: m
: l
     ```
e
     ```
`````

`````html
<dl>
  <dt>m</dt>
  <dd>
    <p>l</p>
    <pre><code></code></pre>
  </dd>
</dl>
<p>e</p>
<pre><code></code></pre>
`````

:::::::

A closer outside the definition body cannot close its fence

::::::: compare

`````carve
:: m
: l
     ```
e
 ```
`````

`````html
<dl>
  <dt>m</dt>
  <dd>
    <p>l</p>
    <pre><code></code></pre>
  </dd>
</dl>
<p>e</p>
<pre><code></code></pre>
`````

:::::::
