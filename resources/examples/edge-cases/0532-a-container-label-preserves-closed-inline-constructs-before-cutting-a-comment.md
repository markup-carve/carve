## A container label preserves closed inline constructs before cutting a comment

A container label is an inline run under CARVE-P9-041. A trailing comment inside a closed insertion or deletion ends at that construct’s closer. Delimited comments, critic comments and verbatim spans keep their own boundaries before the label’s trailing comment is considered.

:::: compare

```carve
:::[{+a %% secret+}]
body
:::
```

```html
<div>
  <p class="div-label"><ins>a</ins></p>
  <p>body</p>
</div>
```

::::

:::: compare

```carve
:::[{-a %% secret-}]
body
:::
```

```html
<div>
  <p class="div-label"><del>a</del></p>
  <p>body</p>
</div>
```

::::

:::: compare

```carve
:::[{% %% hidden %} after]
body
:::
```

```html
<div>
  <p class="div-label"> after</p>
  <p>body</p>
</div>
```

::::

:::: compare

```carve
:::[{# %% hidden #} after]
body
:::
```

```html
<div>
  <p class="div-label"><span class="critic-comment"> %% hidden </span> after</p>
  <p>body</p>
</div>
```

::::

:::: compare

```carve
:::[`a %% secret`]
body
:::
```

```html
<div>
  <p class="div-label"><code>a %% secret</code></p>
  <p>body</p>
</div>
```

::::
