import { indexProducts } from "@/lib/search/meilisearch"

async function main() {
  console.log("Starting Meilisearch product indexing...")
  await indexProducts()
  console.log("Done!")
  process.exit(0)
}

main().catch((err) => {
  console.error("Indexing failed:", err)
  process.exit(1)
})
