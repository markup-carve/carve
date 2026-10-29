## A quoted comment or attribute line closes the quote's paragraph

A comment or a block-attribute line inside a quote closes the quoted paragraph,
as it does outside one. An unclosed fence on the next line misses the quote and
opens in the note, where it runs to the end, the note's own closer included:

:::::: compare

````carve
::: note
> para
> %% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para</p></blockquote>
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
> para
> {#x}
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::

Quoted text keeps the paragraph open, and the fence line interrupts it all the
same:

:::::: compare

````carve
::: note
> para
> more text
```
code
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para
more text</p></blockquote>
  <pre><code>code
:::
after *b*
</code></pre>
</aside>
```

::::::
