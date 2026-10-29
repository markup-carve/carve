## Opaque spans inside a container

A container collects its body by scanning for its closer. A code fence, a raw
block and a comment block are opaque: their contents are content, not markup,
so a colon fence written inside one closes nothing. This is what lets a
document about Carve show a container fence at all - under exact-length
closers the code fence is the only structural way to quote one.

:::::: compare

````carve
::: note
```
:::
```
body
:::
after
````

```html
<aside class="admonition note" aria-label="Note">
  <pre><code>:::
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

The opener carrying no info string is the case that hides the bug: the opener
line is closer-shaped itself, so an implementation that tests it before
consuming it ends the span where it began (carve#450). A tilde fence behaves
the same.

:::::: compare

````carve
::: note
~~~
:::
~~~
body
:::
after
````

```html
<aside class="admonition note" aria-label="Note">
  <pre><code>:::
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

A container opener inside the span is content too. Under exact-length closers
this one is load-bearing: read as markup it would push a nesting level and put
every following closer one level off.

:::::: compare

````carve
::: note
```text
::: tip
```
body
:::
after
````

```html
<aside class="admonition note" aria-label="Note">
  <pre><code class="language-text">::: tip
</code></pre>
  <p>body</p>
</aside>
<p>after</p>
```

::::::

A comment block is opaque in the same way. It renders nothing at all, so what
this pins is where the container ends.

:::: compare

```carve
::: note
%%%
:::
%%%
body
:::
after
```

```html
<aside class="admonition note" aria-label="Note">
  <p>body</p>
</aside>
<p>after</p>
```

::::

An unclosed code fence is opaque too: it runs to the end of its container, so
the `:::` and `after` below render inside the code block and the admonition
closes at end of input. A `%%%` opener with no exact-width closer is different:
it opens no span and is a line comment.

:::: compare

````carve
::: note
```
x
:::
after
````

```html
<aside class="admonition note" aria-label="Note">
  <pre><code>x
:::
after
</code></pre>
</aside>
```

::::

Alone, or as the whole content of a blockquote, an unterminated fence opens a
code block that runs to the end the same way.

:::: compare

````carve
> ```
````

```html
<blockquote>
  <pre><code></code></pre>
</blockquote>
```

::::
