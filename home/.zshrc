# Completion system
# OPENSPEC:START
fpath=("$HOME/.zsh/completions" $fpath)
autoload -Uz compinit
compinit
# OPENSPEC:END

# Local shell behavior
[[ -r "$HOME/zsh/zsh-aliases.zsh" ]] && source "$HOME/zsh/zsh-aliases.zsh"

# Load nvm without resolving the default version on every shell startup.
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
	source "$NVM_DIR/nvm.sh" --no-use
	if [[ ! -x "$NVM_DIR/current/bin/node" ]]; then
		nvm use --silent default >/dev/null
	fi
fi

# Interactive tools
(( $+commands[starship] )) && eval "$(starship init zsh)"
(( $+commands[fzf] )) && source <(fzf --zsh)
[[ -r "$BUN_INSTALL/_bun" ]] && source "$BUN_INSTALL/_bun"

# OpenCode uses separate configuration for private projects.
opencode() {
	local config tui_config

	case "$PWD/" in
		"$HOME/dev/drottsgard/"*)
			config="$HOME/.config/opencode/private.jsonc"
			tui_config="$HOME/.config/opencode/private-tui.json"
			;;
		*)
			config="$HOME/.config/opencode/work.jsonc"
			tui_config="$HOME/.config/opencode/work-tui.json"
			;;
	esac

	OPENCODE_CONFIG="$config" \
		OPENCODE_TUI_CONFIG="$tui_config" \
		command opencode "$@"
}

# AWS ships a Bash-style completer.
if (( $+commands[aws_completer] )); then
	autoload -Uz bashcompinit
	bashcompinit
	complete -C "$commands[aws_completer]" aws
fi

# Plugins that inspect the command line should load last.
[[ -r "$HOME/zsh/zsh-autosuggestions/zsh-autosuggestions.zsh" ]] && \
	source "$HOME/zsh/zsh-autosuggestions/zsh-autosuggestions.zsh"
[[ -r "${HOMEBREW_PREFIX:-/opt/homebrew}/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" ]] && \
	source "${HOMEBREW_PREFIX:-/opt/homebrew}/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"

[[ -r "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"
