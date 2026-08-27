#!/usr/bin/env bash

set -euo pipefail

if [ -x /opt/homebrew/bin/brew ]; then
	eval "$(/opt/homebrew/bin/brew shellenv)"
elif [ -x /usr/local/bin/brew ]; then
	eval "$(/usr/local/bin/brew shellenv)"
fi

required_commands=(
	brew
	colima
	docker
	docker-compose
	docker-credential-osxkeychain
)
missing_commands=()

for required_command in "${required_commands[@]}"; do
	if ! command -v "$required_command" &>/dev/null; then
		missing_commands+=("$required_command")
	fi
done

if [ "${#missing_commands[@]}" -gt 0 ]; then
	echo "Missing required commands: ${missing_commands[*]}" >&2
	echo "Install the repository packages first with: ./dot package install" >&2
	exit 1
fi

brew_prefix="$(brew --prefix)"
plugin_dir="$brew_prefix/lib/docker/cli-plugins"

if [ ! -x "$plugin_dir/docker-compose" ] || [ ! -x "$plugin_dir/docker-buildx" ]; then
	echo "Docker CLI plugins were not linked into $plugin_dir." >&2
	echo "Reinstall them with: brew reinstall docker-compose docker-buildx" >&2
	exit 1
fi

docker_config_dir="${DOCKER_CONFIG:-$HOME/.docker}"
docker_config="$docker_config_dir/config.json"
mkdir -p "$docker_config_dir"

if [ ! -e "$docker_config" ]; then
	printf '{}\n' > "$docker_config"
fi

if ! /usr/bin/plutil -lint "$docker_config" &>/dev/null; then
	echo "$docker_config is not valid JSON; refusing to modify it." >&2
	exit 1
fi

/usr/bin/plutil -replace cliPluginsExtraDirs -json "[\"$plugin_dir\"]" "$docker_config"
/usr/bin/plutil -replace credsStore -string osxkeychain "$docker_config"

echo "Configured Docker CLI plugins and macOS Keychain credentials."
echo "Starting Colima..."
colima start

docker context use colima &>/dev/null

docker compose version
docker buildx version
docker version --format 'Docker client {{.Client.Version}}, server {{.Server.Version}}'

echo "Colima is ready."
