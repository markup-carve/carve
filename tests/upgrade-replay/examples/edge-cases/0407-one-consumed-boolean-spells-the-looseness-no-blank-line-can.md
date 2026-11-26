## One consumed boolean spells the looseness no blank line can

PART 9 section 17 L7. Carve spells looseness with a blank line, and a blank line
needs two things to stand between, so the shape with nothing on one side has no
spelling at all: a ONE-ITEM loose list, and a definition description holding ONE
block. The second is the worse case, because a blank line between two ENTRIES
does not loosen a `<dl>` in the first place - only a second block inside the
description wraps it - so `<dd><p>x</p></dd>` is unspellable at every entry
count.

`loose` on the preceding block-attribute line says both, in the one place the
axis exists, and is CONSUMED: neither `<ul>` nor `<dl>` below carries a `loose`
attribute. It follows PART 12 section 15's `header-rows` in all three respects -
the same line, a structural fact carried as a boolean, consumed rather than
emitted.

The `<dl>` pair carries a second finding. This repository's own oracle never read
a definition list's block attributes at all: `{.foo}` before a `:: term` line
parsed correctly, attached to the node and was dropped on the way out, where
carve-js emits `<dl class="foo">`. No corpus document had ever put an attribute
line before a definition list, so nothing was red - the same gap carve#626 and
carve#693 left one container over.

Both documents are declared in `resources/engine-pin-drift.txt`: the pinned build
has not shipped the key and renders the attribute literally, as `<ul loose="">`.

::: compare

```carve
{loose}
- Note text.
```

```html
<ul>
  <li><p>Note text.</p></li>
</ul>
```

:::

::: compare

```carve
{loose}
:: Term
:  Definition.
```

```html
<dl>
  <dt>Term</dt>
  <dd><p>Definition.</p></dd>
</dl>
```

:::
