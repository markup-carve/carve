## A fence keeps the blank line at the end of its content

A blank line inside a fence is content, and the last one is content too. That
holds wherever the fence ends: at its own closer, at the end of a container, or
at the end of the document.

Nothing pinned this before, and all three engines lost the blank independently -
each by a different mechanism, and each only on some of the shapes below
(markup-carve/carve-js#988, markup-carve/carve-php#1177,
markup-carve/carve-rs#908).

::: compare

````carve
```
x

```
````

````html
<pre><code>x

</code></pre>
````

:::

An unterminated fence runs to the end of the document, and the blank before that
end is still its content.

::: compare

````carve
```
x

````

````html
<pre><code>x

</code></pre>
````

:::

Inside a colon container the unclosed fence takes the container's closer as
payload, and the blank before it is still content.

:::: compare

````carve
::: note
```
x

:::
````

````html
<aside class="admonition note" aria-label="Note">
  <pre><code>x

:::
</code></pre>
</aside>
````

::::

The end of a list item ends the fence the same way its own closer would.

::: compare

````carve
- ```
  x

````

````html
<ul>
  <li>
    <pre><code>x

</code></pre>
  </li>
</ul>
````

:::

A fence opened on a nested list marker line keeps the blank too, even with no
line before it and at any depth. A blank line supplies every indentation prefix
(PART 0 O1), so nesting depth does not change which frame owns it
(markup-carve/carve-php#3573, markup-carve/carve-rs#2925).

::: compare

````carve
- - ```

tail
````

````html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>
</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::

::: compare

````carve
- - - ```

tail
````

````html
<ul>
  <li>
    <ul>
      <li>
        <ul>
          <li>
            <pre><code>
</code></pre>
          </li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::

Two blank lines before a nested item's closer remain fence content.

::: compare

````carve
- - ```


    ```

tail
````

````html
<ul>
  <li>
    <ul>
      <li>
        <pre><code>

</code></pre>
      </li>
    </ul>
  </li>
</ul>
<p>tail</p>
````

:::
