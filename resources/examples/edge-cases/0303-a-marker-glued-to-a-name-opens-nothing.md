## A marker glued to a name opens nothing

The boundary rule has a right half. A `#` or `@` written directly against the end
of a tag or mention name is preceded by a WORD character - the last character of
that name - so it cannot open a second one, exactly as `a#b` cannot open one
(PART 9 §7).

The `word` production absorbs a glued marker between two word characters, which
is that rule stated structurally, but a run that STARTS with a marker never
enters `word` at all - so this shape was unreachable until markup-carve/carve-js#1029
made `{#i#j}` literal text rather than an attribute block, and the executable
spec read it as two tags (markup-carve/carve#1156).

::: compare

```carve
#i#j
```

```html
<p><span class="tag"><strong>#i</strong></span>#j</p>
```

:::

A mention takes the same guard.

::: compare

```carve
@a@b
```

```html
<p><span class="mention"><strong>@a</strong></span>@b</p>
```

:::

Separated by a space, both open normally - that is the control the guard must not
break.

::: compare

```carve
#a #b
```

```html
<p><span class="tag"><strong>#a</strong></span> <span class="tag"><strong>#b</strong></span></p>
```

:::
