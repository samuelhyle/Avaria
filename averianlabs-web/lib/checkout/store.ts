"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export interface CheckoutState {
  email: string
  firstName: string
  lastName: string
  street: string
  postal: string
  city: string
  country: string
  b2b: boolean
  vatId: string
  shippingMethod: string
  pendingOrderId: string
  pendingOrderUrl: string
  setPendingOrder: (id: string, url: string) => void

  setEmail: (email: string) => void
  setAddress: (addr: Partial<Omit<CheckoutState, keyof CheckoutActions>>) => void
  setB2b: (b2b: boolean) => void
  setVatId: (vatId: string) => void
  setShippingMethod: (method: string) => void
  reset: () => void
}

interface CheckoutActions {
  setPendingOrder: (id: string, url: string) => void
  setEmail: (email: string) => void
  setAddress: (addr: Partial<Omit<CheckoutState, keyof CheckoutActions>>) => void
  setB2b: (b2b: boolean) => void
  setVatId: (vatId: string) => void
  setShippingMethod: (method: string) => void
  reset: () => void
}

const initialState = {
  email: "",
  firstName: "",
  lastName: "",
  street: "",
  postal: "",
  city: "",
  country: "FI",
  b2b: false,
  vatId: "",
  shippingMethod: "",
  pendingOrderId: "",
  pendingOrderUrl: "",
}

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      ...initialState,
      setPendingOrder: (id, url) => set({ pendingOrderId: id, pendingOrderUrl: url }),
      setEmail: (email) => set({ email }),
      setAddress: (addr) => set((s) => ({ ...s, ...addr })),
      setB2b: (b2b) => set({ b2b }),
      setVatId: (vatId) => set({ vatId }),
      setShippingMethod: (shippingMethod) => set({ shippingMethod }),
      reset: () => set(initialState),
    }),
    { name: "averianlabs-checkout-v2" },
  ),
)
