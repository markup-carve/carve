## An all-blank raw payload still emits its line

The payload is every line between the delimiters, so a sole blank line is not
an absent block. For a matching raw format it contributes its newline exactly
as a trailing blank does beside other content, which leaves a blank line above
the paragraph that follows. A harness that trims before comparing cannot see
that newline here, because it stands first in the output; the pairs that put a
paragraph above the block are where it is visible.

::: compare

````carve
```=html

```

after
````

````html


<p>after</p>
````

:::
