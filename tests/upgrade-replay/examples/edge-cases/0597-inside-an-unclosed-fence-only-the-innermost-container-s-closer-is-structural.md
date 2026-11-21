## Inside an unclosed fence only the innermost container's closer is structural

A code fence with no closer runs to the end of its container. Every colon line
after it is fence content, whatever its width, and that includes the closer of
the container it sits in: no closer closes anything there and no run opens
anything. A fence that closes stays opaque to every colon line inside it
(PART 2, A CLOSER IS REQUIRED).

:::::: compare

````carve
::: outer
:::: inner
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
    <pre><code>code
:::
::::
:::
after *b*
</code></pre>
  </div>
</div>
```

::::::

:::::: compare

````carve
:::: outer
::: inner
```
code
::::
:::
::::
after *b*
````

```html
<div class="outer">
  <div class="inner">
    <pre><code>code
::::
:::
::::
after *b*
</code></pre>
  </div>
</div>
```

::::::

:::::: compare

````carve
::: note
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
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
::: outer
:::: inner
```
code
:::
```
::::
:::
after *b*
````

```html
<div class="outer">
  <div class="inner">
    <pre><code>code
:::
</code></pre>
  </div>
</div>
<p>after <strong>b</strong></p>
```

::::::

A comment line above the fence changes nothing: the fence still runs to the
end, in one container or nested.

:::::: compare

````carve
::: note
%% c
```
code
::::
:::
after *b*
````

```html
<aside class="admonition note" aria-label="Note">
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
::: outer
:::: inner
%% c
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
    <pre><code>code
:::
::::
:::
after *b*
</code></pre>
  </div>
</div>
```

::::::

Nor does a quote or an item whose only content is a comment:

:::::: compare

````carve
::: note
> %% c
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
- %% c
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
