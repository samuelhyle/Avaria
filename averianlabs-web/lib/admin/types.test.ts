import { describe, expect, it } from "vitest"
import { AdminAccessError, adminErrorStatus, mapUserRoleToAdmin, tierIdFor } from "./types"

describe("AdminAccessError", () => {
  it("captures the code and message", () => {
    const e = new AdminAccessError("unauthenticated", "Auth required.")
    expect(e.code).toBe("unauthenticated")
    expect(e.message).toBe("Auth required.")
    expect(e.name).toBe("AdminAccessError")
  })

  it("is a real Error subclass", () => {
    const e = new AdminAccessError("insufficient", "Nope.")
    expect(e).toBeInstanceOf(Error)
  })
})

describe("adminErrorStatus", () => {
  it("returns 401 for unauthenticated", () => {
    expect(adminErrorStatus(new AdminAccessError("unauthenticated", "x"))).toBe(401)
  })

  it("returns 403 for insufficient", () => {
    expect(adminErrorStatus(new AdminAccessError("insufficient", "x"))).toBe(403)
  })
})

describe("mapUserRoleToAdmin", () => {
  it.each([
    ["admin", "admin"],
    ["moderator", "moderator"],
    ["customer", null],
    [null, null],
    [undefined, null],
    ["", null],
    ["Admin", null], // case-sensitive
  ])("maps %j to %s", (input, expected) => {
    expect(mapUserRoleToAdmin(input as string | null | undefined)).toBe(expected)
  })
})

describe("tierIdFor", () => {
  it.each([
    [0, "new"],
    [4, "new"],
    [5, "contributor"],
    [24, "contributor"],
    [25, "analyst"],
    [99, "analyst"],
    [100, "senior"],
    [249, "senior"],
    [250, "fellow"],
  ])("reputation %i maps to tier %s", (rep, expected) => {
    expect(tierIdFor(rep)).toBe(expected)
  })
})
