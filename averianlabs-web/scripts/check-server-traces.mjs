// Verify the Linux CPU runtime remains in Netlify's deployment traces.
import { readFile, readdir, stat } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"

if (!process.env.NETLIFY) throw new Error("Server trace check requires the Netlify build target")
const dist = resolve(process.env.NEXT_DIST_DIR ?? ".next")
const manifests = []
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await visit(path)
    else if (entry.name.endsWith(".nft.json")) manifests.push(path)
  }
}
await visit(join(dist, "server"))
for (const name of ["next-server.js.nft.json", "next-minimal-server.js.nft.json"]) {
  manifests.push(join(dist, name))
}
const files = new Map()
for (const manifest of manifests) {
  const trace = JSON.parse(await readFile(manifest, "utf8"))
  for (const file of trace.files) {
    const path = resolve(dirname(manifest), file)
    if (!files.has(path)) files.set(path, (await stat(path)).size)
  }
}
const native = [...files.keys()].filter((path) => path.includes("/onnxruntime-node/bin/"))
const incompatible = native.filter(
  (path) => !path.includes("/linux/") || /providers_(cuda|tensorrt)\.so$/.test(path),
)
if (incompatible.length) {
  throw new Error(
    `Unused ONNX binaries remain traced: ${incompatible.map((p) => relative(process.cwd(), p)).join(", ")}`,
  )
}
for (const architecture of ["x64", "arm64"]) {
  for (const required of ["onnxruntime_binding.node", "libonnxruntime.so.1"]) {
    if (!native.some((path) => path.endsWith(`/linux/${architecture}/${required}`))) {
      throw new Error(
        `Required Linux CPU runtime file is missing from the server traces: ${architecture}/${required}`,
      )
    }
  }
}
const bytes = [...files.values()].reduce((sum, size) => sum + size, 0)
console.log(
  `[deploy] Server trace union: ${files.size} files, ${(bytes / 1024 ** 2).toFixed(1)} MiB; Linux CPU binding verified`,
)
for (const [path, size] of [...files.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(
    `[deploy] Largest traced asset: ${(size / 1024 ** 2).toFixed(1)} MiB ${relative(process.cwd(), path)}`,
  )
}
