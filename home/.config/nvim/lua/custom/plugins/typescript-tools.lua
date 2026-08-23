local root_markers = {
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lock',
  'bun.lockb',
  '.git',
}

local function get_project_root(bufnr)
  return vim.fs.root(bufnr, root_markers)
end

local function has_tsserver(root_dir)
  return root_dir
    and vim.fn.filereadable(vim.fs.joinpath(root_dir, 'node_modules', 'typescript', 'lib', 'tsserver.js')) == 1
end

return {
  'pmizio/typescript-tools.nvim',
  dependencies = { 'nvim-lua/plenary.nvim', 'neovim/nvim-lspconfig' },
  opts = {
    root_dir = function(bufnr, on_dir)
      local root_dir = get_project_root(bufnr)
      if has_tsserver(root_dir) then
        on_dir(root_dir)
      end
    end,
    settings = {
      separate_diagnostic_server = true,
      publish_diagnostic_on = 'insert_leave',
      code_lens = 'off',
      disable_member_code_lens = true,
      tsserver_max_memory = 4096,
    },
  },
  config = function(_, opts)
    require('typescript-tools').setup(opts)

    vim.lsp.config('tsgo', {
      cmd = function(dispatchers, config)
        local tsc = vim.fs.joinpath(config.root_dir, 'node_modules', '.bin', 'tsc')
        return vim.lsp.rpc.start({ tsc, '--lsp', '--stdio' }, dispatchers)
      end,
      root_dir = function(bufnr, on_dir)
        local root_dir = get_project_root(bufnr)
        if not root_dir or has_tsserver(root_dir) then
          return
        end

        local tsc = vim.fs.joinpath(root_dir, 'node_modules', '.bin', 'tsc')
        if vim.fn.executable(tsc) == 1 then
          on_dir(root_dir)
        end
      end,
    })
    vim.lsp.enable('tsgo')
  end,
}
