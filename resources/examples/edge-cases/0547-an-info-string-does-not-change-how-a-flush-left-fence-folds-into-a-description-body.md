## An info string does not change how a flush-left fence folds into a description body

A closed nested fence leaves no paragraph open. A flush-left fence line ends
the description body and opens a document block, with or without a language
(CARVE-P0-009; carve#2895).

::: compare

````carve
:: t
:  - ```
     ```
```rust
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
<pre><code class="language-rust"></code></pre>
````

:::

The bare run ends the body too:

::: compare

````carve
:: t
:  - ```
     ```
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
<pre><code></code></pre>
````

:::

A terminated fence at that column also opens outside the body.

::: compare

````carve
:: t
:  - ```
     ```
```rust
c
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
<pre><code class="language-rust">c
</code></pre>
````

:::
