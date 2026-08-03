#!/usr/bin/env node
/*
 * Copy resources/ast-schema.json into docs/public so the docs site serves it at
 * the `$id` the schema declares.
 *
 * The schema's `$id` is an absolute URL, and a `$ref` to it - from an editor,
 * from a validator's remote-schema cache, from another schema that composes it -
 * only resolves if something answers at that URL. VitePress serves docs/public
 * verbatim, so one copy at build time is the whole mechanism.
 *
 * The copy is GENERATED and gitignored on purpose. A second committed copy of a
 * 2700-line file is a second thing to edit, and the failure mode is silent: the
 * repo says one shape and the published URL says another, with no diff anywhere
 * to notice. This script also fails loudly when the `$id` stops matching the
 * path it is copied to, so renaming the file cannot quietly break the URL.
 */

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = resolve(root, 'resources/ast-schema.json')
const target = resolve(root, 'docs/public/ast-schema.json')

const schema = JSON.parse(readFileSync(source, 'utf8'))
const expected = 'https://markup-carve.github.io/carve/ast-schema.json'
if (schema.$id !== expected) {
  console.error(`ast-schema.json declares $id ${schema.$id}, but it is published at ${expected}.`)
  process.exit(1)
}

mkdirSync(dirname(target), { recursive: true })
copyFileSync(source, target)
console.log(`published ${schema.$id}`)
