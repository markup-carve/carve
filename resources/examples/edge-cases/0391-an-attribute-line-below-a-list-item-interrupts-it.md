## An attribute line below a list item interrupts it

An attribute line is an INVISIBLE construct, and the three of them - reference
definitions, comments and `{...}` attribute lines - interrupt a paragraph with
no blank line and produce no block of their own. A list item's paragraph is a
paragraph, so a column-0 attribute line below one ends the item and floats
forward to whatever block comes next, exactly as a comment or a definition
written in the same place does.

The executable spec folded it instead, so the line came back as literal text
inside the item while the block below took no attributes. It read the same line
correctly one construct over: a `%%` comment and a `[r]: /u` definition at that
column already interrupted (markup-carve/carve-rs#1167).

::: compare

```carve
- b
{.x}

> q
```

```html
<ul>
  <li>b</li>
</ul>
<blockquote class="x"><p>q</p></blockquote>
```

:::

With no block beneath it the attributes are simply consumed, which is what
"produces no block of its own" means - not kept as text.

::: compare

```carve
- b
{.x}
```

```html
<ul>
  <li>b</li>
</ul>
```

:::
