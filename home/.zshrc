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

# bun completions
[ -s "/Users/drottsgard/.bun/_bun" ] && source "/Users/drottsgard/.bun/_bun"
