import robots from "@/app/robots"
import { assertNotDemo } from "@/lib/demo"
import { afterEach, expect, test, vi } from "vitest"

afterEach(() => vi.unstubAllEnvs())

test("a full review deployment blocks indexing without disabling the backend", () => {
  vi.stubEnv("BUILD_MODE", "")
  vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", "true")
  expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }])
  expect(() => assertNotDemo("database")).not.toThrow()
})

test("a static demo still blocks indexing", () => {
  vi.stubEnv("BUILD_MODE", "demo")
  vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", "false")
  expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }])
})

for (const review of ["", "false"]) {
  test(`a non-review deployment retains private-route and AI crawler restrictions (${review || "unset"})`, () => {
    vi.stubEnv("BUILD_MODE", "")
    vi.stubEnv("NEXT_PUBLIC_REVIEW_SITE", review)
    const rules = robots().rules
    expect(rules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userAgent: "*", allow: "/" }),
        { userAgent: "GPTBot", disallow: "/" },
      ]),
    )
    const publicRule = (rules as Array<{ userAgent: string; disallow?: string[] }>).find(
      (rule) => rule.userAgent === "*",
    )
    expect(publicRule?.disallow).toEqual(
      expect.arrayContaining(["/api/", "/en/account", "/fi/checkout"]),
    )
  })
}
