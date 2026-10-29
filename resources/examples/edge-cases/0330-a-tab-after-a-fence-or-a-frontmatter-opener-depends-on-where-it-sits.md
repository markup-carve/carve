## A tab after a fence or a frontmatter opener depends on where it sits

Two clauses meet on these two lines, and which one governs is decided by
POSITION rather than by construct (markup-carve/carve#1295).

A tab BEFORE content on the opener is the marker-to-content separator, which is
the `space` terminal and nothing else, so the construct does not open - the
rule the definition, heading, list and task markers already carry. A tab at the
END of the line, with nothing after it, is never that slot: it is trailing
whitespace on a content line, PART 2 drops it, and what is left is the bare
opener. Read that way the two clauses never overlap, so neither needs an
exception written into it to protect the other.

A code fence whose info string is preceded by a tab is not a fence opener. The
backtick run is then an ordinary inline verbatim run in a paragraph, and the
bare `` ``` `` line below it is a valid opener that interrupts that paragraph:

::: compare

````carve
```	php
x
```
````

````html
<p><code>	php
x</code></p>
<pre><code></code></pre>
````

:::

The same fence with the tab at the end of the line and no info string opens
normally, because the tab never reaches the separator's question:

::: compare

````carve
```	
x
```
````

````html
<pre><code>x
</code></pre>
````

:::

The frontmatter delimiter is the same pair. Its opener may name a metadata
format, so a tab before that token is the same separator and the same refusal -
the line is not a delimiter, and with no frontmatter consumed the document
starts with the text of those lines:

::: compare

```carve
---	yaml
title: x
---

body
```

```html
<p>—	yaml
title: x</p>
<hr>
<p>body</p>
```

:::

And a delimiter with a trailing tab and no format token opens frontmatter,
which renders nothing:

::: compare

```carve
---	
title: x
---

body
```

```html
<p>body</p>
```

:::
