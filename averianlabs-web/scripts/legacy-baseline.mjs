import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"

const normalize = (value) =>
  (String(value ?? "").match(/'(?:''|[^'])*'|[^']+/g) ?? [])
    .map((part) =>
      part.startsWith("'")
        ? part
        : part
            .replace(
              /::(?:regconfig|"char"|text|jsonb|integer|bigint|boolean|regclass)(?:\[\])?/gi,
              "",
            )
            .replaceAll('"', "")
            .replaceAll("public.", "")
            .replace(/\s+/g, "")
            .toLowerCase(),
    )
    .join("")

export async function inspectSchema(sql) {
  const columns = await sql`
    select c.relname as table_name, a.attname as column_name,
      format_type(a.atttypid, a.atttypmod) as type, a.attnotnull as not_null,
      a.attgenerated as generated, pg_get_expr(d.adbin, d.adrelid) as default_value
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum
  `
  const constraints = await sql`
    select c.relname as table_name, co.conname as name,
      pg_get_constraintdef(co.oid, true) as definition
    from pg_constraint co join pg_class c on c.oid = co.conrelid
    join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public'
  `
  const indexes = await sql`
    select tablename as table_name, indexname as name, indexdef as definition
    from pg_indexes where schemaname = 'public'
  `
  return { columns, constraints, indexes }
}

export function compareBaseline(snapshot, actual) {
  const differences = []
  const expectedTables = Object.values(snapshot.tables)
  const expectedNames = new Set(expectedTables.map((t) => t.name))
  for (const name of new Set(actual.columns.map((c) => c.table_name))) {
    if (!expectedNames.has(name)) differences.push(`Unknown table: ${name}`)
  }
  for (const table of expectedTables) {
    const columns = actual.columns.filter((c) => c.table_name === table.name)
    if (!columns.length) differences.push(`Missing table: ${table.name}`)
    for (const column of columns) {
      if (!table.columns[column.column_name])
        differences.push(`Unexpected column: ${table.name}.${column.column_name}`)
    }
    for (const expected of Object.values(table.columns)) {
      const column = columns.find((c) => c.column_name === expected.name)
      const label = `${table.name}.${expected.name}`
      if (!column) {
        differences.push(`Missing column: ${label}`)
        continue
      }
      if (normalize(column.type) !== normalize(expected.type))
        differences.push(`Different type: ${label}`)
      if (column.not_null !== expected.notNull) differences.push(`Different nullability: ${label}`)
      if (Boolean(column.generated) !== Boolean(expected.generated))
        differences.push(`Different generated-column behavior: ${label}`)
      const expectedDefault = expected.generated?.as ?? expected.default
      if (normalize(column.default_value) !== normalize(expectedDefault))
        differences.push(`Different default/expression: ${label}`)
    }
    const definitions = actual.constraints
      .filter((c) => c.table_name === table.name)
      .map((c) => normalize(c.definition))
    const expectedDefinitions = []
    const primary = Object.values(table.columns).filter((c) => c.primaryKey)
    if (primary.length)
      expectedDefinitions.push(`PRIMARY KEY (${primary.map((c) => c.name).join(",")})`)
    for (const key of Object.values(table.compositePrimaryKeys ?? {}))
      expectedDefinitions.push(`PRIMARY KEY (${key.columns.join(",")})`)
    for (const key of Object.values(table.uniqueConstraints ?? {}))
      expectedDefinitions.push(
        `UNIQUE ${key.nullsNotDistinct ? "NULLS NOT DISTINCT " : ""}(${key.columns.join(",")})`,
      )
    for (const key of Object.values(table.foreignKeys ?? {})) {
      let definition = `FOREIGN KEY (${key.columnsFrom.join(",")}) REFERENCES ${key.tableTo}(${key.columnsTo.join(",")})`
      if (key.onUpdate && key.onUpdate !== "no action") definition += ` ON UPDATE ${key.onUpdate}`
      if (key.onDelete && key.onDelete !== "no action") definition += ` ON DELETE ${key.onDelete}`
      expectedDefinitions.push(definition)
    }
    for (const key of Object.values(table.checkConstraints ?? {}))
      expectedDefinitions.push(`CHECK (${key.value})`)
    for (const definition of expectedDefinitions) {
      if (!definitions.includes(normalize(definition)))
        differences.push(`Missing/different constraint: ${table.name} ${definition}`)
    }
    if (definitions.length !== expectedDefinitions.length)
      differences.push(`Different constraint count: ${table.name}`)
    for (const index of Object.values(table.indexes ?? {})) {
      const found = actual.indexes.find((i) => i.table_name === table.name && i.name === index.name)
      if (!found) differences.push(`Missing index: ${table.name}.${index.name}`)
    }
  }
  return differences
}

export async function originalBaseline() {
  const snapshot = JSON.parse(
    await readFile(new URL("../db/migrations/meta/0000_snapshot.json", import.meta.url), "utf8"),
  )
  const migration = await readFile(
    new URL("../db/migrations/0000_robust_rhino.sql", import.meta.url),
    "utf8",
  )
  const journal = JSON.parse(
    await readFile(new URL("../db/migrations/meta/_journal.json", import.meta.url), "utf8"),
  )
  return {
    snapshot,
    timestamp: journal.entries[0].when,
    hash: createHash("sha256").update(migration).digest("hex"),
  }
}

export async function adoptBaseline(sql, baseline) {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(2026101301)`
    const differences = compareBaseline(baseline.snapshot, await inspectSchema(tx))
    if (differences.length)
      throw new Error(`Original schema does not match: ${differences.slice(0, 12).join("; ")}`)
    await tx`create schema if not exists drizzle`
    await tx`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`
    const existing = await tx`select id from drizzle.__drizzle_migrations limit 1`
    if (!existing.length) {
      await tx`insert into drizzle.__drizzle_migrations (hash, created_at) values (${baseline.hash}, ${baseline.timestamp})`
      console.log(
        "[deploy] Verified original schema adopted as migration 0000; existing data preserved",
      )
    }
  })
}
