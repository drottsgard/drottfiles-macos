rex.action{
  name = "lazygit",
  title = "Open Lazygit in Floating Pane",
  run = function(ctx)
    local process, err = rex.block.call("com.superlogical.terminal", "process", {
      block_id = ctx.block_id,
    })
    if err ~= nil then error(err, 0) end

    local cwd = process.foreground and process.foreground.cwd
    if not cwd then
      for _, ancestor in ipairs(process.ancestors or {}) do
        if ancestor.cwd then
          cwd = ancestor.cwd
          break
        end
      end
    end
    if not cwd then error("Cannot determine the focused terminal's working directory", 0) end

    local layer, layer_err = rex.session.new_layer{
      bounds = { 0.05, 0.05, 0.9, 0.9 },
      focus = true,
      layout = rex.layout.block{
        flavor = "com.superlogical.terminal.shell",
        options = {
          command = { "lazygit" },
          cwd = cwd,
        },
      },
    }
    if layer_err ~= nil then error(layer_err, 0) end
    return layer
  end,
}

rex.bind("ctrl+l", "lazygit")
