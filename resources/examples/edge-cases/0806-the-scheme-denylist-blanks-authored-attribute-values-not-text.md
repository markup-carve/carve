---
page: edge-security
---

## The scheme denylist blanks authored attribute values, not text

An attribute value written in an attribute block is blanked when its scheme is on the URL sink denylist, the OS protocol-handler schemes included. A link or image title, an image's alt text and a task box's name are text and keep their value (CARVE-P9-054, carve#4136).

::: compare

```carve
{title="Shell: bash" lang="ms-word:z"}
para
```

```html
<p title="" lang="">para</p>
```

:::

::: compare

```carve
[a](u "javascript:x") [b](u "Shell: x")
```

```html
<p><a href="u" title="javascript:x">a</a> <a href="u" title="Shell: x">b</a></p>
```

:::

::: compare

```carve
![Shell: x](i.png)
```

```html
<img src="i.png" alt="Shell: x">
```

:::

::: compare

```carve
- [ ] shell: x
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="shell: x"> shell: x</li>
</ul>
```

:::
