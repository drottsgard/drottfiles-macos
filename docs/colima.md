# Colima Docker runtime

This workstation uses Colima as its Docker runtime. Docker Desktop is not installed or required.

## Clean installation

Install the declared Homebrew packages, then configure and start Colima:

```bash
./dot package install
./dot colima setup
```

The setup command:

1. verifies that Colima, the Docker CLI, Compose, buildx, and the macOS Keychain credential helper are installed;
2. adds Homebrew's Docker CLI plugin directory to `~/.docker/config.json`;
3. configures Docker credentials to use macOS Keychain;
4. starts Colima and activates its Docker context; and
5. verifies the Docker engine, Compose, and buildx.

The command preserves other keys in `~/.docker/config.json`. That file is machine-local and is deliberately not managed by GNU Stow because Docker adds registry and context state to it.

## Usage

Colima does not start merely because the packages are installed. Start and stop the runtime explicitly:

```bash
colima start
colima stop
```

A project using Compose works normally once Colima is running:

```bash
docker compose up -d
docker compose down
```

Inspect storage periodically:

```bash
docker system df
```

Docker volumes may contain databases or other persistent project data. Do not use volume-pruning or profile-deletion commands unless that data is disposable or backed up.

## Recreate a disposable profile

If the default VM filesystem becomes damaged and its project data is disposable, rebuild it with:

```bash
colima stop default
colima delete --data default
./dot colima setup
```

`colima delete --data default` permanently removes every image, container, and volume in the default profile.
