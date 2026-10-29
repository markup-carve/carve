## An unclosed fence after an attribute line in a container ends at its closer

A block-attribute line is not paragraph text, so an unclosed fence below it
opens at a block start. It runs to the end of its container: every colon line
after it, the innermost container's own closer included, is code. The
attribute floats onto the code block (PART 9 §15).

:::::: compare

````carve
::: note
{#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <pre id="x"><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

Nested, no container's closer ends the fence:

:::::: compare

````carve
::: outer
:::: inner
{.c}
```
code
:::
::::
:::
after *b*
````

```html
<div class="outer">
  <div class="inner">
    <pre class="c"><code>code
:::
::::
:::
after *b*
</code></pre>
  </div>
</div>
```

::::::

A quote or an item whose only content is an attribute line leaves no paragraph
open either:

:::::: compare

````carve
::: note
> {#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote>

  </blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

:::::: compare

````carve
::: note
- {#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <ul>
    <li></li>
  </ul>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
