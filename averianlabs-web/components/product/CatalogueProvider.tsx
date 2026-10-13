"use client"

import type { Product } from "@/lib/products/types"
import { createContext, useContext } from "react"

const CatalogueContext = createContext<Product[]>([])

export function CatalogueProvider({ products, children }: { products: Product[]; children: React.ReactNode }) {
  return <CatalogueContext.Provider value={products}>{children}</CatalogueContext.Provider>
}

export function useCatalogue() {
  return useContext(CatalogueContext)
}
