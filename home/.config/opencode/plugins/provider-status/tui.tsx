import { Plugin } from "@opencode/plugin/tui"
import { createResource, onCleanup, Show } from "solid-js"
import { activeAccounts, statusLabel } from "./status"

export default Plugin.define({
  id: "drottsgard.provider-status",
  setup(context) {
    return context.ui.slot({
      append: "prompt.footer.status",
      render: (input) => {
        const location = context.location ?? context.data.location.default()
        const [accounts, { refetch }] = createResource(async () => {
          // The account-list API includes values. Discard them immediately;
          // display metadata is all this plugin stores or renders.
          const result = await context.client.credential.list()
          return activeAccounts(result)
        })
        const refresh = () => { void Promise.resolve(refetch()).catch(() => {}) }
        const stopUpdated = context.data.on("credential.updated", refresh)
        const stopSwitched = context.data.on("credential.switched", refresh)
        onCleanup(() => {
          stopUpdated()
          stopSwitched()
        })

        // Populate the host's reactive, location-scoped metadata caches.
        // Failure here still allows the provider ID and account label to render.
        void Promise.all([
          context.data.location.provider.sync(location),
          context.data.location.integration.sync(location),
        ]).catch(() => {})

        const label = () => statusLabel({
          providerID: context.ui.model.current()?.providerID,
          providers: context.data.location.provider.list(location) ?? [],
          integrations: context.data.location.integration.list(location) ?? [],
          accounts: accounts.error || accounts.loading ? undefined : accounts(),
          failed: Boolean(accounts.error),
        })

        return (
          <Show when={input.mode === "normal" && label()}>
            <text fg={context.theme.text.base}>{label()}</text>
          </Show>
        )
      },
    })
  },
})
