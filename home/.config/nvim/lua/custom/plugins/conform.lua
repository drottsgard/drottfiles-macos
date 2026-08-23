return {
  'stevearc/conform.nvim',
  opts = {
    formatters_by_ft = {
      lua = { "stylua" },
      python = { "isort", "black" },
      rust = { "rustfmt", lsp_format = "fallback" },
      -- Run oxlint to fix lint errors, then oxfmt for formatting
      javascript = { "oxlint", "oxfmt" },
      typescript = { "oxlint", "oxfmt" },
      javascriptreact = { "oxlint", "oxfmt" },
      typescriptreact = { "oxlint", "oxfmt" },

      markdown = { "prettierd", "prettier", stop_after_first = true },
    },
    format_after_save = {
      lsp_format = "fallback",
    },
  },
}
