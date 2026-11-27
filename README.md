# macOS dotfiles

Personal configuration and Homebrew packages for a macOS development workstation.

## Setup

```sh
git clone https://github.com/drottsgard/drottfiles-macos.git
cd drottfiles-macos
./dot init
```

`./dot init` installs Homebrew if needed, installs the packages in `packages/Brewfile`, and links `home/` into your home directory. Keep the clone in place and open a new terminal.

## Updates

Run `git pull` to get changes. Rerun `./dot stow` when config files are added and `./dot package install` when the Brewfile changes.

## Inspiration

Inspired by [dmmulroy’s dotfiles](https://github.com/dmmulroy/.dotfiles/).
