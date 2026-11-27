local terminal = require("terminal")

rex.action{
  name = "lazygit",
  title = "Open Lazygit in Floating Pane",
  run = terminal.open({ "lazygit" }),
}

rex.bind("ctrl+b>g", "lazygit")
