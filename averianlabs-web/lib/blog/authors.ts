/**
 * Author lookup — Sanity-backed with hardcoded fallback for local dev.
 *
 * Falls back to an embedded list of seed authors when Sanity is not
 * configured, so the /blog/author/[slug] route never 404s in dev.
 */
import { sanity } from "@/sanity/client"

export interface AuthorRecord {
  id: string
  slug: string
  name: string
  role: string
  bio: string
  avatarUrl?: string | null
}

export const SEED_AUTHORS: AuthorRecord[] = [
  {
    id: "seed-elena",
    slug: "elena-mäkinen",
    name: "Elena Mäkinen",
    role: "Editorial lead",
    bio: "PhD in analytical chemistry (Helsinki). Writes on peptide identity, batch QA, and what good documentation actually looks like.",
    avatarUrl: null,
  },
  {
    id: "seed-jonas",
    slug: "jonas-keller",
    name: "Jonas Keller",
    role: "Scientific reviewer",
    bio: "Lab director at a Finnish CRO. Reviews methodology pages for accuracy across HPLC, MS, and endotoxin workflows.",
    avatarUrl: null,
  },
  {
    id: "seed-amelia",
    slug: "amelia-park",
    name: "Amelia Park",
    role: "Regulatory",
    bio: "EU MDR specialist. Keeps the regulatory pages honest — country eligibility, MDR classification, and what research-use actually means.",
    avatarUrl: null,
  },
]

function isConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID)
}

export async function listAuthors(): Promise<AuthorRecord[]> {
  if (!isConfigured()) return SEED_AUTHORS
  try {
    const fromSanity = await sanity.fetch<AuthorRecord[]>(
      `*[_type == "author"] | order(name asc) {
        _id, "id": _id, "slug": slug.current, name, role, bio, "avatarUrl": avatar.asset->url
      }`,
    )
    return fromSanity.length > 0 ? fromSanity : SEED_AUTHORS
  } catch {
    return SEED_AUTHORS
  }
}

export async function getAuthorBySlug(slug: string): Promise<AuthorRecord | null> {
  const all = await listAuthors()
  return all.find((a) => a.slug === slug) ?? null
}

export async function getAuthorById(id: string): Promise<AuthorRecord | null> {
  const all = await listAuthors()
  return all.find((a) => a.id === id) ?? null
}
