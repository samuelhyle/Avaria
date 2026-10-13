import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
const messages = JSON.parse(fs.readFileSync("messages/en.json", "utf8"))
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : /\.[tj]sx?$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : [],
    )
}
const failures = []
for (const file of [...files("app"), ...files("components")]) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const namespaces = new Map()
  function find(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      const init = ts.isAwaitExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer
      if (
        ts.isCallExpression(init) &&
        ["getTranslations", "useTranslations"].includes(init.expression.getText(source))
      ) {
        const arg = init.arguments[0]
        let namespace = arg && ts.isStringLiteral(arg) ? arg.text : undefined
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const property = arg.properties.find(
            (p) => ts.isPropertyAssignment(p) && p.name.getText(source) === "namespace",
          )
          if (property && ts.isStringLiteral(property.initializer))
            namespace = property.initializer.text
        }
        if (namespace) {
          const found = namespaces.get(node.name.text) ?? []
          found.push(namespace)
          namespaces.set(node.name.text, found)
        }
      }
    }
    ts.forEachChild(node, find)
  }
  find(source)
  function check(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const scopes = namespaces.get(node.expression.text)
      const key = node.arguments[0].text
      if (
        scopes &&
        !scopes.some(
          (scope) =>
            `${scope}.${key}`.split(".").reduce((value, part) => value?.[part], messages) !==
            undefined,
        )
      ) {
        const pos = source.getLineAndCharacterOfPosition(node.getStart(source))
        failures.push(`${file}:${pos.line + 1}: ${scopes.join("|")}.${key}`)
      }
    }
    ts.forEachChild(node, check)
  }
  check(source)
}
if (failures.length) {
  console.error(failures.join("\n"))
  process.exitCode = 1
} else console.log("All literal translation calls resolve.")
