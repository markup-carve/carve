import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(readFileSync(join(root, 'spec/0.2/data/ast-schema.json'), 'utf8'))
const extensions = JSON.parse(readFileSync(join(root, 'spec/0.2/data/extensions.json'), 'utf8')).extensions
const types = new Set(Object.keys(schema.$defs))
function hasNode(value) {
  if (!value || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(hasNode)
  if (value.$ref === '#/definitions/metadataValue') return true
  if (typeof value.$ref === 'string' && types.has(value.$ref.split('/').at(-1))) return true
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/definitions/')) return hasNode(schema.definitions[value.$ref.split('/').at(-1)])
  return Object.entries(value).some(([key, part]) => key !== '$defs' && hasNode(part))
}
function paths(value, prefix) {
  if (!hasNode(value)) return []
  if (value.$ref === '#/definitions/metadataValue') return [prefix]
  if (typeof value.$ref === 'string' && value.$ref.startsWith('#/definitions/')) return paths(schema.definitions[value.$ref.split('/').at(-1)], prefix)
  if (value.items && Array.isArray(value.items.oneOf)) return [prefix]
  if (value.items?.properties && hasNode(value.items)) return paths(value.items, prefix + '.*')
  if (value.items && hasNode(value.items)) return [prefix]
  if (value.additionalProperties && hasNode(value.additionalProperties)) return [prefix + '.*']
  if (value.properties) return Object.entries(value.properties).flatMap(([key, child]) => paths(child, prefix + '.' + key))
  if (value.oneOf) return [...new Set(value.oneOf.flatMap(part => paths(part, prefix)))]
  return [prefix]
}
const nodes = {}
for (const [type, def] of Object.entries(schema.$defs).sort(([a],[b]) => a.localeCompare(b))) {
  const first = ['children','title','caption','short','prefix','locator','suffix','pairs','base','annotation','columns','longDescription','slots','fallback','metadata']
  const order = [...first, ...Object.keys(def.properties).filter(key => !first.includes(key))]
  nodes[type] = order.flatMap(key => key in def.properties ? paths(def.properties[key], key) : [])
}
for (const {name,slots,slotOrder} of extensions) {
  if (slotOrder.length !== Object.keys(slots).length || slotOrder.some(key => !(key in slots))) throw new Error('slotOrder differs from slots for ' + name)
}
const extensionSlots = Object.fromEntries(extensions.map(({name,version,slots,slotOrder}) => [name,{version,slotOrder,slots}]))
const recursive = {metadataValue:{ref:'#/definitions/metadataValue',nodeSlots:{inlines:'value',blocks:'value'},valueSlots:{list:'value[]',map:'value.*'},order:['inlines','blocks','list','map'],mapEntryOrder:'unicode_code_point'}}
const out = JSON.stringify({description:'C2-A-024 to C2-A-026 and C2-A-212. Child slots in structural walk order, generated from ast-schema.json and extensions.json.',nodes,recursive,extensions:extensionSlots},null,2)+'\n'
const path = join(root,'spec/0.2/data/node-slots.json')
if (process.argv.includes('--check')) {
  if (readFileSync(path,'utf8') !== out) { console.error('node-slots.json is stale'); process.exitCode = 1 }
} else writeFileSync(path,out)
