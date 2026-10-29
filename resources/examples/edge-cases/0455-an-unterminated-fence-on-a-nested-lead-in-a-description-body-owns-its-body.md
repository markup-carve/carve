## An unterminated fence on a nested lead in a description body owns its body

A flush-left line leaves the description body and its nested fence. The
trailing run then interrupts that document paragraph and opens an empty code
block. CARVE-P0-013 and CARVE-P9-083 give both hosts the same boundary
(markup-carve/carve#2973).

::: compare

````carve
:: t
: - ``` x
code
```
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code class="language-x"></code></pre>
      </li>
    </ul>
  </dd>
</dl>
<p>code</p>
<pre><code></code></pre>
````

:::

The tilde spelling has the same boundary.

::: compare

````carve
:: t
: - ~~~ x
code
~~~
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code class="language-x"></code></pre>
      </li>
    </ul>
  </dd>
</dl>
<p>code</p>
<pre><code></code></pre>
````

:::

A fence without an info string also leaves the flush-left lines outside.

::: compare

````carve
:: t
: - ```
code
```
````

````html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code></code></pre>
      </li>
    </ul>
  </dd>
</dl>
<p>code</p>
<pre><code></code></pre>
````

:::

The flush-left paragraph also ends the first description list.

::: compare

```carve
:: t
: - ``` x
code

:: t2
: plain
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <ul>
      <li>
        <pre><code class="language-x"></code></pre>
      </li>
    </ul>
  </dd>
</dl>
<p>code</p>
<dl>
  <dt>t2</dt>
  <dd>plain</dd>
</dl>
```

:::
