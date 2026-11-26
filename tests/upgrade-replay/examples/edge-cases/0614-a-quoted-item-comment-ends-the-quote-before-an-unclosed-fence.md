## A quoted item comment ends the quote before an unclosed fence

An item line under an item's paragraph starts the next item, so a comment or
attribute item closes that paragraph inside a quote too. No paragraph is then
open for the unquoted fence line to continue, so the quote ends, the fence
opens in the note's body, and it runs to the end, the note's own closer
included:

:::::: compare

````carve
::: note
> - para
> - %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote>
    <ul>
      <li>para</li>
      <li></li>
    </ul>
  </blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

and for an attribute item:

:::::: compare

````carve
::: note
> - para
> - {#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote>
    <ul>
      <li>para</li>
      <li></li>
    </ul>
  </blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

Under a quoted plain paragraph the item line is lazy text, so the paragraph
stays open, and the fence line interrupts it:

:::::: compare

````carve
::: note
> para
> - %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para
-</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
