import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(join(root, 'spec/0.2/data/ast-schema.json'), 'utf8'))
const types = new Set(Object.keys(schema.$defs))
function hasNode(value) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(hasNode)
  if (typeof value.$ref === 'string' && types.has(value.$ref.split('/').at(-1))) return true
  if (value.$ref === '#/definitions/metadata') return hasNode(schema.definitions.metadata)
  return Object.entries(value).some(([key, part]) => key !== '$defs' && hasNode(part))
}
function paths(value, prefix) {
  if (!hasNode(value)) return []
  if (value.$ref === '#/definitions/metadata') return paths(schema.definitions.metadata, prefix)
  if (value.items && Array.isArray(value.items.oneOf)) return [prefix]
  if (value.items && hasNode(value.items)) return [prefix]
  if (value.additionalProperties && hasNode(value.additionalProperties)) return [prefix + '.*']
  if (value.properties) return Object.entries(value.properties).flatMap(([key, child]) => paths(child, prefix + '.' + key))
  if (value.oneOf) return [...new Set(value.oneOf.flatMap(part => paths(part, prefix)))]
  return [prefix]
}
const nodes = {}
for (const [type, def] of Object.entries(schema.$defs).sort(([a],[b]) => a.localeCompare(b))) {
  const first = ['children','title','caption','short','prefix','locator','suffix','pairs','base','annotation','columns','longDescription','fallback','slots','metadata']
  const order = [...first, ...Object.keys(def.properties).filter(key => !first.includes(key))]
  nodes[type] = order.flatMap(key => key in def.properties ? paths(def.properties[key], key) : [])
}
const out = JSON.stringify({description:'C2-A-024 to C2-A-026. Child slots in structural walk order, generated from ast-schema.json.',nodes},null,2)+'\n'
const path = join(root,'spec/0.2/data/node-slots.json')
if (process.argv.includes('--check')) {
  if (readFileSync(path,'utf8') !== out) { console.error('node-slots.json is stale'); process.exitCode = 1 }
} else writeFileSync(path,out)
