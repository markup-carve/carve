## An editorial comment contributes nothing to a heading id

An editorial comment is about the text, not part of it, so it never moves a heading id. The heading index and a task box name read the same text.

::: compare

```carve
# x {#c#} y

[x y][]
```

```html
<section id="x-y">
  <h1>x <span class="critic-comment">c</span> y</h1>
  <p><a href="#x-y">x y</a></p>
</section>
```

:::

::: compare

```carve
- [ ] x {#c#} y
- [x] {# note #}done
```

```html
<ul class="task-list">
  <li><input type="checkbox" disabled aria-label="x y"> x <span class="critic-comment">c</span> y</li>
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="done"> <span class="critic-comment"> note </span>done</li>
</ul>
```

:::

::: compare

```carve
# Plan {#draft#}

# Plan
```

```html
<section id="Plan">
  <h1>Plan <span class="critic-comment">draft</span></h1>
</section>
<section id="Plan-2">
  <h1>Plan</h1>
</section>
```

:::
