## A boolean attribute does not start with an underscore

An identifier may start with `_`, so `{_x_}` was two constructs at once: the
boolean attribute `_x_`, and a forced underline. Alone on a line the attribute
reading won, the underline was unreachable, and with no block beneath it to
attach to the line rendered nothing at all - five characters kept in the source
and gone from the output. The bare attribute form gives the collision up
(markup-carve/carve#1450).

::: compare

```carve
{_x_}

{_x_} y
```

```html
<p><u>x</u></p>
<p><u>x</u> y</p>
```

:::

Only the bare form is narrowed. An id, a class and a key/value keep their
leading underscore, and none of them can be read as an underline, because none
of them ends `_}`. HTML has no boolean attribute starting with `_`, and the one
underscore attribute in the wild is hyperscript's, which carries a value.

::: compare

```carve
{#_id ._c _k=1 _="on click"}
para
```

```html
<p id="_id" class="_c" _k="1" _="on click">para</p>
```

:::

A bare `{_foo}` has no underline reading either, so it is text rather than
something else.

::: compare

```carve
{_foo}
para
```

```html
<p>{_foo}
para</p>
```

:::

The writer follows, and nothing extra pins it. PART 11 §6c shortens an
empty-string attribute to its bare name, and it cannot do that here - `{_u=""}` written as
`{_u}` would be text, and `{_x_=""}` would be an underline, either way a
document that no longer says what it said. §1's `parse(fmt(x)) == parse(x)` is
gated across all three engines over this corpus, so the case below breaks each
engine's own round-trip on the day it ships the reading rule and not before.

::: compare

```carve
[x]{_u=""}
```

```html
<p><span _u="">x</span></p>
```

:::
