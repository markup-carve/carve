## Comment columns and surviving list items

A below-column line comment can retain an ordinary follower. A comment at the
content column clears that retention. A later below-column comment then has
no prefix or claim to admit it, so the item ends before that comment. A sibling
marker still starts the next item.

::: compare

```carve
- intro
%% c
tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
  %% c
tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
%%%
c
%%%
  tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
%% c
- next
```

```html
<ul>
  <li>intro</li>
  <li>next</li>
</ul>
```

:::

::: compare

```carve
- intro
%% a
  %% b
tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
  %% a
%% b
tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
  %% a
%% b
  tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::

::: compare

```carve
- intro
  %% a
%%%
b
%%%
  tail
```

```html
<ul>
  <li>intro</li>
</ul>
<p>tail</p>
```

:::
