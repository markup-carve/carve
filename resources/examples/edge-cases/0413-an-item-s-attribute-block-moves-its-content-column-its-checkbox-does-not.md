## An item's attribute block moves its content column; its checkbox does not

::: warning Historical category label
The heading is retained as the append-only corpus ID. The rule it originally
named was reversed before release: marker-attached attributes and task
checkboxes both contribute zero to the content column. The current rule and
fixtures below are authoritative.
:::

`90-list-item-attributes-4` is the only document that puts attributes on a task
item, and it is a single line, so it has no continuation and cannot say where
the item's content begins. `06-task-lists` and
`363-a-task-item-s-checkbox-is-not-decided-by-its-first-block` carry
continuations but no attributes, so they cannot say it either. Between them the
two halves of `-{#k} [x] ` were each pinned alone and the combination was pinned
nowhere - which is how three engines came to read it three ways with every gate
green (carve#1692).

The normative rule is the bare marker width plus its separator. A checkbox is
CONTENT (carve#1690), so it does not move the column; the attribute block is
item metadata, so it does not move the column either. `-{#k} [x] a` therefore
has the same content column as `- a`: column 2. A line written there is inside
the item.

::: compare

```carve
-{#k} [x] bare
  # inside
```

```html
<ul class="task-list">
  <li data-task-state="x" id="k"><input type="checkbox" checked disabled aria-label="bare"> bare
    <h1 id="inside">inside</h1>
  </li>
</ul>
```

:::

The old full-prefix column is pinned beside it as a migration case. It is past
the canonical content column but remains structural under the authored-base
rule. The metadata spelling can no longer silently select between structures.

::: compare

```carve
-{#k} [x] old
      # outside
```

```html
<ul class="task-list">
  <li data-task-state="x" id="k"><input type="checkbox" checked disabled aria-label="old"> old
    <h1 id="outside">outside</h1>
  </li>
</ul>
```

:::

The two neighbours a wrong fix breaks. Without the attribute block the column is
the bullet's alone, so column 2 is where the content is and the heading lands
inside the item - the checkbox still moves nothing.

::: compare

```carve
- [x] a
  # h
```

```html
<ul class="task-list">
  <li data-task-state="x"><input type="checkbox" checked disabled aria-label="a"> a
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

Without the checkbox the answer is unchanged: marker-attached attributes are
metadata, so the bare bullet still puts the content at column 2.

::: compare

```carve
-{#k} a
  # h
```

```html
<ul>
  <li id="k">a
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

The ordered spelling is the same rule again. The attributes contribute zero,
but the ordered marker itself remains variable: `1.` puts content at column 3,
while `10.` puts it at column 4.

::: compare

```carve
1.{#k} a
   # h
```

```html
<ol>
  <li id="k">a
    <h1 id="h">h</h1>
  </li>
</ol>
```

:::

A SUB-LIST READS THE COLUMN THROUGH ANOTHER DOOR, and this pair is here because
the four above cannot open it. The attributed task's bare bullet column is 2,
so `after` reaches the inner item's content column. Metadata and checkbox text
do not change the nesting or looseness calculation.

::: compare

```carve
- outer
  -{#k} [x] inner

  after
```

```html
<ul>
  <li><p>outer</p>
    <ul class="task-list">
      <li data-task-state="x" id="k"><input type="checkbox" checked disabled aria-label="inner"> inner</li>
    </ul>
    <p>after</p>
  </li>
</ul>
```

:::

Two sibling items with different-length metadata now share the same body
column. Renaming a class cannot move either heading.

::: compare

```carve
-{.x} a
  # one
-{.averylongclass} b
  # two
```

```html
<ul>
  <li class="x">a
    <h1 id="one">one</h1>
  </li>
  <li class="averylongclass">b
    <h1 id="two">two</h1>
  </li>
</ul>
```

:::

The old full-prefix column is over-indented under the bare-marker rule. It stays
inside the item and establishes an authored block base, so the heading remains
structural and canonical output moves it to column 2.

::: compare

```carve
-{.x1} a
       # h
```

```html
<ul>
  <li class="x1">a
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

Unicode metadata is an explicit non-effect. Its UTF-8, UTF-16 and codepoint
lengths never enter the column calculation, and the task checkbox remains
content rather than marker width.

::: compare

```carve
-{title="😀"} [x] a
  # h
```

```html
<ul class="task-list">
  <li data-task-state="x" title="😀"><input type="checkbox" checked disabled aria-label="a"> a
    <h1 id="h">h</h1>
  </li>
</ul>
```

:::

An attributed outer item uses the same bare column to open a nested list. This
pins the direct shape separately from an attributed task nested inside a plain
outer item.

::: compare

```carve
-{.outer} parent
  - child
```

```html
<ul>
  <li class="outer">parent
    <ul>
      <li>child</li>
    </ul>
  </li>
</ul>
```

:::
