## A line block's last body line keeps its backslash

PART 11 §7c lets the canonical writer spell a line block's `hard_break` as a
BARE NEWLINE, because the container hardens every line boundary of its own
accord (§23). The permission holds only where re-reading that newline yields the
same tree, and at the END of a stanza it does not: §23 hardens the boundary
BETWEEN two body lines, and the body's end is not one. A `hard_break` there is
the author's own (PART 3), the newline after it belongs to the closing fence,
and a writer that drops the backslash drops the break
(markup-carve/carve-js#1172).

No space is involved. This is the shape the clause's first wording could not
reach, because it enumerated the two cases where a bare newline is unsafe and
both of them are about whitespace.

:::: compare

```carve
::: |
a\
:::
```

```html
<div class="line-block">
  <p>a<br>
</p>
</div>
```

::::

A TRAILING run of TWO OR MORE columns is NBSP content under MEDIAL GAPS and
survives a bare newline on its own, which is why it needs no backslash INSIDE a
stanza - `345-a-line-block-s-hard-break-keeps-its-backslash-3` is that document.
At the stanza's end the break is what is at stake rather than the spaces, so the
same line answers the other way.

:::: compare

```carve
::: |
a  \
:::
```

```html
<div class="line-block">
  <p>a&nbsp;&nbsp;<br>
</p>
</div>
```

::::

A LINE THAT ENDS IN A COMMENT IS EXEMPT, and the shape that shows why is an
EMPTY comment line. The writer spells one as the marker plus a separator space,
and PART 2 strips that space again on the way back in - so the LONE TRAILING
SPACE case does not reach it: the space is inside the note rather than content
the parser is about to lose, and stripping it leaves the same node. A backslash
written to protect it lands INSIDE the note, where the block layer, which claims
the whole line before the inline parser sees it, reads it back as the comment's
own content. The same exemption is why a last body line ending in a comment
takes no backslash either: the marker runs to the end of its own line, so there
is no hard break there to spell.

:::: compare

```carve
::: |
a
%%
b
:::
```

```html
<div class="line-block">
  <p>a<br>
<br>
b</p>
</div>
```

::::

And a boundary the author spelled `\` is still a boundary, so it is still the
breaks that decide which line is last. Here the last body line is the COMMENT:
the backslash on `a ` is there to hold the LONE trailing space, and the comment
line below it is a line of its own. Asking the question of the soft-break
conversion asks it where a `\` never arrives, which kept the same note under `a`
and dropped it under `a \`.

:::: compare

```carve
::: |
a \
%% c
:::
```

```html
<div class="line-block">
  <p>a <br>
</p>
</div>
```

::::
