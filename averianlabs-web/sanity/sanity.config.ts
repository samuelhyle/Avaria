import { visionTool } from "@sanity/vision"
import { defineConfig } from "sanity"
import { structureTool } from "sanity/structure"
import { schemaTypes } from "./schemas"

// The GROQ query console (Vision) is a development tool only.
const isDev = process.env.NODE_ENV === "development"

export default defineConfig({
  name: "averianlabs",
  title: "AverianLabs",
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  plugins: isDev ? [structureTool(), visionTool()] : [structureTool()],
  schema: { types: schemaTypes },
})
