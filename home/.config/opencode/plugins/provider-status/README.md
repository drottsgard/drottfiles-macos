# Provider status

Read-only OpenCode V2 TUI plugin. Adds `OpenAI · Work` to the prompt footer
using the selected model's provider and its active saved account label.
Model selection is reactive; account switches, renames, additions, and removals
refresh the account metadata through server events, including changes from other
clients. Nothing is written to account configuration.

Discovered automatically from `~/.config/opencode/plugins/provider-status/tui.tsx`.
Run `./dot stow` from the dotfiles repository, then restart the TUI. No changes
to `cli.json` or dependency installation are required; OpenCode supplies the
plugin and Solid runtimes.

Environment connections show `Environment` when no saved account is active.
`No saved account` does not mean the provider is unusable: custom configuration
or ambient cloud credentials can still authenticate it. Lookup failures show
`Account unavailable` instead of an old account label.

The account-list endpoint includes credential values; the plugin immediately
discards them and retains only active account labels and integration IDs. It
never renders, logs, resolves, or persists secrets.

Validated against OpenCode 2.1.2. Run the scoped tests with:

```sh
bun test ./home/.config/opencode/plugins/provider-status/status.test.ts
```
