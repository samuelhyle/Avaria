import assert from "node:assert/strict"
import { test } from "node:test"
import { compareBaseline } from "./legacy-baseline.mjs"

const snapshot = {
  tables: {
    "public.users": {
      name: "users",
      columns: {
        id: { name: "id", type: "text", notNull: true, primaryKey: true },
        role: { name: "role", type: "text", notNull: true, default: "'user'" },
      },
      indexes: { users_role_idx: { name: "users_role_idx" } },
    },
  },
}
const actual = {
  columns: [
    {
      table_name: "users",
      column_name: "id",
      type: "text",
      not_null: true,
      generated: "",
      default_value: null,
    },
    {
      table_name: "users",
      column_name: "role",
      type: "text",
      not_null: true,
      generated: "",
      default_value: "'user'::text",
    },
  ],
  constraints: [{ table_name: "users", definition: 'PRIMARY KEY ("id")' }],
  indexes: [{ table_name: "users", name: "users_role_idx" }],
}
test("matches the original schema despite PostgreSQL expression formatting", () => {
  assert.deepEqual(compareBaseline(snapshot, actual), [])
})
test("refuses a missing table", () => {
  assert.ok(compareBaseline(snapshot, { ...actual, columns: [] }).includes("Missing table: users"))
})
test("refuses unknown tables", () => {
  const changed = structuredClone(actual)
  changed.columns.push({ ...changed.columns[0], table_name: "other_project" })
  assert.ok(compareBaseline(snapshot, changed).includes("Unknown table: other_project"))
})
test("refuses an unexpected column", () => {
  const changed = structuredClone(actual)
  changed.columns.push({ ...changed.columns[0], column_name: "new_field" })
  assert.ok(compareBaseline(snapshot, changed).includes("Unexpected column: users.new_field"))
})
test("refuses a changed type", () => {
  const changed = structuredClone(actual)
  changed.columns[1].type = "integer"
  assert.ok(compareBaseline(snapshot, changed).includes("Different type: users.role"))
})
test("refuses changed nullability", () => {
  const changed = structuredClone(actual)
  changed.columns[1].not_null = false
  assert.ok(compareBaseline(snapshot, changed).includes("Different nullability: users.role"))
})
test("preserves string-literal case when comparing defaults", () => {
  const changed = structuredClone(actual)
  changed.columns[1].default_value = "'USER'::text"
  assert.ok(compareBaseline(snapshot, changed).includes("Different default/expression: users.role"))
})
test("refuses a changed generated column", () => {
  const changed = structuredClone(actual)
  changed.columns[1].generated = "s"
  assert.ok(
    compareBaseline(snapshot, changed).includes("Different generated-column behavior: users.role"),
  )
})
test("refuses missing primary keys", () => {
  assert.ok(
    compareBaseline(snapshot, { ...actual, constraints: [] }).some((s) =>
      s.includes("Missing/different constraint"),
    ),
  )
})
test("refuses missing indexes", () => {
  assert.ok(
    compareBaseline(snapshot, { ...actual, indexes: [] }).includes(
      "Missing index: users.users_role_idx",
    ),
  )
})
