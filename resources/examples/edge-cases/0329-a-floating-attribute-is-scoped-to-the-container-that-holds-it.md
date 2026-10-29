## A floating attribute is scoped to the container that holds it

PART 9 §15 A2 says a pending `{...}` applies to the next block. That answers
which BLOCK, not which container, and containment already bounds everything else
in the language — so an attribute written inside a quote, an item or a `dd` does
not survive that container's end (markup-carve/carve#1281).

A4 already dropped an attribute with no block left to attach to; a container's
end is the second way to run out of blocks, and it drops the same way. Neither
is silent: both are reported as `unattached-block-attribute`.

The attribute does not escape over a blank line onto a document-level
paragraph — `tail` here is unclassed:

::: compare

```carve
> q
> {.k}

tail
```

```html
<blockquote><p>q</p></blockquote>
<p>tail</p>
```

:::

Without the blank line the answer is the same, and it composes with §S4: the
attribute leaves no open paragraph, so the flush-left line ends the quote rather
than joining it, and A4 then has nothing left to attach to.

::: compare

```carve
> q
> {.k}
tail
```

```html
<blockquote><p>q</p></blockquote>
<p>tail</p>
```

:::

A list item is the same container question:

::: compare

```carve
- a
  {.k}

tail
```

```html
<ul>
  <li>a</li>
</ul>
<p>tail</p>
```

:::

And the attribute does not reach FORWARD out of the item to pull a block in
either. The heading stays outside and stays unclassed:

::: compare

```carve
- a
  {.k}
# H
```

```html
<ul>
  <li>a</li>
</ul>
<section id="H">
  <h1>H</h1>
</section>
```

:::

A definition body ends the same way:

::: compare

```carve
:: t
:  d
   {.k}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

An attribute block may WRAP across lines (§15 A5), and one block is one block
however many lines it takes — a body ending `{.k` / `#x}` closes the same way as
a body ending `{.k}`:

::: compare

```carve
:: t
:  d
   {.k
   #x}
tail
```

```html
<dl>
  <dt>t</dt>
  <dd>d</dd>
</dl>
<p>tail</p>
```

:::

### Scoped, not disabled

The controls are what keep "scoped" from reading as "dropped". Inside its own
container the attribute attaches exactly as it always has — in a quote:

::: compare

```carve
> {.k}
>
> tail
```

```html
<blockquote><p class="k">tail</p></blockquote>
```

:::

in a list item:

::: compare

```carve
- a
  {.k}
  # H
```

```html
<ul>
  <li>a
    <h1 class="k" id="H">H</h1>
  </li>
</ul>
```

:::

in a definition body:

::: compare

```carve
:: t
:  d
   {.k}
   # H
```

```html
<dl>
  <dt>t</dt>
  <dd>
    <p>d</p>
    <h1 class="k" id="H">H</h1>
  </dd>
</dl>
```

:::

and at the top level, where the document is the container and a blank line ends
nothing:

::: compare

```carve
{.k}

tail
```

```html
<p class="k">tail</p>
```

:::
