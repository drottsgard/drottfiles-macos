# Configure Homebrew for login shells.
if [[ -x /opt/homebrew/bin/brew ]]; then
	eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
	eval "$(/usr/local/bin/brew shellenv)"
fi

# User-level tools and runtimes.
export NVM_DIR="$HOME/.nvm"
export NVM_SYMLINK_CURRENT=true
export BUN_INSTALL="$HOME/.bun"
export EDITOR=nvim

# Keep each directory in PATH only once.
typeset -U path PATH
path=(
	"$HOME/.local/bin"
	"$BUN_INSTALL/bin"
	"$HOME/.opencode/bin"
	"$NVM_DIR/current/bin"
	$path
)
export PATH
