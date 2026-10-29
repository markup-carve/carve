## Boolean attributes

A bare word in a `{…}` block (no `#` / `.` / `=`) is a value-less boolean
attribute. In the AST it has the same empty-string value as `name=""`, and it
normally renders `name=""`. It works in any attribute position and mixes
with id / class / key=value. The three core semantic span names are the
exception: on `[content]{attrs}` they select their semantic wrapper. Four more
names do so when the SemanticSpan extension is enabled.

::: compare

```carve
Press [Tab]{kbd} to indent.
```

```html
<p>Press <kbd>Tab</kbd> to indent.</p>
```

:::

A leading block-attribute line carries booleans too (here onto a paragraph),
alongside a class:

::: compare

```carve
{.callout open}
Bare spelling.

{.callout open=""}
Explicit empty string.
```

```html
<p class="callout" open="">Bare spelling.</p>
<p class="callout" open="">Explicit empty string.</p>
```

:::

The bare and explicit empty-string spellings have the same meaning. The
canonical writer uses the bare one for both.
