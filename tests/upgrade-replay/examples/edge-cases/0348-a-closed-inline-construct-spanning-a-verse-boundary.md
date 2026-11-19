## A closed inline construct spanning a verse boundary

A line block hardens SOFT BREAKS, and §23's subject is the node: the only
question at a boundary is whether a `soft_break` is there, never what encloses
it. An emphasis run, a link label or a semantic span that spans a boundary
encloses one - the newline is a node BESIDE the construct's text - so the break
hardens exactly as it does with no construct around it
(markup-carve/carve#1351).

:::: compare

```carve
::: |
*Roses are red,
Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong></p>
</div>
```

::::

The control is DIFFERENT IN KIND rather than in depth, which is the whole of
the rule. A verbatim run that closes on a LATER line spans the same boundary
and does NOT harden it, because the newline is inside the run's own value and
there is no node for the clause to convert. That completes the set above, and
CLOSING is not what any of it turns on: a run that closes on the SAME line
leaves the break outside itself and hardens, a run that closes on a later line
and a run that never closes both hold the break in their value and do not.
These two documents differ only in which construct spans the boundary and they
answer differently:

:::: compare

```carve
::: |
a `b
c` d
:::
```

```html
<div class="line-block">
  <p>a <code>b
c</code> d</p>
</div>
```

::::

No depth is a threshold either, so one stanza answers its boundaries the same
way whether or not a construct is open across them. The pinned reading gave
this document a bare newline and then a `<br>`:

:::: compare

```carve
::: |
*Roses are red,
Violets are blue.*
And so are you.
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong><br>
And so are you.</p>
</div>
```

::::

A BACKSLASH BREAK IS NOT ADDITIVE holds at depth for the same reason it holds
at the top: the backslash consumed the newline, so no soft break survives
inside the construct either and ONE boundary still produces ONE break. An
implementation that hardens by LINE BOUNDARY rather than by node writes two
here:

:::: compare

```carve
::: |
*Roses are red,\
Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
Violets are blue.</strong></p>
</div>
```

::::

A LINK LABEL AND A SEMANTIC SPAN HOLD THE SAME NODE and the rule reaches them
for the same reason - every engine's tree puts a `soft_break` inside the `link`
and inside the `span`. They were not pinned here at first, because the
executable spec's `brContent` admitted no newline and so parsed no bracketed
construct across a line boundary ANYWHERE, in a line block or in an ordinary
paragraph: a fixture would have pinned that limitation rather than this rule.
That is fixed (markup-carve/carve#1352), and the shapes are pinned under
"A bracketed construct spanning a line boundary" below.

And LEADING WHITESPACE is still content inside the construct, so the two rules
compose. An implementation that answers this by re-reading the construct's raw
text loses the gap:

:::: compare

```carve
::: |
*Roses are red,
  Violets are blue.*
:::
```

```html
<div class="line-block">
  <p><strong>Roses are red,<br>
&nbsp;&nbsp;Violets are blue.</strong></p>
</div>
```

::::
