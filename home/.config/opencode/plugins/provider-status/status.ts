export interface Account {
  integrationID: string
  label: string
  active: boolean
}

export interface Provider {
  id: string
  name: string
  integrationID?: string
}

export interface Integration {
  id: string
  connections: ReadonlyArray<{ type: "credential" | "env" }>
}

// Keep only display metadata; never retain credential values in plugin state.
export function activeAccounts(accounts: ReadonlyArray<Account>): Account[] {
  return accounts
    .filter((account) => account.active)
    .map(({ integrationID, label, active }) => ({ integrationID, label, active }))
}

export function statusLabel(input: {
  providerID?: string
  providers: ReadonlyArray<Provider>
  integrations: ReadonlyArray<Integration>
  accounts?: ReadonlyArray<Account>
  failed?: boolean
}): string {
  if (!input.providerID) return ""
  const provider = input.providers.find((item) => item.id === input.providerID)
  const name = provider?.name ?? input.providerID
  const integrationID = provider?.integrationID ?? input.providerID
  if (input.failed) return `${name} · Account unavailable`
  if (!input.accounts) return `${name} · …`
  const account = input.accounts.find((item) => item.integrationID === integrationID && item.active)
  if (account) return `${name} · ${account.label}`
  const integration = input.integrations.find((item) => item.id === integrationID)
  const environment = integration?.connections.some((item) => item.type === "env")
  return `${name} · ${environment ? "Environment" : "No saved account"}`
}
