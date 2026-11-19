## An unclosed fence under an open paragraph in a container opens nothing

A code fence with no closer still interrupts an open paragraph (PART 9 §10
I4), and that holds inside a container too: the fence ends the paragraph, a
quote's or an item's included, and opens a code block. Unclosed, it runs to
the end of its container, so every colon line below it is payload and the
note closes at end of input.

:::::: compare

````carve
::: note
para
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <p>para</p>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

The paragraph can be a quote's, continued lazily:

:::::: compare

````carve
::: note
> quote
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>quote</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

or a list item's:

:::::: compare

````carve
::: note
- item
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li>item</li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
