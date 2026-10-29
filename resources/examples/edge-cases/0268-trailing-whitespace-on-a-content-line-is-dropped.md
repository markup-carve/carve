## Trailing whitespace on a content line is dropped

A `whitespace` run at the end of a content line does not reach the output. It
is not content, and there is no shape of the language that gives it meaning:
Carve's hard break is the backslash form, never two trailing spaces.

The rule is the project's rather than any one production's, and it decides more
than the shape that raised it:

> trailing (invisible and bad) whitespace is the one important rule we have: no
> such thing.

It was previously written down only for a paragraph's FINAL line, and PART 12
section 7 asserted the opposite for a line before a soft break. carve#926
settled it as general and corrected both.

A trailing space on the last line of a paragraph, which was already the stated
rule:

::: compare

```carve
abc 
```

```html
<p>abc</p>
```

:::

And on a line before a SOFT BREAK, which is the half the specification had
backwards. These two documents are the same document:

::: compare

```carve
abc 
def
```

```html
<p>abc
def</p>
```

:::

A tab answers the same way, at both positions:

::: compare

```carve
abc	
def	
```

```html
<p>abc
def</p>
```

:::

Every other line that carries content answers the same way. A heading, a list
item, a block quote line and a definition entry:

::: compare

```carve
# Title 

- item 

> quoted 
```

```html
<section id="Title">
  <h1>Title</h1>
  <ul>
    <li>item</li>
  </ul>
  <blockquote><p>quoted</p></blockquote>
</section>
```

:::

::: compare

```carve
:: term 
:  def 
```

```html
<dl>
  <dt>term</dt>
  <dd>def</dd>
</dl>
```

:::

A table caption, which kept its run until carve#926 measured it:

::: compare

```carve
| a |
^ Cap 
```

```html
<table>
  <caption>Cap</caption>
  <tbody>
    <tr><td>a</td></tr>
  </tbody>
</table>
```

:::

### The run is `whitespace`, and nothing else is whitespace

The dropped run is `' '` or a tab, the same two-character terminal
`blank_line = {whitespace}` takes. Every other character is CONTENT and
survives, however invisible it looks in an editor. This one document carries a
no-break space, a zero-width space, a byte order mark, an en quad, a form feed
and an ideographic space, each at the end of its own line:

::: compare

```carve
a 
b​
c﻿
d 
e
f　
```

```html
<p>a&nbsp;
b​
c﻿
d 
e
f　</p>
```

:::

That is why U+FEFF was a red herring in the shape that raised this. In a line
holding a space, a byte order mark and a space, the BOM is content and what is
dropped is the trailing SPACE:

::: compare

```carve
 ﻿ 
```

```html
<p>﻿</p>
```

:::

### Where the rule does not reach

Verbatim content keeps its bytes. A fenced code block's body is the block's
payload, not a content line:

::: compare

````carve
```
abc 
```
````

````html
<pre><code>abc 
</code></pre>
````

:::

And whitespace INSIDE a construct is not trailing: it ends at the construct's
delimiter rather than at the line's end. A code span, a literal inline and a
table cell all keep it, and so does the run before a hard-break backslash:

::: compare

```carve
`x ` and !`y `
```

```html
<p><code>x </code> and y </p>
```

:::

::: compare

```carve
a \
b
```

```html
<p>a <br>
b</p>
```

:::

A LINE BLOCK is not an exception either, in the order that matters. Its MEDIAL
GAPS rule converts an inner or trailing run of two or more columns into NBSP
CONTENT first, and content is not whitespace -- so this rule never reaches it,
and only the one-column case is left for it to drop:

:::: compare

```carve
::: |
abc  
def 
:::
```

```html
<div class="line-block">
  <p>abc&nbsp;&nbsp;<br>
def</p>
</div>
```

::::

### A definition term's continuation line

A `dt` written across two physical lines is one logical line assembled from
two, and the second line's trailing run is dropped exactly like the first
line's would be (markup-carve/carve#1289). Nothing exempts a term: the run is
whitespace at the end of a content line, and the verbatim run that spans the
break carries a newline rather than the dropped space.

::: compare

```carve
:: `a
b 
:  d
```

```html
<dl>
  <dt><code>a
b</code></dt>
  <dd>d</dd>
</dl>
```

:::

The control belongs to "where the rule does not reach" above rather than to
this one: spaces INSIDE the run are the construct's content and end at its
closing delimiter, so a term whose whole content is an all-space verbatim keeps
them.

::: compare

```carve
:: `  `
:  d
```

```html
<dl>
  <dt><code>  </code></dt>
  <dd>d</dd>
</dl>
```

:::
