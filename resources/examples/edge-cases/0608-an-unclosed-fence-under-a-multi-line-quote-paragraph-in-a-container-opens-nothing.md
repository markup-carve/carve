## An unclosed fence under a multi-line quote paragraph in a container opens nothing

A quote paragraph that runs over several quoted lines is still open at the
fence line, and the fence interrupts it (PART 9 §10 I4). Every quoted line
carries paragraph text, so none of them closes the paragraph above it. The
colon lines below are payload of the unclosed fence, as in the one-line case.

:::::: compare

````carve
::: note
> para
> more
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>para
more</p></blockquote>
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
> a
> b
> c
> d
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
  <blockquote><p>a
b
c
d</p></blockquote>
  <pre><code>code
::::
:::
after *b*
</code></pre>
</aside>
```

::::::
