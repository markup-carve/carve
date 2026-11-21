// carve#6338, #6337, #6344: the github-alert-marker, delimited-table-wide-row and blockquote-marker-without-space rows
// read as their catalog rows state. A small evaluator of the operators these rows use runs them on hand-built records.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const model = JSON.parse(readFileSync(new URL('../spec/0.2/data/lint-model.json', import.meta.url), 'utf8'))
const rule = (id) => model.rules.find((row) => row.id === id)

const path = (from, keys) => keys.reduce((at, key) => (at === undefined || at === null ? undefined : at[/^\d+$/.test(key) ? Number(key) : key]), from)
const field = (scope, name) => {
  const [head, ...rest] = name.split('.')
  return path(head === 'item' ? scope.item : scope.record[head], rest)
}
const listOf = (scope, arg) => (typeof arg === 'string' ? field(scope, arg) : value(scope, arg))
function value(scope, expr) {
  if (typeof expr !== 'object' || expr === null || Array.isArray(expr)) return expr
  const [op] = Object.keys(expr)
  const arg = expr[op]
  if (op === 'f') return field(scope, arg)
  if (op === 'v') return value(scope, scope.lets[arg])
  if (op === 'count') {
    const list = listOf(scope, arg.in)
    return Array.isArray(list) ? list.filter((item) => holds({ ...scope, item }, arg.where)).length : 0
  }
  if (op === 'find') {
    const list = value(scope, arg.in)
    const found = Array.isArray(list) ? list.find((item) => holds({ ...scope, item }, arg.where)) : undefined
    return path(found, (arg.field ?? '').split('.').filter((part) => part !== ''))
  }
  throw new Error(`value operator ${op}`)
}
function holds(scope, expr) {
  if (expr === true) return true
  const [op] = Object.keys(expr)
  const arg = expr[op]
  if (op === 'all') return arg.every((item) => holds(scope, item))
  if (op === 'any') return arg.some((item) => holds(scope, item))
  if (op === 'not') return !holds(scope, arg)
  if (op === 'has') return field(scope, arg) !== undefined
  if (op === 'matches') return new RegExp(arg[1]).test(value(scope, arg[0]))
  if (op === 'gt') return value(scope, arg[0]) > value(scope, arg[1])
  if (op === 'in') return (Array.isArray(arg[1]) ? arg[1] : []).includes(value(scope, arg[0]))
  if (op === 'some') {
    const list = listOf(scope, arg.in)
    return Array.isArray(list) && list.some((item) => holds({ ...scope, item }, arg.where))
  }
  throw new Error(`test operator ${op}`)
}
const fires = (id, record) => {
  const row = rule(id)
  return holds({ record, lets: row.let ?? {} }, row.when)
}

test('github-alert-marker skips a glued first `>` unless an alert tag follows it', () => {
  const line = (text) => fires('github-alert-marker', { leaf: 'paragraph', text })
  for (const text of ['>[!NOTE]', '>[!NOTE] > [!TIP]', '>[!CAUTION]: > [!NOTE]', '> [!x]: > [!NOTE]', '  > [!TIP]']) assert.ok(line(text), text)
  for (const text of ['>[!x]: > [!NOTE]', '>[!NOTEx]: > [!NOTE]', '>[!note]: > [!TIP]', '>[!]: >[!NOTE]', ' >[! NOTE]: > [!NOTE]', '>[x]: > [!NOTE]']) {
    assert.ok(!line(text), text)
  }
})

test('blockquote-marker-without-space reports a `>` followed by a tab and text', () => {
  const line = (text, raw = text) => fires('blockquote-marker-without-space', { text, raw_body: raw })
  for (const text of ['>\tx', '>\t>', '>\t', '>a', '>>a']) assert.ok(line(text, text.trimEnd()), JSON.stringify(text))
  // A line whose text reads hidden characters as U+0000 behind a real quote mark and its space stays unreported.
  assert.ok(!line('>\u0000\u0000\u0000 x', '> %% x'))
  for (const text of ['> x', '>', '> ']) assert.ok(!line(text, text.trimEnd()), JSON.stringify(text))
})

test('delimited-table-wide-row takes the width of the first record of the table, behind empty groups', () => {
  const row = (width) => ({ type: 'table_row', children: Array.from({ length: width }, () => ({ type: 'table_cell' })) })
  const table = (...groups) => fires('delimited-table-wide-row', {
    source_format: 'csv',
    node: { type: 'table', children: groups.map((widths) => ({ type: 'table_body', children: widths.map(row) })) }
  })
  assert.ok(!table([], [2, 2]))
  assert.ok(!table([], [], [2], [2]))
  assert.ok(table([], [2, 3]))
  assert.ok(table([], [2], [], [3]))
  assert.ok(!table([3], [2]))
  assert.ok(table([2, 3]))
  assert.ok(!table([], []))
})
