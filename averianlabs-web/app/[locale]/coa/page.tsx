import {
  type DocumentSearchParams,
  documentLibraryHref,
  readDocumentFilters,
} from "@/lib/documents/library"
import { makePageMetadata } from "@/lib/seo/metadata"
import { redirect } from "next/navigation"

export const generateMetadata = makePageMetadata("coa", "/coa")
/** Keep shared batch/report links usable while using a single searchable library. */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<DocumentSearchParams>
}) {
  const { locale } = await params
  const filters = readDocumentFilters(await searchParams)
  redirect(documentLibraryHref(locale, { ...filters, type: "coa" }, filters.page))
}
