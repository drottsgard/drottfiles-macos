require("lazygit")
require("nvim")

-- Press the prefix twice to send it to the focused terminal.
rex.bind("ctrl+b>ctrl+b", "pane.send_key", { key = "ctrl+b" })
