# AGENTS.md

Dotfiles for a macOS development workstation. This repository has no repo-wide build, test, lint, or CI command; some tools under `home/` have their own scoped code and tests.

## Repository layout

- `home/` — GNU Stow package whose paths mirror `$HOME`
- `home/.config/` — application configuration
- `home/.pi/` — pi settings, extensions, and skills
- `packages/Brewfile` — Homebrew formulae and casks
- `scripts/` — idempotent workstation setup scripts
- `dot` — helper for stowing dotfiles, managing the Brewfile, and running workstation setup

## Commands

```bash
./dot stow                         # Symlink home/ into $HOME
./dot package install              # Install packages from packages/Brewfile
./dot package add <name> [...]     # Install formulae and update the Brewfile
./dot package add --cask <name>    # Install casks and update the Brewfile
./dot colima setup                 # Configure and start the Colima Docker runtime
./dot help
```

Run workstation commands on macOS. Use Homebrew rather than Linux package managers.

## Dotfiles

Add files beneath `home/` at the path where they should appear relative to `$HOME`. For example, `home/.config/foo/config.toml` maps to `~/.config/foo/config.toml`. Apply changes with `./dot stow`.

Shell startup responsibilities are split between:

- `home/.zprofile` — Homebrew, runtime environment variables, editor, and `PATH`
- `home/.zshrc` — completions, interactive tools, nvm loading, and shell plugins

Files matching `*.local` are ignored. `home/.zshrc` loads `~/.zshrc.local` for machine-local shell configuration and secrets.

## Packages

Use `./dot package add <name>` or `./dot package add --cask <name>` for packages that should remain in `packages/Brewfile`. The helper installs the package and sorts formulae and casks into stable groups. Use `./dot package install` to reconcile a workstation with the Brewfile.

Colima changes: read `docs/colima.md` before changing container packages, runtime setup, Docker CLI plugin discovery, or credential storage.

## Shell conventions

Shell scripts use Bash and fail fast with either `set -e` or stricter options such as `set -euo pipefail`. Match each file's existing indentation: workstation scripts such as `dot` and `home/.local/bin/tmux-sessionizer` use tabs, while shell templates under `home/.pi/agent/skills/` use spaces.

When a script needs Homebrew, initialize its environment because `brew` may not yet be on `PATH`:

```bash
if [ -f /opt/homebrew/bin/brew ]; then
	eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -f /usr/local/bin/brew ]; then
	eval "$(/usr/local/bin/brew shellenv)"
fi
```

Keep workstation operations safe to rerun. Check for required commands and existing files before acting, and suppress only expected failures narrowly with patterns such as `2>/dev/null || true`.

## Scoped code

Treat code under `home/.pi/agent/extensions/` as independent tool code rather than assuming root-level project tooling. Check that extension's `README.md`, `package.json`, or `tsconfig.json` before changing or testing it.
