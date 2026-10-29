local function has_tsserver(root_dir)
  return vim.fn.filereadable(vim.fs.joinpath(root_dir, 'node_modules', 'typescript', 'lib', 'tsserver.js')) == 1
end

return {
  'pmizio/typescript-tools.nvim',
  dependencies = { 'nvim-lua/plenary.nvim', 'neovim/nvim-lspconfig' },
  opts = {
    settings = {
      separate_diagnostic_server = true,
      publish_diagnostic_on = 'insert_leave',
      code_lens = 'off',
      disable_member_code_lens = true,
      tsserver_max_memory = 4096,
    },
  },
  config = function(_, opts)
    -- Keep lspconfig's workspace detection; only select the TS version.
    local workspace_root = vim.lsp.config.tsgo.root_dir
    opts.root_dir = function(bufnr, on_dir)
      workspace_root(bufnr, function(root_dir)
        if has_tsserver(root_dir) then
          on_dir(root_dir)
        end
      end)
    end
    require('typescript-tools').setup(opts)

    vim.lsp.config('tsgo', {
      cmd = function(dispatchers, config)
        local tsc = vim.fs.joinpath(config.root_dir, 'node_modules', '.bin', 'tsc')
        return vim.lsp.rpc.start({ tsc, '--lsp', '--stdio' }, dispatchers)
      end,
      root_dir = function(bufnr, on_dir)
        workspace_root(bufnr, function(root_dir)
          local tsc = vim.fs.joinpath(root_dir, 'node_modules', '.bin', 'tsc')
          if not has_tsserver(root_dir) and vim.fn.executable(tsc) == 1 then
            on_dir(root_dir)
          end
        end)
      end,
    })
    vim.lsp.enable('tsgo')
  end,
}
