local terminal = require("terminal")

rex.action{
  name = "nvim",
  title = "Open Neovim in New Tab",
  run = terminal.open({ "nvim", "." }, "Neovim"),
}

rex.bind("ctrl+b>n", "nvim")
