# macOS dotfiles

Personal configuration and Homebrew packages for a macOS development workstation.

## Setup

Install [Homebrew](https://brew.sh/) and follow its shell setup instructions. Then run:

```sh
git clone git@github.com:drottsgard/drottfiles-macos.git
cd drottfiles-macos
./dot package install
./dot stow
```

Keep the clone in place: GNU Stow links files from `home/` into your home directory. Open a new terminal to load the shell configuration.

## Updates

Run `git pull` to get changes. Rerun `./dot stow` when config files are added and `./dot package install` when the Brewfile changes.
