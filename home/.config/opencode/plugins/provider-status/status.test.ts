import { describe, expect, test } from "bun:test"
import { activeAccounts, statusLabel } from "./status"

const providers = [{ id: "openai", name: "OpenAI" }]
const work = { integrationID: "openai", label: "Work", active: true }
const personal = { integrationID: "openai", label: "Personal", active: false }
const base = { providerID: "openai", providers, integrations: [] }

describe("provider status", () => {
  test("shows only the active account, regardless of list order", () => {
    expect(statusLabel({ ...base, accounts: [personal, work] })).toBe("OpenAI · Work")
  })

  test("reflects account switching and renaming", () => {
    const accounts = activeAccounts([
      { ...work, active: false },
      { ...personal, active: true, label: "Home" },
    ])
    expect(statusLabel({ ...base, accounts })).toBe("OpenAI · Home")
  })

  test("uses a provider's integration mapping for aliases", () => {
    expect(statusLabel({
      ...base,
      providerID: "company",
      providers: [{ id: "company", name: "Company", integrationID: "openai" }],
      accounts: [work],
    })).toBe("Company · Work")
  })

  test("does not retain credential values", () => {
    expect(activeAccounts([{ ...work, value: { key: "secret" } }, personal] as typeof work[]))
      .toEqual([work])
  })

  test("distinguishes loading and lookup failure", () => {
    expect(statusLabel(base)).toBe("OpenAI · …")
    expect(statusLabel({ ...base, accounts: [work], failed: true }))
      .toBe("OpenAI · Account unavailable")
  })

  test("prefers saved accounts to environment connections", () => {
    const input = { ...base, integrations: [{ id: "openai", connections: [{ type: "env" as const }] }] }
    expect(statusLabel({ ...input, accounts: [work] })).toBe("OpenAI · Work")
    expect(statusLabel({ ...input, accounts: [] })).toBe("OpenAI · Environment")
  })

  test("handles logout, unknown providers, and no model", () => {
    expect(statusLabel({ ...base, accounts: [] })).toBe("OpenAI · No saved account")
    expect(statusLabel({ ...base, providerID: "custom", accounts: [work] }))
      .toBe("custom · No saved account")
    expect(statusLabel({ ...base, providerID: undefined, accounts: [work] })).toBe("")
  })
})
