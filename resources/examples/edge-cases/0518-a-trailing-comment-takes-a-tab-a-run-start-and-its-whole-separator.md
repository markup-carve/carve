## A trailing comment takes a tab, a run start and its whole separator

Only a run of spaces separates a trailing `%%` marker from the text before it. A tab is content. The whole space run goes with the comment, so two spaces before `%%` leave no trailing space behind (CARVE-P9-041, carve#3013). A `%%` that starts the inline run needs no separator at all, which is only spellable in a host whose run begins mid-line: a definition term, a table cell, a figure caption, a div label. A paragraph is the one host where the run starts at a line start, so the block layer's comment line covers it (PART 9 §21).

::: compare

```carve
a	%% hidden
```

```html
<p>a	%% hidden</p>
```

:::

::: compare

```carve
a  %% hidden
```

```html
<p>a</p>
```

:::

::: compare

```carve
:: a	%% hidden
: d
```

```html
<dl>
  <dt>a	%% hidden</dt>
  <dd>d</dd>
</dl>
```

:::

::: compare

```carve
:: %% hidden
: d
```

```html
<dl>
  <dt></dt>
  <dd>d</dd>
</dl>
```

:::

::: compare

```carve
| a	%% hidden | b |
|---|---|
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col">a	%% hidden</th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
| %% hidden | b |
|---|---|
| 1 | 2 |
```

```html
<table>
  <thead>
    <tr><th scope="col"></th><th scope="col">b</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2</td></tr>
  </tbody>
</table>
```

:::

::: compare

```carve
![alt](u)
^ cap	%% hidden
```

```html
<figure>
  <img src="u" alt="alt">
  <figcaption>cap	%% hidden</figcaption>
</figure>
```

:::

::: compare

```carve
![alt](u)
^ %% hidden
```

```html
<figure>
  <img src="u" alt="alt">
  <figcaption></figcaption>
</figure>
```

:::

:::: compare

```carve
::: note [a	%% hidden]
body
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p class="div-label">a	%% hidden</p>
  <p>body</p>
</aside>
```

::::

:::: compare

```carve
::: note [%% hidden]
body
:::
```

```html
<aside class="admonition note" aria-label="Note">
  <p class="div-label"></p>
  <p>body</p>
</aside>
```

::::

::: compare

```carve
a%%b and 50%% stay
```

```html
<p>a%%b and 50%% stay</p>
```

:::

::: compare

```carve
[a	%% hidden](/u)
```

```html
<p><a href="/u">a	%% hidden</a></p>
```

:::

::: compare

```carve
[%% hidden](/u)
```

```html
<p><a href="/u"></a></p>
```

:::
