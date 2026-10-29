## An unterminated fence at a content column opens no block, so the paragraph stays open

Section 10 I4 makes a valid code fence interrupt an open paragraph whether or
not a closer follows. At document level `q` over a bare fence run over `b` is a
paragraph followed by a code block holding `b`.

At a container's content column the same line does the same thing: the fence
opens a code block that runs to the end of the container. A fenced body is not a
paragraph, so a flush-left line below does not fold into it and the container
ends (CARVE-P0-013).

::: compare

````carve
- q
  ```
tail
````

````html
<ul>
  <li>q
    <pre><code></code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

The container is not a parameter. A definition body's content column answers the
same way, and so does a block quote's.

::: compare

````carve
:: t
:  a
   ```
tail
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <p>a</p>
    <pre><code></code></pre>
  </dd>
</dl>
<p>tail</p>
````

:::

::: compare

````carve
> q
> ```
tail
````

````html
<blockquote>
  <p>q</p>
  <pre><code></code></pre>
</blockquote>
<p>tail</p>
````

:::

CONTROL. A blank line inside the open fence is content, and the flush-left line
still ends the fence and the item.

::: compare

````carve
- q
  ```

tail
````

````html
<ul>
  <li>q
    <pre><code>
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

CONTROL. AT BLOCK START a fence opens a body the same way, and the body runs to
the end of the container. The flush-left line has nothing to fold into and the
item ends, which is the fenced-body clause.

::: compare

````carve
- a

  ```
  b
tail
````

````html
<ul>
  <li>a
    <pre><code>b
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::

CONTROL. A fence WITH its closer is a block, and a block leaves no paragraph
open, so the item ends on the flush-left line for the ordinary reason.

::: compare

````carve
- q
  ```
  y
  ```
tail
````

````html
<ul>
  <li>q
    <pre><code>y
</code></pre>
  </li>
</ul>
<p>tail</p>
````

:::
