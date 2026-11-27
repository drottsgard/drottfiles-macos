#!/usr/bin/env bash

set -euo pipefail
umask 077

profile="${1:-}"
case "$profile" in
	personal|work) ;;
	*) echo "Usage: ./dot ssh setup <personal|work> [hostname]" >&2; exit 1 ;;
esac
server="$(printf '%s' "${2-github.com}" | LC_ALL=C tr 'A-Z' 'a-z')"
label='[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?'
if [[ ! "$server" =~ ^$label(\.$label)*$ ]] || [ "${#server}" -gt 253 ]; then
	echo "Expected a hostname such as gitlab.com or git.company.com." >&2
	exit 1
fi
case "$server" in
	github.com) name=github; settings=https://github.com/settings/ssh/new ;;
	gitlab.com) name=gitlab; settings=https://gitlab.com/-/user_settings/ssh_keys ;;
	bitbucket.org) name=bitbucket; settings=https://bitbucket.org/account/settings/ssh-keys/ ;;
	*) name="host-$server"; settings="the SSH key settings on $server" ;;
esac

dir="$HOME/.ssh"
if [ -L "$dir" ]; then
	echo "$dir is a symlink; choose a local key location manually." >&2
	exit 1
fi
mkdir -p "$dir"
key="$dir/id_ed25519_${name}_$profile"
host="$name-$profile"

if [ -L "$key" ] || [ -L "$key.pub" ]; then
	echo "Refusing to use a symlinked key: $key" >&2
	exit 1
elif [ -f "$key" ] && [ -f "$key.pub" ]; then
	echo "Reusing $key"
elif [ -e "$key" ] || [ -e "$key.pub" ]; then
	echo "Incomplete or unexpected key files at $key; review them before continuing." >&2
	exit 1
else
	ssh-keygen -t ed25519 -C "$host@$(hostname -s)" -f "$key"
fi

block="Host $host
    HostName $server
    User git
    IdentityFile ~/.ssh/${key##*/}
    IdentitiesOnly yes
    AddKeysToAgent yes
    IgnoreUnknown UseKeychain
    UseKeychain yes"

if [ ! -e "$dir/config" ] && [ ! -L "$dir/config" ]; then
	( set -C; echo "$block" > "$dir/config" )
elif ! ssh -F "$dir/config" -G "$host" | awk -v server="$server" -v key="~/.ssh/${key##*/}" -v full="$key" '
	$1 == "hostname" && $2 == server { host = 1 }
	$1 == "user" && $2 == "git" { user = 1 }
	$1 == "identityfile" && ($2 == key || $2 == full) { identity = 1 }
	$1 == "identitiesonly" && $2 == "yes" { only = 1 }
	END { exit !(host && user && identity && only) }
'; then
	printf '\nConfigure this host in %s (before any Host * defaults):\n\n%s\n' "$dir/config" "$block"
fi

printf '\nCopy the public key: pbcopy < "%s.pub"\n' "$key"
echo "Add it to your $profile account: $settings"
echo "Check the account: ssh -T $host"
echo "Clone with: git clone git@$host:OWNER/REPO.git"
