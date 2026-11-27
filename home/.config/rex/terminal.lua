local function open_terminal(command, tab_title)
  return function(ctx)
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

    local options = {
      focus = true,
      layout = rex.layout.block {
        flavor = "com.superlogical.terminal.shell",
        options = {
          command = command,
          cwd = cwd,
        },
      },
    }
    local result, open_err
    if tab_title then
      options.window_label = tab_title
      options.focus = false
      result, open_err = rex.session.new_window(options)
    else
      options.bounds = { 0.05, 0.05, 0.9, 0.9 }
      result, open_err = rex.session.new_layer(options)
    end
    if open_err ~= nil then error(open_err, 0) end
    if tab_title then
      rex.client.queue("session.select", {
        session_id = ctx.session_id,
        window_id = result.window_id,
      })
    end
    return result
  end
end

return { open = open_terminal }
