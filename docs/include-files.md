---
title: Include files
description: Bring another Carve or text file into a document when the processor supports file inclusion.
---

# Include files

Use an include when a long document is easier to maintain as several files.
Write the path in double braces on its own line:

```carve
# Handbook

{{ chapters/introduction.crv }}
```

The path is relative to the file containing the directive. When rendering a
file with the Carve CLI, included files must stay under the input file's
directory unless you set another containment root:

```sh
carve handbook.crv > handbook.html
carve --include-root . book/handbook.crv > handbook.html
```

You can include one section by its id, or show a source file as code:

```carve
{{ chapters/setup.crv #Install }}
{{ src/example.js @code:js }}
```

A long `@code` include can be capped with `{.scroll}` on the line above it, see
[Scrolling code blocks](./recipes#scrolling-code-blocks). Selecting the part
you need with `@lines:` or `@region:` is usually better than scrolling the
whole file.

File inclusion is a processor feature. A parser without a file resolver leaves
the directive as text; the browser Playground cannot read local files. Use
`carve lint --include-root . handbook.crv` to check included files and report
missing paths, cycles, and other include errors.

For selection options, path rules, limits, and host security requirements, see
the [file inclusion rules](./includes).
